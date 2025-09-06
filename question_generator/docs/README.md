# Question Generator Microservice

🚀 AI-powered question generation service using FastAPI and LangChain.

## ✨ Features

- ⚡ **Fast**: Async FastAPI with optimized AI calls
- 🧠 **Smart**: LangChain-powered prompt engineering
- 📄 **Flexible**: Supports text and PDF inputs
- 🔒 **Compatible**: OpenAI-compatible API support (OpenAI, DeepSeek, Azure, etc.)
- 🐳 **Portable**: Docker containerization
- 📚 **Documented**: Auto-generated API docs at `/docs`

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env and set your API configuration

# 2. Start service
docker-compose up -d

# 3. Test
curl http://localhost:8000/health
```

### Local Development

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env and set your API configuration

# 3. Run service
python app.py
```

## 🔧 Configuration

Environment variables in `.env`:

```bash
# API Configuration (Required)
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.deepseek.com    # Or your preferred API endpoint
OPENAI_MODEL=deepseek-chat                  # Or your preferred model

# Service Configuration
PORT=8000
DEBUG=true
```

### Supported API Providers

| Provider | Base URL | Example Model |
|----------|----------|---------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-3.5-turbo` |
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| Azure OpenAI | `https://your-resource.openai.azure.com/...` | `gpt-35-turbo` |

## 📖 API Usage

### Quick Test

```bash
# Health check
curl http://localhost:8000/health

# Generate questions
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"materials": "Python is a programming language", "num_questions": 2}'
```

### API Endpoints

- `GET /` - Service info
- `GET /health` - Health check
- `POST /generate` - Generate questions from text
- `POST /generate/pdf` - Generate questions from PDF
- `GET /docs` - Interactive API documentation

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🏗️ Project Structure

```
question_generator/
├── app.py                      # Main FastAPI application
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container configuration
├── docker-compose.yml         # Service orchestration
├── .env                        # Environment configuration
├── README.md                   # This file
├── API_DOCUMENTATION.md        # Detailed API documentation
└── OPENAI_COMPATIBLE_API.md    # OpenAI-compatible API guide
```

## 🧪 Testing

```bash
# Run basic test
python test.py

# Test with curl
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"materials": "Test content", "num_questions": 1}'

# Interactive API docs
open http://localhost:8000/docs
```

## 📊 Response Format

```json
{
  "questions": [
    {
      "question": "What is Python?",
      "answer": "Python is a high-level programming language...",
      "difficulty": "easy",
      "topic": "programming basics"
    }
  ],
  "generation_time": 2.34
}
```

## 🐳 Docker

```bash
# Start service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

## 📞 Support

- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Issues**: Create GitHub issue

## 📄 License

MIT License

---

**Simple. Fast. Reliable.** 🎯
