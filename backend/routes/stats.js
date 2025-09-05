const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// 获取系统总体统计
router.get('/overview', optionalAuth, async (req, res) => {
  try {
    const stats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
        (SELECT COUNT(*) FROM courses) as total_courses,
        (SELECT COUNT(*) FROM materials WHERE is_public = TRUE) as total_materials,
        (SELECT COUNT(*) FROM generated_papers WHERE is_public = TRUE) as total_papers,
        (SELECT SUM(download_count) FROM materials WHERE is_public = TRUE) as total_downloads,
        (SELECT COUNT(DISTINCT course_id) FROM user_progress) as active_courses
    `);

    // 获取今日统计
    const todayStats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) as new_users_today,
        (SELECT COUNT(*) FROM materials WHERE DATE(created_at) = CURDATE()) as new_materials_today,
        (SELECT COUNT(*) FROM generated_papers WHERE DATE(created_at) = CURDATE()) as new_papers_today,
        (SELECT COUNT(*) FROM download_logs WHERE DATE(downloaded_at) = CURDATE()) as downloads_today
    `);

    // 获取热门课程（按活跃度）
    const popularCourses = await executeQuery(`
      SELECT 
        c.name,
        c.code,
        COUNT(DISTINCT up.user_id) as enrolled_users,
        COUNT(DISTINCT m.id) as materials_count,
        COUNT(DISTINCT p.id) as papers_count
      FROM courses c
      LEFT JOIN user_progress up ON c.id = up.course_id
      LEFT JOIN materials m ON c.id = m.course_id AND m.is_public = TRUE
      LEFT JOIN generated_papers p ON c.id = p.course_id AND p.is_public = TRUE
      GROUP BY c.id
      ORDER BY enrolled_users DESC, materials_count DESC
      LIMIT 5
    `);

    res.json({
      overview: stats[0],
      today: todayStats[0],
      popularCourses
    });

  } catch (error) {
    console.error('获取系统统计失败:', error);
    res.status(500).json({ error: '获取系统统计失败' });
  }
});

// 获取用户活动统计
router.get('/user-activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '7d' } = req.query;

    let dateCondition;
    switch (period) {
      case '24h':
        dateCondition = 'DATE(created_at) = CURDATE()';
        break;
      case '7d':
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
      default:
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    // 获取用户在指定期间的活动统计
    const activityStats = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN table_name = 'materials' THEN 1 END) as materials_uploaded,
        COUNT(CASE WHEN table_name = 'papers' THEN 1 END) as papers_created,
        COUNT(CASE WHEN table_name = 'downloads' THEN 1 END) as downloads_made
      FROM (
        SELECT created_at, 'materials' as table_name FROM materials WHERE uploaded_by = ? AND ${dateCondition}
        UNION ALL
        SELECT created_at, 'papers' as table_name FROM generated_papers WHERE created_by = ? AND ${dateCondition}
        UNION ALL
        SELECT downloaded_at as created_at, 'downloads' as table_name FROM download_logs WHERE user_id = ? AND ${dateCondition.replace('created_at', 'downloaded_at')}
      ) as activities
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [userId, userId, userId]);

    // 获取学习时间统计
    const studyTimeStats = await executeQuery(`
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
      ORDER BY up.last_activity DESC
    `, [userId]);

    res.json({
      period,
      activityStats,
      studyTimeStats
    });

  } catch (error) {
    console.error('获取用户活动统计失败:', error);
    res.status(500).json({ error: '获取用户活动统计失败' });
  }
});

