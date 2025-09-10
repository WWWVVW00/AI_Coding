#!/bin/bash
#
# Question Generator Service Test Script (Shell Version)
# 使用curl测试question_generator服务的各种功能
#

BASE_URL="http://localhost:8000"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0

print_header() {
    echo -e "\n${BLUE}==========================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}==========================================================${NC}"
}

print_result() {
    local test_name="$1"
    local success="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✅ PASS${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC} $test_name"
    fi
    
    if [ -n "$details" ]; then
        echo -e "   Details: $details"
    fi
}

test_health_check() {
    print_header "健康检查测试"
    
    # 测试根端点
    echo "Testing root endpoint..."
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        service_name=$(echo "$body" | grep -o '"service":"[^"]*"' | cut -d'"' -f4)
        print_result "Root endpoint" "true" "Service: $service_name"
    else
        print_result "Root endpoint" "false" "HTTP Status: $http_code"
    fi
    
    # 测试健康检查端点
    echo "Testing health endpoint..."
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        print_result "Health check" "true" "Status: $status"
    else
        print_result "Health check" "false" "HTTP Status: $http_code"
    fi
}

test_sync_generation() {
    print_header "同步文本问题生成测试"
    
    echo "Testing synchronous question generation..."
    
    # 准备测试数据
    cat > /tmp/test_payload.json << 'EOF'
{
    "materials": "机器学习是人工智能的一个分支，它使计算机能够从数据中学习并做出预测或决策，而无需被明确编程。机器学习的主要类型包括：1. 监督学习：使用标记的训练数据来学习映射函数 2. 无监督学习：从未标记的数据中发现隐藏模式 3. 强化学习：通过与环境交互来学习最优行为。常见的机器学习算法包括线性回归、逻辑回归、决策树、随机森林、支持向量机和神经网络。",
    "num_questions": 3
}
EOF
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d @/tmp/test_payload.json \
        "$BASE_URL/generate")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        # 尝试解析JSON响应
        questions_count=$(echo "$body" | grep -o '"question"' | wc -l | tr -d ' ')
        generation_time=$(echo "$body" | grep -o '"generation_time":[0-9.]*' | cut -d':' -f2)
        
        print_result "Sync generation" "true" "Generated $questions_count questions in ${generation_time}s"
        
        # 显示第一个问题（简化版）
        first_question=$(echo "$body" | grep -o '"question":"[^"]*"' | head -n1 | cut -d'"' -f4)
        if [ -n "$first_question" ]; then
            echo "   First question: ${first_question:0:100}..."
        fi
    else
        print_result "Sync generation" "false" "HTTP Status: $http_code"
        echo "   Response: ${body:0:200}..."
    fi
    
    # 清理临时文件
    rm -f /tmp/test_payload.json
}

