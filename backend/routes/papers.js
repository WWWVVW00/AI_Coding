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
 * 辅助函数：根据提供的资料ID数组，获取材料信息，包括文本内容和PDF文件
 * @param {number[]} materialIds - 学习资料的ID数组
 * @returns {Promise<{textContent: string, pdfFiles: Array}>} - 返回文本内容和PDF文件信息
 */
async function getMaterialsData(materialIds) {
  if (!materialIds || materialIds.length === 0) {
    return { textContent: "", pdfFiles: [] };
  }
  
  console.log('[DEBUG] 查询材料数据，IDs:', materialIds);
  
  // 构建正确的IN查询
  const placeholders = materialIds.map(() => '?').join(',');
  const query = `SELECT id, file_path, file_type, file_name FROM materials WHERE id IN (${placeholders})`;
  
  console.log('[DEBUG] SQL查询语句:', query);
  console.log('[DEBUG] 查询参数:', materialIds);
  
  // 查询数据库获取文件路径
  const materials = await executeQuery(query, materialIds);
  
  console.log('[DEBUG] 数据库查询结果:', materials.length, '条记录');
  console.log('[DEBUG] 查询到的材料:', materials);
  
  let combinedText = "";
  let pdfFiles = [];

  for (const material of materials) {
    console.log(`[DEBUG] 处理材料 ${material.id}: 类型=${material.file_type}, 路径=${material.file_path}`);
    try {
      // 检查文件是否存在
      await fs.access(material.file_path);
      console.log(`[DEBUG] 文件存在: ${material.file_path}`);
      
      if (material.file_type === 'pdf') {
        // PDF文件直接保存路径，后续上传到生成服务
        pdfFiles.push({
          id: material.id,
          filePath: material.file_path,
          originalName: material.file_name || `material_${material.id}.pdf`
        });
        console.log(`[DEBUG] 添加PDF文件: ${material.file_name}`);
      } else if (material.file_type === 'txt') {
        // 纯文本文件读取内容
        const text = await fs.readFile(material.file_path, 'utf8');
        combinedText += `--- START OF MATERIAL ---\n${text}\n--- END OF MATERIAL ---\n\n`;
        console.log(`[DEBUG] 读取文本文件: ${material.file_name}, 长度: ${text.length}`);
      } else {
        console.warn(`[DEBUG] 跳过不支持的文件类型: ${material.file_type}, 文件: ${material.file_name}`);
      }
    } catch (error) {
      console.error(`[DEBUG] 无法读取或处理文件 ${material.file_path}:`, error.message);
      // 即使某个文件读取失败，也继续处理其他文件
    }
  }
  
  console.log('[DEBUG] 最终结果 - 文本长度:', combinedText.length, ', PDF数量:', pdfFiles.length);
  
  return { textContent: combinedText, pdfFiles };
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
    console.log('=== 开始试卷生成流程 ===');
    const { 
      courseId, title, description, difficultyLevel, totalQuestions, 
      isPublic, sourceMaterials 
    } = req.body;
    const userId = req.user.id;

    console.log('[DEBUG] 接收到的请求参数:', {
      courseId,
      title,
      description,
      difficultyLevel,
      totalQuestions,
      isPublic,
      sourceMaterials,
      userId
    });

    // 1. 从文件系统中获取学习资料数据（文本内容和PDF文件）
    console.log('[STEP 1] 开始获取学习资料数据...');
    console.log('[DEBUG] 待处理的资料ID列表:', sourceMaterials);
    
    const { textContent, pdfFiles } = await getMaterialsData(sourceMaterials);
    
    console.log('[STEP 1] 资料数据获取完成:');
    console.log('  - 文本内容长度:', textContent ? textContent.length : 0);
    console.log('  - PDF文件数量:', pdfFiles.length);
    if (pdfFiles.length > 0) {
      console.log('  - PDF文件列表:', pdfFiles.map(pdf => ({ id: pdf.id, name: pdf.originalName, path: pdf.filePath })));
    }
    
    // 检查是否有可用的材料
    if (!textContent && pdfFiles.length === 0 && sourceMaterials && sourceMaterials.length > 0) {
      console.log('[ERROR] 无法从提供的资料中提取可读的内容');
      return res.status(400).json({ error: '无法从提供的资料中提取可读的内容。' });
    }

    console.log('[STEP 2] 开始选择API端点并准备请求...');
    let taskId;
    let aiServiceUrl;

    // 2. 根据材料类型选择合适的API端点
    if (pdfFiles.length > 0) {
      // 优先使用PDF上传API（目前只支持单个PDF文件）
      const pdfFile = pdfFiles[0]; // 取第一个PDF文件
      aiServiceUrl = `${process.env.QUESTION_GENERATOR_URL}/tasks/generate/pdf`;
      console.log('[STEP 2] 选择PDF上传模式');
      console.log(`[DEBUG] PDF API URL: ${aiServiceUrl}`);
      console.log(`[DEBUG] 使用的PDF文件:`, {
        id: pdfFile.id,
        name: pdfFile.originalName,
        path: pdfFile.filePath
      });

      const FormData = require('form-data');
      const form = new FormData();
      
      // 读取PDF文件并添加到表单
      console.log('[DEBUG] 正在创建文件流...');
      const pdfStream = require('fs').createReadStream(pdfFile.filePath);
      form.append('pdf_file', pdfStream, {
        filename: pdfFile.originalName,
        contentType: 'application/pdf'
      });
      form.append('num_questions', totalQuestions.toString());
      
      console.log('[DEBUG] 表单数据准备完成，开始发送请求...');
      console.log(`[AI] 正在调用PDF上传API: ${aiServiceUrl}`);

      const submitResponse = await axios.post(aiServiceUrl, form, {
        headers: {
          ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      taskId = submitResponse.data.task_id;
      console.log(`[AI] PDF任务已提交成功！`);
      console.log(`[DEBUG] 任务ID: ${taskId}`);
      console.log(`[DEBUG] 文件名: ${pdfFile.originalName}`);
      console.log(`[DEBUG] 服务器响应:`, submitResponse.data);
      
    } else {
      // 使用文本API
      aiServiceUrl = `${process.env.QUESTION_GENERATOR_URL}/tasks/generate`;
      console.log('[STEP 2] 选择文本API模式');
      console.log(`[DEBUG] 文本API URL: ${aiServiceUrl}`);
      
      const generationInput = textContent || '通用知识';
      console.log(`[DEBUG] 输入文本长度: ${generationInput.length}`);
      console.log(`[DEBUG] 文本内容预览: ${generationInput.substring(0, 200)}...`);
      
      const requestPayload = {
        materials: generationInput.substring(0, 20000), // 限制上下文长度
        num_questions: totalQuestions
      };
      
      console.log('[DEBUG] 请求载荷:', {
        materials_length: requestPayload.materials.length,
        num_questions: requestPayload.num_questions
      });
      console.log(`[AI] 正在调用文本API: ${aiServiceUrl}`);
      
      const submitResponse = await axios.post(aiServiceUrl, requestPayload);

      taskId = submitResponse.data.task_id;
      console.log(`[AI] 文本任务已提交成功！`);
      console.log(`[DEBUG] 任务ID: ${taskId}`);
      console.log(`[DEBUG] 服务器响应:`, submitResponse.data);
    }

    if (!taskId) {
      console.log('[ERROR] AI服务未能返回有效的任务ID');
      throw new Error('AI服务未能返回有效的任务ID');
    }

    console.log('[STEP 3] 开始轮询AI服务获取任务状态...');
    console.log(`[DEBUG] 任务ID: ${taskId}`);
    console.log(`[DEBUG] 最大轮询次数: 100 (约8.5分钟)`);
    
    // 3. 轮询AI服务获取任务状态
    let taskStatus;
    const maxAttempts = 100; // 最多轮询30次（约8.5分钟）
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`[POLLING] 第 ${attempt + 1}/${maxAttempts} 次查询，等待5秒...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
      
      const statusUrl = `${process.env.QUESTION_GENERATOR_URL}/tasks/${taskId}/status`;
      console.log(`[DEBUG] 查询状态URL: ${statusUrl}`);
      
      const statusResponse = await axios.get(statusUrl);
      taskStatus = statusResponse.data;

      console.log(`[POLLING] 任务状态响应:`, taskStatus);

      if (taskStatus.status === 'completed') {
        console.log(`[SUCCESS] 任务 ${taskId} 已完成！`);
        console.log(`[DEBUG] 完成时间: 第 ${attempt + 1} 次查询`);
        break;
      }
      if (taskStatus.status === 'failed') {
        console.log(`[ERROR] 任务失败:`, taskStatus.error_message);
        throw new Error(`AI任务生成失败: ${taskStatus.error_message}`);
      }
      console.log(`[POLLING] 任务 ${taskId} 状态: ${taskStatus.status}, 进度: ${taskStatus.progress || '处理中'}`);
    }

    if (!taskStatus || taskStatus.status !== 'completed') {
      console.log('[ERROR] 任务超时或状态异常');
      console.log('[DEBUG] 最终状态:', taskStatus);
      throw new Error('AI任务超时，请稍后重试或减少题目数量。');
    }

    console.log('[STEP 4] 开始获取任务结果...');
    // 4. 获取任务结果
    const resultUrl = `${process.env.QUESTION_GENERATOR_URL}/tasks/${taskId}/result`;
    console.log(`[DEBUG] 结果获取URL: ${resultUrl}`);
    
    const resultResponse = await axios.get(resultUrl);
    const taskResult = resultResponse.data.result;

    console.log('[DEBUG] 任务结果响应:', resultResponse.data);
    console.log('[DEBUG] 解析后的结果:', taskResult);

    if (!taskResult) {
      console.log('[ERROR] 无法获取AI任务结果');
      throw new Error('无法获取AI任务结果');
    }

    const { questions } = taskResult;
    console.log(`[SUCCESS] 获取到 ${questions.length} 道题目`);
    console.log('[DEBUG] 题目预览:', questions.slice(0, 2));

    console.log('[STEP 5] 开始将结果存入数据库...');
    
    // 5. 将AI返回的结果存入数据库
    console.log('[DEBUG] 插入试卷基本信息...');
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
    console.log(`[DEBUG] 试卷插入成功，ID: ${paperId}`);

    console.log('[DEBUG] 准备插入题目数据...');
    const questionQueries = questions.map((q, index) => {
      console.log(`[DEBUG] 题目 ${index + 1}:`, {
        question: q.question.substring(0, 100) + '...',
        answer: q.answer,
        difficulty: q.difficulty,
        topic: q.topic
      });
      
      return {
        sql: `
          INSERT INTO paper_questions (
            paper_id, question_number, question_type, question_text,
            correct_answer, explanation, difficulty
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          paperId, index + 1, 'essay', q.question,
          q.answer, q.answer, q.difficulty
        ]
      };
    });

    console.log(`[DEBUG] 开始批量插入 ${questionQueries.length} 道题目...`);
    await executeTransaction(questionQueries);
    console.log('[SUCCESS] 题目插入完成');

    console.log('[DEBUG] 查询新创建的试卷信息...');
    const newPaper = await executeQuery('SELECT * FROM generated_papers WHERE id = ?', [paperId]);
    console.log('[DEBUG] 新试卷信息:', newPaper[0]);

    console.log('=== 试卷生成流程完成 ===');
    res.status(201).json({ message: '试卷智能生成成功！', paper: newPaper[0] });

  } catch (error) {
    console.log('[ERROR] 试卷生成过程中发生错误:');
    console.log('[ERROR] 错误类型:', error.name);
    console.log('[ERROR] 错误消息:', error.message);
    console.log('[ERROR] 错误堆栈:', error.stack);
    if (error.response) {
      console.log('[ERROR] HTTP响应错误:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
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