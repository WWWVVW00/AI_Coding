# RESTful Question Generator API Documentation

## Overview

The Question Generator API has been upgraded to support asynchronous, RESTful operations to prevent timeout issues during question generation. The API now uses a task-based approach where you submit generation requests and poll for results.

## Key Features

- **Async Processing**: Submit tasks and check status without blocking
- **RESTful Design**: Standard HTTP methods and status codes
- **Task Management**: Track, list, and manage generation tasks
- **Backwards Compatibility**: Legacy synchronous endpoints still available
- **Progress Tracking**: Real-time status updates and progress information

## Base URL

```
http://localhost:8000
```

## API Endpoints

### 1. Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-06T10:30:00",
  "active_tasks": 2
}
```

### 2. Submit Text Generation Task

```http
POST /tasks/generate
```

**Request Body:**
```json
{
  "materials": "Your educational content here...",
  "num_questions": 5
}
```

**Response:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Task submitted successfully. Use /tasks/{task_id}/status to check progress."
}
```

### 3. Submit PDF Generation Task

```http
POST /tasks/generate/pdf
```

**Request:** Form-data with:
- `pdf_file`: PDF file
- `num_questions`: Number of questions (optional, default: 5)

**Response:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "pending",
  "message": "PDF task submitted successfully. Processed file: document.pdf"
}
```

### 4. Check Task Status

```http
GET /tasks/{task_id}/status
```

**Response:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "created_at": "2025-09-06T10:30:00",
  "updated_at": "2025-09-06T10:30:15",
  "progress": "Generating questions...",
  "error_message": null
}
```

**Task Status Values:**
- `pending`: Task submitted, waiting to start
- `processing`: Task is currently being processed
- `completed`: Task finished successfully
- `failed`: Task failed with error

### 5. Get Task Result

```http
GET /tasks/{task_id}/result
```

**Response (when completed):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": {
    "questions": [
      {
        "question": "What is Python?",
        "answer": "Python is a high-level programming language...",
        "difficulty": "easy",
        "topic": "programming"
      }
    ],
    "generation_time": 2.5
  },
  "error_message": null,
  "created_at": "2025-09-06T10:30:00",
  "completed_at": "2025-09-06T10:30:25"
}
```

### 6. List Tasks

```http
GET /tasks?status=completed&limit=10
```

**Parameters:**
- `status` (optional): Filter by task status
- `limit` (optional): Maximum number of tasks to return (default: 50)

**Response:**
```json
{
  "tasks": [
    {
      "task_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "created_at": "2025-09-06T10:30:00",
      "updated_at": "2025-09-06T10:30:25",
      "progress": "Completed",
      "num_questions": 5,
      "source": "text",
      "filename": null
    }
  ],
  "total": 1,
  "filtered_by_status": "completed"
}
```

### 7. Delete Task

```http
DELETE /tasks/{task_id}
```

**Response:**
```json
{
  "message": "Task 550e8400-e29b-41d4-a716-446655440000 deleted successfully"
}
```

## Legacy Endpoints (Deprecated but Supported)

### Synchronous Text Generation
```http
POST /generate
```

### Synchronous PDF Generation
```http
POST /generate/pdf
```

⚠️ **Warning**: These endpoints are synchronous and may timeout for large documents or slow AI responses. Use the async endpoints instead.

## Usage Workflow

### 1. Basic Text Generation

```bash
# 1. Submit task
curl -X POST "http://localhost:8000/tasks/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "materials": "Your educational content here",
    "num_questions": 3
  }'

# Response: {"task_id": "abc123...", "status": "pending", ...}

# 2. Check status
curl "http://localhost:8000/tasks/abc123.../status"

# 3. Get result (when status is "completed")
curl "http://localhost:8000/tasks/abc123.../result"
```

### 2. PDF Generation

```bash
# 1. Submit PDF task
curl -X POST "http://localhost:8000/tasks/generate/pdf" \
  -F "pdf_file=@document.pdf" \
  -F "num_questions=5"

# 2. Check status and get result (same as above)
```

### 3. Task Management

```bash
# List all tasks
curl "http://localhost:8000/tasks"

# List only completed tasks
curl "http://localhost:8000/tasks?status=completed"

# Delete a task
curl -X DELETE "http://localhost:8000/tasks/abc123..."
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `400`: Bad request (invalid input)
- `404`: Task not found
- `500`: Internal server error

Error responses include details:
```json
{
  "detail": "Task not found"
}
```

## Benefits of the New API

1. **No Timeouts**: Long-running generation tasks won't cause client timeouts
2. **Progress Tracking**: Real-time status updates and progress information
3. **Scalability**: Can handle multiple concurrent generation requests
4. **Task Management**: List, monitor, and clean up tasks
5. **Flexibility**: Check results at any time, even after disconnection

## Python Client Example

```python
import requests
import time

def generate_questions_async(materials, num_questions=5):
    base_url = "http://localhost:8000"
    
    # Submit task
    response = requests.post(f"{base_url}/tasks/generate", json={
        "materials": materials,
        "num_questions": num_questions
    })
    
    if response.status_code != 200:
        raise Exception(f"Failed to submit task: {response.text}")
    
    task_id = response.json()["task_id"]
    print(f"Task submitted: {task_id}")
    
    # Poll for completion
    while True:
        status_response = requests.get(f"{base_url}/tasks/{task_id}/status")
        status = status_response.json()
        
        print(f"Status: {status['status']} - {status.get('progress', '')}")
        
        if status['status'] == 'completed':
            # Get result
            result_response = requests.get(f"{base_url}/tasks/{task_id}/result")
            return result_response.json()['result']
        elif status['status'] == 'failed':
            raise Exception(f"Task failed: {status.get('error_message')}")
        
        time.sleep(2)

# Usage
materials = "Python is a programming language..."
result = generate_questions_async(materials, 3)
print(f"Generated {len(result['questions'])} questions")
```

## Configuration

The API requires the following environment variables:

```bash
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=your_base_url
OPENAI_MODEL=gpt-3.5-turbo
```

## Running the API

```bash
# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
```

The API will be available at `http://localhost:8000` with interactive documentation at `http://localhost:8000/docs`.
