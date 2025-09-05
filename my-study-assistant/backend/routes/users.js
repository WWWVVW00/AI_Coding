const express = require('express');
const router = express.Router();
const { executeQuery, buildPaginationQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRating } = require('../middleware/validation');

// 获取用户的学习进度
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const progress = await executeQuery(`
      SELECT 
        up.*,
        c.name as course_name,
        c.code as course_code,
        c.department,
        COUNT(DISTINCT m.id) as available_materials,
        COUNT(DISTINCT p.id) as available_papers
      FROM user_progress up
      JOIN courses c ON up.course_id = c.id
      LEFT JOIN materials m ON c.id = m.course_id AND m.is_public = TRUE
      LEFT JOIN generated_papers p ON c.id = p.course_id AND p.is_public = TRUE
      WHERE up.user_id = ?
      GROUP BY up.id, c.id
      ORDER BY up.last_activity DESC
    `, [userId]);

    res.json({ progress });

  } catch (error) {
    console.error('获取学习进度失败:', error);
    res.status(500).json({ error: '获取学习进度失败' });
  }
});

// 更新学习进度
router.put('/progress/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { materialsViewed, papersCompleted, studyTime } = req.body;
    const userId = req.user.id;

    // 验证课程是否存在
    const course = await executeQuery('SELECT id FROM courses WHERE id = ?', [courseId]);
    if (course.length === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }

    // 检查是否已有进度记录
    const existingProgress = await executeQuery(
      'SELECT id FROM user_progress WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existingProgress.length > 0) {
      // 更新现有记录
      await executeQuery(`
        UPDATE user_progress SET
          materials_viewed = COALESCE(?, materials_viewed),
          papers_completed = COALESCE(?, papers_completed),
          total_study_time = total_study_time + COALESCE(?, 0),
          last_activity = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND course_id = ?
      `, [materialsViewed, papersCompleted, studyTime, userId, courseId]);
    } else {
      // 创建新记录
      await executeQuery(`
        INSERT INTO user_progress (
          user_id, course_id, materials_viewed, papers_completed, 
          total_study_time, last_activity
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        userId, 
        courseId, 
        materialsViewed || 0, 
        papersCompleted || 0, 
        studyTime || 0
      ]);
    }

    // 获取更新后的进度
    const updatedProgress = await executeQuery(`
      SELECT 
        up.*,
        c.name as course_name,
        c.code as course_code
      FROM user_progress up
      JOIN courses c ON up.course_id = c.id
      WHERE up.user_id = ? AND up.course_id = ?
    `, [userId, courseId]);

    res.json({
      message: '学习进度更新成功',
      progress: updatedProgress[0]
    });

  } catch (error) {
    console.error('更新学习进度失败:', error);
    res.status(500).json({ error: '更新学习进度失败' });
  }
});

// 获取用户收藏
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'all', page = 1, limit = 20 } = req.query;

    let query = `
      SELECT 
        uf.*,
        CASE 
          WHEN uf.item_type = 'material' THEN m.title
          WHEN uf.item_type = 'paper' THEN p.title
          WHEN uf.item_type = 'course' THEN c.name
        END as item_title,
        CASE 
          WHEN uf.item_type = 'material' THEN mc.name
          WHEN uf.item_type = 'paper' THEN pc.name
          WHEN uf.item_type = 'course' THEN c.name
        END as course_name,
        CASE 
          WHEN uf.item_type = 'material' THEN mc.code
          WHEN uf.item_type = 'paper' THEN pc.code
          WHEN uf.item_type = 'course' THEN c.code
        END as course_code
      FROM user_favorites uf
      LEFT JOIN materials m ON uf.item_type = 'material' AND uf.item_id = m.id
      LEFT JOIN courses mc ON m.course_id = mc.id
      LEFT JOIN generated_papers p ON uf.item_type = 'paper' AND uf.item_id = p.id
      LEFT JOIN courses pc ON p.course_id = pc.id
      LEFT JOIN courses c ON uf.item_type = 'course' AND uf.item_id = c.id
      WHERE uf.user_id = ?
    `;

    const params = [userId];

    if (type !== 'all') {
      query += ` AND uf.item_type = ?`;
      params.push(type);
    }

    const paginatedQuery = buildPaginationQuery(
      query, 
      parseInt(page), 
      parseInt(limit), 
      'uf.created_at DESC'
    );

    const favorites = await executeQuery(paginatedQuery, params);

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_favorites
      WHERE user_id = ?
      ${type !== 'all' ? 'AND item_type = ?' : ''}
    `;

    const countParams = [userId];
    if (type !== 'all') countParams.push(type);

    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      favorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取用户收藏失败:', error);
    res.status(500).json({ error: '获取用户收藏失败' });
  }
});

