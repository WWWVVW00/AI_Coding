# Study Assistant Docker 部署指南

## 🚀 快速开始

### 前提条件
- 安装 Docker Desktop for Windows
- 确保 Docker 服务正在运行

### 一键启动

#### 方法 1: 使用批处理脚本（推荐）
```cmd
# 双击运行或在命令行执行
docker-start.bat
```

#### 方法 2: 使用 PowerShell 脚本
```powershell
# 开发环境
.\docker-scripts.ps1 dev

# 生产环境
.\docker-scripts.ps1 prod
```

#### 方法 3: 直接使用 Docker Compose
```cmd
# 开发环境
docker-compose -f docker-compose.dev.yml up -d --build

# 生产环境
docker-compose up -d --build
```

## 📋 服务说明

### 开发环境 (docker-compose.dev.yml)
- **前端**: http://localhost:5173 (Vite 开发服务器，支持热重载)
- **后端**: http://localhost:3001 (Node.js API，支持热重载)
- **数据库**: localhost:3306 (MySQL 8.0)

### 生产环境 (docker-compose.yml)
- **应用**: http://localhost (Nginx + React 构建版本)
- **API**: http://localhost:3001 (Node.js API)
- **数据库**: localhost:3306 (MySQL 8.0)

## 🛠️ 管理命令

### 使用 PowerShell 脚本
```powershell
# 启动开发环境
.\docker-scripts.ps1 dev

# 启动生产环境
.\docker-scripts.ps1 prod

# 停止所有服务
.\docker-scripts.ps1 stop

# 查看日志
.\docker-scripts.ps1 logs

# 运行数据库迁移
.\docker-scripts.ps1 db-migrate

# 重置数据库
.\docker-scripts.ps1 db-reset

# 查看服务状态
.\docker-scripts.ps1 status

# 清理环境
.\docker-scripts.ps1 clean
```

### 使用 Docker Compose 命令

#### 开发环境
```cmd
# 启动服务
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止服务
docker-compose -f docker-compose.dev.yml down

# 重新构建并启动
docker-compose -f docker-compose.dev.yml up -d --build
```

#### 生产环境
```cmd
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

## 🗄️ 数据库管理

### 初始化数据库
```cmd
# 运行数据库迁移
docker-compose exec backend npm run migrate

# 或使用脚本
.\docker-scripts.ps1 db-migrate
```

### 直接访问数据库
```cmd
# 连接到 MySQL
docker-compose exec database mysql -u root -p

# 密码: admin123456
```

### 重置数据库
```cmd
# 重置所有数据
docker-compose exec backend node scripts/migrate.js reset

# 或使用脚本
.\docker-scripts.ps1 db-reset
```

## 📁 数据持久化

### 数据卷说明
- `mysql_data` / `mysql_dev_data`: MySQL 数据库文件
- `backend_uploads` / `backend_dev_uploads`: 用户上传的文件
- `backend_logs` / `backend_dev_logs`: 应用日志文件

### 备份数据
```cmd
# 备份数据库
docker-compose exec database mysqldump -u root -padmin123456 study_assistant > backup.sql

# 恢复数据库
docker-compose exec -T database mysql -u root -padmin123456 study_assistant < backup.sql
```

## 🔧 环境配置

### 环境变量文件
- `.env.docker`: Docker 环境配置
- `backend/.env`: 后端环境配置

### 重要配置项
```env
# 数据库配置
DB_HOST=database          # 容器内使用服务名
DB_PASSWORD=admin123456   # 数据库密码
DB_NAME=study_assistant   # 数据库名

# JWT 配置
JWT_SECRET=your_secret_key_here  # 生产环境请更改

# 服务器配置
PORT=3001                 # 后端端口
NODE_ENV=production       # 环境模式
```

## 🚨 故障排除

### 常见问题

#### 1. 端口冲突
```cmd
# 检查端口占用
netstat -ano | findstr :3306
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# 停止占用端口的进程
taskkill /PID <进程ID> /F
```

#### 2. 数据库连接失败
```cmd
# 检查数据库容器状态
docker-compose ps database

# 查看数据库日志
docker-compose logs database

# 重启数据库服务
docker-compose restart database
```

#### 3. 前端无法访问后端
- 检查 CORS 配置
- 确认后端服务正在运行
- 检查网络连接

#### 4. 构建失败
```cmd
# 清理 Docker 缓存
docker system prune -f

# 重新构建镜像
docker-compose build --no-cache
```

### 查看日志
```cmd
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database

# 实时查看日志
docker-compose logs -f
```

### 进入容器调试
```cmd
# 进入后端容器
docker-compose exec backend sh

# 进入数据库容器
docker-compose exec database bash

# 进入前端容器（开发模式）
docker-compose -f docker-compose.dev.yml exec frontend sh
```

## 🔒 安全注意事项

### 生产环境配置
1. **更改默认密码**
   - 数据库 root 密码
   - JWT 密钥

2. **网络安全**
   - 不要暴露数据库端口到公网
   - 使用 HTTPS
   - 配置防火墙

3. **数据备份**
   - 定期备份数据库
   - 备份用户上传的文件

### 环境变量安全
```env
# 生产环境示例
DB_PASSWORD=your_strong_password_here
JWT_SECRET=your_super_secret_jwt_key_with_at_least_32_characters
```

## 📊 监控和维护

### 健康检查
- 前端: http://localhost
- 后端: http://localhost:3001/api/health
- 数据库: 通过后端健康检查

### 性能监控
```cmd
# 查看容器资源使用
docker stats

# 查看系统资源
docker system df
```

### 日志管理
```cmd
# 清理日志
docker system prune -f

# 限制日志大小（在 docker-compose.yml 中配置）
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 🚀 部署到生产环境

### 云服务器部署
1. 安装 Docker 和 Docker Compose
2. 克隆项目代码
3. 配置环境变量
4. 运行生产环境

```bash
# 在服务器上
git clone <your-repo>
cd my-study-assistant
cp .env.docker .env
# 编辑 .env 文件，设置生产环境配置
docker-compose up -d --build
```

### 域名和 HTTPS
- 配置域名解析
- 使用 Let's Encrypt 获取 SSL 证书
- 配置 Nginx 反向代理

## 📞 支持

如果遇到问题，请检查：
1. Docker Desktop 是否正在运行
2. 端口是否被占用
3. 环境变量是否正确配置
4. 查看容器日志获取详细错误信息

---

**祝你使用愉快！** 🎉