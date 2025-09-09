const express = require('express');
const router = express.Router();
const axios = require('axios'); // 用于发送HTTP请求
const fs = require('fs/promises'); // 用于异步读取文件
const { 
  executeQuery, 
  executeTransaction, 
  buildPaginationQuery, 
  buildSearchConditions 
} = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validatePaperGeneration } = require('../middleware/validation');

/**
 * 辅助函数：根据提供的资料ID数组，读取文件内容并合并成一个字符串。
 * @param {number[]} materialIds - 学习资料的ID数组
 * @returns {Promise<string>} - 合并后的文本内容
 */
async function getMaterialsText(materialIds) {
  if (!materialIds || materialIds.length === 0) {
    return "";
  }
  
  // 查询数据库获取文件路径
  const materials = await executeQuery(
    `SELECT file_path, file_type FROM materials WHERE id IN (?)`,
    [materialIds]
  );
  
  let combinedText = "";

  for (const material of materials) {
    try {
      // 检查文件是否存在
      await fs.access(material.file_path);
      // 目前仅支持读取纯文本文件，未来可扩展
      if (['txt', 'md'].includes(material.file_type)) {
        const text = await fs.readFile(material.file_path, 'utf8');
        combinedText += `--- START OF MATERIAL ---\n${text}\n--- END OF MATERIAL ---\n\n`;
      }
    } catch (error) {
      console.error(`无法读取或处理文件 ${material.file_path}:`, error);
      // 即使某个文件读取失败，也继续处理其他文件
    }
  }
  return combinedText;
}

/**
 * 辅助函数：将试卷和题目数据格式化为可下载的文本文件。
 * @param {object} paper - 试卷信息对象
 * @param {object[]} questions - 题目数组
 * @param {boolean} includeAnswers - 是否包含答案和解析
 * @returns {string} - 格式化后的文本内容
 */
function generatePaperContent(paper, questions, includeAnswers) {
  let content = `${paper.title}\n\n`;
  content += `课程：${paper.course_name} (${paper.course_code})\n`;
  content += `难度：${paper.difficulty_level || '中等'}\n`;
  content += `题目数量：${paper.total_questions}\n\n`;
  content += `${'='.repeat(50)}\n\n`;

  questions.forEach((q, index) => {
    content += `题目 ${index + 1}: ${q.question_text}\n\n`;
    if (includeAnswers) {
      content += `答案：${q.correct_answer}\n`;
      if (q.explanation) {
        content += `解析：${q.explanation}\n`;
      }
      content += '\n';
    }
    content += `${'-'.repeat(30)}\n\n`;
  });

  return content;
}

// ==========================================================
// API 路由
// ==========================================================