// 添加/移除收藏
router.post('/favorites', authenticateToken, async (req, res) => {
  try {
    const { itemType, itemId } = req.body;
    const userId = req.user.id;

    if (!['material', 'paper', 'course'].includes(itemType)) {
      return res.status(400).json({ error: '无效的收藏类型' });
    }

    // 验证项目是否存在
    let tableName;
    switch (itemType) {
      case 'material':
        tableName = 'materials';
        break;
      case 'paper':
        tableName = 'generated_papers';
        break;
      case 'course':
        tableName = 'courses';
        break;
    }

    const item = await executeQuery(`SELECT id FROM ${tableName} WHERE id = ?`, [itemId]);
    if (item.length === 0) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 检查是否已收藏
    const existingFavorite = await executeQuery(
      'SELECT id FROM user_favorites WHERE user_id = ? AND item_type = ? AND item_id = ?',
      [userId, itemType, itemId]
    );

    if (existingFavorite.length > 0) {
      // 移除收藏
      await executeQuery(
        'DELETE FROM user_favorites WHERE user_id = ? AND item_type = ? AND item_id = ?',
        [userId, itemType, itemId]
      );

      res.json({ message: '取消收藏成功', favorited: false });
    } else {
      // 添加收藏
      await executeQuery(
        'INSERT INTO user_favorites (user_id, item_type, item_id) VALUES (?, ?, ?)',
        [userId, itemType, itemId]
      );

      res.json({ message: '收藏成功', favorited: true });
    }

  } catch (error) {
    console.error('收藏操作失败:', error);
    res.status(500).json({ error: '收藏操作失败' });
  }
});

