#!/usr/bin/env python3
"""
Question Generator Service Test Script
测试question_generator服务的各种功能
"""

import requests
import json
import time
import sys
from datetime import datetime

# 服务配置
BASE_URL = "http://localhost:8000"

class QuestionGeneratorTester:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = {}
    
    def print_header(self, title):
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}")
    
    def print_result(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.results[test_name] = success
    
    def test_health_check(self):
        """测试健康检查端点"""
        self.print_header("健康检查测试")
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                self.print_result("Root endpoint", True, f"Service: {data.get('service', 'Unknown')}")
            else:
                self.print_result("Root endpoint", False, f"Status: {response.status_code}")
            
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                self.print_result("Health check", True, f"Status: {data.get('status', 'Unknown')}")
            else:
                self.print_result("Health check", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.print_result("Health check", False, str(e))
    
    def test_sync_text_generation(self):
        """测试同步文本问题生成（旧版API）"""
        self.print_header("同步文本问题生成测试")
        try:
            payload = {
                "materials": """
                机器学习是人工智能的一个分支，它使计算机能够从数据中学习并做出预测或决策，而无需被明确编程。
                机器学习的主要类型包括：
                1. 监督学习：使用标记的训练数据来学习映射函数
                2. 无监督学习：从未标记的数据中发现隐藏模式
                3. 强化学习：通过与环境交互来学习最优行为
                
                常见的机器学习算法包括线性回归、逻辑回归、决策树、随机森林、支持向量机和神经网络。
                """,
                "num_questions": 3
            }
            
            response = self.session.post(f"{self.base_url}/generate", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                questions = data.get("questions", [])
                generation_time = data.get("generation_time", 0)
                
                self.print_result("Sync generation", True, 
                                f"Generated {len(questions)} questions in {generation_time:.2f}s")
                
                for i, q in enumerate(questions, 1):
                    print(f"   Q{i}: {q.get('question', 'No question')[:100]}...")
                    print(f"       Answer: {q.get('answer', 'No answer')[:100]}...")
                    print(f"       Difficulty: {q.get('difficulty', 'Unknown')}")
                    print(f"       Topic: {q.get('topic', 'Unknown')}")
                    print()
            else:
                self.print_result("Sync generation", False, 
                                f"Status: {response.status_code}, Body: {response.text[:200]}")
                
        except Exception as e:
            self.print_result("Sync generation", False, str(e))
    
    def test_async_text_generation(self):
        """测试异步文本问题生成（新API）"""
        self.print_header("异步文本问题生成测试")
        try:
            # 提交任务
            payload = {
                "materials": """
                深度学习是机器学习的一个子领域，它使用人工神经网络来模拟人类大脑的学习过程。
                深度学习网络由多层神经元组成，每一层都从前一层接收输入并产生输出。
                
                深度学习的主要架构包括：
                - 卷积神经网络（CNN）：主要用于图像处理
                - 循环神经网络（RNN）：适用于序列数据处理
                - 长短期记忆网络（LSTM）：RNN的改进版本
                - Transformer：现代自然语言处理的基础
                
                深度学习在计算机视觉、自然语言处理、语音识别等领域都有广泛应用。
                """,
                "num_questions": 4
            }
            
            # 提交任务
            response = self.session.post(f"{self.base_url}/tasks/generate", json=payload)
            
            if response.status_code == 200:
                task_data = response.json()
                task_id = task_data.get("task_id")
                self.print_result("Task submission", True, f"Task ID: {task_id}")
                
                # 轮询任务状态
                max_attempts = 30
                for attempt in range(max_attempts):
                    time.sleep(2)  # 等待2秒
                    
                    status_response = self.session.get(f"{self.base_url}/tasks/{task_id}/status")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        status = status_data.get("status")
                        progress = status_data.get("progress", "")
                        
                        print(f"   Attempt {attempt + 1}: Status = {status}, Progress = {progress}")
                        
                        if status == "completed":
                            # 获取结果
                            result_response = self.session.get(f"{self.base_url}/tasks/{task_id}/result")
                            if result_response.status_code == 200:
                                result_data = result_response.json()
                                result = result_data.get("result", {})
                                questions = result.get("questions", [])
                                generation_time = result.get("generation_time", 0)
                                
                                self.print_result("Async generation", True, 
                                                f"Generated {len(questions)} questions in {generation_time:.2f}s")
                                
                                for i, q in enumerate(questions, 1):
                                    print(f"   Q{i}: {q.get('question', 'No question')[:80]}...")
                                    print(f"       Difficulty: {q.get('difficulty', 'Unknown')}")
                                    print()
                            else:
                                self.print_result("Async generation", False, "Failed to get result")
                            break
                        elif status == "failed":
                            error_msg = status_data.get("error_message", "Unknown error")
                            self.print_result("Async generation", False, f"Task failed: {error_msg}")
                            break
                else:
                    self.print_result("Async generation", False, "Task timeout")
            else:
                self.print_result("Task submission", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.print_result("Async generation", False, str(e))
    
    def test_task_management(self):
        """测试任务管理功能"""
        self.print_header("任务管理测试")
        try:
            # 列出所有任务
            response = self.session.get(f"{self.base_url}/tasks")
            if response.status_code == 200:
                data = response.json()
                tasks = data.get("tasks", [])
                total = data.get("total", 0)
                self.print_result("List tasks", True, f"Found {total} tasks")
                
                for task in tasks[:3]:  # 显示前3个任务
                    print(f"   Task {task.get('task_id', 'Unknown')[:8]}...: {task.get('status', 'Unknown')}")
            else:
                self.print_result("List tasks", False, f"Status: {response.status_code}")
            
            # 测试按状态过滤
            response = self.session.get(f"{self.base_url}/tasks?status=completed")
            if response.status_code == 200:
                data = response.json()
                completed_tasks = data.get("tasks", [])
                self.print_result("Filter completed tasks", True, f"Found {len(completed_tasks)} completed tasks")
            else:
                self.print_result("Filter completed tasks", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.print_result("Task management", False, str(e))
    
    def test_error_handling(self):
        """测试错误处理"""
        self.print_header("错误处理测试")
        try:
            # 测试空材料
            payload = {
                "materials": "",
                "num_questions": 3
            }
            response = self.session.post(f"{self.base_url}/generate", json=payload)
            
            if response.status_code != 200:
                self.print_result("Empty materials handling", True, f"Correctly rejected with status {response.status_code}")
            else:
                self.print_result("Empty materials handling", False, "Should have rejected empty materials")
            
            # 测试无效任务ID
            response = self.session.get(f"{self.base_url}/tasks/invalid-task-id/status")
            if response.status_code == 404:
                self.print_result("Invalid task ID handling", True, "Correctly returned 404")
            else:
                self.print_result("Invalid task ID handling", False, f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.print_result("Error handling", False, str(e))
    
    def run_all_tests(self):
        """运行所有测试"""
        print(f"Question Generator Service Test Suite")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Target URL: {self.base_url}")
        
        # 运行测试
        self.test_health_check()
        self.test_sync_text_generation()
        self.test_async_text_generation()
        self.test_task_management()
        self.test_error_handling()
        
        # 总结
        self.print_header("测试总结")
        passed = sum(1 for result in self.results.values() if result)
        total = len(self.results)
        
        print(f"Total tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success rate: {passed/total*100:.1f}%")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check the logs above.")
            return False

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test Question Generator Service')
    parser.add_argument('--url', default=BASE_URL, help='Base URL of the service')
    parser.add_argument('--quick', action='store_true', help='Run quick tests only')
    
    args = parser.parse_args()
    
    tester = QuestionGeneratorTester(args.url)
    
    if args.quick:
        tester.test_health_check()
    else:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
