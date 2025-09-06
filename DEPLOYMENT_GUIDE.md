# 问题生成器集成部署指南

本文档说明如何部署和配置集成了AI问题生成器的复习小助手系统。

## 📋 系统架构

```
复习小助手系统
├── 前端 (React + Vite) - 端口 80/5173
├── 后端 (Express + MySQL) - 端口 3001  
├── 问题生成器 (FastAPI + OpenAI) - 端口 8000
└── 数据库 (MySQL 8.0) - 端口 3306
```

## 🚀 快速部署 (Docker)

### 1. 环境变量配置

创建 `.env` 文件：

```bash
# OpenAI API 配置 (必需)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo

# 可选：使用兼容的API服务
# OPENAI_BASE_URL=https://api.deepseek.com/v1
# OPENAI_MODEL=deepseek-chat
```

### 2. 一键启动

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f question-generator
```

### 3. 服务验证

访问以下URL验证服务：

- **前端应用**: http://localhost
- **后端API**: http://localhost:3001/api/health
- **问题生成器**: http://localhost:8000/health
- **API文档**: http://localhost:8000/docs

## 🛠️ 开发环境部署

### 1. 启动问题生成器

```bash
cd question_generator

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
export OPENAI_API_KEY="your_api_key"
export OPENAI_BASE_URL="https://api.openai.com/v1"

# 启动服务
python app.py
```

### 2. 启动后端

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置：
# QUESTION_GENERATOR_URL=http://localhost:8000

# 启动服务
npm run dev
```

### 3. 启动前端

```bash
# 在项目根目录
npm install
npm run dev
```

## 🧪 功能测试

### 1. 测试问题生成器连接

```bash
# 后端测试脚本
cd backend
node scripts/test-question-generator.js
```

### 2. 前端功能测试

1. 登录系统
2. 创建或选择课程
3. 上传学习资料
4. 配置试卷生成参数
5. 提交生成任务
6. 观察生成状态和进度
7. 查看生成的试卷

### 3. API测试

```bash
# 测试健康检查
curl http://localhost:8000/health

# 测试问题生成
curl -X POST http://localhost:8000/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{
    "materials": "人工智能是计算机科学的一个分支...",
    "num_questions": 3
  }'
```

## ⚙️ 配置说明

### 问题生成器配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `OPENAI_API_KEY` | - | OpenAI API密钥 (必需) |
| `OPENAI_BASE_URL` | https://api.openai.com/v1 | API基础URL |
| `OPENAI_MODEL` | gpt-3.5-turbo | 使用的模型 |
| `MAX_QUESTIONS` | 20 | 最大问题数量 |
| `DEBUG` | false | 调试模式 |

### 后端配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `QUESTION_GENERATOR_URL` | http://localhost:8000 | 问题生成器地址 |
| `QUESTION_GENERATOR_TIMEOUT` | 300000 | 请求超时时间(毫秒) |

## 🔧 故障排除

### 1. 问题生成器无法启动

**症状**: `ImportError: No module named 'xxx'`
**解决**: 
```bash
pip install -r requirements.txt
# 或使用Docker
docker-compose up question-generator
```

**症状**: `OpenAI API key not found`
**解决**: 检查环境变量设置
```bash
echo $OPENAI_API_KEY
# 或检查 .env 文件
```

### 2. 后端无法连接问题生成器

**症状**: 后端日志显示 "问题生成服务不可用"
**解决**: 
1. 检查问题生成器是否运行: `curl http://localhost:8000/health`
2. 检查后端配置: `QUESTION_GENERATOR_URL` 环境变量
3. 检查网络连接和防火墙设置

### 3. AI生成任务失败

**症状**: 生成状态显示"failed"
**解决**:
1. 检查OpenAI API密钥是否有效
2. 检查API配额和余额
3. 查看问题生成器日志: `docker-compose logs question-generator`

### 4. 前端状态更新异常

**症状**: 生成状态不更新或显示错误
**解决**:
1. 检查浏览器网络面板中的API调用
2. 检查JWT token是否有效
3. 检查后端API响应格式

## 📊 性能优化

### 1. 问题生成器优化

- 使用更强大的模型 (如 gpt-4)
- 调整 `temperature` 参数控制创造性
- 设置合适的 `max_tokens` 限制

### 2. 后端优化

- 增加连接池大小
- 实现请求队列和限流
- 添加Redis缓存生成结果

### 3. 数据库优化

- 为频繁查询的字段添加索引
- 定期清理过期的任务数据
- 使用读写分离

## 🔐 安全注意事项

1. **API密钥安全**
   - 不要在代码中硬编码API密钥
   - 使用环境变量或密钥管理服务
   - 定期轮换API密钥

2. **访问控制**
   - 确保问题生成器不对外暴露
   - 使用防火墙限制访问
   - 实现API调用频率限制

3. **数据安全**
   - 加密存储敏感数据
   - 记录操作日志
   - 定期备份数据

## 📈 监控和日志

### 1. 服务监控

```bash
# 查看所有服务状态
docker-compose ps

# 查看资源使用情况
docker stats

# 查看服务日志
docker-compose logs -f --tail=100 question-generator
```

### 2. 应用指标

监控以下关键指标：
- 问题生成成功率
- 平均生成时间
- API调用频率
- 系统资源使用率

### 3. 告警设置

建议为以下情况设置告警：
- 问题生成器服务下线
- API调用失败率过高
- 生成时间过长
- 资源使用率过高

## 🔄 升级和维护

### 1. 服务升级

```bash
# 更新代码
git pull

# 重新构建并重启服务
docker-compose down
docker-compose up -d --build

# 滚动更新 (零停机)
docker-compose up -d --no-deps question-generator
```

### 2. 数据备份

```bash
# 备份数据库
docker exec study-assistant-db mysqldump -u root -p study_assistant > backup.sql

# 备份上传文件
tar -czf uploads_backup.tar.gz ./backend/uploads
```

### 3. 清理维护

```bash
# 清理Docker镜像
docker system prune -a

# 清理过期日志
find ./logs -name "*.log" -mtime +7 -delete

# 清理临时文件
rm -rf ./backend/uploads/temp/*
```

---

如有问题，请参考各服务的详细文档或提交Issue。