// 获取课程统计详情
router.get('/course/:courseId', optionalAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { period = '30d' } = req.query;

    // 验证课程是否存在
    const course = await executeQuery('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (course.length === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }

    let dateCondition;
    switch (period) {
      case '7d':
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
      default:
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    // 获取课程基本统计
    const courseStats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM materials WHERE course_id = ? AND is_public = TRUE) as total_materials,
        (SELECT COUNT(*) FROM generated_papers WHERE course_id = ? AND is_public = TRUE) as total_papers,
        (SELECT COUNT(DISTINCT user_id) FROM user_progress WHERE course_id = ?) as enrolled_users,
        (SELECT SUM(download_count) FROM materials WHERE course_id = ?) as total_downloads,
        (SELECT AVG(rating) FROM user_ratings ur JOIN materials m ON ur.item_id = m.id WHERE ur.item_type = 'material' AND m.course_id = ?) as avg_material_rating,
        (SELECT AVG(rating) FROM user_ratings ur JOIN generated_papers p ON ur.item_id = p.id WHERE ur.item_type = 'paper' AND p.course_id = ?) as avg_paper_rating
    `, [courseId, courseId, courseId, courseId, courseId, courseId]);

    // 获取时间趋势数据
    const trendData = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN table_type = 'material' THEN 1 END) as materials_count,
        COUNT(CASE WHEN table_type = 'paper' THEN 1 END) as papers_count
      FROM (
        SELECT created_at, 'material' as table_type FROM materials WHERE course_id = ? AND ${dateCondition}
        UNION ALL
        SELECT created_at, 'paper' as table_type FROM generated_papers WHERE course_id = ? AND ${dateCondition}
      ) as course_activities
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [courseId, courseId]);

    // 获取最活跃的用户
    const activeUsers = await executeQuery(`
      SELECT 
        u.username,
        u.full_name,
        COUNT(DISTINCT m.id) as materials_uploaded,
        COUNT(DISTINCT p.id) as papers_created,
        up.total_study_time,
        up.last_activity
      FROM users u
      LEFT JOIN materials m ON u.id = m.uploaded_by AND m.course_id = ?
      LEFT JOIN generated_papers p ON u.id = p.created_by AND p.course_id = ?
      LEFT JOIN user_progress up ON u.id = up.user_id AND up.course_id = ?
      WHERE (m.id IS NOT NULL OR p.id IS NOT NULL OR up.id IS NOT NULL)
      GROUP BY u.id
      ORDER BY (COUNT(DISTINCT m.id) + COUNT(DISTINCT p.id) + COALESCE(up.total_study_time, 0) / 60) DESC
      LIMIT 10
    `, [courseId, courseId, courseId]);

    // 获取资料类型分布
    const materialTypeDistribution = await executeQuery(`
      SELECT 
        material_type,
        COUNT(*) as count,
        AVG(download_count) as avg_downloads
      FROM materials 
      WHERE course_id = ? AND is_public = TRUE
      GROUP BY material_type
      ORDER BY count DESC
    `, [courseId]);

    res.json({
      course: course[0],
      period,
      stats: courseStats[0],
      trendData,
      activeUsers,
      materialTypeDistribution
    });

  } catch (error) {
    console.error('获取课程统计失败:', error);
    res.status(500).json({ error: '获取课程统计失败' });
  }
});

// 获取下载统计
router.get('/downloads', authenticateToken, async (req, res) => {
  try {
    const { period = '30d', type = 'all' } = req.query;

    let dateCondition;
    switch (period) {
      case '24h':
        dateCondition = 'DATE(downloaded_at) = CURDATE()';
        break;
      case '7d':
        dateCondition = 'downloaded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateCondition = 'downloaded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      default:
        dateCondition = 'downloaded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    let typeCondition = '';
    if (type !== 'all') {
      typeCondition = `AND dl.item_type = '${type}'`;
    }

    // 获取下载趋势
    const downloadTrends = await executeQuery(`
      SELECT 
        DATE(dl.downloaded_at) as date,
        COUNT(CASE WHEN dl.item_type = 'material' THEN 1 END) as material_downloads,
        COUNT(CASE WHEN dl.item_type = 'paper' THEN 1 END) as paper_downloads,
        COUNT(*) as total_downloads
      FROM download_logs dl
      WHERE ${dateCondition} ${typeCondition}
      GROUP BY DATE(dl.downloaded_at)
      ORDER BY date ASC
    `);

    // 获取热门下载项目
    const popularItems = await executeQuery(`
      SELECT 
        dl.item_type,
        dl.item_id,
        COUNT(*) as download_count,
        CASE 
          WHEN dl.item_type = 'material' THEN m.title
          WHEN dl.item_type = 'paper' THEN p.title
        END as item_title,
        CASE 
          WHEN dl.item_type = 'material' THEN c1.name
          WHEN dl.item_type = 'paper' THEN c2.name
        END as course_name
      FROM download_logs dl
      LEFT JOIN materials m ON dl.item_type = 'material' AND dl.item_id = m.id
      LEFT JOIN courses c1 ON m.course_id = c1.id
      LEFT JOIN generated_papers p ON dl.item_type = 'paper' AND dl.item_id = p.id
      LEFT JOIN courses c2 ON p.course_id = c2.id
      WHERE ${dateCondition} ${typeCondition}
      GROUP BY dl.item_type, dl.item_id
      ORDER BY download_count DESC
      LIMIT 10
    `);

    res.json({
      period,
      type,
      downloadTrends,
      popularItems
    });

  } catch (error) {
    console.error('获取下载统计失败:', error);
    res.status(500).json({ error: '获取下载统计失败' });
  }
});

// 获取评分统计
router.get('/ratings', optionalAuth, async (req, res) => {
  try {
    const { courseId, type = 'all' } = req.query;

    let baseQuery = `
      SELECT 
        ur.rating,
        COUNT(*) as count,
        ur.item_type,
        AVG(ur.rating) as avg_rating
      FROM user_ratings ur
    `;

    const params = [];
    const conditions = [];

    if (type !== 'all') {
      conditions.push('ur.item_type = ?');
      params.push(type);
    }

    if (courseId) {
      baseQuery += `
        LEFT JOIN materials m ON ur.item_type = 'material' AND ur.item_id = m.id
        LEFT JOIN generated_papers p ON ur.item_type = 'paper' AND ur.item_id = p.id
      `;
      conditions.push('(m.course_id = ? OR p.course_id = ?)');
      params.push(courseId, courseId);
    }

    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    baseQuery += ` GROUP BY ur.rating, ur.item_type ORDER BY ur.rating DESC`;

    const ratingDistribution = await executeQuery(baseQuery, params);

    // 获取评分趋势
    const ratingTrends = await executeQuery(`
      SELECT 
        DATE(ur.created_at) as date,
        AVG(ur.rating) as avg_rating,
        COUNT(*) as rating_count
      FROM user_ratings ur
      ${courseId ? `
        LEFT JOIN materials m ON ur.item_type = 'material' AND ur.item_id = m.id
        LEFT JOIN generated_papers p ON ur.item_type = 'paper' AND ur.item_id = p.id
      ` : ''}
      WHERE ur.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ${type !== 'all' ? 'AND ur.item_type = ?' : ''}
      ${courseId ? 'AND (m.course_id = ? OR p.course_id = ?)' : ''}
      GROUP BY DATE(ur.created_at)
      ORDER BY date ASC
    `, [
      ...(type !== 'all' ? [type] : []),
      ...(courseId ? [courseId, courseId] : [])
    ]);

    res.json({
      ratingDistribution,
      ratingTrends
    });

  } catch (error) {
    console.error('获取评分统计失败:', error);
    res.status(500).json({ error: '获取评分统计失败' });
  }
});

// 管理员：获取详细系统统计
router.get('/admin/detailed', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 获取用户统计
    const userStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
        COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_week,
        COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_month
      FROM users
    `);

    // 获取内容统计
    const contentStats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM courses) as total_courses,
        (SELECT COUNT(*) FROM materials) as total_materials,
        (SELECT COUNT(*) FROM generated_papers) as total_papers,
        (SELECT COUNT(*) FROM paper_questions) as total_questions,
        (SELECT SUM(file_size) FROM materials) as total_storage_used
    `);

    // 获取活动统计
    const activityStats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM download_logs WHERE DATE(downloaded_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as downloads_week,
        (SELECT COUNT(*) FROM user_ratings WHERE DATE(created_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as ratings_week,
        (SELECT COUNT(*) FROM user_favorites WHERE DATE(created_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as favorites_week
    `);

    // 获取存储统计
    const storageStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size,
        AVG(file_size) as avg_file_size,
        SUM(reference_count) as total_references
      FROM file_storage
    `);

    // 获取热门内容
    const popularContent = await executeQuery(`
      SELECT 
        'material' as type,
        m.title,
        c.name as course_name,
        m.download_count as popularity_score
      FROM materials m
      JOIN courses c ON m.course_id = c.id
      WHERE m.is_public = TRUE
      ORDER BY m.download_count DESC
      LIMIT 5
      
      UNION ALL
      
      SELECT 
        'paper' as type,
        p.title,
        c.name as course_name,
        (p.download_count + p.like_count * 2) as popularity_score
      FROM generated_papers p
      JOIN courses c ON p.course_id = c.id
      WHERE p.is_public = TRUE
      ORDER BY popularity_score DESC
      LIMIT 5
    `);

    // 获取系统性能指标
    const performanceStats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM download_logs WHERE downloaded_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as downloads_last_hour,
        (SELECT COUNT(*) FROM users WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as active_users_last_hour,
        (SELECT AVG(file_size) FROM materials WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as avg_upload_size_24h
    `);

    res.json({
      userStats: userStats[0],
      contentStats: contentStats[0],
      activityStats: activityStats[0],
      storageStats: storageStats[0],
      popularContent,
      performanceStats: performanceStats[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取详细系统统计失败:', error);
    res.status(500).json({ error: '获取详细系统统计失败' });
  }
});

// 获取实时统计（WebSocket或定期轮询使用）
router.get('/realtime', optionalAuth, async (req, res) => {
  try {
    const realtimeStats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)) as active_users_5min,
        (SELECT COUNT(*) FROM download_logs WHERE downloaded_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)) as downloads_5min,
        (SELECT COUNT(*) FROM materials WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as uploads_1hour,
        (SELECT COUNT(*) FROM generated_papers WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as papers_1hour
    `);

    res.json({
      ...realtimeStats[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取实时统计失败:', error);
    res.status(500).json({ error: '获取实时统计失败' });
  }
});

module.exports = router;