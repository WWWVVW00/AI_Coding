#!/usr/bin/env python3
"""
Test script for the async RESTful Question Generator API
"""
import requests
import json
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Response: {result}")
        print(f"Active tasks: {result.get('active_tasks', 0)}")
    else:
        print(f"Error: {response.text}")
    return response.status_code == 200

def test_async_text_generation():
    """Test async text-based question generation"""
    print("\n🔍 Testing async text-based question generation...")
    
    # Step 1: Submit task
    test_data = {
        "materials": "Python is a high-level programming language. It features dynamic typing and automatic memory management. Python supports multiple programming paradigms including object-oriented, functional, and procedural programming.",
        "num_questions": 3
    }
    
    print("📤 Submitting generation task...")
    response = requests.post(
        f"{BASE_URL}/tasks/generate",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Submit Status Code: {response.status_code}")
    if response.status_code != 200:
        print(f"Submit Error: {response.text}")
        return False
    
    submit_result = response.json()
    task_id = submit_result["task_id"]
    print(f"Task ID: {task_id}")
    print(f"Initial Status: {submit_result['status']}")
    print(f"Message: {submit_result['message']}")
    
    # Step 2: Poll task status
    print("\n📊 Polling task status...")
    max_attempts = 30  # 30 attempts with 2 second intervals = 1 minute max
    for attempt in range(max_attempts):
        response = requests.get(f"{BASE_URL}/tasks/{task_id}/status")
        if response.status_code != 200:
            print(f"Status check error: {response.text}")
            return False
        
        status_result = response.json()
        print(f"Attempt {attempt + 1}: Status = {status_result['status']}, Progress = {status_result.get('progress', 'N/A')}")
        
        if status_result['status'] == 'completed':
            print("✅ Task completed!")
            break
        elif status_result['status'] == 'failed':
            print(f"❌ Task failed: {status_result.get('error_message', 'Unknown error')}")
            return False
        
        time.sleep(2)  # Wait 2 seconds before next check
    else:
        print("⏰ Task did not complete within timeout period")
        return False
    
    # Step 3: Get result
    print("\n📥 Fetching task result...")
    response = requests.get(f"{BASE_URL}/tasks/{task_id}/result")
    if response.status_code != 200:
        print(f"Result fetch error: {response.text}")
        return False
    
    result = response.json()
    print(f"Final Status: {result['status']}")
    
    if result['result']:
        questions = result['result']['questions']
        generation_time = result['result']['generation_time']
        print(f"Generated {len(questions)} questions in {generation_time:.2f} seconds")
        
        for i, q in enumerate(questions, 1):
            print(f"\nQuestion {i}:")
            print(f"  Text: {q['question']}")
            print(f"  Difficulty: {q['difficulty']}")
            print(f"  Topic: {q['topic']}")
            print(f"  Answer: {q['answer'][:100]}...")  # First 100 chars of answer
    
    return True

def test_task_management():
    """Test task management endpoints"""
    print("\n🔍 Testing task management...")
    
    # List all tasks
    print("📋 Listing all tasks...")
    response = requests.get(f"{BASE_URL}/tasks")
    if response.status_code == 200:
        result = response.json()
        print(f"Total tasks: {result['total']}")
        if result['tasks']:
            print("Recent tasks:")
            for task in result['tasks'][:3]:  # Show first 3 tasks
                print(f"  - {task['task_id'][:8]}... | Status: {task['status']} | Created: {task['created_at']}")
    else:
        print(f"List tasks error: {response.text}")
        return False
    
    # List completed tasks only
    print("\n📋 Listing completed tasks...")
    response = requests.get(f"{BASE_URL}/tasks?status=completed")
    if response.status_code == 200:
        result = response.json()
        print(f"Completed tasks: {result['total']}")
    else:
        print(f"List completed tasks error: {response.text}")
        return False
    
    return True

def test_backwards_compatibility():
    """Test that legacy endpoints still work"""
    print("\n🔍 Testing backwards compatibility...")
    
    test_data = {
        "materials": "Machine learning is a subset of artificial intelligence.",
        "num_questions": 1
    }
    
    response = requests.post(
        f"{BASE_URL}/generate",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Legacy endpoint status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Generated {len(result['questions'])} questions using legacy endpoint")
        return True
    else:
        print(f"Legacy endpoint error: {response.text}")
        return False

def test_api_config():
    """Test API configuration"""
    print("\n🔍 Testing API configuration...")
    
    # Check environment variables
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")
    model = os.getenv("OPENAI_MODEL")
    
    print(f"API Key: {'✓ Set' if api_key else '✗ Not set'}")
    print(f"Base URL: {base_url or 'Not set'}")
    print(f"Model: {model or 'Not set'}")
    
    return bool(api_key and base_url and model)

def main():
    """Run all tests"""
    print("🚀 Starting Async Question Generator API Tests")
    print("=" * 60)
    
    tests = [
        ("API Configuration", test_api_config),
        ("Health Check", test_health),
        ("Async Text Generation", test_async_text_generation),
        ("Task Management", test_task_management),
        ("Backwards Compatibility", test_backwards_compatibility),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            print(f"\n{'='*20} {test_name} {'='*20}")
            result = test_func()
            results.append((test_name, result))
            print(f"✓ {test_name}: {'PASS' if result else 'FAIL'}")
        except Exception as e:
            results.append((test_name, False))
            print(f"✗ {test_name}: ERROR - {e}")
    
    print("\n" + "=" * 60)
    print("📊 Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! The async RESTful API is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the configuration and logs.")
    
    print("\n📚 API Usage Guide:")
    print("1. Submit task: POST /tasks/generate")
    print("2. Check status: GET /tasks/{task_id}/status")
    print("3. Get result: GET /tasks/{task_id}/result")
    print("4. List tasks: GET /tasks")
    print("5. Legacy sync endpoint still available: POST /generate")

if __name__ == "__main__":
    main()
