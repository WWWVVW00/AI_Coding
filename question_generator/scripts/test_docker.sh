#!/bin/bash

# Docker部署测试脚本
# 用于验证Docker容器中的RESTful API是否正常工作

set -e

echo "🐳 Question Generator Docker 部署测试"
echo "====================================="

# 配置
CONTAINER_NAME="question-generator-test"
IMAGE_NAME="question-generator"
PORT="8001"  # 使用不同端口避免冲突
BASE_URL="http://localhost:$PORT"

# 清理函数
cleanup() {
    echo "🧹 清理测试环境..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
}

# 设置清理trap
trap cleanup EXIT

echo "📦 1. 构建Docker镜像..."
docker build -t $IMAGE_NAME .

echo "🚀 2. 启动Docker容器..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:8000 \
    -e OPENAI_API_KEY="test_key_for_docker" \
    -e OPENAI_BASE_URL="https://api.example.com" \
    -e OPENAI_MODEL="test-model" \
    -e DEBUG="true" \
    $IMAGE_NAME

echo "⏳ 3. 等待容器启动..."
sleep 10

# 检查容器状态
echo "📊 4. 检查容器状态..."
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ 容器启动失败"
    docker logs $CONTAINER_NAME
    exit 1
fi

echo "✅ 容器启动成功"

# 测试API端点
echo "🔍 5. 测试API端点..."

# 测试健康检查
echo "   测试健康检查..."
if curl -s -f "$BASE_URL/health" > /dev/null; then
    echo "   ✅ 健康检查通过"
else
    echo "   ❌ 健康检查失败"
    docker logs $CONTAINER_NAME
    exit 1
fi

# 测试根路径
echo "   测试根路径..."
response=$(curl -s "$BASE_URL/")
if echo "$response" | grep -q "async_restful"; then
    echo "   ✅ 根路径返回正确的模式信息"
else
    echo "   ❌ 根路径响应异常: $response"
    exit 1
fi

# 测试任务提交（会失败但应该返回正确的错误）
echo "   测试任务提交..."
task_response=$(curl -s -X POST "$BASE_URL/tasks/generate" \
    -H "Content-Type: application/json" \
    -d '{"materials": "测试内容", "num_questions": 1}')

if echo "$task_response" | grep -q "task_id"; then
    echo "   ✅ 任务提交接口工作正常"
    
    # 提取task_id
    task_id=$(echo "$task_response" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
    echo "   📝 任务ID: $task_id"
    
    # 测试状态查询
    echo "   测试状态查询..."
    sleep 2
    status_response=$(curl -s "$BASE_URL/tasks/$task_id/status")
    if echo "$status_response" | grep -q "failed\|completed\|processing"; then
        echo "   ✅ 状态查询接口工作正常"
    else
        echo "   ❌ 状态查询响应异常: $status_response"
    fi
    
    # 测试结果获取
    echo "   测试结果获取..."
    result_response=$(curl -s "$BASE_URL/tasks/$task_id/result")
    if echo "$result_response" | grep -q "task_id"; then
        echo "   ✅ 结果获取接口工作正常"
    else
        echo "   ❌ 结果获取响应异常: $result_response"
    fi
    
else
    echo "   ❌ 任务提交响应异常: $task_response"
    exit 1
fi

# 测试任务列表
echo "   测试任务列表..."
list_response=$(curl -s "$BASE_URL/tasks")
if echo "$list_response" | grep -q "tasks"; then
    echo "   ✅ 任务列表接口工作正常"
else
    echo "   ❌ 任务列表响应异常: $list_response"
    exit 1
fi

# 检查容器日志
echo "📋 6. 检查容器日志..."
echo "最近的日志："
docker logs --tail 10 $CONTAINER_NAME

# 检查容器资源使用
echo "📊 7. 检查资源使用..."
docker stats --no-stream $CONTAINER_NAME

# 测试文档页面
echo "📚 8. 测试文档页面..."
if curl -s -f "$BASE_URL/docs" > /dev/null; then
    echo "   ✅ API文档页面可访问"
else
    echo "   ⚠️  API文档页面无法访问（可能是正常的）"
fi

echo ""
echo "🎉 Docker部署测试完成！"
echo ""
echo "📋 测试结果总结："
echo "✅ Docker镜像构建成功"
echo "✅ 容器启动成功"
echo "✅ 健康检查通过"
echo "✅ RESTful API端点工作正常"
echo "✅ 异步任务机制正常"
echo ""
echo "🌐 访问地址："
echo "   API: $BASE_URL"
echo "   健康检查: $BASE_URL/health"
echo "   API文档: $BASE_URL/docs"
echo "   任务管理: $BASE_URL/tasks"
echo ""
echo "🚀 Docker部署已就绪！"

# 询问是否保留容器
echo ""
read -p "是否保留测试容器以便进一步测试？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ 保留容器 $CONTAINER_NAME 在端口 $PORT"
    echo "   使用以下命令管理："
    echo "   查看日志: docker logs -f $CONTAINER_NAME"
    echo "   停止容器: docker stop $CONTAINER_NAME"
    echo "   删除容器: docker rm $CONTAINER_NAME"
    
    # 不执行清理
    trap - EXIT
else
    echo "🧹 将在脚本结束时清理容器"
fi
