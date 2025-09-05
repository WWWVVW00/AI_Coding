# 🎓 学习助手系统

一个完整的学习资料管理和试卷生成系统，支持用户自定义课程、资料上传、AI试卷生成等功能。

## 🌟 系统特性

### 核心功能
- **📚 课程管理**: 官方课程 + 用户自定义课程
- **📄 资料管理**: 多格式文件上传、分类、下载
- **📝 智能试卷**: AI驱动的试卷生成和管理
- **👥 用户系统**: 注册、登录、权限管理
- **📊 学习统计**: 详细的学习进度和数据分析
- **⭐ 互动功能**: 收藏、评分、排行榜

### 技术架构
- **前端**: React 18 + Vite + TailwindCSS
- **后端**: Node.js + Express + MySQL
- **认证**: JWT + bcrypt
- **文件存储**: 本地存储 + 引用计数
- **API设计**: RESTful API

## 🚀 快速开始

### 系统要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- 现代浏览器 (Chrome, Firefox, Safari, Edge)

### 1. 克隆项目
```bash
git clone <repository-url>
cd my-study-assistant
```

### 2. 后端设置

#### 安装后端依赖
```bash
cd backend
npm install
```

#### 配置数据库
```bash
# 复制环境配置
cp .env.example .env

# 编辑 .env 文件，配置数据库连接
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=study_assistant
```

#### 初始化数据库
```bash
# 检查数据库连接
npm run db:check

# 运行数据库迁移
npm run db:migrate
```

#### 启动后端服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

后端服务将在 `http://localhost:3001` 启动

### 3. 前端设置

#### 安装前端依赖
```bash
cd ..  # 回到项目根目录
npm install
```

#### 配置前端环境
```bash
# 复制环境配置
cp .env.example .env

# 编辑 .env 文件
# VITE_API_URL=http://localhost:3001/api
```

#### 启动前端服务
```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build
```

前端服务将在 `http://localhost:5173` 启动

### 4. 访问系统

1. 打开浏览器访问 `http://localhost:5173`
2. 使用默认管理员账号登录：
   - 用户名: `admin`
   - 密码: `admin123456`
3. 或者注册新用户账号

## 📖 使用指南

### 用户功能

#### 1. 课程管理
- **浏览课程**: 查看所有可用课程
- **搜索课程**: 按名称、代码、院系搜索
- **创建课程**: 用户可以创建自定义课程
- **课程详情**: 查看课程资料和试卷

#### 2. 资料管理
- **上传资料**: 支持多种文件格式
- **分类管理**: 按类型分类（课件、作业、考试等）
- **下载资料**: 一键下载所需资料
- **资料评分**: 对资料进行评分和评论

#### 3. 试卷生成
- **智能生成**: 基于课程资料生成试卷
- **自定义设置**: 题目数量、难度、题型
- **试卷管理**: 保存、编辑、分享试卷
- **历年试卷**: 查看往年试卷资源

#### 4. 学习统计
- **学习进度**: 跟踪各课程学习情况
- **活动统计**: 查看学习活动数据
- **排行榜**: 与其他用户比较学习成果
- **收藏管理**: 管理收藏的资料和试卷

### 管理员功能

#### 1. 用户管理
- 查看所有用户列表
- 启用/禁用用户账号
- 用户活动监控

#### 2. 内容管理
- 审核用户上传的资料
- 管理课程信息
- 删除不当内容

#### 3. 系统统计
- 查看系统使用统计
- 监控系统性能
- 数据分析报告

## 🏗️ 系统架构

### 前端架构
```
src/
├── components/          # React组件
├── services/           # API服务层
├── hooks/              # 自定义Hooks
├── utils/              # 工具函数
├── styles/             # 样式文件
└── assets/             # 静态资源
```

### 后端架构
```
backend/
├── config/             # 配置文件
├── middleware/         # 中间件
├── routes/             # API路由
├── scripts/            # 工具脚本
├── database/           # 数据库相关
└── uploads/            # 文件存储
```

### 数据库设计
- **用户系统**: 用户信息、权限、进度
- **课程系统**: 课程信息、资料、试卷
- **文件系统**: 文件存储、引用计数
- **统计系统**: 使用数据、性能指标

## 🔧 开发指南

### 添加新功能

#### 1. 后端API开发
```javascript
// 在 routes/ 目录下创建新路由
router.get('/new-feature', async (req, res) => {
  try {
    // 业务逻辑
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 2. 前端组件开发
```jsx
// 创建新的React组件
const NewFeature = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // 调用API获取数据
    apiService.get('/new-feature')
      .then(setData)
      .catch(console.error);
  }, []);
  
  return <div>{/* 组件内容 */}</div>;
};
```

#### 3. API服务集成
```javascript
// 在 services/api.js 中添加新的API方法
export const newFeatureAPI = {
  getData: () => apiService.get('/new-feature'),
  createData: (data) => apiService.post('/new-feature', data),
};
```

### 数据库迁移
```bash
# 添加新的数据表或字段
# 编辑 database/schema.sql

# 运行迁移
npm run db:migrate

# 如需重置数据库（危险操作）
npm run db:reset
```

### 测试
```bash
# 后端测试
cd backend
npm test

# 前端测试
cd ..
npm test
```

## 🚀 部署指南

### 生产环境部署

#### 1. 服务器要求
- Ubuntu 20.04+ / CentOS 8+
- Node.js 16+
- MySQL 8.0+
- Nginx (推荐)

#### 2. 后端部署
```bash
# 安装依赖
cd backend
npm ci --production

# 配置环境变量
cp .env.example .env
# 编辑生产环境配置

# 运行数据库迁移
npm run db:migrate

# 使用PM2启动
npm install -g pm2
pm2 start ecosystem.config.js
```

#### 3. 前端部署
```bash
# 构建生产版本
npm run build

# 配置Nginx
# 将 dist/ 目录内容部署到Web服务器
```

#### 4. Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker部署
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 📊 监控和维护

### 性能监控
- 使用PM2监控后端进程
- 配置日志轮转
- 监控数据库性能

### 备份策略
```bash
# 数据库备份
mysqldump -u root -p study_assistant > backup.sql

# 文件备份
tar -czf uploads_backup.tar.gz backend/uploads/
```

### 更新部署
```bash
# 拉取最新代码
git pull origin main

# 更新依赖
npm install

# 重启服务
pm2 restart all
```

## 🐛 故障排除

### 常见问题

#### 1. 数据库连接失败
- 检查MySQL服务状态
- 验证连接配置
- 确认防火墙设置

#### 2. 文件上传失败
- 检查上传目录权限
- 验证文件大小限制
- 确认磁盘空间

#### 3. 前端无法连接后端
- 检查API地址配置
- 验证CORS设置
- 确认后端服务运行状态

### 日志查看
```bash
# 后端日志
pm2 logs

# 数据库日志
tail -f /var/log/mysql/error.log

# Nginx日志
tail -f /var/log/nginx/access.log
```

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持与反馈

- 📧 邮箱: support@study-assistant.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/your-repo/issues)
- 📖 文档: [项目文档](https://docs.study-assistant.com)
- 💬 讨论: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

**开始使用学习助手，让学习更高效！** 🚀