test_async_generation() {
    print_header "异步文本问题生成测试"
    
    echo "Testing asynchronous question generation..."
    
    # 准备测试数据
    cat > /tmp/async_payload.json << 'EOF'
{
    "materials": "深度学习是机器学习的一个子领域，它使用人工神经网络来模拟人类大脑的学习过程。深度学习网络由多层神经元组成，每一层都从前一层接收输入并产生输出。深度学习的主要架构包括：卷积神经网络（CNN）：主要用于图像处理；循环神经网络（RNN）：适用于序列数据处理；长短期记忆网络（LSTM）：RNN的改进版本；Transformer：现代自然语言处理的基础。深度学习在计算机视觉、自然语言处理、语音识别等领域都有广泛应用。",
    "num_questions": 4
}
EOF
    
    # 提交任务
    echo "Submitting async task..."
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d @/tmp/async_payload.json \
        "$BASE_URL/tasks/generate")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        task_id=$(echo "$body" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
        print_result "Task submission" "true" "Task ID: ${task_id:0:8}..."
        
        # 轮询任务状态
        echo "Polling task status..."
        max_attempts=15
        for ((i=1; i<=max_attempts; i++)); do
            sleep 2
            
            status_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tasks/$task_id/status")
            status_http_code=$(echo "$status_response" | tail -n1)
            status_body=$(echo "$status_response" | head -n -1)
            
            if [ "$status_http_code" = "200" ]; then
                status=$(echo "$status_body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
                progress=$(echo "$status_body" | grep -o '"progress":"[^"]*"' | cut -d'"' -f4)
                
                echo "   Attempt $i: Status = $status, Progress = $progress"
                
                if [ "$status" = "completed" ]; then
                    # 获取结果
                    result_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tasks/$task_id/result")
                    result_http_code=$(echo "$result_response" | tail -n1)
                    result_body=$(echo "$result_response" | head -n -1)
                    
                    if [ "$result_http_code" = "200" ]; then
                        questions_count=$(echo "$result_body" | grep -o '"question"' | wc -l | tr -d ' ')
                        generation_time=$(echo "$result_body" | grep -o '"generation_time":[0-9.]*' | cut -d':' -f2)
                        
                        print_result "Async generation" "true" "Generated $questions_count questions in ${generation_time}s"
                    else
                        print_result "Async generation" "false" "Failed to get result"
                    fi
                    break
                elif [ "$status" = "failed" ]; then
                    error_msg=$(echo "$status_body" | grep -o '"error_message":"[^"]*"' | cut -d'"' -f4)
                    print_result "Async generation" "false" "Task failed: $error_msg"
                    break
                fi
            else
                print_result "Async generation" "false" "Status check failed"
                break
            fi
        done
        
        if [ $i -gt $max_attempts ]; then
            print_result "Async generation" "false" "Task timeout"
        fi
    else
        print_result "Task submission" "false" "HTTP Status: $http_code"
    fi
    
    # 清理临时文件
    rm -f /tmp/async_payload.json
}

test_task_management() {
    print_header "任务管理测试"
    
    echo "Testing task management..."
    
    # 列出所有任务
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tasks")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        total=$(echo "$body" | grep -o '"total":[0-9]*' | cut -d':' -f2)
        print_result "List tasks" "true" "Found $total tasks"
    else
        print_result "List tasks" "false" "HTTP Status: $http_code"
    fi
    
    # 测试按状态过滤
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tasks?status=completed")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        tasks_array=$(echo "$body" | grep -o '"tasks":\[[^]]*\]')
        completed_count=$(echo "$tasks_array" | grep -o '"task_id"' | wc -l | tr -d ' ')
        print_result "Filter completed tasks" "true" "Found $completed_count completed tasks"
    else
        print_result "Filter completed tasks" "false" "HTTP Status: $http_code"
    fi
}

test_error_handling() {
    print_header "错误处理测试"
    
    echo "Testing error handling..."
    
    # 测试空材料
    cat > /tmp/empty_payload.json << 'EOF'
{
    "materials": "",
    "num_questions": 3
}
EOF
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d @/tmp/empty_payload.json \
        "$BASE_URL/generate")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" != "200" ]; then
        print_result "Empty materials handling" "true" "Correctly rejected with status $http_code"
    else
        print_result "Empty materials handling" "false" "Should have rejected empty materials"
    fi
    
    # 测试无效任务ID
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tasks/invalid-task-id/status")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "404" ]; then
        print_result "Invalid task ID handling" "true" "Correctly returned 404"
    else
        print_result "Invalid task ID handling" "false" "Unexpected status: $http_code"
    fi
    
    # 清理临时文件
    rm -f /tmp/empty_payload.json
}

run_all_tests() {
    echo -e "${YELLOW}Question Generator Service Test Suite${NC}"
    echo "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Target URL: $BASE_URL"
    
    # 运行测试
    test_health_check
    test_sync_generation
    test_async_generation
    test_task_management
    test_error_handling
    
    # 总结
    print_header "测试总结"
    failed_tests=$((TOTAL_TESTS - PASSED_TESTS))
    success_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    
    echo "Total tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $failed_tests"
    echo "Success rate: ${success_rate}%"
    
    if [ "$PASSED_TESTS" = "$TOTAL_TESTS" ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}⚠️  Some tests failed. Check the logs above.${NC}"
        return 1
    fi
}

# 检查是否有bc命令（用于计算百分比）
if ! command -v bc &> /dev/null; then
    echo "Installing bc for calculations..."
    # 在macOS上，bc通常已经安装，如果没有可以用brew安装
fi

# 主程序
case "${1:-all}" in
    "health")
        test_health_check
        ;;
    "sync")
        test_sync_generation
        ;;
    "async")
        test_async_generation
        ;;
    "tasks")
        test_task_management
        ;;
    "errors")
        test_error_handling
        ;;
    "all"|*)
        run_all_tests
        ;;
esac
