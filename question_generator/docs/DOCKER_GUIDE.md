# Docker 部署指南

本指南介绍如何使用Docker部署Question Generator RESTful API。

## 🚀 快速开始

### 1. 准备环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件，设置你的API密钥
nano .env
```

在`.env`文件中设置：
```bash
OPENAI_API_KEY=your_actual_api_key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat
```

### 2. 使用Docker Compose启动（推荐）

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 检查服务状态
docker-compose ps
```

### 3. 测试API

```bash
# 健康检查
curl http://localhost:8000/health

# 提交任务测试
curl -X POST http://localhost:8000/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{
    "materials": "Docker是一个开源的容器化平台，用于开发、运输和运行应用程序。",
    "num_questions": 2
  }'
```

## 🔧 手动Docker命令

### 构建镜像

```bash
# 构建镜像
docker build -t question-generator .

# 查看镜像
docker images question-generator
```

### 运行容器

```bash
# 基本运行
docker run -d \
  --name question-generator \
  -p 8000:8000 \
  -e OPENAI_API_KEY="your_api_key" \
  -e OPENAI_BASE_URL="https://api.deepseek.com" \
  -e OPENAI_MODEL="deepseek-chat" \
  question-generator

# 带卷挂载（用于日志和上传文件）
docker run -d \
  --name question-generator \
  -p 8000:8000 \
  -e OPENAI_API_KEY="your_api_key" \
  -e OPENAI_BASE_URL="https://api.deepseek.com" \
  -e OPENAI_MODEL="deepseek-chat" \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/uploads:/app/uploads \
  question-generator
```

## 📊 监控和管理

### 查看容器状态

```bash
# 查看运行中的容器
docker ps

# 查看容器详细信息
docker inspect question-generator

# 查看资源使用情况
docker stats question-generator
```

### 查看日志

```bash
# 查看实时日志
docker logs -f question-generator

# 查看最近的日志
docker logs --tail 100 question-generator

# 使用docker-compose查看日志
docker-compose logs -f question-generator
```

### 健康检查

```bash
# Docker自带的健康检查
docker inspect --format='{{.State.Health.Status}}' question-generator

# 手动健康检查
curl http://localhost:8000/health
```

## 🔄 更新和维护

### 更新服务

```bash
# 使用docker-compose更新
docker-compose pull
docker-compose up -d

# 手动更新
docker stop question-generator
docker rm question-generator
docker build -t question-generator .
docker run -d --name question-generator -p 8000:8000 [env_vars] question-generator
```

### 备份和恢复

```bash
# 备份容器配置
docker run --rm -v question_generator_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data

# 恢复配置
docker run --rm -v question_generator_data:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /
```

## 🐛 故障排除

### 常见问题

1. **端口已被占用**
   ```bash
   # 查看端口占用
   lsof -i :8000
   
   # 使用不同端口
   docker run -p 8001:8000 question-generator
   ```

2. **环境变量未设置**
   ```bash
   # 检查环境变量
   docker exec question-generator env | grep OPENAI
   
   # 设置环境变量
   docker run -e OPENAI_API_KEY="your_key" question-generator
   ```

3. **容器启动失败**
   ```bash
   # 查看启动日志
   docker logs question-generator
   
   # 进入容器调试
   docker exec -it question-generator /bin/bash
   ```

### 性能调优

1. **内存限制**
   ```bash
   # 限制内存使用
   docker run --memory=512m question-generator
   ```

2. **CPU限制**
   ```bash
   # 限制CPU使用
   docker run --cpus="0.5" question-generator
   ```

3. **多worker部署**
   ```bash
   # 启动多个worker
   docker run -e WORKERS=2 question-generator
   ```

## 🔐 生产环境配置

### Docker Compose生产配置

```yaml
version: '3.8'

services:
  question-generator:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_BASE_URL=${OPENAI_BASE_URL}
      - OPENAI_MODEL=${OPENAI_MODEL}
      - WORKERS=2
      - LOG_LEVEL=warning
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # 可选：添加Redis用于生产环境的任务存储
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
```

### 安全配置

1. **使用secrets管理敏感信息**
   ```yaml
   services:
     question-generator:
       secrets:
         - openai_api_key
       environment:
         - OPENAI_API_KEY_FILE=/run/secrets/openai_api_key

   secrets:
     openai_api_key:
       file: ./secrets/openai_api_key.txt
   ```

2. **网络隔离**
   ```yaml
   networks:
     internal:
       driver: bridge
   
   services:
     question-generator:
       networks:
         - internal
   ```

## 📈 扩展配置

### 负载均衡

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - question-generator-1
      - question-generator-2

  question-generator-1:
    build: .
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_BASE_URL=${OPENAI_BASE_URL}

  question-generator-2:
    build: .
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_BASE_URL=${OPENAI_BASE_URL}
```

### 监控配置

```yaml
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🚀 部署命令总结

```bash
# 1. 准备环境
cp .env.example .env
# 编辑 .env 文件

# 2. 启动服务
docker-compose up -d

# 3. 验证部署
curl http://localhost:8000/health

# 4. 查看日志
docker-compose logs -f

# 5. 停止服务
docker-compose down

# 6. 更新服务
docker-compose pull && docker-compose up -d
```

这个Docker配置支持RESTful API的所有功能，包括异步任务处理、进度跟踪和任务管理。