// --- [核心功能] 生成新试卷 ---
router.post('/generate', authenticateToken, validatePaperGeneration, async (req, res, next) => {
  try {
    const { 
      courseId, title, description, difficultyLevel, totalQuestions, 
      isPublic, sourceMaterials 
    } = req.body;
    const userId = req.user.id;

    // 1. 从文件系统中获取学习资料的文本内容
    const materialsText = await getMaterialsText(sourceMaterials);
    if (!materialsText && sourceMaterials && sourceMaterials.length > 0) {
      return res.status(400).json({ error: '无法从提供的资料中提取可读的文本内容。' });
    }
    const generationInput = materialsText || '通用知识';

    // 2. 异步调用 Python AI 服务提交生成任务
    const aiServiceUrl = `${process.env.QUESTION_GENERATOR_URL}/tasks/generate`;
    console.log(`[AI] 正在调用: ${aiServiceUrl}`);

    const submitResponse = await axios.post(aiServiceUrl, {
      materials: generationInput.substring(0, 20000), // 限制上下文长度
      num_questions: totalQuestions
    });

    const taskId = submitResponse.data.task_id;
    if (!taskId) {
      throw new Error('AI服务未能返回有效的任务ID');
    }
    console.log(`[AI] 任务已提交，ID: ${taskId}`);

    // 3. 轮询AI服务获取任务状态
    let taskStatus;
    const maxAttempts = 30; // 最多轮询30次（约2.5分钟）
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
      
      const statusResponse = await axios.get(`${process.env.QUESTION_GENERATOR_URL}/tasks/${taskId}/status`);
      taskStatus = statusResponse.data;

      if (taskStatus.status === 'completed') {
        console.log(`[AI] 任务 ${taskId} 完成`);
        break;
      }
      if (taskStatus.status === 'failed') {
        throw new Error(`AI任务生成失败: ${taskStatus.error_message}`);
      }
      console.log(`[AI] 任务 ${taskId} 状态: ${taskStatus.status}, 进度: ${taskStatus.progress || '处理中'}, 第 ${attempt + 1} 次查询`);
    }

    if (!taskStatus || taskStatus.status !== 'completed') {
      throw new Error('AI任务超时，请稍后重试或减少题目数量。');
    }

    // 4. 获取任务结果
    const resultResponse = await axios.get(`${process.env.QUESTION_GENERATOR_URL}/tasks/${taskId}/result`);
    const taskResult = resultResponse.data.result;

    if (!taskResult) {
      throw new Error('无法获取AI任务结果');
    }

    const { questions } = taskResult;
    
    // 4. 将AI返回的结果存入数据库
    const paperResult = await executeQuery(`
      INSERT INTO generated_papers (
        course_id, created_by, title, description, difficulty_level,
        total_questions, is_public, source_materials
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      courseId, userId, title, description || null, difficultyLevel || 'medium',
      questions.length, isPublic !== false, sourceMaterials ? JSON.stringify(sourceMaterials) : null
    ]);

    const paperId = paperResult.insertId;

    const questionQueries = questions.map((q, index) => ({
      sql: `
        INSERT INTO paper_questions (
          paper_id, question_number, question_type, question_text,
          correct_answer, explanation, difficulty, topic
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        paperId, index + 1, 'text', q.question,
        q.answer, q.answer, q.difficulty, q.topic
      ]
    }));

    await executeTransaction(questionQueries);

    const newPaper = await executeQuery('SELECT * FROM generated_papers WHERE id = ?', [paperId]);

    res.status(201).json({ message: '试卷智能生成成功！', paper: newPaper[0] });

  } catch (error) {
    next(error); // 将错误传递给全局错误处理器
  }
});


