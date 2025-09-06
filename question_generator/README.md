# Question Generator Service

A service that automatically generates exam questions and answers from course materials using LLM.

## Features
- Accepts course outlines, textbooks, and exam materials as input
- Generates questions and answers using OpenAI-compatible API
- Docker deployment support

## Requirements
- Python 3.8+
- Docker (for deployment)

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Configure API keys in `.env` file
3. Run service: `python app.py`

## Docker Deployment
```bash
docker build -t question-generator .
docker run -p 5000:5000 question-generator
```