#!/usr/bin/env python3
"""Simple test script for Question Generator microservice"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_generate():
    """Test question generation"""
    print("\nTesting question generation...")
    
    payload = {
        "materials": "Python is a programming language. It has variables, functions, and classes.",
        "num_questions": 2
    }
    
    response = requests.post(f"{BASE_URL}/generate", json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Generated {len(result['questions'])} questions")
        print(f"Generation time: {result['generation_time']:.2f}s")
        
        for i, q in enumerate(result['questions'], 1):
            print(f"\nQuestion {i}: {q['question']}")
            print(f"Answer: {q['answer'][:100]}...")
            print(f"Difficulty: {q['difficulty']}, Topic: {q['topic']}")
    else:
        print(f"Error: {response.text}")
    
    return response.status_code == 200

def main():
    """Run all tests"""
    print("🧪 Testing Question Generator Microservice")
    print("=" * 50)
    
    success = True
    success &= test_health()
    success &= test_generate()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed!")
    
    return success

if __name__ == "__main__":
    main()

async def test_root_endpoint():
    """Test root endpoint"""
    print("\n=== Testing Root Endpoint ===")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/", timeout=5.0)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Root endpoint works: {result['service']}")
                print(f"   Framework: {result.get('framework', 'N/A')}")
            else:
                print(f"❌ Root endpoint failed: {response.text}")
                
        except Exception as e:
            print(f"❌ Root endpoint failed: {e}")

async def test_json_input():
    """Test JSON input functionality"""
    print("\n=== Testing JSON Input ===")
    
    payload = {
        "course_outline": "Introduction to Python programming and data structures",
        "textbook_materials": "Python fundamentals: variables, data types, control structures, functions, classes, and object-oriented programming principles.",
        "exam_materials": "Focus areas: loops, functions, data structures, exception handling, and basic algorithms.",
        "num_questions": 3
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/generate_questions",
                json=payload,
                timeout=TIMEOUT
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                questions = result.get('questions', [])
                print(f"✅ Success! Generated {len(questions)} questions")
                print(f"   Generation time: {result.get('generation_time_seconds', 0):.2f}s")
                
                # Display first question as example
                if questions:
                    q = questions[0]
                    print(f"\n   Example Question:")
                    print(f"   Topic: {q.get('topic', 'N/A')}")
                    print(f"   Difficulty: {q.get('difficulty', 'N/A')}")
                    print(f"   Type: {q.get('question_type', 'N/A')}")
                    print(f"   Q: {q.get('question', '')[:100]}...")
                    print(f"   A: {q.get('answer', '')[:100]}...")
            else:
                result = response.json()
                print(f"❌ Error: {result}")
                
        except Exception as e:
            print(f"❌ JSON input test failed: {e}")

async def test_simple_endpoint():
    """Test simplified endpoint"""
    print("\n=== Testing Simple Endpoint ===")
    
    payload = {
        "textbook_materials": "Python basics: variables, functions, loops, and data structures like lists and dictionaries.",
        "num_questions": 2
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/generate_questions_simple",
                json=payload,
                timeout=TIMEOUT
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                questions = result.get('questions', [])
                print(f"✅ Simple endpoint works! Generated {len(questions)} questions")
                
                # Display first question
                if questions:
                    q = questions[0]
                    print(f"\n   Question: {q.get('question', '')[:80]}...")
                    print(f"   Answer: {q.get('answer', '')[:80]}...")
            else:
                result = response.json()
                print(f"❌ Error: {result}")
                
        except Exception as e:
            print(f"❌ Simple endpoint test failed: {e}")

async def test_stats_endpoint():
    """Test stats endpoint"""
    print("\n=== Testing Stats Endpoint ===")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/stats", timeout=5.0)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Stats endpoint works!")
                print(f"   Uptime: {result.get('uptime_human', 'N/A')}")
                print(f"   Model: {result.get('configuration', {}).get('model', 'N/A')}")
                print(f"   Mock mode: {result.get('configuration', {}).get('mock_mode', 'N/A')}")
            else:
                print(f"❌ Stats endpoint failed: {response.text}")
                
        except Exception as e:
            print(f"❌ Stats endpoint failed: {e}")

async def test_error_handling():
    """Test error handling with invalid inputs"""
    print("\n=== Testing Error Handling ===")
    
    # Test empty request
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/generate_questions",
                json={},
                timeout=10.0
            )
            
            print(f"Empty request - Status: {response.status_code}")
            if response.status_code == 400:
                print("✅ Correctly handled empty request")
            else:
                result = response.json()
                print(f"❌ Unexpected response: {result}")
                
        except Exception as e:
            print(f"❌ Error handling test failed: {e}")

async def test_file_upload():
    """Test PDF file upload (simulated)"""
    print("\n=== Testing File Upload Capability ===")
    
    # Create a dummy text file to simulate PDF upload
    test_content = "This is test educational content for question generation."
    
    async with httpx.AsyncClient() as client:
        try:
            # Simulate file upload with text content
            files = {
                "textbook_pdf": ("test.txt", test_content.encode(), "text/plain")
            }
            
            response = await client.post(
                f"{BASE_URL}/generate_questions",
                files=files,
                timeout=TIMEOUT
            )
            
            print(f"File upload test - Status: {response.status_code}")
            
            # Note: This will likely fail since we're sending text, not PDF
            # But it tests the upload mechanism
            if response.status_code in [200, 400]:
                print("✅ File upload endpoint is accessible")
            else:
                print(f"⚠️  File upload test result: {response.status_code}")
                
        except Exception as e:
            print(f"⚠️  File upload test failed (expected): {e}")

async def performance_test():
    """Test API performance"""
    print("\n=== Performance Test ===")
    
    payload = {
        "textbook_materials": "Brief Python introduction for performance testing: variables, functions, basic control structures.",
        "num_questions": 2
    }
    
    start_time = time.time()
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/generate_questions_simple",
                json=payload,
                timeout=TIMEOUT
            )
            
            end_time = time.time()
            total_time = end_time - start_time
            
            print(f"Total request time: {total_time:.2f} seconds")
            
            if response.status_code == 200:
                result = response.json()
                questions_count = len(result.get('questions', []))
                print(f"✅ Generated {questions_count} questions in {total_time:.2f}s")
                
                # Check if generation time is reported
                if 'metadata' in result:
                    gen_time = result['metadata'].get('generation_time_seconds', 0)
                    if gen_time > 0:
                        print(f"   LLM generation time: {gen_time:.2f}s")
                        print(f"   Overhead time: {total_time - gen_time:.2f}s")
            else:
                result = response.json()
                print(f"❌ Performance test failed: {result}")
                
        except Exception as e:
            print(f"❌ Performance test failed: {e}")

async def test_concurrent_requests():
    """Test concurrent request handling"""
    print("\n=== Concurrent Requests Test ===")
    
    payload = {
        "textbook_materials": "Concurrent test: Python basics for multiple simultaneous requests.",
        "num_questions": 1
    }
    
    async def single_request(client: httpx.AsyncClient, request_id: int):
        try:
            response = await client.post(
                f"{BASE_URL}/generate_questions_simple",
                json=payload,
                timeout=TIMEOUT
            )
            return f"Request {request_id}: {response.status_code}"
        except Exception as e:
            return f"Request {request_id}: Failed - {e}"
    
    async with httpx.AsyncClient() as client:
        start_time = time.time()
        
        # Run 3 concurrent requests
        tasks = [single_request(client, i) for i in range(1, 4)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        print(f"Concurrent requests completed in {total_time:.2f}s")
        for result in results:
            print(f"   {result}")

async def run_all_tests():
    """Run all tests sequentially"""
    print("🧪 Starting FastAPI Test Suite")
    print(f"Testing server at: {BASE_URL}")
    print("=" * 50)
    
    # List of all test functions
    tests = [
        test_health_endpoint,
        test_root_endpoint,
        test_stats_endpoint,
        test_json_input,
        test_simple_endpoint,
        test_error_handling,
        test_file_upload,
        performance_test,
        test_concurrent_requests
    ]
    
    # Run tests
    for test_func in tests:
        try:
            await test_func()
        except Exception as e:
            print(f"❌ Test {test_func.__name__} failed with exception: {e}")
        
        # Small delay between tests
        await asyncio.sleep(0.5)
    
    print("\n" + "=" * 50)
    print("🏁 FastAPI Test Suite Completed!")

if __name__ == "__main__":
    print("FastAPI Question Generator - Comprehensive Test Suite")
    print("Make sure the FastAPI server is running on http://localhost:8000")
    print("Start server with: python app_fastapi.py")
    print()
    
    # Run the test suite
    asyncio.run(run_all_tests())
