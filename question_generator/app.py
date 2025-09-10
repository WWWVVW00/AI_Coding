from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
import PyPDF2
from io import BytesIO
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import uuid
import asyncio
from enum import Enum

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Task status enum
class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# In-memory task storage (in production, use Redis or database)
task_storage: Dict[str, Dict[str, Any]] = {}

# FastAPI app
app = FastAPI(
    title="Question Generator API",
    description="AI-powered question generation microservice",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class QuestionInput(BaseModel):
    materials: str = Field(..., description="Educational materials for question generation")
    num_questions: int = Field(default=5, ge=1, le=10, description="Number of questions to generate")

class QuestionResponse(BaseModel):
    question: str
    answer: str
    difficulty: str
    topic: str

class GenerationResult(BaseModel):
    questions: List[QuestionResponse]
    generation_time: float

class TaskSubmitResponse(BaseModel):
    task_id: str
    status: TaskStatus
    message: str

class TaskStatusResponse(BaseModel):
    task_id: str
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    progress: Optional[str] = None
    error_message: Optional[str] = None

class TaskResultResponse(BaseModel):
    task_id: str
    status: TaskStatus
    result: Optional[GenerationResult] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

# Global AI client (lazy initialization)
llm = None

def get_llm():
    """Lazy initialization of LLM client"""
    global llm
    if llm is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return get_llm_google()
        
        llm = ChatOpenAI(
           model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
           api_key=api_key,
           base_url=os.getenv("OPENAI_BASE_URL"),
           temperature=0.7,
           max_tokens=2000
        )

        # --- 核心改动：使用 ChatGoogleGenerativeAI ---
        # llm = ChatGoogleGenerativeAI(
        #     model=os.getenv("GOOGLE_MODEL", "gemini-2.5-pro"),
        #     google_api_key=api_key,
        #     temperature=0.7,
        #     convert_system_message_to_human=True # Gemini需要这个设置
        # )
    return llm

def get_llm_google():
    """Lazy initialization of LLM client for Google Gemini"""
    global llm
    if llm is None:
        # 1. 明确检查 GOOGLE_API_KEY
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            # 2. 抛出正确的错误信息
            raise HTTPException(
                status_code=500, 
                detail="GOOGLE_API_KEY environment variable not set"
            )
        
        # 3. 初始化 ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model=os.getenv("GOOGLE_MODEL", "gemini-pro"),
            google_api_key=api_key,
            temperature=0.7,
            convert_system_message_to_human=True 
        )
    return llm


# Text splitter for large documents
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=4000,
    chunk_overlap=200
)

# Prompt template
prompt_template = PromptTemplate(
    input_variables=["materials", "num_questions"],
    template="""Based on the following educational materials, generate {num_questions} high-quality exam questions with detailed answers.

Materials:
{materials}

For each question, provide:
1. The question text
2. A detailed answer
3. Difficulty level (easy/medium/hard)
4. Main topic

Format your response as JSON:
{{
  "questions": [
    {{
      "question": "question text",
      "answer": "detailed answer",
      "difficulty": "medium",
      "topic": "main topic"
    }}
  ]
}}

Generate the questions now:"""
)

def extract_pdf_text(pdf_file: UploadFile) -> str:
    """Extract text from PDF file"""
    try:
        content = pdf_file.file.read()
        pdf_reader = PyPDF2.PdfReader(BytesIO(content))
        text = ""
        
        for page in pdf_reader.pages[:20]:  # Limit to 20 pages
            text += page.extract_text() + "\n"
        
        if not text.strip():
            raise ValueError("No readable text found in PDF")
        
        return text
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to process PDF: {str(e)}")

async def process_generation_task(task_id: str, materials: str, num_questions: int):
    """Background task for processing question generation"""
    try:
        # Update task status to processing
        task_storage[task_id]["status"] = TaskStatus.PROCESSING
        task_storage[task_id]["updated_at"] = datetime.now()
        task_storage[task_id]["progress"] = "Starting question generation..."
        
        logger.info(f"Starting task {task_id}")
        
        # Generate questions
        result = await asyncio.to_thread(generate_questions, materials, num_questions)
        
        # Update task as completed
        task_storage[task_id]["status"] = TaskStatus.COMPLETED
        task_storage[task_id]["result"] = result
        task_storage[task_id]["completed_at"] = datetime.now()
        task_storage[task_id]["updated_at"] = datetime.now()
        
        logger.info(f"Task {task_id} completed successfully")
        
    except Exception as e:
        # Update task as failed
        error_msg = str(e)
        task_storage[task_id]["status"] = TaskStatus.FAILED
        task_storage[task_id]["error_message"] = error_msg
        task_storage[task_id]["updated_at"] = datetime.now()
        
        logger.error(f"Task {task_id} failed: {error_msg}")

