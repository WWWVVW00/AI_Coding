# API Documentation

Complete API usage guide for the Question Generator Microservice.

## 📑 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Request & Response Examples](#request--response-examples)
- [Client Libraries](#client-libraries)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Integration Examples](#integration-examples)

## 📖 Overview

The Question Generator API provides AI-powered question generation from educational materials. It supports both text input and PDF file uploads.

### Base URL
```
http://localhost:8000
```

### Content Type
All requests expect `application/json` content type unless specified otherwise.

## 🔐 Authentication

No authentication required for the current version. API key configuration is handled via environment variables.

## 🛠️ Endpoints

### 1. Health Check

Check service health and status.

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-06T10:30:00.123456"
}
```

### 2. Service Information

Get basic service information.

```http
GET /
```

**Response:**
```json
{
  "service": "Question Generator",
  "version": "1.0.0",
  "status": "running"
}
```

### 3. Generate Questions from Text

Generate questions from text materials.

```http
POST /generate
```

**Request Body:**
```json
{
  "materials": "string",      // Required: Educational content
  "num_questions": integer    // Optional: Number of questions (1-10, default: 5)
}
```

**Response:**
```json
{
  "questions": [
    {
      "question": "string",
      "answer": "string",
      "difficulty": "easy|medium|hard",
      "topic": "string"
    }
  ],
  "generation_time": float
}
```

### 4. Generate Questions from PDF

Generate questions from PDF file.

```http
POST /generate/pdf
```

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `pdf_file`: PDF file (required)
  - `num_questions`: integer (optional, 1-10, default: 5)

**Response:**
```json
{
  "questions": [
    {
      "question": "string",
      "answer": "string",
      "difficulty": "easy|medium|hard",
      "topic": "string"
    }
  ],
  "generation_time": float,
  "source": "pdf"
}
```

### 5. Interactive API Documentation

Access auto-generated API documentation.

```http
GET /docs
```

Opens Swagger UI with interactive API documentation.

## 📝 Request & Response Examples

### Text Input Example

**Request:**
```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "materials": "Python is a high-level programming language known for its simplicity and readability. It supports multiple programming paradigms including procedural, object-oriented, and functional programming.",
    "num_questions": 3
  }'
```

**Response:**
```json
{
  "questions": [
    {
      "question": "What are the main characteristics of Python as a programming language?",
      "answer": "Python is a high-level programming language known for its simplicity and readability, supporting multiple programming paradigms.",
      "difficulty": "easy",
      "topic": "programming basics"
    },
    {
      "question": "Which programming paradigms does Python support?",
      "answer": "Python supports procedural, object-oriented, and functional programming paradigms.",
      "difficulty": "medium",
      "topic": "programming concepts"
    },
    {
      "question": "Why is Python considered beginner-friendly?",
      "answer": "Python is considered beginner-friendly due to its simple syntax and high readability.",
      "difficulty": "easy",
      "topic": "language features"
    }
  ],
  "generation_time": 2.45
}
```

### PDF Upload Example

**Request:**
```bash
curl -X POST http://localhost:8000/generate/pdf \
  -F "pdf_file=@textbook.pdf" \
  -F "num_questions=2"
```

**Response:**
```json
{
  "questions": [
    {
      "question": "Based on the textbook content, explain the concept discussed in Chapter 1.",
      "answer": "Detailed answer based on the PDF content...",
      "difficulty": "medium",
      "topic": "chapter 1"
    },
    {
      "question": "What are the key points mentioned in the document?",
      "answer": "Summary of key points from the PDF...",
      "difficulty": "easy",
      "topic": "general"
    }
  ],
  "generation_time": 3.12,
  "source": "pdf"
}
```

## 💻 Client Libraries

### Python Client

```python
import requests
import json

class QuestionGeneratorClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def health_check(self):
        """Check service health"""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()
    
    def generate_from_text(self, materials, num_questions=5):
        """Generate questions from text"""
        payload = {
            "materials": materials,
            "num_questions": num_questions
        }
        response = self.session.post(f"{self.base_url}/generate", json=payload)
        response.raise_for_status()
        return response.json()
    
    def generate_from_pdf(self, pdf_path, num_questions=5):
        """Generate questions from PDF file"""
        with open(pdf_path, 'rb') as pdf_file:
            files = {'pdf_file': pdf_file}
            data = {'num_questions': num_questions}
            response = requests.post(
                f"{self.base_url}/generate/pdf",
                files=files,
                data=data
            )
        response.raise_for_status()
        return response.json()