// 提交评分
router.post('/ratings', authenticateToken, validateRating, async (req, res) => {
  try {
    const { itemType, itemId, rating, review } = req.body;
    const userId = req.user.id;

    // 验证项目是否存在
    let tableName = itemType === 'material' ? 'materials' : 'generated_papers';
    const item = await executeQuery(`SELECT id FROM ${tableName} WHERE id = ?`, [itemId]);
    if (item.length === 0) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 检查是否已评分
    const existingRating = await executeQuery(
      'SELECT id FROM user_ratings WHERE user_id = ? AND item_type = ? AND item_id = ?',
      [userId, itemType, itemId]
    );

    if (existingRating.length > 0) {
      // 更新评分
      await executeQuery(`
        UPDATE user_ratings SET
          rating = ?, review = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND item_type = ? AND item_id = ?
      `, [rating, review, userId, itemType, itemId]);

      res.json({ message: '评分更新成功' });
    } else {
      // 新增评分
      await executeQuery(`
        INSERT INTO user_ratings (user_id, item_type, item_id, rating, review)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, itemType, itemId, rating, review]);

      res.json({ message: '评分提交成功' });
    }

  } catch (error) {
    console.error('提交评分失败:', error);
    res.status(500).json({ error: '提交评分失败' });
  }
});

// 获取用户的评分记录
router.get('/ratings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const query = `
      SELECT 
        ur.*,
        CASE 
          WHEN ur.item_type = 'material' THEN m.title
          WHEN ur.item_type = 'paper' THEN p.title
        END as item_title,
        CASE 
          WHEN ur.item_type = 'material' THEN c1.name
          WHEN ur.item_type = 'paper' THEN c2.name
        END as course_name
      FROM user_ratings ur
      LEFT JOIN materials m ON ur.item_type = 'material' AND ur.item_id = m.id
      LEFT JOIN courses c1 ON m.course_id = c1.id
      LEFT JOIN generated_papers p ON ur.item_type = 'paper' AND ur.item_id = p.id
      LEFT JOIN courses c2 ON p.course_id = c2.id
      WHERE ur.user_id = ?
    `;

    const paginatedQuery = buildPaginationQuery(
      query, 
      parseInt(page), 
      parseInt(limit), 
      'ur.updated_at DESC'
    );

    const ratings = await executeQuery(paginatedQuery, [userId]);

    // 获取总数
    const [{ total }] = await executeQuery(
      'SELECT COUNT(*) as total FROM user_ratings WHERE user_id = ?',
      [userId]
    );

    res.json({
      ratings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取评分记录失败:', error);
    res.status(500).json({ error: '获取评分记录失败' });
  }
});

// 获取用户统计信息
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM materials WHERE uploaded_by = ?) as uploaded_materials,
        (SELECT COUNT(*) FROM generated_papers WHERE created_by = ?) as created_papers,
        (SELECT COUNT(*) FROM courses WHERE created_by = ?) as created_courses,
        (SELECT COUNT(DISTINCT course_id) FROM user_progress WHERE user_id = ?) as enrolled_courses,
        (SELECT COUNT(*) FROM user_favorites WHERE user_id = ?) as total_favorites,
        (SELECT COUNT(*) FROM user_ratings WHERE user_id = ?) as total_ratings,
        (SELECT SUM(total_study_time) FROM user_progress WHERE user_id = ?) as total_study_time,
        (SELECT SUM(download_count) FROM materials WHERE uploaded_by = ?) as total_downloads
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);

    // 获取最近活动
    const recentActivity = await executeQuery(`
      SELECT 
        'material' as type,
        m.title as title,
        c.name as course_name,
        m.created_at as activity_time
      FROM materials m
      JOIN courses c ON m.course_id = c.id
      WHERE m.uploaded_by = ?
      
      UNION ALL
      
      SELECT 
        'paper' as type,
        p.title as title,
        c.name as course_name,
        p.created_at as activity_time
      FROM generated_papers p
      JOIN courses c ON p.course_id = c.id
      WHERE p.created_by = ?
      
      ORDER BY activity_time DESC
      LIMIT 10
    `, [userId, userId]);

    // 获取学习时间统计（按课程）
    const studyTimeByCourse = await executeQuery(`
      SELECT 
        c.name as course_name,
        c.code as course_code,
        up.total_study_time,
        up.materials_viewed,
        up.papers_completed,
        up.last_activity
      FROM user_progress up
      JOIN courses c ON up.course_id = c.id
      WHERE up.user_id = ?
      ORDER BY up.total_study_time DESC
      LIMIT 5
    `, [userId]);

    res.json({
      stats: stats[0],
      recentActivity,
      studyTimeByourse: studyTimeByourse
    });

  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({ error: '获取用户统计失败' });
  }
});

// 获取用户排行榜
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'study_time', limit = 10 } = req.query;

    let query;
    switch (type) {
      case 'study_time':
        query = `
          SELECT 
            u.username,
            u.full_name,
            SUM(up.total_study_time) as total_study_time,
            COUNT(DISTINCT up.course_id) as courses_count
          FROM users u
          JOIN user_progress up ON u.id = up.user_id
          WHERE u.is_active = TRUE
          GROUP BY u.id
          ORDER BY total_study_time DESC
          LIMIT ?
        `;
        break;
      
      case 'materials':
        query = `
          SELECT 
            u.username,
            u.full_name,
            COUNT(m.id) as materials_count,
            SUM(m.download_count) as total_downloads
          FROM users u
          JOIN materials m ON u.id = m.uploaded_by
          WHERE u.is_active = TRUE AND m.is_public = TRUE
          GROUP BY u.id
          ORDER BY materials_count DESC
          LIMIT ?
        `;
        break;
      
      case 'papers':
        query = `
          SELECT 
            u.username,
            u.full_name,
            COUNT(p.id) as papers_count,
            SUM(p.download_count) as total_downloads,
            SUM(p.like_count) as total_likes
          FROM users u
          JOIN generated_papers p ON u.id = p.created_by
          WHERE u.is_active = TRUE AND p.is_public = TRUE
          GROUP BY u.id
          ORDER BY papers_count DESC
          LIMIT ?
        `;
        break;
      
      default:
        return res.status(400).json({ error: '无效的排行榜类型' });
    }

    const leaderboard = await executeQuery(query, [parseInt(limit)]);

    res.json({
      type,
      leaderboard
    });

  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

// 管理员：获取所有用户列表
router.get('/admin/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;

    let baseQuery = `
      SELECT 
        u.*,
        COUNT(DISTINCT m.id) as materials_count,
        COUNT(DISTINCT p.id) as papers_count,
        COUNT(DISTINCT c.id) as courses_count
      FROM users u
      LEFT JOIN materials m ON u.id = m.uploaded_by
      LEFT JOIN generated_papers p ON u.id = p.created_by
      LEFT JOIN courses c ON u.id = c.created_by
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      baseQuery += ` AND (u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status === 'active') {
      baseQuery += ` AND u.is_active = TRUE`;
    } else if (status === 'inactive') {
      baseQuery += ` AND u.is_active = FALSE`;
    }

    baseQuery += ` GROUP BY u.id`;

    const paginatedQuery = buildPaginationQuery(
      baseQuery, 
      parseInt(page), 
      parseInt(limit), 
      'u.created_at DESC'
    );

    const users = await executeQuery(paginatedQuery, params);

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE 1=1
      ${search ? `AND (u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)` : ''}
      ${status === 'active' ? 'AND u.is_active = TRUE' : ''}
      ${status === 'inactive' ? 'AND u.is_active = FALSE' : ''}
    `;

    const countParams = [];
    if (search) {
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 管理员：禁用/启用用户
router.put('/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await executeQuery('SELECT id, username FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    await executeQuery(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive, id]
    );

    res.json({
      message: `用户${isActive ? '启用' : '禁用'}成功`,
      username: user[0].username
    });

  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({ error: '更新用户状态失败' });
  }
});

module.exports = router;