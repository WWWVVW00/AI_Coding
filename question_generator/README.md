# 问题生成器 (Question Generator)

一个基于FastAPI的RESTful问题生成服务，使用OpenAI API生成高质量的问题和答案。支持多种输入格式（文本、PDF），提供异步任务处理机制，避免超时问题。

## 🚀 特性

- **RESTful API设计** - 完全异步的任务处理机制
- **多格式支持** - 支持纯文本和PDF文件输入
- **任务管理** - UUID任务追踪，支持状态查询和结果获取
- **Docker部署** - 完整的容器化支持
- **健康检查** - 内置健康检查端点
- **API文档** - 自动生成的Swagger文档

## 📁 项目结构

```
question_generator/
├── app.py                 # 主应用程序
├── requirements.txt       # Python依赖
├── requirements.docker.txt # Docker精简依赖
├── docker-compose.yml     # Docker编排配置
├── Dockerfile            # Docker构建文件
├── .env.example          # 环境变量示例
├── .gitignore           # Git忽略文件
│
├── docs/                # 📚 文档目录
│   ├── README.md        # 主要说明文档
│   ├── API_DOCUMENTATION.md     # API详细文档
│   ├── RESTFUL_API_GUIDE.md    # RESTful API使用指南
│   ├── DOCKER_GUIDE.md         # Docker部署指南
│   └── OPENAI_COMPATIBLE_API.md # OpenAI兼容API说明
│
├── tests/               # 🧪 测试目录
│   ├── test_api.py      # API基础测试
│   ├── test_async_api.py # 异步API测试
│   ├── test_pdf.py      # PDF处理测试
│   ├── test.py          # 基础功能测试
│   └── test_document.txt # 测试文档
│
├── scripts/             # 📜 脚本目录
│   ├── start.sh         # 启动脚本
│   └── test_docker.sh   # Docker测试脚本
│
└── examples/            # 📖 示例目录
    ├── demo_restful_api.py   # RESTful API演示
    └── client_example.py     # 客户端使用示例
```

## 🔧 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd question_generator

# 安装Python依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的OpenAI API配置
```

### 2. 本地运行

```bash
# 直接运行
python app.py

# 或使用uvicorn
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Docker部署

```bash
# 使用docker-compose（推荐）
docker-compose up -d

# 或手动构建和运行
docker build -t question-generator .
docker run -d -p 8000:8000 \
    -e OPENAI_API_KEY="your_api_key" \
    -e OPENAI_BASE_URL="https://api.openai.com/v1" \
    question-generator
```

## 📋 API 使用说明

### 基础端点

- **健康检查**: `GET /health`
- **API信息**: `GET /`
- **API文档**: `GET /docs`

### 任务管理

1. **提交任务**: `POST /tasks/generate`
   ```json
   {
     "materials": "学习材料内容",
     "num_questions": 5,
     "question_types": ["single_choice", "multiple_choice"],
     "difficulty": "medium"
   }
   ```

2. **查询状态**: `GET /tasks/{task_id}/status`

3. **获取结果**: `GET /tasks/{task_id}/result`

4. **任务列表**: `GET /tasks`

### 使用示例

```python
import requests
import time

# 提交任务
response = requests.post("http://localhost:8000/tasks/generate", json={
    "materials": "人工智能是计算机科学的一个分支...",
    "num_questions": 3
})

task_id = response.json()["task_id"]

# 轮询任务状态
while True:
    status = requests.get(f"http://localhost:8000/tasks/{task_id}/status")
    if status.json()["status"] in ["completed", "failed"]:
        break
    time.sleep(2)

# 获取结果
result = requests.get(f"http://localhost:8000/tasks/{task_id}/result")
print(result.json())
```

## 🧪 测试

```bash
# 运行基础测试
python tests/test_api.py

# 运行异步API测试  
python tests/test_async_api.py

# Docker部署测试
./scripts/test_docker.sh
```

## 🐳 Docker部署

详细的Docker部署说明请参考 [docs/DOCKER_GUIDE.md](docs/DOCKER_GUIDE.md)

快速部署：
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 📖 更多文档

- [API详细文档](docs/API_DOCUMENTATION.md) - 完整的API接口说明
- [RESTful API指南](docs/RESTFUL_API_GUIDE.md) - RESTful架构说明
- [Docker部署指南](docs/DOCKER_GUIDE.md) - 容器化部署详解
- [OpenAI兼容API](docs/OPENAI_COMPATIBLE_API.md) - OpenAI API兼容性说明

## 🛠️ 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `OPENAI_API_KEY` | OpenAI API密钥 | - | ✅ |
| `OPENAI_BASE_URL` | API基础URL | `https://api.openai.com/v1` | ❌ |
| `OPENAI_MODEL` | 使用的模型 | `gpt-3.5-turbo` | ❌ |
| `MAX_QUESTIONS` | 最大问题数量 | `20` | ❌ |
| `DEBUG` | 调试模式 | `false` | ❌ |

### 支持的问题类型

- `single_choice` - 单选题
- `multiple_choice` - 多选题  
- `true_false` - 判断题
- `fill_blank` - 填空题
- `short_answer` - 简答题

### 难度级别

- `easy` - 简单
- `medium` - 中等
- `hard` - 困难

## 🔧 开发说明

### 技术栈

- **框架**: FastAPI 0.104+
- **异步**: asyncio, BackgroundTasks
- **AI集成**: OpenAI API, langchain
- **文档处理**: PyPDF2
- **容器化**: Docker, docker-compose

### 架构设计

项目采用异步RESTful架构：

1. **任务提交** - 立即返回task_id，避免HTTP超时
2. **后台处理** - 使用BackgroundTasks异步执行
3. **状态追踪** - 内存存储任务状态（生产环境建议使用Redis）
4. **结果获取** - 通过task_id查询处理结果

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

如有问题，请查看相关文档或提交Issue。
