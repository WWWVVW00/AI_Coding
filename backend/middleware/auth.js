const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// JWT认证中间件
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: '访问被拒绝',
        message: '请提供有效的访问令牌'
      });
    }

    // 验证JWT令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 从数据库获取用户信息
    const users = await executeQuery(
      'SELECT id, username, email, full_name, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        error: '用户不存在',
        message: '令牌中的用户不存在'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ 
        error: '账户已被禁用',
        message: '您的账户已被管理员禁用'
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: decoded.role || 'user'
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: '无效令牌',
        message: '提供的访问令牌无效'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: '令牌已过期',
        message: '访问令牌已过期，请重新登录'
      });
    }

    console.error('认证中间件错误:', error);
    res.status(500).json({ 
      error: '认证服务错误',
      message: '服务器内部错误'
    });
  }
};

// 可选认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const users = await executeQuery(
      'SELECT id, username, email, full_name, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length > 0 && users[0].is_active) {
      req.user = {
        id: users[0].id,
        username: users[0].username,
        email: users[0].email,
        fullName: users[0].full_name,
        role: decoded.role || 'user'
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // 可选认证失败时不返回错误，只是设置user为null
    req.user = null;
    next();
  }
};

// 管理员权限检查
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: '需要登录',
      message: '此操作需要登录'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: '权限不足',
      message: '此操作需要管理员权限'
    });
  }

  next();
};

// 检查用户是否为资源所有者或管理员
const requireOwnershipOrAdmin = (resourceUserIdField = 'created_by') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: '需要登录',
          message: '此操作需要登录'
        });
      }

      // 管理员可以访问所有资源
      if (req.user.role === 'admin') {
        return next();
      }

      // 从请求参数中获取资源ID
      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({ 
          error: '缺少资源ID',
          message: '请求中缺少必要的资源标识符'
        });
      }

      // 这里需要根据具体的资源类型来查询
      // 由于这是通用中间件，具体的查询逻辑应该在路由中处理
      req.requireOwnership = {
        userId: req.user.id,
        resourceId: resourceId,
        field: resourceUserIdField
      };

      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      res.status(500).json({ 
        error: '权限检查失败',
        message: '服务器内部错误'
      });
    }
  };
};

// 速率限制中间件（基于用户）
const createUserRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    
    if (!userRequests.has(userId)) {
      userRequests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userLimit = userRequests.get(userId);
    
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        error: '请求过于频繁',
        message: `每${windowMs / 1000 / 60}分钟最多${maxRequests}个请求`,
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }

    userLimit.count++;
    next();
  };
};

// 生成JWT令牌
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role || 'user'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'study-assistant',
    audience: 'study-assistant-users'
  });
};

// 验证刷新令牌
const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // 检查刷新令牌是否在数据库中存在且有效
    const tokens = await executeQuery(
      'SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW()',
      [refreshToken, decoded.userId]
    );

    if (tokens.length === 0) {
      throw new Error('刷新令牌无效或已过期');
    }

    return decoded;
  } catch (error) {
    throw new Error('刷新令牌验证失败');
  }
};

// 记录用户活动
const logUserActivity = async (req, res, next) => {
  if (req.user) {
    try {
      await executeQuery(`
        INSERT INTO user_activity_logs (
          user_id, action, resource_type, resource_id, 
          ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        req.user.id,
        req.method,
        req.baseUrl.split('/').pop(),
        req.params.id || null,
        req.ip,
        req.get('User-Agent')
      ]);
    } catch (error) {
      // 记录活动失败不应该影响主要功能
      console.error('记录用户活动失败:', error);
    }
  }
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireOwnershipOrAdmin,
  createUserRateLimit,
  generateToken,
  verifyRefreshToken,
  logUserActivity
};