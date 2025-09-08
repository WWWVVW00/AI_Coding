const express = require('express');
const router = express.Router();
const { executeQuery, executeTransaction, buildPaginationQuery, buildSearchConditions } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validatePaperGeneration, validateQuestion } = require('../middleware/validation');

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
    const course = await executeQuery('SELECT id FROM courses WHERE id = ?', [courseId]);
    if (course.length === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }

    // 验证源资料是否存在（如果提供了）
    if (sourceMaterials && sourceMaterials.length > 0) {
      const materials = await executeQuery(
        `SELECT id FROM materials WHERE id IN (${sourceMaterials.map(() => '?').join(',')}) AND course_id = ?`,
        [...sourceMaterials, courseId]
      );

      if (materials.length !== sourceMaterials.length) {
        return res.status(400).json({ error: '部分源资料不存在或不属于该课程' });
      }
    }

    // 创建试卷记录
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
      sourceMaterials ? JSON.stringify(sourceMaterials) : null
    ]);

    const paperId = paperResult.insertId;

    // 这里应该调用AI服务生成题目，现在先生成模拟题目
    const mockQuestions = generateMockQuestions(totalQuestions, difficultyLevel || 'medium', language || 'zh');

    // 插入题目
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

    // 获取生成的试卷信息
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
      message: '试卷生成成功',
      paper: newPaper[0]
    });

  } catch (error) {
    console.error('生成试卷失败:', error);
    res.status(500).json({ error: '生成试卷失败' });
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