# AI API 测试工具

这是一个用于测试不同 AI 提供商 API 的前端工具，支持 OpenAI、Claude 和 Google Gemini。

## 功能特性

- 🤖 支持多个 AI 提供商
  - OpenAI (GPT-3.5, GPT-4 系列)
  - Anthropic Claude (Claude-3 系列)
  - Google Gemini (Gemini Pro 系列)

- ⚙️ 灵活的配置选项
  - API Key 配置
  - 模型选择
  - 自定义 Base URL
  - Temperature 和 Max Tokens 调节

- 🎨 现代化 UI 设计
  - 响应式布局
  - 实时配置预览
  - 加载状态指示
  - 错误处理

## 使用方法

1. 打开 `index.html` 文件
2. 选择 AI 提供商
3. 输入对应的 API Key
4. 选择模型和调整参数
5. 输入测试提示词
6. 点击"测试 API"按钮

## 配置格式

工具会生成以下格式的配置：

### OpenAI 格式
```json
{
  "openai": {
    "type": "openai_compatible",
    "config": {
      "api_key": "your-api-key",
      "model_name": "gpt-3.5-turbo",
      "base_url": "https://api.openai.com/v1",
      "temperature": 0.7,
      "max_tokens": 1000
    }
  }
}
```

### Claude 格式
```json
{
  "claude": {
    "type": "claude",
    "config": {
      "api_key": "your-api-key",
      "model_name": "claude-3-sonnet-20240229",
      "base_url": "https://api.anthropic.com/v1",
      "temperature": 0.7,
      "max_tokens": 1000
    }
  }
}
```

### Google Gemini 格式
```json
{
  "google": {
    "type": "google",
    "config": {
      "api_key": "your-api-key",
      "model_name": "gemini-pro",
      "base_url": "https://generativelanguage.googleapis.com/v1beta",
      "temperature": 0.7,
      "max_tokens": 1000
    }
  }
}
```

## API 端点

### OpenAI Compatible
- 端点: `{base_url}/chat/completions`
- 认证: `Authorization: Bearer {api_key}`

### Claude
- 端点: `{base_url}/messages`
- 认证: `x-api-key: {api_key}`
- 版本: `anthropic-version: 2023-06-01`

### Google Gemini
- 端点: `{base_url}/models/{model}:generateContent?key={api_key}`
- 认证: URL 参数中的 API Key

## 文件结构

```
test/
├── index.html      # 主页面
├── ai-test.js      # JavaScript 逻辑
└── README.md       # 说明文档
```

## 注意事项

1. **API Key 安全**: 请不要在生产环境中暴露 API Key
2. **CORS 限制**: 某些 API 可能有 CORS 限制，建议在本地服务器环境下测试
3. **费用控制**: 测试时注意 API 调用费用
4. **模型可用性**: 不同提供商的模型可用性可能不同

## 本地服务器运行

如果遇到 CORS 问题，可以使用本地服务器：

```bash
# Python 3
python -m http.server 8000

# Node.js (需要安装 http-server)
npx http-server

# 然后访问 http://localhost:8000/test/
```

## 扩展功能

- 可以添加更多 AI 提供商
- 支持批量测试
- 添加配置导入/导出功能
- 集成到现有项目中