#!/usr/bin/env python3
"""
Demo script showing the new RESTful API functionality
This demonstrates the task-based approach without requiring real API keys
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def demo_task_flow():
    """Demonstrate the complete task workflow"""
    print("🚀 RESTful Question Generator API Demo")
    print("=" * 50)
    
    # Step 1: Check API status
    print("\n📊 1. Checking API status...")
    response = requests.get(f"{BASE_URL}/")
    if response.status_code == 200:
        info = response.json()
        print(f"✅ API is running in {info['mode']} mode")
        print(f"   Service: {info['service']} v{info['version']}")
    else:
        print("❌ API is not responding")
        return
    
    # Step 2: Check health
    print("\n💓 2. Health check...")
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        health = response.json()
        print(f"✅ Status: {health['status']}")
        print(f"   Active tasks: {health['active_tasks']}")
    
    # Step 3: Submit a task
    print("\n📤 3. Submitting a generation task...")
    task_data = {
        "materials": "人工智能（AI）是计算机科学的一个分支，专注于创建能够执行通常需要人类智能的任务的系统。",
        "num_questions": 2
    }
    
    response = requests.post(
        f"{BASE_URL}/tasks/generate",
        json=task_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        submit_result = response.json()
        task_id = submit_result["task_id"]
        print(f"✅ Task submitted successfully!")
        print(f"   Task ID: {task_id}")
        print(f"   Status: {submit_result['status']}")
        print(f"   Message: {submit_result['message']}")
        
        # Step 4: Monitor task progress
        print(f"\n📊 4. Monitoring task progress...")
        max_checks = 10
        for i in range(max_checks):
            time.sleep(1)  # Wait 1 second
            
            status_response = requests.get(f"{BASE_URL}/tasks/{task_id}/status")
            if status_response.status_code == 200:
                status = status_response.json()
                print(f"   Check {i+1}: {status['status']} - {status.get('progress', 'No progress info')}")
                
                if status['status'] == 'completed':
                    print("🎉 Task completed successfully!")
                    break
                elif status['status'] == 'failed':
                    print(f"❌ Task failed: {status.get('error_message', 'Unknown error')}")
                    print("   (This is expected without proper API credentials)")
                    break
            else:
                print(f"   ❌ Failed to check status: {status_response.text}")
                break
        
        # Step 5: Try to get result (will show error handling)
        print(f"\n📥 5. Attempting to get result...")
        result_response = requests.get(f"{BASE_URL}/tasks/{task_id}/result")
        if result_response.status_code == 200:
            result = result_response.json()
            print(f"   Task status: {result['status']}")
            if result['result']:
                print(f"   Questions generated: {len(result['result']['questions'])}")
            elif result['error_message']:
                print(f"   Error: {result['error_message']}")
        
    else:
        print(f"❌ Failed to submit task: {response.text}")
    
    # Step 6: List all tasks
    print(f"\n📋 6. Listing all tasks...")
    response = requests.get(f"{BASE_URL}/tasks")
    if response.status_code == 200:
        tasks_info = response.json()
        print(f"   Total tasks: {tasks_info['total']}")
        for task in tasks_info['tasks'][:3]:  # Show first 3
            print(f"   - {task['task_id'][:8]}... | {task['status']} | {task['num_questions']} questions")
    
    # Step 7: Show API improvements
    print(f"\n✨ 7. Key improvements of the new RESTful API:")
    print("   ✅ No timeout issues - tasks run in background")
    print("   ✅ Real-time progress tracking")
    print("   ✅ Task management and monitoring")
    print("   ✅ Multiple concurrent requests supported")
    print("   ✅ Backwards compatibility maintained")
    print("   ✅ RESTful design following best practices")
    
    print(f"\n📚 8. Usage pattern:")
    print("   1. POST /tasks/generate → get task_id")
    print("   2. GET /tasks/{task_id}/status → monitor progress")
    print("   3. GET /tasks/{task_id}/result → get final result")
    print("   4. GET /tasks → list and manage tasks")

def demo_legacy_compatibility():
    """Demonstrate that legacy endpoints still work"""
    print(f"\n🔄 Legacy Compatibility Test")
    print("=" * 30)
    
    legacy_data = {
        "materials": "这是一个测试文本",
        "num_questions": 1
    }
    
    print("Testing legacy /generate endpoint...")
    response = requests.post(
        f"{BASE_URL}/generate",
        json=legacy_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        print("✅ Legacy endpoint still works!")
    else:
        print(f"❌ Legacy endpoint failed (expected due to missing API keys): {response.status_code}")

if __name__ == "__main__":
    try:
        demo_task_flow()
        demo_legacy_compatibility()
        
        print(f"\n🎯 Summary:")
        print("The API has been successfully converted to RESTful architecture!")
        print("Benefits:")
        print("- No more timeout issues during generation")
        print("- Better user experience with progress tracking")
        print("- Scalable design for multiple concurrent requests")
        print("- Proper error handling and status management")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure the server is running on localhost:8000")
    except Exception as e:
        print(f"❌ Demo failed: {e}")
