const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'study_assistant',
  charset: 'utf8mb4',
  timezone: '+08:00',
  
  // 连接池配置
  waitForConnections: true, // 在没有可用连接时等待，而不是立即抛出错误
  connectionLimit: 10,      // 连接池中的最大连接数
  queueLimit: 0,            // 排队请求的最大数量（0表示无限制）
  acquireTimeout: 60000,    // 获取连接的超时时间（毫秒）
  connectTimeout: 60000,     // 建立新连接的超时时间 (mysql2 使用 connectTimeout)
};
// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询的通用函数
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 执行事务
async function executeTransaction(queries) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { sql, params } of queries) {
      const [result] = await connection.execute(sql, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 分页查询辅助函数
function buildPaginationQuery(baseQuery, page = 1, limit = 20, orderBy = 'id DESC') {
  const offset = (page - 1) * limit;
  return `${baseQuery} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
}

// 构建搜索条件
function buildSearchConditions(searchFields, searchTerm) {
  if (!searchTerm || !searchFields.length) return { where: '', params: [] };
  
  const conditions = searchFields.map(field => `${field} LIKE ?`).join(' OR ');
  const params = searchFields.map(() => `%${searchTerm}%`);
  
  return {
    where: `(${conditions})`,
    params
  };
}

// 数据库健康检查
async function healthCheck() {
  try {
    const [result] = await pool.execute('SELECT 1 as health');
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
}

// 获取数据库统计信息
async function getDatabaseStats() {
  try {
    const stats = {};
    
    // 获取各表的记录数
    const tables = ['users', 'courses', 'materials', 'generated_papers', 'paper_questions'];
    
    for (const table of tables) {
      const [result] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = result[0].count;
    }
    
    // 获取今日统计
    const today = new Date().toISOString().split('T')[0];
    const [todayStats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = ?) as new_users_today,
        (SELECT COUNT(*) FROM materials WHERE DATE(created_at) = ?) as new_materials_today,
        (SELECT COUNT(*) FROM generated_papers WHERE DATE(created_at) = ?) as new_papers_today
    `, [today, today, today]);
    
    stats.today = todayStats[0];
    
    return stats;
  } catch (error) {
    console.error('获取数据库统计失败:', error);
    throw error;
  }
}

// 清理过期数据
async function cleanupExpiredData() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // 清理过期的下载日志
    await pool.execute(
      'DELETE FROM download_logs WHERE downloaded_at < ?',
      [thirtyDaysAgo]
    );
    
    // 清理未引用的文件
    await pool.execute(`
      DELETE FROM file_storage 
      WHERE reference_count = 0 
      AND created_at < ?
    `, [thirtyDaysAgo]);
    
    console.log('✅ 过期数据清理完成');
  } catch (error) {
    console.error('❌ 清理过期数据失败:', error);
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  buildPaginationQuery,
  buildSearchConditions,
  healthCheck,
  getDatabaseStats,
  cleanupExpiredData
};