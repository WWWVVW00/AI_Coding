const express = require('express');
const router = express.Router();
const { executeQuery, executeTransaction, buildPaginationQuery, buildSearchConditions } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validatePaperGeneration, validateQuestion } = require('../middleware/validation');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');

// 问题生成器配置
const QUESTION_GENERATOR_URL = process.env.QUESTION_GENERATOR_URL || 'http://localhost:8000';
const QUESTION_GENERATOR_TIMEOUT = parseInt(process.env.QUESTION_GENERATOR_TIMEOUT) || 300000; // 5分钟

// 创建axios实例
const questionGeneratorApi = axios.create({
  baseURL: QUESTION_GENERATOR_URL,
  timeout: QUESTION_GENERATOR_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 问题生成辅助函数
async function submitQuestionGenerationTask(materials, numQuestions = 5) {
  try {
    const response = await questionGeneratorApi.post('/tasks/generate', {
      materials,
      num_questions: numQuestions
    });
    return response.data;
  } catch (error) {
    console.error('提交问题生成任务失败:', error.message);
    throw new Error(`问题生成服务不可用: ${error.message}`);
  }
}

async function getTaskStatus(taskId) {
  try {
    const response = await questionGeneratorApi.get(`/tasks/${taskId}/status`);
    return response.data;
  } catch (error) {
    console.error('查询任务状态失败:', error.message);
    throw new Error(`无法查询任务状态: ${error.message}`);
  }
}

async function getTaskResult(taskId) {
  try {
    const response = await questionGeneratorApi.get(`/tasks/${taskId}/result`);
    return response.data;
  } catch (error) {
    console.error('获取任务结果失败:', error.message);
    throw new Error(`无法获取任务结果: ${error.message}`);
  }
}

// 将AI生成的问题转换为数据库格式
function convertAIQuestionsToDBFormat(aiQuestions, difficulty) {
  return aiQuestions.map((q, index) => {
    let questionType = 'short_answer'; // 默认类型
    let options = null;
    let correctAnswer = q.answer;

    // 尝试从问题文本判断类型
    if (q.question.includes('选择') || q.question.includes('下列') || q.question.includes('以下')) {
      questionType = 'multiple_choice';
      // 如果没有选项，生成默认选项
      if (!q.options) {
        options = ['A. 选项A', 'B. 选项B', 'C. 选项C', 'D. 选项D'];
        correctAnswer = 'A';
      } else {
        options = q.options;
      }
    } else if (q.question.includes('正确') || q.question.includes('错误') || q.question.includes('是否')) {
      questionType = 'true_false';
      options = ['A. 正确', 'B. 错误'];
      correctAnswer = correctAnswer.includes('错误') || correctAnswer.includes('不') ? 'B' : 'A';
    }

    return {
      type: questionType,
      text: q.question,
      options: options,
      answer: correctAnswer,
      explanation: q.answer, // 使用answer作为解析
      points: questionType === 'short_answer' ? 2 : 1,
      difficulty: q.difficulty || difficulty || 'medium'
    };
  });
}

// 获取试卷列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      courseId = '', 
      difficulty = '',
      language = '',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    let baseQuery = `
      SELECT 
        p.*,
        u.username as creator_name,
        u.full_name as creator_full_name,
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

    // 搜索条件
    if (search) {
      const searchConditions = buildSearchConditions(['p.title', 'p.description'], search);
      baseQuery += ` AND ${searchConditions.where}`;
      params.push(...searchConditions.params);
    }

    // 课程筛选
    if (courseId) {
      baseQuery += ` AND p.course_id = ?`;
      params.push(courseId);
    }

    // 难度筛选
    if (difficulty) {
      baseQuery += ` AND p.difficulty_level = ?`;
      params.push(difficulty);
    }

    // 语言筛选
    if (language) {
      baseQuery += ` AND p.language = ?`;
      params.push(language);
    }

    baseQuery += ` GROUP BY p.id`;

    // 排序
    const validSorts = ['title', 'created_at', 'download_count', 'like_count', 'view_count', 'average_rating'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    const paginatedQuery = buildPaginationQuery(
      baseQuery, 
      parseInt(page), 
      parseInt(limit), 
      `${sortField} ${sortOrder}`
    );

    const papers = await executeQuery(paginatedQuery, params);

    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM generated_papers p
      JOIN courses c ON p.course_id = c.id
      WHERE p.is_public = TRUE
      ${search ? `AND (p.title LIKE ? OR p.description LIKE ?)` : ''}
      ${courseId ? `AND p.course_id = ?` : ''}
      ${difficulty ? `AND p.difficulty_level = ?` : ''}
      ${language ? `AND p.language = ?` : ''}
    `;

    const countParams = [];
    if (search) {
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (courseId) countParams.push(courseId);
    if (difficulty) countParams.push(difficulty);
    if (language) countParams.push(language);

    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      papers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取试卷列表失败:', error);
    res.status(500).json({ error: '获取试卷列表失败' });
  }
});