# Usage example
client = QuestionGeneratorClient()

# Check health
health = client.health_check()
print(f"Service status: {health['status']}")

# Generate from text
result = client.generate_from_text(
    "Machine learning is a subset of artificial intelligence...",
    num_questions=3
)

for i, question in enumerate(result['questions'], 1):
    print(f"Q{i}: {question['question']}")
    print(f"A{i}: {question['answer']}")
    print(f"Difficulty: {question['difficulty']}")
    print("-" * 50)
```

### JavaScript/Node.js Client

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class QuestionGeneratorClient {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
        this.client = axios.create({
            baseURL: baseUrl,
            timeout: 30000
        });
    }
    
    async healthCheck() {
        const response = await this.client.get('/health');
        return response.data;
    }
    
    async generateFromText(materials, numQuestions = 5) {
        const payload = {
            materials: materials,
            num_questions: numQuestions
        };
        const response = await this.client.post('/generate', payload);
        return response.data;
    }
    
    async generateFromPdf(pdfPath, numQuestions = 5) {
        const form = new FormData();
        form.append('pdf_file', fs.createReadStream(pdfPath));
        form.append('num_questions', numQuestions.toString());
        
        const response = await this.client.post('/generate/pdf', form, {
            headers: form.getHeaders()
        });
        return response.data;
    }
}

// Usage example
async function main() {
    const client = new QuestionGeneratorClient();
    
    try {
        // Check health
        const health = await client.healthCheck();
        console.log(`Service status: ${health.status}`);
        
        // Generate from text
        const result = await client.generateFromText(
            'React is a JavaScript library for building user interfaces...',
            3
        );
        
        result.questions.forEach((q, index) => {
            console.log(`Q${index + 1}: ${q.question}`);
            console.log(`A${index + 1}: ${q.answer}`);
            console.log(`Difficulty: ${q.difficulty}`);
            console.log('-'.repeat(50));
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
```

### cURL Examples

```bash
# Health check
curl -X GET http://localhost:8000/health

# Generate from text
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "materials": "Artificial Intelligence is transforming various industries...",
    "num_questions": 2
  }'

# Generate from PDF
curl -X POST http://localhost:8000/generate/pdf \
  -F "pdf_file=@document.pdf" \
  -F "num_questions=3"

# Get service info
curl -X GET http://localhost:8000/

# Access API docs (opens in browser)
curl -X GET http://localhost:8000/docs
```

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - AI generation failed |

### Error Response Format

```json
{
  "detail": "Error description",
  "timestamp": "2025-09-06T10:30:00.123456"
}
```

### Common Errors

**400 Bad Request:**
```json
{
  "detail": "Failed to process PDF: No readable text found in PDF"
}
```

**422 Validation Error:**
```json
{
  "detail": [
    {
      "loc": ["body", "num_questions"],
      "msg": "ensure this value is less than or equal to 10",
      "type": "value_error.number.not_le",
      "ctx": {"limit_value": 10}
    }
  ]
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Generation failed: API rate limit exceeded"
}
```

### Error Handling Best Practices

```python
import requests
from requests.exceptions import RequestException, Timeout, HTTPError

def safe_api_call(client, materials, num_questions=5):
    try:
        result = client.generate_from_text(materials, num_questions)
        return {"success": True, "data": result}
    
    except HTTPError as e:
        if e.response.status_code == 400:
            return {"success": False, "error": "Invalid request parameters"}
        elif e.response.status_code == 422:
            return {"success": False, "error": "Validation error"}
        elif e.response.status_code == 500:
            return {"success": False, "error": "Service temporarily unavailable"}
        else:
            return {"success": False, "error": f"HTTP error: {e.response.status_code}"}
    
    except Timeout:
        return {"success": False, "error": "Request timeout - please try again"}
    
    except RequestException as e:
        return {"success": False, "error": f"Network error: {str(e)}"}
    
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}
```

## 🚦 Rate Limiting

Currently no rate limiting is implemented. For production use, consider:

- Maximum 30 requests per minute per IP
- Maximum 100 requests per hour per IP
- Maximum 5 concurrent requests per IP

## 🔗 Integration Examples

### Flask Web Application

```python
from flask import Flask, request, render_template, flash
import requests

app = Flask(__name__)
app.secret_key = 'your-secret-key'

QUESTION_API_URL = "http://localhost:8000"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_questions():
    materials = request.form.get('materials')
    num_questions = int(request.form.get('num_questions', 5))
    
    try:
        response = requests.post(
            f"{QUESTION_API_URL}/generate",
            json={
                "materials": materials,
                "num_questions": num_questions
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return render_template('results.html', questions=result['questions'])
        else:
            flash('Error generating questions. Please try again.')
            return render_template('index.html')
    
    except Exception as e:
        flash(f'Service error: {str(e)}')
        return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### Django REST API

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests

class QuestionGeneratorView(APIView):
    def post(self, request):
        materials = request.data.get('materials')
        num_questions = request.data.get('num_questions', 5)
        
        if not materials:
            return Response(
                {'error': 'Materials are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            response = requests.post(
                'http://localhost:8000/generate',
                json={
                    'materials': materials,
                    'num_questions': num_questions
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return Response(response.json())
            else:
                return Response(
                    {'error': 'Question generation failed'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

### Express.js API Gateway

```javascript
const express = require('express');
const axios = require('axios');
const multer = require('multer');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

const QUESTION_API_URL = 'http://localhost:8000';

// Proxy text-based generation
app.post('/api/questions/text', async (req, res) => {
    try {
        const response = await axios.post(`${QUESTION_API_URL}/generate`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ 
            error: 'Question generation failed',
            details: error.message 
        });
    }
});

// Proxy PDF-based generation
app.post('/api/questions/pdf', upload.single('pdf'), async (req, res) => {
    try {
        const FormData = require('form-data');
        const fs = require('fs');
        
        const form = new FormData();
        form.append('pdf_file', fs.createReadStream(req.file.path));
        form.append('num_questions', req.body.num_questions || '5');
        
        const response = await axios.post(
            `${QUESTION_API_URL}/generate/pdf`,
            form,
            { headers: form.getHeaders() }
        );
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ 
            error: 'PDF processing failed',
            details: error.message 
        });
    }
});

app.listen(3000, () => {
    console.log('API Gateway running on port 3000');
});
```

## 📊 Performance Guidelines

### Optimal Request Patterns

- **Text length**: 500-4000 characters for best results
- **PDF size**: Under 10MB for optimal processing
- **Questions count**: 1-5 questions for faster response
- **Concurrent requests**: Maximum 5 simultaneous requests

### Response Time Expectations

| Input Type | Size | Expected Time |
|------------|------|---------------|
| Text | 1-2KB | 1.5-2.5 seconds |
| Text | 4-8KB | 2.5-4.0 seconds |
| PDF | 5-10 pages | 3.0-5.0 seconds |
| PDF | 10-20 pages | 5.0-8.0 seconds |

### Best Practices

1. **Batch Processing**: For multiple documents, process sequentially
2. **Caching**: Cache results for identical inputs
3. **Timeout Handling**: Set appropriate timeouts (30+ seconds)
4. **Error Retry**: Implement exponential backoff for retries
5. **Input Validation**: Validate inputs before API calls

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | API key (required) |
| `OPENAI_BASE_URL` | - | Custom API endpoint |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | AI model name |
| `PORT` | `8000` | Service port |
| `DEBUG` | `false` | Debug mode |

### Docker Configuration

```yaml
# docker-compose.yml
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
    restart: unless-stopped
```

## 📞 Support

### Getting Help

1. **API Documentation**: http://localhost:8000/docs
2. **Health Check**: http://localhost:8000/health
3. **Service Status**: Check Docker logs
4. **Configuration Guide**: See `OPENAI_COMPATIBLE_API.md`

### Common Issues

**Service not responding:**
```bash
# Check if service is running
docker-compose ps

# Check logs
docker-compose logs question-generator

# Restart service
docker-compose restart
```

**API key errors:**
```bash
# Verify configuration
cat .env | grep OPENAI

# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.deepseek.com/models
```

---

For more examples and advanced usage, refer to the test files and interactive documentation at `/docs`.
