const express = require('express');
const router = express.Router();
const { executeQuery, buildPaginationQuery, buildSearchConditions } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateCourse } = require('../middleware/validation');

// 获取所有课程（支持分页和搜索）
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      department = '', 
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    let baseQuery = `
      SELECT 
        c.*,
        u.username as creator_name,
        COUNT(DISTINCT m.id) as material_count,
        COUNT(DISTINCT p.id) as paper_count,
        AVG(ur.rating) as average_rating
      FROM courses c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN materials m ON c.id = m.course_id AND m.is_public = TRUE
      LEFT JOIN generated_papers p ON c.id = p.course_id AND p.is_public = TRUE
      LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id IN (
        SELECT id FROM materials WHERE course_id = c.id
      )
      WHERE 1=1
    `;

    const params = [];

    // 搜索条件
    if (search) {
      const searchConditions = buildSearchConditions(['c.name', 'c.code', 'c.description'], search);
      baseQuery += ` AND ${searchConditions.where}`;
      params.push(...searchConditions.params);
    }

    // 学系筛选
    if (department) {
      baseQuery += ` AND c.department = ?`;
      params.push(department);
    }

    baseQuery += ` GROUP BY c.id`;

    // 排序
    const validSorts = ['name', 'code', 'created_at', 'material_count', 'paper_count'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    // 分页查询
    const paginatedQuery = buildPaginationQuery(
      baseQuery, 
      parseInt(page), 
      parseInt(limit), 
      `${sortField} ${sortOrder}`
    );

    const courses = await executeQuery(paginatedQuery, params);

    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM courses c
      WHERE 1=1
      ${search ? `AND (c.name LIKE ? OR c.code LIKE ? OR c.description LIKE ?)` : ''}
      ${department ? `AND c.department = ?` : ''}
    `;

    const countParams = [];
    if (search) {
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (department) {
      countParams.push(department);
    }

    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取课程列表失败:', error);
    res.status(500).json({ error: '获取课程列表失败' });
  }
});

// 获取单个课程详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const courseQuery = `
      SELECT 
        c.*,
        u.username as creator_name,
        u.full_name as creator_full_name,
        COUNT(DISTINCT m.id) as material_count,
        COUNT(DISTINCT p.id) as paper_count,
        COUNT(DISTINCT up.user_id) as enrolled_users,
        AVG(ur.rating) as average_rating,
        COUNT(DISTINCT ur.id) as rating_count
      FROM courses c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN materials m ON c.id = m.course_id AND m.is_public = TRUE
      LEFT JOIN generated_papers p ON c.id = p.course_id AND p.is_public = TRUE
      LEFT JOIN user_progress up ON c.id = up.course_id
      LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id IN (
        SELECT id FROM materials WHERE course_id = c.id
      )
      WHERE c.id = ?
      GROUP BY c.id
    `;

    const courses = await executeQuery(courseQuery, [id]);
    
    if (courses.length === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }

    const course = courses[0];

    // 获取最近的学习资料
    const recentMaterials = await executeQuery(`
      SELECT 
        m.*,
        u.username as uploader_name,
        AVG(ur.rating) as average_rating
      FROM materials m
      LEFT JOIN users u ON m.uploaded_by = u.id
      LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id = m.id
      WHERE m.course_id = ? AND m.is_public = TRUE
      GROUP BY m.id
      ORDER BY m.created_at DESC
      LIMIT 5
    `, [id]);

    // 获取最近的试卷
    const recentPapers = await executeQuery(`
      SELECT 
        p.*,
        u.username as creator_name
      FROM generated_papers p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.course_id = ? AND p.is_public = TRUE
      ORDER BY p.created_at DESC
      LIMIT 5
    `, [id]);

    res.json({
      course,
      recentMaterials,
      recentPapers
    });

  } catch (error) {
    console.error('获取课程详情失败:', error);
    res.status(500).json({ error: '获取课程详情失败' });
  }
});

// 创建新课程
router.post('/', authenticateToken, validateCourse, async (req, res) => {
  try {
    const { name, code, department, description, credits, semester, year, instructor } = req.body;
    const userId = req.user.id;

    // 检查课程代码是否已存在
    const existingCourse = await executeQuery(
      'SELECT id FROM courses WHERE code = ? AND year = ? AND semester = ?',
      [code, year || new Date().getFullYear(), semester || 'Fall']
    );

    if (existingCourse.length > 0) {
      return res.status(400).json({ error: '该课程代码在此学期已存在' });
    }

    const insertQuery = `
      INSERT INTO courses (
        name, code, department, description, credits, 
        semester, year, instructor, created_by, is_official
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    `;

    const result = await executeQuery(insertQuery, [
      name,
      code.toUpperCase(),
      department || null,
      description || null,
      credits || 3,
      semester || 'Fall',
      year || new Date().getFullYear(),
      instructor || null,
      userId
    ]);

    // 获取创建的课程信息
    const newCourse = await executeQuery(
      'SELECT * FROM courses WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: '课程创建成功',
      course: newCourse[0]
    });

  } catch (error) {
    console.error('创建课程失败:', error);
    res.status(500).json({ error: '创建课程失败' });
  }
});

// 更新课程信息
router.put('/:id', authenticateToken, validateCourse, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, department, description, credits, semester, year, instructor } = req.body;
    const userId = req.user.id;

    // 检查课程是否存在且用户有权限修改
    const course = await executeQuery(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );

    if (course.length === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }

    // 只有课程创建者或管理员可以修改
    if (course[0].created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '没有权限修改此课程' });
    }

    // 检查新的课程代码是否与其他课程冲突
    if (code !== course[0].code) {
      const existingCourse = await executeQuery(
        'SELECT id FROM courses WHERE code = ? AND year = ? AND semester = ? AND id != ?',
        [code, year || course[0].year, semester || course[0].semester, id]
      );

      if (existingCourse.length > 0) {
        return res.status(400).json({ error: '该课程代码在此学期已存在' });
      }
    }

    const updateQuery = `
      UPDATE courses SET
        name = ?, code = ?, department = ?, description = ?,
        credits = ?, semester = ?, year = ?, instructor = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      name,
      code.toUpperCase(),
      department,
      description,
      credits,
      semester,
      year,
      instructor,
      id
    ]);

    // 获取更新后的课程信息
    const updatedCourse = await executeQuery(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );

    res.json({
      message: '课程更新成功',
      course: updatedCourse[0]
    });

  } catch (error) {
    console.error('更新课程失败:', error);
    res.status(500).json({ error: '更新课程失败' });
  }
});