def generate_questions(materials: str, num_questions: int) -> dict:
    """Generate questions using LangChain"""
    try:
        # Split text if too long
        if len(materials) > 8000:
            chunks = text_splitter.split_text(materials)
            materials = chunks[0]  # Use first chunk
        
        # Generate prompt
        prompt = prompt_template.format(
            materials=materials,
            num_questions=num_questions
        )
        
        # Call LLM
        start_time = datetime.now()
        response = get_llm().invoke(prompt)
        generation_time = (datetime.now() - start_time).total_seconds()
        
        # Parse response
        try:
            import json
            # Log the raw response for debugging
            logger.info(f"AI Raw Response: {response.content[:500]}...")
            
            # Try to extract JSON from response if it's wrapped in text
            content = response.content.strip()
            
            # Look for JSON block in the response
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end != -1:
                    content = content[start:end].strip()
            elif "{" in content and "}" in content:
                start = content.find("{")
                end = content.rfind("}") + 1
                content = content[start:end]
            
            result = json.loads(content)
            result["generation_time"] = generation_time
            return result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"JSON parsing failed: {e}")
            logger.error(f"Raw response: {response.content}")
            
            # Try to parse the response manually
            content = response.content
            questions = []
            
            # Simple pattern matching for questions and answers
            lines = content.split('\n')
            current_question = ""
            current_answer = ""
            current_difficulty = "medium"
            current_topic = "general"
            
            for line in lines:
                line = line.strip()
                if line.lower().startswith(('question', 'q:', 'q.', '**question')):
                    if current_question:
                        questions.append({
                            "question": current_question,
                            "answer": current_answer or "Answer based on the provided materials",
                            "difficulty": current_difficulty,
                            "topic": current_topic
                        })
                    current_question = line
                    current_answer = ""
                elif line.lower().startswith(('answer', 'a:', 'a.', '**answer')):
                    current_answer = line
                elif line and current_question and not current_answer:
                    current_answer = line
            
            # Add the last question
            if current_question:
                questions.append({
                    "question": current_question,
                    "answer": current_answer or "Answer based on the provided materials",
                    "difficulty": current_difficulty,
                    "topic": current_topic
                })
            
            # If no questions found, create basic ones
            if not questions:
                questions = [{
                    "question": f"Based on the materials about {materials[:50]}..., explain the key concepts.",
                    "answer": f"The materials discuss: {materials[:200]}...",
                    "difficulty": "medium",
                    "topic": "general"
                }]
            
            return {
                "questions": questions[:num_questions],
                "generation_time": generation_time
            }
            
    except Exception as e:
        logger.error(f"Question generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# API Routes
@app.get("/")
async def root():
    return {
        "service": "Question Generator",
        "version": "1.0.0",
        "status": "running",
        "mode": "async_restful"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_tasks": len([t for t in task_storage.values() if t["status"] in [TaskStatus.PENDING, TaskStatus.PROCESSING]])
    }

@app.post("/tasks/generate", response_model=TaskSubmitResponse)
async def submit_generation_task(input_data: QuestionInput, background_tasks: BackgroundTasks):
    """Submit a question generation task"""
    try:
        # Generate task ID
        task_id = str(uuid.uuid4())
        
        # Store task metadata
        task_storage[task_id] = {
            "task_id": task_id,
            "status": TaskStatus.PENDING,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "materials": input_data.materials,
            "num_questions": input_data.num_questions,
            "progress": "Task submitted",
            "result": None,
            "error_message": None,
            "completed_at": None
        }
        
        # Add background task
        background_tasks.add_task(
            process_generation_task,
            task_id,
            input_data.materials,
            input_data.num_questions
        )
        
        logger.info(f"Task {task_id} submitted")
        
        return TaskSubmitResponse(
            task_id=task_id,
            status=TaskStatus.PENDING,
            message="Task submitted successfully. Use /tasks/{task_id}/status to check progress."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tasks/generate/pdf", response_model=TaskSubmitResponse)
async def submit_pdf_generation_task(
    background_tasks: BackgroundTasks,
    pdf_file: UploadFile = File(...),
    num_questions: int = 5
):
    """Submit a PDF question generation task"""
    try:
        # Extract text from PDF
        materials = extract_pdf_text(pdf_file)
        
        # Generate task ID
        task_id = str(uuid.uuid4())
        
        # Store task metadata
        task_storage[task_id] = {
            "task_id": task_id,
            "status": TaskStatus.PENDING,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "materials": materials,
            "num_questions": num_questions,
            "progress": "PDF processed, task submitted",
            "result": None,
            "error_message": None,
            "completed_at": None,
            "source": "pdf",
            "filename": pdf_file.filename
        }
        
        # Add background task
        background_tasks.add_task(
            process_generation_task,
            task_id,
            materials,
            num_questions
        )
        
        logger.info(f"PDF Task {task_id} submitted for file: {pdf_file.filename}")
        
        return TaskSubmitResponse(
            task_id=task_id,
            status=TaskStatus.PENDING,
            message=f"PDF task submitted successfully. Processed file: {pdf_file.filename}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Get task status"""
    if task_id not in task_storage:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = task_storage[task_id]
    
    return TaskStatusResponse(
        task_id=task_id,
        status=task["status"],
        created_at=task["created_at"],
        updated_at=task["updated_at"],
        progress=task.get("progress"),
        error_message=task.get("error_message")
    )

@app.get("/tasks/{task_id}/result", response_model=TaskResultResponse)
async def get_task_result(task_id: str):
    """Get task result"""
    if task_id not in task_storage:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = task_storage[task_id]
    
    # Convert result to GenerationResult if completed
    result = None
    if task["status"] == TaskStatus.COMPLETED and task["result"]:
        result = GenerationResult(
            questions=[QuestionResponse(**q) for q in task["result"]["questions"]],
            generation_time=task["result"]["generation_time"]
        )
    
    return TaskResultResponse(
        task_id=task_id,
        status=task["status"],
        result=result,
        error_message=task.get("error_message"),
        created_at=task["created_at"],
        completed_at=task.get("completed_at")
    )

@app.get("/tasks")
async def list_tasks(status: Optional[TaskStatus] = None, limit: int = 50):
    """List all tasks with optional status filter"""
    tasks = []
    
    for task in task_storage.values():
        if status is None or task["status"] == status:
            tasks.append({
                "task_id": task["task_id"],
                "status": task["status"],
                "created_at": task["created_at"],
                "updated_at": task["updated_at"],
                "progress": task.get("progress"),
                "num_questions": task.get("num_questions"),
                "source": task.get("source", "text"),
                "filename": task.get("filename")
            })
    
    # Sort by creation time (newest first)
    tasks.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {
        "tasks": tasks[:limit],
        "total": len(tasks),
        "filtered_by_status": status.value if status else None
    }

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    if task_id not in task_storage:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = task_storage[task_id]
    
    # Only allow deletion of completed or failed tasks
    if task["status"] in [TaskStatus.PENDING, TaskStatus.PROCESSING]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete active task. Wait for completion or failure."
        )
    
    del task_storage[task_id]
    
    return {"message": f"Task {task_id} deleted successfully"}

# Legacy endpoints for backward compatibility (now deprecated)
@app.post("/generate", response_model=GenerationResult)
async def generate_questions_endpoint(input_data: QuestionInput):
    """Generate questions from text materials (DEPRECATED: Use /tasks/generate instead)"""
    try:
        result = generate_questions(input_data.materials, input_data.num_questions)
        
        return GenerationResult(
            questions=[QuestionResponse(**q) for q in result["questions"]],
            generation_time=result["generation_time"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/pdf")
async def generate_from_pdf(
    pdf_file: UploadFile = File(...),
    num_questions: int = 5
):
    """Generate questions from PDF file (DEPRECATED: Use /tasks/generate/pdf instead)"""
    try:
        # Extract text from PDF
        materials = extract_pdf_text(pdf_file)
        
        # Generate questions
        result = generate_questions(materials, num_questions)
        
        return {
            "questions": result["questions"],
            "generation_time": result["generation_time"],
            "source": "pdf"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting Question Generator microservice on port {port}")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("DEBUG", "false").lower() == "true"
    )
