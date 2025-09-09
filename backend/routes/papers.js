const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validatePaperGeneration } = require('../middleware/validation');
const { sendMessageToUser } = require('../config/websocketManager');

// 辅助函数：轮询AI任务状态
async function pollAiTask(taskId) {
  const AI_SERVICE_URL = 'http://question-generator:8000'; // Docker-compose 服务名
  let retries = 20; // 最多轮询20次（约2分钟）
  const delay = 6000; // 每次间隔6秒

  while (retries > 0) {
    try {
      const statusRes = await axios.get(`${AI_SERVICE_URL}/tasks/${taskId}/status`);
      const status = statusRes.data.status;

      if (status === 'completed') {
        const resultRes = await axios.get(`${AI_SERVICE_URL}/tasks/${taskId}/result`);
        return resultRes.data.result;
      }
      if (status === 'failed') {
        throw new Error(statusRes.data.error_message || 'AI generation failed');
      }
      // 如果是 pending 或 processing，则继续等待
    } catch (error) {
      console.error(`AI task polling error for ${taskId}:`, error.message);
      // 如果是网络错误等，可以提前退出
      if (error.response && error.response.status !== 404) {
        throw new Error('Failed to communicate with AI service');
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    retries--;
  }
  throw new Error('AI task timed out');
}

// 生成新试卷 (重写此路由)
router.post('/generate', authenticateToken, validatePaperGeneration, async (req, res) => {
  const { 
    courseId, title, description, difficultyLevel, totalQuestions, 
    estimatedTime, language, isPublic, sourceMaterials 
  } = req.body;
  const userId = req.user.id;
  const AI_SERVICE_URL = 'http://question-generator:8000';

  // 1. 立即响应前端，告知任务已开始
  res.status(202).json({ 
    message: '试卷生成任务已开始，完成后将通过通知告知您。',
  });

  // 2. 在后台执行耗时操作
  try {
    // 验证课程和资料
    const course = await executeQuery('SELECT name FROM courses WHERE id = ?', [courseId]);
    if (course.length === 0) throw new Error('课程不存在');
    if (!sourceMaterials || sourceMaterials.length === 0) throw new Error('请至少选择一份学习资料');

    const materials = await executeQuery(
      `SELECT file_path FROM materials WHERE id IN (?)`,
      [sourceMaterials]
    );
    if (materials.length !== sourceMaterials.length) throw new Error('部分源资料不存在');
    
    // 读取文件内容
    let combinedText = '';
    for (const material of materials) {
        // 注意：这里的路径是容器内的绝对路径
        const content = await fs.readFile(material.file_path, 'utf8');
        combinedText += content + '\n\n';
    }

    if (!combinedText.trim()) throw new Error('学习资料内容为空，无法生成试卷');

    // 3. 提交任务到AI微服务
    const aiTaskResponse = await axios.post(`${AI_SERVICE_URL}/tasks/generate`, {
      materials: combinedText,
      num_questions: totalQuestions,
    });
    const taskId = aiTaskResponse.data.task_id;
    if (!taskId) throw new Error('未能从AI服务获取任务ID');

    // 4. 后端轮询AI服务获取结果
    const aiResult = await pollAiTask(taskId);
    if (!aiResult || !aiResult.questions || aiResult.questions.length === 0) {
      throw new Error('AI未能生成有效题目');
    }
    
    // 5. 将AI结果存入数据库
    const paperResult = await executeQuery(`
      INSERT INTO generated_papers (course_id, created_by, title, description, difficulty_level, total_questions, estimated_time, language, is_public, source_materials)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [courseId, userId, title, description, difficultyLevel, totalQuestions, estimatedTime, language, isPublic, JSON.stringify(sourceMaterials)]
    );
    const paperId = paperResult.insertId;

    const questionQueries = aiResult.questions.map((q, index) => ({
      sql: `
        INSERT INTO paper_questions (paper_id, question_number, question_type, question_text, options, correct_answer, explanation, points, difficulty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [paperId, index + 1, 'multiple_choice', q.question, JSON.stringify(q.options || []), q.answer, q.explanation || '', 1, q.difficulty]
    }));
    await executeTransaction(questionQueries);

    // 6. 通过WebSocket通知前端任务完成
    const newPaper = await executeQuery('SELECT * FROM generated_papers WHERE id = ?', [paperId]);
    sendMessageToUser(userId, {
      type: 'PAPER_GENERATION_SUCCESS',
      message: `您的试卷 "${title}" 已成功生成！`,
      paper: newPaper[0],
    });

  } catch (error) {
    console.error('后台试卷生成失败:', error.message);
    // 通过WebSocket通知前端任务失败
    sendMessageToUser(userId, {
      type: 'PAPER_GENERATION_FAILED',
      message: `试卷 "${title}" 生成失败: ${error.message}`,
    });
  }
});

// 模拟题目生成函数
function generateMockQuestions(count, difficulty, language) {
  const questions = [];
  const questionTypes = ['multiple_choice', 'true_false', 'short_answer', 'calculation'];
  
  for (let i = 0; i < count; i++) {
    const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    let question = {
      type: type,
      difficulty: difficulty,
      points: type === 'multiple_choice' || type === 'true_false' ? 1 : 2
    };

    if (language === 'zh') {
      question.text = `这是第${i + 1}道${getQuestionTypeName(type)}题目。请根据所学知识回答以下问题...`;
      question.explanation = `这道题考查的是基础概念的理解。正确答案的原理是...`;
      
      if (type === 'multiple_choice') {
        question.options = ['A. 选项A', 'B. 选项B', 'C. 选项C', 'D. 选项D'];
        question.answer = 'C';
      } else if (type === 'true_false') {
        question.options = ['A. 正确', 'B. 错误'];
        question.answer = 'A';
      } else {
        question.answer = '这是标准答案的示例内容...';
      }
    } else {
      question.text = `This is question ${i + 1} of type ${type}. Please answer based on your knowledge...`;
      question.explanation = `This question tests the understanding of basic concepts. The correct answer is based on...`;
      
      if (type === 'multiple_choice') {
        question.options = ['A. Option A', 'B. Option B', 'C. Option C', 'D. Option D'];
        question.answer = 'C';
      } else if (type === 'true_false') {
        question.options = ['A. True', 'B. False'];
        question.answer = 'A';
      } else {
        question.answer = 'This is a sample standard answer...';
      }
    }

    questions.push(question);
  }

  return questions;
}

function getQuestionTypeName(type) {
  const typeNames = {
    'multiple_choice': '选择',
    'true_false': '判断',
    'short_answer': '简答',
    'calculation': '计算',
    'essay': '论述'
  };
  return typeNames[type] || '其他';
}

// 更新试卷信息
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isPublic } = req.body;
    const userId = req.user.id;

    // 检查试卷是否存在且用户有权限修改
    const paper = await executeQuery(
      'SELECT * FROM generated_papers WHERE id = ?',
      [id]
    );

    if (paper.length === 0) {
      return res.status(404).json({ error: '试卷不存在' });
    }

    if (paper[0].created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '没有权限修改此试卷' });
    }

    await executeQuery(`
      UPDATE generated_papers SET
        title = ?, description = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, isPublic, id]);

    const updatedPaper = await executeQuery(`
      SELECT 
        p.*,
        c.name as course_name,
        c.code as course_code
      FROM generated_papers p
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = ?
    `, [id]);

    res.json({
      message: '试卷更新成功',
      paper: updatedPaper[0]
    });

  } catch (error) {
    console.error('更新试卷失败:', error);
    res.status(500).json({ error: '更新试卷失败' });
  }
});

// 删除试卷
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const paper = await executeQuery(
      'SELECT * FROM generated_papers WHERE id = ?',
      [id]
    );

    if (paper.length === 0) {
      return res.status(404).json({ error: '试卷不存在' });
    }

    if (paper[0].created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '没有权限删除此试卷' });
    }

    // 删除试卷（题目会因为外键约束自动删除）
    await executeQuery('DELETE FROM generated_papers WHERE id = ?', [id]);

    res.json({ message: '试卷删除成功' });

  } catch (error) {
    console.error('删除试卷失败:', error);
    res.status(500).json({ error: '删除试卷失败' });
  }
});

// 下载试卷
router.get('/:id/download', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'txt', includeAnswers = 'false' } = req.query;
    const userId = req.user?.id;

    const papers = await executeQuery(`
      SELECT 
        p.*,
        c.name as course_name,
        c.code as course_code
      FROM generated_papers p
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = ? AND (p.is_public = TRUE OR p.created_by = ?)
    `, [id, userId || 0]);

    if (papers.length === 0) {
      return res.status(404).json({ error: '试卷不存在或不可下载' });
    }

    const paper = papers[0];

    // 获取题目
    const questions = await executeQuery(`
      SELECT * FROM paper_questions 
      WHERE paper_id = ? 
      ORDER BY question_number ASC
    `, [id]);

    // 记录下载日志
    if (userId) {
      await executeQuery(`
        INSERT INTO download_logs (user_id, item_type, item_id, ip_address, user_agent)
        VALUES (?, 'paper', ?, ?, ?)
      `, [userId, id, req.ip, req.get('User-Agent')]);
    }

    // 增加下载计数
    await executeQuery(
      'UPDATE generated_papers SET download_count = download_count + 1 WHERE id = ?',
      [id]
    );

    // 生成文件内容
    let content = generatePaperContent(paper, questions, includeAnswers === 'true', format);

    // 设置响应头
    const filename = `${paper.title}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'text/plain; charset=utf-8');

    res.send(content);

  } catch (error) {
    console.error('下载试卷失败:', error);
    res.status(500).json({ error: '下载试卷失败' });
  }
});

