#!/usr/bin/env python3
"""
Test script for the Question Generator API with OpenAI-compatible endpoints
"""
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_text_generation():
    """Test text-based question generation"""
    print("\n🔍 Testing text-based question generation...")
    
    test_data = {
        "materials": "Python is a high-level programming language. It features dynamic typing and automatic memory management.",
        "num_questions": 2
    }
    
    response = requests.post(
        f"{BASE_URL}/generate",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Generated {len(result['questions'])} questions")
        print(f"Generation time: {result['generation_time']} seconds")
        for i, q in enumerate(result['questions'], 1):
            print(f"\nQuestion {i}:")
            print(f"  Text: {q['question']}")
            print(f"  Difficulty: {q['difficulty']}")
            print(f"  Topic: {q['topic']}")
    else:
        print(f"Error: {response.text}")
    
    return response.status_code == 200

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
    print("🚀 Starting Question Generator API Tests")
    print("=" * 50)
    
    tests = [
        ("API Configuration", test_api_config),
        ("Health Check", test_health),
        ("Text Generation", test_text_generation),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            print(f"✓ {test_name}: {'PASS' if result else 'FAIL'}")
        except Exception as e:
            results.append((test_name, False))
            print(f"✗ {test_name}: ERROR - {e}")
    
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! The API is working with OpenAI-compatible endpoints.")
    else:
        print("⚠️  Some tests failed. Check the configuration and logs.")

if __name__ == "__main__":
    main()
