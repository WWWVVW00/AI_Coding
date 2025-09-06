const fs = require('fs-extra');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
  timezone: '+08:00'
};

async function createDatabase() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 创建数据库（如果不存在）
    const dbName = process.env.DB_NAME || 'study_assistant';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 ${dbName} 创建成功或已存在`);
    
    // 选择数据库 - 使用 query 而不是 execute 来避免预处理语句问题
    await connection.query(`USE \`${dbName}\``);
    
    return connection;
  } catch (error) {
    console.error('❌ 创建数据库失败:', error);
    throw error;
  }
}

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 开始数据库迁移...');
    
    // 创建数据库连接
    connection = await createDatabase();
    
    // 读取SQL文件
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    
    if (!await fs.pathExists(schemaPath)) {
      throw new Error(`SQL文件不存在: ${schemaPath}`);
    }
    
    const sqlContent = await fs.readFile(schemaPath, 'utf8');
    
    // 分割SQL语句（按分号分割，但要处理存储过程等复杂情况）
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`📄 找到 ${statements.length} 个SQL语句`);
    
    // 执行每个SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log(`✅ 执行语句 ${i + 1}/${statements.length}`);
        } catch (error) {
          // 忽略一些常见的警告（如表已存在等）
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
              error.code === 'ER_DUP_KEYNAME' ||
              error.message.includes('already exists')) {
            console.log(`⚠️  语句 ${i + 1} 跳过 (已存在): ${error.message}`);
          } else {
            console.error(`❌ 执行语句 ${i + 1} 失败:`, error.message);
            console.error(`语句内容: ${statement.substring(0, 100)}...`);
            throw error;
          }
        }
      }
    }
    
    // 插入初始数据
    await insertInitialData(connection);
    
    console.log('🎉 数据库迁移完成！');
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function insertInitialData(connection) {
  console.log('📝 插入初始数据...');
  
  try {
    // 检查是否已有数据
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    if (users[0].count > 0) {
      console.log('⚠️  数据库已有数据，跳过初始数据插入');
      return;
    }
    
    // 创建管理员用户
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123456', 12);
    
    await connection.execute(`
      INSERT INTO users (
        username, email, password_hash, full_name, 
        is_active, created_at
      ) VALUES (?, ?, ?, ?, TRUE, NOW())
    `, [
      'admin',
      'admin@study-assistant.com',
      adminPassword,
      '系统管理员'
    ]);
    
    console.log('✅ 管理员用户创建成功 (用户名: admin, 密码: admin123456)');
    
    // 创建示例课程
    const sampleCourses = [
      {
        name: '高等数学',
        code: 'MATH101',
        department: '数学系',
        description: '微积分、线性代数等数学基础课程',
        credits: 4,
        semester: 'Fall',
        year: 2024,
        instructor: '张教授',
        is_official: true
      },
      {
        name: '数据结构与算法',
        code: 'CS201',
        department: '计算机科学系',
        description: '计算机科学核心课程，涵盖各种数据结构和算法',
        credits: 3,
        semester: 'Fall',
        year: 2024,
        instructor: '李教授',
        is_official: true
      },
      {
        name: '数据库系统',
        code: 'CS301',
        department: '计算机科学系',
        description: '关系数据库理论与实践',
        credits: 3,
        semester: 'Spring',
        year: 2024,
        instructor: '王教授',
        is_official: true
      }
    ];
    
    for (const course of sampleCourses) {
      await connection.execute(`
        INSERT INTO courses (
          name, code, department, description, credits,
          semester, year, instructor, is_official, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        course.name, course.code, course.department, course.description,
        course.credits, course.semester, course.year, course.instructor,
        course.is_official
      ]);
    }
    
    console.log('✅ 示例课程创建成功');
    
    // 创建系统统计记录
    await connection.execute(`
      INSERT INTO system_stats (
        stat_date, total_users, total_courses, total_materials,
        total_papers, daily_downloads, daily_uploads, daily_paper_generations
      ) VALUES (CURDATE(), 1, 3, 0, 0, 0, 0, 0)
    `);
    
    console.log('✅ 系统统计初始化完成');
    
  } catch (error) {
    console.error('❌ 插入初始数据失败:', error);
    throw error;
  }
}

// 检查数据库连接
async function checkConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('SELECT 1');
    await connection.end();
    console.log('✅ 数据库连接测试成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.error('请检查以下配置:');
    console.error(`- 主机: ${dbConfig.host}:${dbConfig.port}`);
    console.error(`- 用户: ${dbConfig.user}`);
    console.error(`- 密码: ${dbConfig.password ? '已设置' : '未设置'}`);
    return false;
  }
}

// 重置数据库（危险操作）
async function resetDatabase() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('⚠️  确定要重置数据库吗？这将删除所有数据！(输入 "YES" 确认): ', async (answer) => {
      rl.close();
      
      if (answer === 'YES') {
        try {
          const connection = await mysql.createConnection(dbConfig);
          const dbName = process.env.DB_NAME || 'study_assistant';
          
          await connection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
          console.log('✅ 数据库已删除');
          
          await connection.end();
          
          // 重新运行迁移
          await runMigration();
          resolve();
        } catch (error) {
          console.error('❌ 重置数据库失败:', error);
          process.exit(1);
        }
      } else {
        console.log('❌ 操作已取消');
        resolve();
      }
    });
  });
}

// 命令行参数处理
const command = process.argv[2];

async function main() {
  switch (command) {
    case 'check':
      await checkConnection();
      break;
    case 'reset':
      await resetDatabase();
      break;
    case 'migrate':
    default:
      // 先检查连接
      const connected = await checkConnection();
      if (connected) {
        await runMigration();
      } else {
        console.error('❌ 请先确保数据库服务正在运行并且配置正确');
        process.exit(1);
      }
      break;
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runMigration,
  checkConnection,
  resetDatabase
};