// 生成试卷内容
function generatePaperContent(paper, questions, includeAnswers, format) {
  let content = `${paper.title}\n`;
  content += `课程：${paper.course_name} (${paper.course_code})\n`;
  content += `难度：${paper.difficulty_level}\n`;
  content += `题目数量：${paper.total_questions}\n`;
  if (paper.estimated_time) {
    content += `预计时间：${paper.estimated_time}分钟\n`;
  }
  content += `\n${'='.repeat(50)}\n\n`;

  questions.forEach((question, index) => {
    content += `${index + 1}. ${question.question_text}\n`;
    
    if (question.options) {
      const options = JSON.parse(question.options);
      options.forEach(option => {
        content += `   ${option}\n`;
      });
    }
    
    content += '\n';
    
    if (includeAnswers) {
      content += `答案：${question.correct_answer}\n`;
      if (question.explanation) {
        content += `解析：${question.explanation}\n`;
      }
      content += '\n';
    }
    
    content += '-'.repeat(30) + '\n\n';
  });

  return content;
}

// 点赞试卷
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查是否已经点赞
    const existingLike = await executeQuery(
      'SELECT id FROM user_favorites WHERE user_id = ? AND item_type = "paper" AND item_id = ?',
      [userId, id]
    );

    if (existingLike.length > 0) {
      // 取消点赞
      await executeQuery(
        'DELETE FROM user_favorites WHERE user_id = ? AND item_type = "paper" AND item_id = ?',
        [userId, id]
      );
      
      await executeQuery(
        'UPDATE generated_papers SET like_count = like_count - 1 WHERE id = ?',
        [id]
      );

      res.json({ message: '取消点赞成功', liked: false });
    } else {
      // 添加点赞
      await executeQuery(
        'INSERT INTO user_favorites (user_id, item_type, item_id) VALUES (?, "paper", ?)',
        [userId, id]
      );
      
      await executeQuery(
        'UPDATE generated_papers SET like_count = like_count + 1 WHERE id = ?',
        [id]
      );

      res.json({ message: '点赞成功', liked: true });
    }

  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(500).json({ error: '点赞操作失败' });
  }
});

