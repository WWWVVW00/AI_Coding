# OpenAI 兼容 API 配置指南

本问题生成器微服务支持任何 OpenAI 兼容的 API 端点，不仅限于 OpenAI 官方 API。

## 配置方法

在 `.env` 文件中设置以下环境变量：

```bash
# API 配置
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://your-api-endpoint.com  # 设置自定义 API 端点
OPENAI_MODEL=your-model-name                   # 设置对应的模型名称

# 服务配置
PORT=8000
DEBUG=true
```

## 支持的 API 提供商

### 1. DeepSeek (已配置)
```bash
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat
```

### 2. OpenAI 官方
```bash
OPENAI_BASE_URL=https://api.openai.com/v1  # 或者留空使用默认值
OPENAI_MODEL=gpt-3.5-turbo
```

### 3. Azure OpenAI
```bash
OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
OPENAI_MODEL=gpt-35-turbo
```

### 4. 其他兼容提供商
任何遵循 OpenAI API 格式的提供商都可以使用，只需设置对应的 `OPENAI_BASE_URL` 和 `OPENAI_MODEL`。

## 验证配置

1. 启动服务：
```bash
docker-compose up -d
```

2. 检查健康状态：
```bash
curl http://localhost:8000/health
```

3. 测试问题生成：
```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"materials": "Test content", "num_questions": 1}'
```

4. 查看日志确认 API 调用：
```bash
docker-compose logs
```

在日志中你应该能看到类似以下的输出，确认使用了正确的 API 端点：
```
INFO:httpx:HTTP Request: POST https://your-api-endpoint.com/chat/completions "HTTP/1.1 200 OK"
```

## 注意事项

- 确保 API 密钥有效且有足够的配额
- 不同提供商的模型名称可能不同，请参考对应文档
- 某些提供商可能需要额外的认证头部，可以在代码中进一步自定义
