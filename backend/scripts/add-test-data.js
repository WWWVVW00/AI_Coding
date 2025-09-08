#!/usr/bin/env node

/**
 * 添加测试数据到数据库
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'admin123456',
  database: 'study_assistant'
};

async function addTestData() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 1. 添加测试用户
    console.log('👤 添加测试用户...');
    const userResult = await connection.execute(`
      INSERT IGNORE INTO users (username, email, password_hash, full_name, department) 
      VALUES ('testuser', 'test@example.com', '$2a$10$hash', '测试用户', '计算机科学')
    `);
    
    let userId = userResult[0].insertId;
    if (!userId) {
      // 用户已存在，获取用户ID
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE username = ?', ['testuser']
      );
      userId = existingUsers[0]?.id;
    }
    
    console.log(`✅ 用户ID: ${userId}`);
    
    // 2. 添加测试课程
    console.log('📚 添加测试课程...');
    const courseResult = await connection.execute(`
      INSERT IGNORE INTO courses (name, code, department, description, credits, instructor, created_by) 
      VALUES ('人工智能基础', 'CS101', '计算机科学', '介绍人工智能的基本概念和技术', 3, '张教授', ?)
    `, [userId]);
    
    let courseId = courseResult[0].insertId;
    if (!courseId) {
      // 课程已存在，获取课程ID
      const [existingCourses] = await connection.execute(
        'SELECT id FROM courses WHERE code = ?', ['CS101']
      );
      courseId = existingCourses[0]?.id;
    }
    
    console.log(`✅ 课程ID: ${courseId}`);
    
    // 3. 添加测试学习资料
    console.log('📄 添加测试学习资料...');
    const materials = [
      {
        title: '人工智能导论PPT',
        description: '第一章：人工智能概述',
        file_name: 'ai_intro.ppt',
        file_path: './uploads/materials/ai_intro.ppt',
        file_size: 1024000,
        file_type: 'application/vnd.ms-powerpoint',
        material_type: 'lecture'
      },
      {
        title: '机器学习基础',
        description: '机器学习的基本概念和算法',
        file_name: 'ml_basics.pdf',
        file_path: './uploads/materials/ml_basics.pdf',
        file_size: 2048000,
        file_type: 'application/pdf',
        material_type: 'lecture'
      },
      {
        title: '深度学习实践',
        description: '神经网络和深度学习实例',
        file_name: 'dl_practice.docx',
        file_path: './uploads/materials/dl_practice.docx',
        file_size: 512000,
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        material_type: 'notes'
      }
    ];
    
    for (const material of materials) {
      await connection.execute(`
        INSERT IGNORE INTO materials (
          course_id, uploaded_by, title, description, file_name, file_path, 
          file_size, file_type, material_type, is_public
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `, [
        courseId, userId, material.title, material.description, 
        material.file_name, material.file_path, material.file_size, 
        material.file_type, material.material_type
      ]);
    }
    
    console.log(`✅ 已添加 ${materials.length} 个学习资料`);
    
    // 4. 验证数据
    const [materialCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM materials WHERE course_id = ?', [courseId]
    );
    
    const [courseInfo] = await connection.execute(
      'SELECT * FROM courses WHERE id = ?', [courseId]
    );
    
    console.log('\n📊 数据验证:');
    console.log(`课程: ${courseInfo[0].name} (${courseInfo[0].code})`);
    console.log(`学习资料数量: ${materialCount[0].count}`);
    
    console.log('\n🎉 测试数据添加完成！');
    console.log('现在你可以:');
    console.log('1. 访问 http://localhost');
    console.log('2. 登录系统 (username: testuser, password: 任意密码)');
    console.log('3. 选择"人工智能基础"课程');
    console.log('4. 在课程详情页查看学习资料');
    console.log('5. 配置试卷生成参数并测试AI生成功能');
    
  } catch (error) {
    console.error('❌ 添加测试数据失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('提示: 请确保MySQL数据库正在运行');
      console.log('Docker命令: docker-compose up database -d');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行脚本
addTestData();
