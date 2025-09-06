#!/usr/bin/env python3
"""
PDF Question Generator Test Script
测试 PDF 文件的问题生成功能
"""
import requests
import json
import time

def test_pdf_generation(pdf_path, num_questions=3):
    """测试 PDF 问题生成"""
    url = "http://localhost:8000/generate/pdf"
    
    try:
        # 准备文件上传
        with open(pdf_path, 'rb') as pdf_file:
            files = {'pdf_file': pdf_file}
            data = {'num_questions': num_questions}
            
            print(f"📄 正在处理 PDF: {pdf_path}")
            print(f"🎯 请求生成 {num_questions} 个问题...")
            
            start_time = time.time()
            response = requests.post(url, files=files, data=data, timeout=120)
            end_time = time.time()
            
            if response.status_code == 200:
                result = response.json()
                
                print(f"✅ 成功生成 {len(result['questions'])} 个问题")
                print(f"⏱️  总耗时: {end_time - start_time:.2f} 秒")
                print(f"🤖 AI 生成时间: {result['generation_time']:.2f} 秒")
                print("\n" + "="*80)
                
                for i, question in enumerate(result['questions'], 1):
                    print(f"\n📝 问题 {i} (难度: {question['difficulty']}, 主题: {question['topic']}):")
                    print(f"❓ {question['question']}")
                    print(f"\n💡 答案:")
                    print(f"   {question['answer'][:200]}...")
                    print("-" * 80)
                
                return result
            else:
                print(f"❌ 错误: HTTP {response.status_code}")
                print(f"详情: {response.text}")
                return None
                
    except FileNotFoundError:
        print(f"❌ 错误: 找不到文件 {pdf_path}")
        return None
    except requests.exceptions.Timeout:
        print("❌ 错误: 请求超时")
        return None
    except Exception as e:
        print(f"❌ 错误: {e}")
        return None

def main():
    """主函数"""
    pdf_path = "/Users/kifuko/Downloads/Introduction to Multimodal Interface Design.pdf"
    
    print("🚀 PDF 问题生成器测试")
    print("="*80)
    
    # 测试不同数量的问题生成
    test_cases = [1, 3, 5]
    
    for num_questions in test_cases:
        print(f"\n🔍 测试生成 {num_questions} 个问题:")
        result = test_pdf_generation(pdf_path, num_questions)
        if result:
            print(f"✓ 测试通过")
        else:
            print(f"✗ 测试失败")
        
        print("\n" + "="*80)
        time.sleep(2)  # 避免频繁请求
    
    print("\n🎉 测试完成!")

if __name__ == "__main__":
    main()
