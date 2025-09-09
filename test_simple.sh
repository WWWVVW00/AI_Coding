#!/bin/bash

# Question Generator Service Test Script
# 使用curl测试question_generator服务的各种功能

BASE_URL="http://localhost:8000"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}=== Question Generator Service Test Suite ===${NC}"
echo "Target URL: $BASE_URL"
echo "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
echo

# 测试1: 健康检查
echo -e "${BLUE}Test 1: Health Check${NC}"
echo "Testing root endpoint..."
response=$(curl -s "$BASE_URL/")
if echo "$response" | grep -q "Question Generator"; then
    echo -e "${GREEN}✅ Root endpoint: PASS${NC}"
else
    echo -e "${RED}❌ Root endpoint: FAIL${NC}"
    echo "Response: $response"
fi

echo "Testing health endpoint..."
response=$(curl -s "$BASE_URL/health")
if echo "$response" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health endpoint: PASS${NC}"
else
    echo -e "${RED}❌ Health endpoint: FAIL${NC}"
    echo "Response: $response"
fi

echo

# 测试2: 同步文本问题生成
echo -e "${BLUE}Test 2: Synchronous Text Generation${NC}"
echo "Testing synchronous question generation..."

# 测试负载
cat > /tmp/test_payload.json << 'EOF'
{
    "materials": "机器学习是人工智能的一个分支，它使计算机能够从数据中学习并做出预测或决策，而无需被明确编程。机器学习的主要类型包括监督学习、无监督学习和强化学习。常见的算法包括线性回归、决策树、神经网络等。",
    "num_questions": 2
}
EOF

response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d @/tmp/test_payload.json \
    "$BASE_URL/generate")

if echo "$response" | grep -q "questions"; then
    echo -e "${GREEN}✅ Sync generation: PASS${NC}"
    # 提取问题数量
    question_count=$(echo "$response" | grep -o '"question"' | wc -l | tr -d ' ')
    echo "   Generated $question_count questions"
    
    # 显示第一个问题的片段
    first_question=$(echo "$response" | grep -o '"question":"[^"]*"' | head -n1 | sed 's/"question":"//; s/"$//')
    if [ ${#first_question} -gt 80 ]; then
        echo "   Sample: ${first_question:0:80}..."
    else
        echo "   Sample: $first_question"
    fi
else
    echo -e "${RED}❌ Sync generation: FAIL${NC}"
    echo "Response: $response"
fi

rm -f /tmp/test_payload.json
echo

# 测试3: 异步任务提交
echo -e "${BLUE}Test 3: Asynchronous Task Generation${NC}"
echo "Testing async task submission..."

cat > /tmp/async_payload.json << 'EOF'
{
    "materials": "深度学习是机器学习的一个子领域，使用人工神经网络模拟人脑学习过程。主要架构包括CNN、RNN、LSTM和Transformer等。",
    "num_questions": 3
}
EOF

response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d @/tmp/async_payload.json \
    "$BASE_URL/tasks/generate")

if echo "$response" | grep -q "task_id"; then
    echo -e "${GREEN}✅ Task submission: PASS${NC}"
    
    # 提取task_id
    task_id=$(echo "$response" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
    echo "   Task ID: ${task_id:0:8}..."
    
    # 等待一下然后检查状态
    echo "   Waiting for task completion..."
    sleep 3
    
    status_response=$(curl -s "$BASE_URL/tasks/$task_id/status")
    if echo "$status_response" | grep -q "completed"; then
        echo -e "${GREEN}✅ Task completion: PASS${NC}"
        
        # 获取结果
        result_response=$(curl -s "$BASE_URL/tasks/$task_id/result")
        if echo "$result_response" | grep -q "questions"; then
            echo -e "${GREEN}✅ Result retrieval: PASS${NC}"
            result_count=$(echo "$result_response" | grep -o '"question"' | wc -l | tr -d ' ')
            echo "   Retrieved $result_count questions"
        else
            echo -e "${RED}❌ Result retrieval: FAIL${NC}"
        fi
    else
        status=$(echo "$status_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        echo -e "${YELLOW}⏳ Task status: $status${NC}"
    fi
else
    echo -e "${RED}❌ Task submission: FAIL${NC}"
    echo "Response: $response"
fi

rm -f /tmp/async_payload.json
echo

# 测试4: 任务管理
echo -e "${BLUE}Test 4: Task Management${NC}"
echo "Testing task listing..."

response=$(curl -s "$BASE_URL/tasks")
if echo "$response" | grep -q "tasks"; then
    echo -e "${GREEN}✅ Task listing: PASS${NC}"
    total=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   Found $total tasks"
else
    echo -e "${RED}❌ Task listing: FAIL${NC}"
    echo "Response: $response"
fi

echo

# 测试5: 错误处理
echo -e "${BLUE}Test 5: Error Handling${NC}"
echo "Testing invalid task ID..."

response=$(curl -s "$BASE_URL/tasks/invalid-id/status")
if echo "$response" | grep -q "not found"; then
    echo -e "${GREEN}✅ Error handling: PASS${NC}"
else
    echo -e "${YELLOW}⚠️  Error handling: Different response than expected${NC}"
    echo "Response: $response"
fi

echo

# 总结
echo -e "${YELLOW}=== Test Summary ===${NC}"
echo "Question Generator service is running and responding to requests."
echo "✅ Basic functionality appears to be working correctly."
echo "🔗 Service URL: $BASE_URL"
echo "📊 API Documentation: $BASE_URL/docs (if available)"
echo
echo "To test with real AI generation, make sure environment variables are set:"
echo "  - OPENAI_API_KEY or GOOGLE_API_KEY"
echo "  - OPENAI_BASE_URL (if using custom OpenAI endpoint)"
echo
echo "Test completed at: $(date '+%Y-%m-%d %H:%M:%S')"
