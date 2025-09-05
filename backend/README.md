# 学习助手后端系统

这是一个完整的学习助手后端API系统，支持大规模数据存储和管理。

## 🚀 功能特性

### 核心功能
- **用户管理**: 注册、登录、权限控制
- **课程管理**: 官方课程和用户自定义课程
- **资料管理**: 文件上传、下载、分类管理
- **试卷生成**: AI驱动的试卷生成和管理
- **学习进度**: 用户学习轨迹和统计
- **评分系统**: 资料和试卷评分
- **收藏功能**: 用户收藏管理
- **统计分析**: 详细的数据统计和分析

### 技术特性
- **高性能**: 优化的数据库查询和索引
- **可扩展**: 模块化设计，易于扩展
- **安全性**: JWT认证、数据验证、权限控制
- **文件管理**: 完整的文件存储和引用计数
- **API文档**: RESTful API设计

## 📋 系统要求

- Node.js >= 16.0.0
- MySQL >= 8.0
- 至少 2GB 可用磁盘空间（用于文件存储）

## 🛠️ 安装和配置

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 环境配置

复制环境配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=study_assistant

# JWT配置
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development

# 文件存储配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50MB

# 邮件配置（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. 数据库设置

#### 检查数据库连接
```bash
npm run db:check
```

#### 运行数据库迁移
```bash
npm run db:migrate
```

#### 重置数据库（危险操作）
```bash
npm run db:reset
```

### 4. 启动服务器

#### 开发模式
```bash
npm run dev
```

#### 生产模式
```bash
npm start
```

服务器将在 `http://localhost:3001` 启动

## 📊 数据库架构

### 主要数据表

#### 用户相关
- `users` - 用户基本信息
- `user_progress` - 学习进度
- `user_favorites` - 用户收藏
- `user_ratings` - 用户评分

#### 课程相关
- `courses` - 课程信息
- `materials` - 学习资料
- `generated_papers` - 生成的试卷
- `paper_questions` - 试卷题目

#### 系统相关
- `file_storage` - 文件存储管理
- `download_logs` - 下载日志
- `system_stats` - 系统统计

### 数据关系
```
users (1:N) user_progress (N:1) courses
users (1:N) materials (N:1) courses
users (1:N) generated_papers (N:1) courses
materials (1:N) paper_questions
```

## 🔌 API 接口

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌
- `POST /api/auth/logout` - 用户登出

### 课程接口
- `GET /api/courses` - 获取课程列表
- `POST /api/courses` - 创建新课程
- `GET /api/courses/:id` - 获取课程详情
- `PUT /api/courses/:id` - 更新课程信息
- `DELETE /api/courses/:id` - 删除课程

### 资料接口
- `GET /api/materials` - 获取资料列表
- `POST /api/materials` - 上传新资料
- `GET /api/materials/:id` - 获取资料详情
- `PUT /api/materials/:id` - 更新资料信息
- `DELETE /api/materials/:id` - 删除资料
- `GET /api/materials/:id/download` - 下载资料

### 试卷接口
- `GET /api/papers` - 获取试卷列表
- `POST /api/papers/generate` - 生成新试卷
- `GET /api/papers/:id` - 获取试卷详情
- `PUT /api/papers/:id` - 更新试卷
- `DELETE /api/papers/:id` - 删除试卷

### 用户接口
- `GET /api/users/progress` - 获取学习进度
- `PUT /api/users/progress/:courseId` - 更新学习进度
- `GET /api/users/favorites` - 获取收藏列表
- `POST /api/users/favorites` - 添加/移除收藏
- `POST /api/users/ratings` - 提交评分

### 统计接口
- `GET /api/stats/overview` - 系统总览统计
- `GET /api/stats/user-activity` - 用户活动统计
- `GET /api/stats/course/:courseId` - 课程统计
- `GET /api/stats/downloads` - 下载统计

## 🔐 权限系统

### 用户角色
- **普通用户**: 基本功能使用权限
- **管理员**: 系统管理权限

### 权限控制
- 使用JWT进行身份验证
- 基于角色的访问控制(RBAC)
- API级别的权限验证

## 📁 文件存储

### 存储策略
- 文件按日期和类型分类存储
- 自动生成唯一文件名避免冲突
- 支持文件引用计数，自动清理无用文件

### 支持的文件类型
- **文档**: PDF, DOC, DOCX, TXT, MD
- **图片**: JPG, PNG, GIF, WEBP
- **压缩包**: ZIP, RAR, 7Z

### 文件大小限制
- 单个文件最大 50MB
- 用户总存储空间限制可配置

## 📈 性能优化

### 数据库优化
- 合理的索引设计
- 查询优化和分页
- 连接池管理

### 缓存策略
- 热点数据缓存
- 查询结果缓存
- 文件元数据缓存

### 监控和日志
- 详细的操作日志
- 性能监控指标
- 错误追踪和报告

## 🚀 部署指南

### Docker 部署
```bash
# 构建镜像
docker build -t study-assistant-backend .

# 运行容器
docker run -d \
  --name study-assistant-backend \
  -p 3001:3001 \
  -e DB_HOST=your_db_host \
  -e DB_PASSWORD=your_db_password \
  study-assistant-backend
```

### PM2 部署
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

## 🔧 开发指南

### 项目结构
```
backend/
├── config/          # 配置文件
├── middleware/      # 中间件
├── routes/          # 路由定义
├── scripts/         # 工具脚本
├── uploads/         # 文件上传目录
├── database/        # 数据库相关
└── server.js        # 服务器入口
```

### 代码规范
- 使用 ESLint 进行代码检查
- 遵循 RESTful API 设计原则
- 统一的错误处理和响应格式

### 测试
```bash
# 运行测试
npm test

# 运行测试覆盖率
npm run test:coverage
```

## 📝 API 使用示例

### 用户注册
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'student123',
    email: 'student@example.com',
    password: 'securepassword',
    fullName: '张三'
  })
});
```

### 上传资料
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('courseId', '1');
formData.append('title', '第一章课件');
formData.append('materialType', 'lecture');

const response = await fetch('/api/materials', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 生成试卷
```javascript
const response = await fetch('/api/papers/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    courseId: 1,
    title: '期中考试',
    questionCount: 20,
    difficulty: 'medium',
    questionTypes: ['multiple_choice', 'short_answer']
  })
});
```

## 🐛 故障排除

### 常见问题

#### 数据库连接失败
1. 检查数据库服务是否运行
2. 验证连接配置是否正确
3. 确认数据库用户权限

#### 文件上传失败
1. 检查上传目录权限
2. 验证文件大小限制
3. 确认文件类型是否支持

#### JWT 认证失败
1. 检查 JWT_SECRET 配置
2. 验证令牌是否过期
3. 确认请求头格式正确

### 日志查看
```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 查看数据库日志
tail -f logs/database.log
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 支持

如有问题，请联系：
- 邮箱: support@study-assistant.com
- 文档: https://docs.study-assistant.com
- 问题反馈: https://github.com/study-assistant/issues