// 获取热门试卷
router.get('/popular/list', async (req, res) => {
  try {
    const { limit = 10, courseId } = req.query;

    let query = `
      SELECT 
        p.*,
        u.username as creator_name,
        c.name as course_name,
        c.code as course_code,
        AVG(ur.rating) as average_rating,
        COUNT(ur.id) as rating_count
      FROM generated_papers p
      JOIN users u ON p.created_by = u.id
      JOIN courses c ON p.course_id = c.id
      LEFT JOIN user_ratings ur ON ur.item_type = 'paper' AND ur.item_id = p.id
      WHERE p.is_public = TRUE
    `;

    const params = [];

    if (courseId) {
      query += ` AND p.course_id = ?`;
      params.push(courseId);
    }

    query += `
      GROUP BY p.id
      ORDER BY 
        (p.download_count * 0.4 + 
         p.like_count * 0.3 + 
         p.view_count * 0.1 + 
         AVG(COALESCE(ur.rating, 0)) * 0.2) DESC
      LIMIT ?
    `;

    params.push(parseInt(limit));

    const papers = await executeQuery(query, params);

    res.json({ papers });

  } catch (error) {
    console.error('获取热门试卷失败:', error);
    res.status(500).json({ error: '获取热门试卷失败' });
  }
});

module.exports = router;