// 获取单个试卷详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const papers = await executeQuery(`
      SELECT 
        p.*,
        u.username as creator_name,
        u.full_name as creator_full_name,
        c.name as course_name,
        c.code as course_code,
        AVG(ur.rating) as average_rating,
        COUNT(ur.id) as rating_count
      FROM generated_papers p
      JOIN users u ON p.created_by = u.id
      JOIN courses c ON p.course_id = c.id
      LEFT JOIN user_ratings ur ON ur.item_type = 'paper' AND ur.item_id = p.id
      WHERE p.id = ? AND (p.is_public = TRUE OR p.created_by = ?)
      GROUP BY p.id
    `, [id, userId || 0]);

    if (papers.length === 0) {
      return res.status(404).json({ error: '试卷不存在或不可访问' });
    }

    const paper = papers[0];

    // 获取试卷题目
    const questions = await executeQuery(`
      SELECT * FROM paper_questions 
      WHERE paper_id = ? 
      ORDER BY question_number ASC
    `, [id]);

    // 增加浏览次数
    await executeQuery(
      'UPDATE generated_papers SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );

    // 获取用户是否已收藏此试卷
    let isFavorited = false;
    if (userId) {
      const favorites = await executeQuery(
        'SELECT id FROM user_favorites WHERE user_id = ? AND item_type = "paper" AND item_id = ?',
        [userId, id]
      );
      isFavorited = favorites.length > 0;
    }

    res.json({
      paper: {
        ...paper,
        isFavorited
      },
      questions
    });

  } catch (error) {
    console.error('获取试卷详情失败:', error);
    res.status(500).json({ error: '获取试卷详情失败' });
  }
});

// 生成新试卷
router.post('/generate', authenticateToken, validatePaperGeneration, async (req, res) => {
  try {
    const { 
      courseId, title, description, difficultyLevel, totalQuestions, 
      estimatedTime, language, isPublic, sourceMaterials 
    } = req.body;
    const userId = req.user.id;

    // 验证课程是否存在
    const course = await executeQuery('SELECT id, name FROM courses WHERE id = ?', [courseId]);
    if (course.length === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }

    // 验证源资料是否存在并获取内容
    if (!sourceMaterials || sourceMaterials.length === 0) {
      return res.status(400).json({ error: '请至少选择一个学习资料' });
    }

    const materials = await executeQuery(
      `SELECT id, title, file_path, file_type FROM materials WHERE id IN (${sourceMaterials.map(() => '?').join(',')}) AND course_id = ?`,
      [...sourceMaterials, courseId]
    );

    if (materials.length !== sourceMaterials.length) {
      return res.status(400).json({ error: '部分源资料不存在或不属于该课程' });
    }

    // 提取资料内容
    let materialContent = '';
    for (const material of materials) {
      try {
        // 读取文件内容（这里简化处理，实际应该根据文件类型处理）
        const filePath = path.join(__dirname, '..', material.file_path);
        if (await fs.pathExists(filePath)) {
          if (material.file_type === 'text/plain' || material.file_type === 'application/text') {
            const content = await fs.readFile(filePath, 'utf-8');
            materialContent += `\n\n=== ${material.title} ===\n${content}`;
          } else {
            // 对于其他文件类型，添加文件信息
            materialContent += `\n\n=== ${material.title} (${material.file_type}) ===\n`;
            materialContent += `这是一个${material.file_type}文件，包含课程相关内容。请根据文件名"${material.title}"生成相关问题。`;
          }
        }
      } catch (error) {
        console.error(`读取文件 ${material.title} 失败:`, error);
        materialContent += `\n\n=== ${material.title} ===\n课程资料内容`;
      }
    }

    // 如果没有提取到有效内容，使用默认内容
    if (!materialContent.trim()) {
      materialContent = `课程：${course[0].name}\n这是关于 ${title || '课程内容'} 的学习资料。请根据课程主题生成相关的考试题目。`;
    }

    // 创建试卷记录（状态为生成中）
    const paperResult = await executeQuery(`
      INSERT INTO generated_papers (
        course_id, created_by, title, description, difficulty_level,
        total_questions, estimated_time, language, is_public, source_materials
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      courseId,
      userId,
      title,
      description || null,
      difficultyLevel || 'medium',
      totalQuestions,
      estimatedTime || null,
      language || 'zh',
      isPublic !== false,
      JSON.stringify(sourceMaterials)
    ]);

    const paperId = paperResult.insertId;

    // 提交AI生成任务
    try {
      const taskResponse = await submitQuestionGenerationTask(materialContent, totalQuestions);
      
      // 保存任务ID到数据库（用于后续查询）
      await executeQuery(
        'UPDATE generated_papers SET source_materials = ? WHERE id = ?',
        [JSON.stringify({
          materials: sourceMaterials,
          aiTaskId: taskResponse.task_id,
          taskStatus: 'submitted'
        }), paperId]
      );

      // 立即返回试卷信息和任务ID
      const newPaper = await executeQuery(`
        SELECT 
          p.*,
          c.name as course_name,
          c.code as course_code
        FROM generated_papers p
        JOIN courses c ON p.course_id = c.id
        WHERE p.id = ?
      `, [paperId]);

      res.status(201).json({
        message: '试卷生成任务已提交，正在处理中...',
        paper: {
          ...newPaper[0],
          aiTaskId: taskResponse.task_id,
          generationStatus: 'processing'
        }
      });

      // 异步处理AI生成结果
      processAIGeneration(paperId, taskResponse.task_id, difficultyLevel || 'medium', language || 'zh');

    } catch (aiError) {
      console.error('AI生成任务提交失败:', aiError);
      
      // 如果AI服务不可用，回退到模拟生成
      console.log('回退到模拟题目生成...');
      const mockQuestions = generateMockQuestions(totalQuestions, difficultyLevel || 'medium', language || 'zh');
      
      // 先删除该试卷的现有题目（防止重复插入）
      await executeQuery('DELETE FROM paper_questions WHERE paper_id = ?', [paperId]);
      
      const questionQueries = mockQuestions.map((question, index) => ({
        sql: `
          INSERT INTO paper_questions (
            paper_id, question_number, question_type, question_text,
            options, correct_answer, explanation, points, difficulty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          paperId,
          index + 1,
          question.type,
          question.text,
          question.options ? JSON.stringify(question.options) : null,
          question.answer,
          question.explanation,
          question.points || 1,
          question.difficulty || difficultyLevel || 'medium'
        ]
      }));

      await executeTransaction(questionQueries);

      const newPaper = await executeQuery(`
        SELECT 
          p.*,
          c.name as course_name,
          c.code as course_code
        FROM generated_papers p
        JOIN courses c ON p.course_id = c.id
        WHERE p.id = ?
      `, [paperId]);

      res.status(201).json({
        message: '试卷生成成功（使用模拟题目）',
        paper: {
          ...newPaper[0],
          generationStatus: 'completed',
          generationMethod: 'mock'
        }
      });
    }

  } catch (error) {
    console.error('生成试卷失败:', error);
    res.status(500).json({ error: '生成试卷失败' });
  }
});

// 异步处理AI生成结果
async function processAIGeneration(paperId, taskId, difficulty, language) {
  try {
    // 轮询任务状态
    let attempts = 0;
    const maxAttempts = 60; // 最多等待5分钟
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
      attempts++;
      
      try {
        const statusResponse = await getTaskStatus(taskId);
        
        if (statusResponse.status === 'completed') {
          // 获取生成结果
          const resultResponse = await getTaskResult(taskId);
          
          if (resultResponse.result && resultResponse.result.questions) {
            // 转换AI问题格式
            const dbQuestions = convertAIQuestionsToDBFormat(resultResponse.result.questions, difficulty);
            
            // 先删除该试卷的现有题目（防止重复插入）
            await executeQuery('DELETE FROM paper_questions WHERE paper_id = ?', [paperId]);
            
            // 插入问题到数据库
            const questionQueries = dbQuestions.map((question, index) => ({
              sql: `
                INSERT INTO paper_questions (
                  paper_id, question_number, question_type, question_text,
                  options, correct_answer, explanation, points, difficulty
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              params: [
                paperId,
                index + 1,
                question.type,
                question.text,
                question.options ? JSON.stringify(question.options) : null,
                question.answer,
                question.explanation,
                question.points,
                question.difficulty
              ]
            }));

            await executeTransaction(questionQueries);
            
            // 更新试卷状态
            const currentPaper = await executeQuery('SELECT source_materials FROM generated_papers WHERE id = ?', [paperId]);
            const currentSourceMaterials = currentPaper[0].source_materials;
            
            // 安全解析source_materials
            let existingMaterials = [];
            try {
              if (typeof currentSourceMaterials === 'string') {
                existingMaterials = JSON.parse(currentSourceMaterials)?.materials || [];
              } else if (currentSourceMaterials && currentSourceMaterials.materials) {
                existingMaterials = currentSourceMaterials.materials;
              }
            } catch (error) {
              console.error('解析source_materials失败:', error);
              existingMaterials = [];
            }
            
            await executeQuery(
              'UPDATE generated_papers SET source_materials = ? WHERE id = ?',
              [JSON.stringify({
                materials: existingMaterials,
                aiTaskId: taskId,
                taskStatus: 'completed',
                generationTime: resultResponse.result.generation_time
              }), paperId]
            );
            
            console.log(`试卷 ${paperId} AI生成完成`);
            return;
          }
        } else if (statusResponse.status === 'failed') {
          throw new Error('AI生成任务失败');
        }
        
        // 继续等待
        console.log(`试卷 ${paperId} 生成中... (${attempts}/${maxAttempts})`);
        
      } catch (error) {
        console.error(`检查任务状态失败 (attempt ${attempts}):`, error);
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }
    
    throw new Error('AI生成超时');
    
  } catch (error) {
    console.error(`试卷 ${paperId} AI生成失败:`, error);
    
    // 更新状态为失败
    try {
      await executeQuery(
        'UPDATE generated_papers SET source_materials = ? WHERE id = ?',
        [JSON.stringify({
          materials: JSON.parse((await executeQuery('SELECT source_materials FROM generated_papers WHERE id = ?', [paperId]))[0].source_materials)?.materials || [],
          aiTaskId: taskId,
          taskStatus: 'failed',
          error: error.message
        }), paperId]
      );
    } catch (updateError) {
      console.error('更新试卷状态失败:', updateError);
    }
  }
}