// --- [读取] 获取试卷列表（支持分页、搜索、筛选） ---
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { 
      page = 1, limit = 20, search = '', courseId = '', difficulty = '',
      sort = 'created_at', order = 'DESC'
    } = req.query;

    let baseQuery = `
      SELECT 
        p.*, u.username as creator_name, c.name as course_name, c.code as course_code
      FROM generated_papers p
      JOIN users u ON p.created_by = u.id
      JOIN courses c ON p.course_id = c.id
      WHERE p.is_public = TRUE
    `;
    const params = [];

    if (search) {
      const searchConditions = buildSearchConditions(['p.title', 'p.description'], search);
      baseQuery += ` AND ${searchConditions.where}`;
      params.push(...searchConditions.params);
    }
    if (courseId) {
      baseQuery += ` AND p.course_id = ?`;
      params.push(courseId);
    }
    if (difficulty) {
      baseQuery += ` AND p.difficulty_level = ?`;
      params.push(difficulty);
    }

    const validSorts = ['title', 'created_at', 'download_count', 'like_count', 'view_count'];
    const sortField = validSorts.includes(sort) ? `p.${sort}` : 'p.created_at';
    const sortOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    const paginatedQuery = buildPaginationQuery(baseQuery, page, limit, `${sortField} ${sortOrder}`);
    const papers = await executeQuery(paginatedQuery, params);

    // 获取总数
    // 获取总数
    let countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM generated_papers p WHERE p.is_public = TRUE`;
    
    // --- 修改点：在动态添加 AND 条件之前，先加一个空格 ---
    const conditions = [];
    const countParams = [];

    if (search) {
      const searchConditions = buildSearchConditions(['p.title', 'p.description'], search);
      conditions.push(searchConditions.where);
      countParams.push(...searchConditions.params);
    }
    if (courseId) {
      conditions.push('p.course_id = ?');
      countParams.push(courseId);
    }
    if (difficulty) {
      conditions.push('p.difficulty_level = ?');
      countParams.push(difficulty);
    }
    
    if (conditions.length > 0) {
      // 这里确保了每个 AND 前面都有空格
      countQuery += ' AND ' + conditions.join(' AND ');
    }

    const [{ total }] = await executeQuery(countQuery, countParams);
    
    res.json({ papers, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

// --- [读取] 获取单个试卷详情及其题目 ---
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const paperQuery = await executeQuery(`
      SELECT p.*, u.username as creator_name, c.name as course_name, c.code as course_code
      FROM generated_papers p
      JOIN users u ON p.created_by = u.id
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = ? AND (p.is_public = TRUE OR p.created_by = ?)
    `, [id, userId || 0]);

    if (paperQuery.length === 0) {
      return res.status(404).json({ error: '试卷不存在或您没有权限查看' });
    }
    const paper = paperQuery[0];

    const questions = await executeQuery('SELECT * FROM paper_questions WHERE paper_id = ? ORDER BY question_number ASC', [id]);
    
    await executeQuery('UPDATE generated_papers SET view_count = view_count + 1 WHERE id = ?', [id]);

    res.json({ paper, questions });
  } catch (error) {
    next(error);
  }
});

// --- [更新] 更新试卷信息 (例如标题、描述) ---
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, isPublic } = req.body;
    const userId = req.user.id;

    const [paper] = await executeQuery('SELECT created_by FROM generated_papers WHERE id = ?', [id]);
    if (!paper) {
      return res.status(404).json({ error: '试卷不存在' });
    }
    if (paper.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '没有权限修改此试卷' });
    }

    await executeQuery(
      'UPDATE generated_papers SET title = ?, description = ?, is_public = ?, updated_at = NOW() WHERE id = ?',
      [title, description, isPublic, id]
    );

    const [updatedPaper] = await executeQuery('SELECT * FROM generated_papers WHERE id = ?', [id]);
    res.json({ message: '试卷更新成功', paper: updatedPaper });
  } catch (error) {
    next(error);
  }
});

// --- [删除] 删除试卷 ---
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [paper] = await executeQuery('SELECT created_by FROM generated_papers WHERE id = ?', [id]);
    if (!paper) {
      return res.status(404).json({ error: '试卷不存在' });
    }
    if (paper.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '没有权限删除此试卷' });
    }

    await executeQuery('DELETE FROM generated_papers WHERE id = ?', [id]);
    res.json({ message: '试卷删除成功' });
  } catch (error) {
    next(error);
  }
});

// --- [功能] 下载试卷为文本文件 ---
router.get('/:id/download', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeAnswers = 'false' } = req.query;

    const paperQuery = await executeQuery(`
      SELECT p.*, c.name as course_name, c.code as course_code
      FROM generated_papers p JOIN courses c ON p.course_id = c.id
      WHERE p.id = ? AND p.is_public = TRUE
    `, [id]);
    
    if (paperQuery.length === 0) {
      return res.status(404).json({ error: '试卷不存在或不可下载' });
    }
    const paper = paperQuery[0];

    const questions = await executeQuery('SELECT * FROM paper_questions WHERE paper_id = ? ORDER BY question_number ASC', [id]);
    
    await executeQuery('UPDATE generated_papers SET download_count = download_count + 1 WHERE id = ?', [id]);
    
    const content = generatePaperContent(paper, questions, includeAnswers === 'true');
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(paper.title)}.txt"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(content);

  } catch (error) {
    next(error);
  }
});

module.exports = router;