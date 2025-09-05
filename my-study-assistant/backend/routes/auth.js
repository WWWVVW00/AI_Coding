const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

// 用户注册
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { username, email, password, fullName, studentId, department } = req.body;

    // 检查用户名是否已存在
    const existingUsername = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsername.length > 0) {
      return res.status(400).json({ 
        error: '用户名已存在',
        message: '该用户名已被注册，请选择其他用户名'
      });
    }

    // 检查邮箱是否已存在
    const existingEmail = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ 
        error: '邮箱已存在',
        message: '该邮箱已被注册，请使用其他邮箱或尝试登录'
      });
    }

    // 检查学号是否已存在（如果提供了学号）
    if (studentId) {
      const existingStudentId = await executeQuery(
        'SELECT id FROM users WHERE student_id = ?',
        [studentId]
      );

      if (existingStudentId.length > 0) {
        return res.status(400).json({ 
          error: '学号已存在',
          message: '该学号已被注册'
        });
      }
    }

    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const result = await executeQuery(`
      INSERT INTO users (
        username, email, password_hash, full_name, 
        student_id, department, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      username,
      email,
      passwordHash,
      fullName || null,
      studentId || null,
      department || null
    ]);

    // 获取新创建的用户信息
    const newUser = await executeQuery(
      'SELECT id, username, email, full_name, student_id, department, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    // 生成JWT令牌
    const token = generateToken(newUser[0]);

    res.status(201).json({
      message: '注册成功',
      user: {
        id: newUser[0].id,
        username: newUser[0].username,
        email: newUser[0].email,
        fullName: newUser[0].full_name,
        studentId: newUser[0].student_id,
        department: newUser[0].department,
        createdAt: newUser[0].created_at
      },
      token
    });

  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(500).json({ 
      error: '注册失败',
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 用户登录
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户（支持用户名或邮箱登录）
    const users = await executeQuery(`
      SELECT id, username, email, password_hash, full_name, 
             student_id, department, is_active, created_at
      FROM users 
      WHERE (username = ? OR email = ?) AND is_active = TRUE
    `, [username, username]);

    if (users.length === 0) {
      return res.status(401).json({ 
        error: '登录失败',
        message: '用户名/邮箱或密码错误'
      });
    }

    const user = users[0];

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: '登录失败',
        message: '用户名/邮箱或密码错误'
      });
    }

    // 更新最后登录时间
    await executeQuery(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [user.id]
    );

    // 生成JWT令牌
    const token = generateToken(user);

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        studentId: user.student_id,
        department: user.department,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({ 
      error: '登录失败',
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const users = await executeQuery(`
      SELECT 
        id, username, email, full_name, student_id, 
        department, avatar_url, created_at, updated_at
      FROM users 
      WHERE id = ? AND is_active = TRUE
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ 
        error: '用户不存在',
        message: '用户账户不存在或已被禁用'
      });
    }

    const user = users[0];

    // 获取用户统计信息
    const stats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM materials WHERE uploaded_by = ?) as uploaded_materials,
        (SELECT COUNT(*) FROM generated_papers WHERE created_by = ?) as created_papers,
        (SELECT COUNT(*) FROM courses WHERE created_by = ?) as created_courses,
        (SELECT COUNT(DISTINCT course_id) FROM user_progress WHERE user_id = ?) as enrolled_courses
    `, [userId, userId, userId, userId]);

    res.json({
      user: {
        ...user,
        stats: stats[0]
      }
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ 
      error: '获取用户信息失败',
      message: '服务器内部错误'
    });
  }
});

// 更新用户信息
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, studentId, department } = req.body;

    // 验证输入
    if (fullName && (fullName.length < 2 || fullName.length > 100)) {
      return res.status(400).json({ 
        error: '姓名长度必须在2-100个字符之间'
      });
    }

    if (studentId && studentId.length > 20) {
      return res.status(400).json({ 
        error: '学号不能超过20个字符'
      });
    }

    if (department && department.length > 100) {
      return res.status(400).json({ 
        error: '学系名称不能超过100个字符'
      });
    }

    // 检查学号是否被其他用户使用
    if (studentId) {
      const existingStudentId = await executeQuery(
        'SELECT id FROM users WHERE student_id = ? AND id != ?',
        [studentId, userId]
      );

      if (existingStudentId.length > 0) {
        return res.status(400).json({ 
          error: '该学号已被其他用户使用'
        });
      }
    }

    // 更新用户信息
    await executeQuery(`
      UPDATE users SET 
        full_name = ?, 
        student_id = ?, 
        department = ?, 
        updated_at = NOW()
      WHERE id = ?
    `, [
      fullName || null,
      studentId || null,
      department || null,
      userId
    ]);

    // 获取更新后的用户信息
    const updatedUser = await executeQuery(`
      SELECT 
        id, username, email, full_name, student_id, 
        department, avatar_url, created_at, updated_at
      FROM users 
      WHERE id = ?
    `, [userId]);

    res.json({
      message: '个人信息更新成功',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ 
      error: '更新失败',
      message: '服务器内部错误'
    });
  }
});

// 修改密码
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // 验证输入
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: '当前密码和新密码都是必填项'
      });
    }

    if (newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({ 
        error: '新密码长度必须在6-128个字符之间'
      });
    }

    // 验证密码强度
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        error: '新密码必须包含至少一个大写字母、一个小写字母和一个数字'
      });
    }

    // 获取当前密码哈希
    const users = await executeQuery(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        error: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        error: '当前密码错误'
      });
    }

    // 检查新密码是否与当前密码相同
    const isSamePassword = await bcrypt.compare(newPassword, users[0].password_hash);

    if (isSamePassword) {
      return res.status(400).json({ 
        error: '新密码不能与当前密码相同'
      });
    }

    // 加密新密码
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await executeQuery(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, userId]
    );

    res.json({
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ 
      error: '修改密码失败',
      message: '服务器内部错误'
    });
  }
});

// 验证令牌有效性
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.fullName
    }
  });
});

// 注销登录（客户端处理，服务端记录）
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // 这里可以将令牌加入黑名单（如果使用Redis）
    // 或者记录注销日志
    
    res.json({
      message: '注销成功'
    });

  } catch (error) {
    console.error('注销失败:', error);
    res.status(500).json({ 
      error: '注销失败',
      message: '服务器内部错误'
    });
  }
});

// 检查用户名是否可用
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3 || username.length > 30) {
      return res.status(400).json({ 
        error: '用户名长度必须在3-30个字符之间'
      });
    }

    const users = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    res.json({
      available: users.length === 0,
      username: username
    });

  } catch (error) {
    console.error('检查用户名失败:', error);
    res.status(500).json({ 
      error: '检查失败',
      message: '服务器内部错误'
    });
  }
});

// 检查邮箱是否可用
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: '邮箱格式不正确'
      });
    }

    const users = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    res.json({
      available: users.length === 0,
      email: email
    });

  } catch (error) {
    console.error('检查邮箱失败:', error);
    res.status(500).json({ 
      error: '检查失败',
      message: '服务器内部错误'
    });
  }
});

module.exports = router;