// 删除课程
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查课程是否存在且用户有权限删除
    const course = await executeQuery(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );

    if (course.length === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }

    // 只有课程创建者或管理员可以删除
    if (course[0].created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '没有权限删除此课程' });
    }

    // 检查是否有关联的资料或试卷
    const [materialCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM materials WHERE course_id = ?',
      [id]
    );

    const [paperCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM generated_papers WHERE course_id = ?',
      [id]
    );

    if (materialCount.count > 0 || paperCount.count > 0) {
      return res.status(400).json({ 
        error: '无法删除课程',
        message: '该课程下还有学习资料或试卷，请先删除相关内容'
      });
    }

    await executeQuery('DELETE FROM courses WHERE id = ?', [id]);

    res.json({ message: '课程删除成功' });

  } catch (error) {
    console.error('删除课程失败:', error);
    res.status(500).json({ error: '删除课程失败' });
  }
});

// 获取课程统计信息
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM materials WHERE course_id = ? AND is_public = TRUE) as total_materials,
        (SELECT COUNT(*) FROM generated_papers WHERE course_id = ? AND is_public = TRUE) as total_papers,
        (SELECT COUNT(DISTINCT user_id) FROM user_progress WHERE course_id = ?) as enrolled_users,
        (SELECT COUNT(*) FROM download_logs dl 
         JOIN materials m ON dl.item_id = m.id 
         WHERE dl.item_type = 'material' AND m.course_id = ?) as total_downloads,
        (SELECT AVG(rating) FROM user_ratings ur 
         JOIN materials m ON ur.item_id = m.id 
         WHERE ur.item_type = 'material' AND m.course_id = ?) as average_rating
    `, [id, id, id, id, id]);

    // 获取最近7天的活动统计
    const weeklyStats = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        'material' as type
      FROM materials 
      WHERE course_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      
      UNION ALL
      
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        'paper' as type
      FROM generated_papers 
      WHERE course_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      
      ORDER BY date DESC
    `, [id, id]);

    res.json({
      stats: stats[0],
      weeklyActivity: weeklyStats
    });

  } catch (error) {
    console.error('获取课程统计失败:', error);
    res.status(500).json({ error: '获取课程统计失败' });
  }
});

// 获取热门课程
router.get('/popular/list', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularCourses = await executeQuery(`
      SELECT 
        c.*,
        COUNT(DISTINCT m.id) as material_count,
        COUNT(DISTINCT p.id) as paper_count,
        COUNT(DISTINCT up.user_id) as enrolled_users,
        AVG(ur.rating) as average_rating,
        COUNT(DISTINCT dl.id) as total_downloads
      FROM courses c
      LEFT JOIN materials m ON c.id = m.course_id AND m.is_public = TRUE
      LEFT JOIN generated_papers p ON c.id = p.course_id AND p.is_public = TRUE
      LEFT JOIN user_progress up ON c.id = up.course_id
      LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id IN (
        SELECT id FROM materials WHERE course_id = c.id
      )
      LEFT JOIN download_logs dl ON dl.item_type = 'material' AND dl.item_id IN (
        SELECT id FROM materials WHERE course_id = c.id
      )
      GROUP BY c.id
      ORDER BY 
        (COUNT(DISTINCT up.user_id) * 0.4 + 
         COUNT(DISTINCT dl.id) * 0.3 + 
         AVG(COALESCE(ur.rating, 0)) * 0.3) DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({ courses: popularCourses });

  } catch (error) {
    console.error('获取热门课程失败:', error);
    res.status(500).json({ error: '获取热门课程失败' });
  }
});

module.exports = router;