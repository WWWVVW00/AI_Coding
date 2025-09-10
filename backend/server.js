const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const { testConnection, cleanupExpiredData } = require('./config/database');

// 导入路由
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const materialRoutes = require('./routes/materials');
const paperRoutes = require('./routes/papers');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3001;
app.set('trust proxy', 1);

// 创建必要的目录
async function createDirectories() {
  const dirs = ['./uploads', './uploads/materials', './uploads/avatars', './logs'];
  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }
}

// 中间件配置
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});

app.use('/api/', limiter);

// 文件上传限制
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
app.use('/auth', authRoutes);
app.use('/courses', courseRoutes);
app.use('/materials', materialRoutes);
app.use('/papers', paperRoutes);
app.use('/users', userRoutes);
app.use('/stats', statsRoutes);

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    const { healthCheck, getDatabaseStats } = require('./config/database');
    const dbHealth = await healthCheck();
    const stats = await getDatabaseStats();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      stats: stats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl
  });
});

// 全局错误处理
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  
  // 数据库错误
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      error: '数据已存在',
      message: '该记录已经存在，请检查输入'
    });
  }
  
  // 文件上传错误
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: '文件过大',
      message: '上传文件大小超出限制'
    });
  }
  
  // JWT错误
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '认证失败',
      message: '无效的访问令牌'
    });
  }
  
  // 验证错误
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: '数据验证失败',
      message: error.message
    });
  }
  
  // 默认错误
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? error.message : '请稍后重试'
  });
});

// 启动服务器
async function startServer() {
  try {
    // 创建必要目录
    await createDirectories();
    
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ 无法连接到数据库，服务器启动失败');
      process.exit(1);
    }
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
      console.log(`📚 API文档: http://localhost:${PORT}/api/docs`);
      
      // 定期清理过期数据（每天凌晨2点）
      const now = new Date();
      const tomorrow2AM = new Date(now);
      tomorrow2AM.setDate(tomorrow2AM.getDate() + 1);
      tomorrow2AM.setHours(2, 0, 0, 0);
      
      const msUntil2AM = tomorrow2AM.getTime() - now.getTime();
      setTimeout(() => {
        cleanupExpiredData();
        // 然后每24小时执行一次
        setInterval(cleanupExpiredData, 24 * 60 * 60 * 1000);
      }, msUntil2AM);
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

// 启动服务器
startServer();