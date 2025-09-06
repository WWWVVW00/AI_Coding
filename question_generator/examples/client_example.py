#!/usr/bin/env python3
"""
Simple client example for the async Question Generator API
"""
import requests
import time
import json

class QuestionGeneratorClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def submit_text_task(self, materials, num_questions=5):
        """Submit a text generation task"""
        response = requests.post(
            f"{self.base_url}/tasks/generate",
            json={
                "materials": materials,
                "num_questions": num_questions
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to submit task: {response.text}")
        
        return response.json()["task_id"]
    
    def submit_pdf_task(self, pdf_path, num_questions=5):
        """Submit a PDF generation task"""
        with open(pdf_path, 'rb') as f:
            files = {'pdf_file': f}
            data = {'num_questions': num_questions}
            
            response = requests.post(
                f"{self.base_url}/tasks/generate/pdf",
                files=files,
                data=data
            )
        
        if response.status_code != 200:
            raise Exception(f"Failed to submit PDF task: {response.text}")
        
        return response.json()["task_id"]
    
    def get_task_status(self, task_id):
        """Get task status"""
        response = requests.get(f"{self.base_url}/tasks/{task_id}/status")
        
        if response.status_code != 200:
            raise Exception(f"Failed to get task status: {response.text}")
        
        return response.json()
    
    def get_task_result(self, task_id):
        """Get task result"""
        response = requests.get(f"{self.base_url}/tasks/{task_id}/result")
        
        if response.status_code != 200:
            raise Exception(f"Failed to get task result: {response.text}")
        
        return response.json()
    
    def wait_for_completion(self, task_id, max_wait_time=300, poll_interval=2):
        """Wait for task completion with timeout"""
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:
            status = self.get_task_status(task_id)
            
            print(f"Status: {status['status']} - {status.get('progress', 'No progress info')}")
            
            if status['status'] == 'completed':
                return self.get_task_result(task_id)
            elif status['status'] == 'failed':
                raise Exception(f"Task failed: {status.get('error_message', 'Unknown error')}")
            
            time.sleep(poll_interval)
        
        raise TimeoutError(f"Task {task_id} did not complete within {max_wait_time} seconds")
    
    def generate_questions(self, materials, num_questions=5, max_wait_time=300):
        """High-level method to generate questions with automatic waiting"""
        print(f"Submitting task to generate {num_questions} questions...")
        task_id = self.submit_text_task(materials, num_questions)
        print(f"Task ID: {task_id}")
        
        print("Waiting for completion...")
        result = self.wait_for_completion(task_id, max_wait_time)
        
        if result['result']:
            return result['result']
        else:
            raise Exception("Task completed but no result available")
    
    def list_tasks(self, status=None, limit=10):
        """List tasks"""
        params = {'limit': limit}
        if status:
            params['status'] = status
        
        response = requests.get(f"{self.base_url}/tasks", params=params)
        
        if response.status_code != 200:
            raise Exception(f"Failed to list tasks: {response.text}")
        
        return response.json()

def main():
    """Example usage"""
    client = QuestionGeneratorClient()
    
    # Example 1: Generate questions from text
    print("=" * 50)
    print("Example 1: Text-based generation")
    print("=" * 50)
    
    materials = """
    Machine Learning is a subset of artificial intelligence that focuses on algorithms 
    that can learn from and make predictions or decisions based on data. It involves 
    training models on historical data to identify patterns and relationships, which 
    can then be used to make predictions on new, unseen data.
    
    There are three main types of machine learning:
    1. Supervised Learning: Uses labeled data to train models
    2. Unsupervised Learning: Finds patterns in unlabeled data
    3. Reinforcement Learning: Learns through interaction with an environment
    """
    
    try:
        result = client.generate_questions(materials, num_questions=3)
        
        print(f"\n✅ Generated {len(result['questions'])} questions in {result['generation_time']:.2f} seconds")
        
        for i, question in enumerate(result['questions'], 1):
            print(f"\n--- Question {i} ---")
            print(f"Question: {question['question']}")
            print(f"Difficulty: {question['difficulty']}")
            print(f"Topic: {question['topic']}")
            print(f"Answer: {question['answer'][:100]}...")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Example 2: List recent tasks
    print("\n" + "=" * 50)
    print("Example 2: List recent tasks")
    print("=" * 50)
    
    try:
        tasks_info = client.list_tasks(limit=5)
        print(f"Total tasks: {tasks_info['total']}")
        
        for task in tasks_info['tasks']:
            print(f"Task {task['task_id'][:8]}... | Status: {task['status']} | Questions: {task.get('num_questions', 'N/A')}")
    
    except Exception as e:
        print(f"❌ Error listing tasks: {e}")
    
    # Example 3: Async task submission (fire and forget)
    print("\n" + "=" * 50)
    print("Example 3: Async task submission")
    print("=" * 50)
    
    try:
        short_materials = "Photosynthesis is the process by which plants convert sunlight into energy."
        task_id = client.submit_text_task(short_materials, num_questions=2)
        print(f"✅ Task {task_id} submitted successfully!")
        print("You can check its status later with:")
        print(f"  curl http://localhost:8000/tasks/{task_id}/status")
        print(f"  curl http://localhost:8000/tasks/{task_id}/result")
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
