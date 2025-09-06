# 项目目录索引

## 📁 完整项目结构

```
question_generator/
├── 🐍 app.py                          # 主应用程序
├── 📦 requirements.txt                # Python依赖（开发环境）
├── 📦 requirements.docker.txt         # Python依赖（Docker精简版）
├── 🐳 docker-compose.yml             # Docker编排配置
├── 🐳 Dockerfile                     # Docker构建文件
├── ⚙️  .env.example                   # 环境变量示例
├── 📝 .gitignore                     # Git忽略文件
├── 📖 README.md                      # 项目主文档
│
├── 📚 docs/                          # 文档目录
│   ├── 📄 README.md                  # 旧版主文档（已移动）
│   ├── 📋 API_DOCUMENTATION.md       # API详细文档
│   ├── 🔗 RESTFUL_API_GUIDE.md      # RESTful API使用指南
│   ├── 🐳 DOCKER_GUIDE.md           # Docker部署指南
│   └── 🔌 OPENAI_COMPATIBLE_API.md  # OpenAI兼容API说明
│
├── 🧪 tests/                         # 测试目录
│   ├── ✅ test_api.py                # API基础测试
│   ├── ⚡ test_async_api.py          # 异步API测试
│   ├── 📄 test_pdf.py               # PDF处理测试
│   ├── 🔧 test.py                   # 基础功能测试
│   └── 📝 test_document.txt         # 测试文档
│
├── 📜 scripts/                       # 脚本目录
│   ├── 🚀 start.sh                  # 应用启动脚本
│   └── 🐳 test_docker.sh            # Docker测试脚本
│
└── 📖 examples/                      # 示例目录
    ├── 🔗 demo_restful_api.py       # RESTful API演示
    └── 👨‍💻 client_example.py          # 客户端使用示例
```

## 🎯 文件用途说明

### 核心文件
- **app.py** - FastAPI应用主文件，包含所有API端点和业务逻辑
- **requirements.txt** - 开发环境完整依赖列表
- **requirements.docker.txt** - Docker环境精简依赖，避免构建问题

### 部署配置
- **Dockerfile** - 容器构建配置，基于Python 3.13-slim
- **docker-compose.yml** - 容器编排，简化部署流程
- **.env.example** - 环境变量模板，包含OpenAI API配置

### 文档系统
- **docs/API_DOCUMENTATION.md** - 完整的API接口文档
- **docs/RESTFUL_API_GUIDE.md** - RESTful架构设计说明
- **docs/DOCKER_GUIDE.md** - 详细的Docker部署指南
- **docs/OPENAI_COMPATIBLE_API.md** - OpenAI API兼容性说明

### 测试套件
- **tests/test_api.py** - 基础API功能测试
- **tests/test_async_api.py** - 异步任务处理测试
- **tests/test_pdf.py** - PDF文档处理测试
- **tests/test.py** - 核心功能单元测试

### 工具脚本
- **scripts/start.sh** - 生产环境启动脚本
- **scripts/test_docker.sh** - Docker部署验证脚本

### 使用示例
- **examples/demo_restful_api.py** - RESTful API完整使用演示
- **examples/client_example.py** - 客户端集成示例代码

## 🔄 架构演进

项目从同步阻塞架构进化为异步RESTful架构：

1. **原始版本** - 同步处理，容易超时
2. **RESTful版本** - 异步任务处理，避免超时
3. **容器化版本** - Docker部署，便于扩展

## 📊 目录统计

- **总文件数**: ~20个文件
- **代码文件**: 6个Python文件 + 1个主应用
- **配置文件**: 4个配置文件
- **文档文件**: 5个Markdown文档
- **脚本文件**: 2个Shell脚本

## 🎯 快速导航

| 需求 | 文件路径 |
|------|----------|
| 启动应用 | `python app.py` 或 `docker-compose up` |
| 查看API | `docs/API_DOCUMENTATION.md` |
| 运行测试 | `python tests/test_async_api.py` |
| Docker部署 | `scripts/test_docker.sh` |
| 客户端示例 | `examples/client_example.py` |