// 查询试卷生成状态
router.get('/:id/generation-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 获取试卷信息
    const papers = await executeQuery(`
      SELECT p.*, c.name as course_name
      FROM generated_papers p
      JOIN courses c ON p.course_id = c.id
      WHERE p.id = ? AND p.created_by = ?
    `, [id, userId]);

    if (papers.length === 0) {
      return res.status(404).json({ error: '试卷不存在或无权限访问' });
    }

    const paper = papers[0];
    let generationStatus = {
      status: 'completed',
      progress: '生成完成',
      method: 'unknown'
    };

    // 解析source_materials获取AI任务信息
    if (paper.source_materials) {
      try {
        const sourceInfo = JSON.parse(paper.source_materials);
        if (sourceInfo.aiTaskId) {
          // 查询AI任务状态
          try {
            const taskStatus = await getTaskStatus(sourceInfo.aiTaskId);
            generationStatus = {
              status: taskStatus.status,
              progress: taskStatus.progress || '处理中...',
              method: 'ai',
              taskId: sourceInfo.aiTaskId,
              error: sourceInfo.error
            };
          } catch (error) {
            generationStatus = {
              status: 'failed',
              progress: '查询状态失败',
              method: 'ai',
              error: error.message
            };
          }
        } else {
          generationStatus.method = 'mock';
        }
      } catch (error) {
        // 解析失败，假设是老数据
        generationStatus.method = 'legacy';
      }
    }

    // 获取已生成的题目数量
    const questions = await executeQuery(
      'SELECT COUNT(*) as count FROM paper_questions WHERE paper_id = ?',
      [id]
    );

    res.json({
      paperId: id,
      title: paper.title,
      totalQuestions: paper.total_questions,
      generatedQuestions: questions[0].count,
      generationStatus,
      createdAt: paper.created_at
    });

  } catch (error) {
    console.error('查询生成状态失败:', error);
    res.status(500).json({ error: '查询生成状态失败' });
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

// 查看试卷 (HTML页面)
router.get('/:id/view', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 获取试卷信息
    const papers = await executeQuery(`
      SELECT 
        p.*,
        c.name as course_name,
        c.code as course_code,
        u.username as creator_name
      FROM generated_papers p
      JOIN courses c ON p.course_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ? AND (p.is_public = TRUE OR p.created_by = ?)
    `, [id, userId || 0]);

    if (papers.length === 0) {
      return res.status(404).json({ error: '试卷不存在或无权访问' });
    }

    const paper = papers[0];

    // 获取题目
    const questions = await executeQuery(`
      SELECT * FROM paper_questions 
      WHERE paper_id = ? 
      ORDER BY question_number ASC
    `, [id]);

    // 增加查看计数
    await executeQuery(
      'UPDATE generated_papers SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );

    // 生成HTML页面
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${paper.title} - 试卷预览</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .paper-container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .paper-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .paper-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .paper-info {
            color: #666;
            font-size: 14px;
        }
        .question {
            margin-bottom: 25px;
            padding: 15px;
            border-left: 4px solid #007bff;
            background-color: #f8f9fa;
        }
        .question-header {
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        .question-text {
            margin-bottom: 15px;
            font-size: 16px;
        }
        .options {
            list-style: none;
            padding: 0;
        }
        .options li {
            margin-bottom: 8px;
            padding: 8px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .answer-section {
            margin-top: 15px;
            padding: 10px;
            background-color: #e7f3ff;
            border-radius: 4px;
        }
        .correct-answer {
            font-weight: bold;
            color: #28a745;
        }
        .explanation {
            margin-top: 8px;
            color: #666;
            font-style: italic;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
        @media print {
            .print-button {
                display: none;
            }
            body {
                background: white;
            }
            .paper-container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">打印试卷</button>
    <div class="paper-container">
        <div class="paper-header">
            <div class="paper-title">${paper.title}</div>
            <div class="paper-info">
                课程：${paper.course_name} | 
                难度：${paper.difficulty} | 
                总分：${paper.total_points || questions.reduce((sum, q) => sum + (q.points || 0), 0)}分 |
                创建时间：${new Date(paper.created_at).toLocaleDateString()}
            </div>
        </div>
        
        ${questions.map((question, index) => `
            <div class="question">
                <div class="question-header">
                    第${question.question_number}题 (${question.points || 0}分) - ${question.question_type === 'multiple_choice' ? '单选题' : 
                      question.question_type === 'multiple_select' ? '多选题' : 
                      question.question_type === 'true_false' ? '判断题' : '简答题'}
                </div>
                <div class="question-text">${question.question_text}</div>
                
                ${question.options ? `
                    <ul class="options">
                        ${JSON.parse(question.options).map((option, i) => 
                          `<li>${String.fromCharCode(65 + i)}. ${option}</li>`
                        ).join('')}
                    </ul>
                ` : ''}
                
                <div class="answer-section">
                    <div class="correct-answer">正确答案：${question.correct_answer}</div>
                    ${question.explanation ? `<div class="explanation">解析：${question.explanation}</div>` : ''}
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);

  } catch (error) {
    console.error('查看试卷失败:', error);
    res.status(500).json({ error: '查看试卷失败' });
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