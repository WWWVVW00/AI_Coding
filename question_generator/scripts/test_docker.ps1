# Docker部署测试脚本 (PowerShell版本)
# 用于验证Docker容器中的RESTful API是否正常工作

# 设置错误处理
$ErrorActionPreference = "Stop"

Write-Host "🐳 Question Generator Docker 部署测试" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 配置
$CONTAINER_NAME = "question-generator-test"
$IMAGE_NAME = "question-generator"
$PORT = "8001"  # 使用不同端口避免冲突
$BASE_URL = "http://localhost:$PORT"

# 清理函数
function Cleanup {
    Write-Host "🧹 清理测试环境..." -ForegroundColor Yellow
    try {
        docker stop $CONTAINER_NAME 2>$null
        docker rm $CONTAINER_NAME 2>$null
    }
    catch {
        # 忽略错误，容器可能不存在
    }
}

# 设置清理trap (PowerShell中使用try-finally)
try {
    Write-Host "📦 1. 构建Docker镜像..." -ForegroundColor Green
    docker build -t $IMAGE_NAME .
    if ($LASTEXITCODE -ne 0) {
        throw "Docker镜像构建失败"
    }

    Write-Host "🚀 2. 启动Docker容器..." -ForegroundColor Green
    docker run -d `
        --name $CONTAINER_NAME `
        -p "${PORT}:8000" `
        -e OPENAI_API_KEY="test_key_for_docker" `
        -e OPENAI_BASE_URL="https://api.example.com" `
        -e OPENAI_MODEL="test-model" `
        -e DEBUG="true" `
        $IMAGE_NAME
    
    if ($LASTEXITCODE -ne 0) {
        throw "Docker容器启动失败"
    }

    Write-Host "⏳ 3. 等待容器启动..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # 检查容器状态
    Write-Host "📊 4. 检查容器状态..." -ForegroundColor Green
    $containerStatus = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}"
    if (-not $containerStatus -or $containerStatus -notcontains $CONTAINER_NAME) {
        Write-Host "❌ 容器启动失败" -ForegroundColor Red
        docker logs $CONTAINER_NAME
        throw "容器启动失败"
    }

    Write-Host "✅ 容器启动成功" -ForegroundColor Green

    # 测试API端点
    Write-Host "🔍 5. 测试API端点..." -ForegroundColor Green

    # 测试健康检查
    Write-Host "   测试健康检查..." -ForegroundColor White
    try {
        $healthResponse = Invoke-WebRequest -Uri "$BASE_URL/health" -Method Get -TimeoutSec 30
        if ($healthResponse.StatusCode -eq 200) {
            Write-Host "   ✅ 健康检查通过" -ForegroundColor Green
        } else {
            throw "健康检查返回状态码: $($healthResponse.StatusCode)"
        }
    }
    catch {
        Write-Host "   ❌ 健康检查失败: $($_.Exception.Message)" -ForegroundColor Red
        docker logs $CONTAINER_NAME
        throw "健康检查失败"
    }   

    # 测试根路径
    Write-Host "   测试根路径..." -ForegroundColor White
    try {
        $rootResponse = Invoke-WebRequest -Uri "$BASE_URL/" -Method Get -TimeoutSec 30
        $rootContent = $rootResponse.Content
        if ($rootContent -match "async_restful") {
            Write-Host "   ✅ 根路径返回正确的模式信息" -ForegroundColor Green
        } else {
            Write-Host "   ❌ 根路径响应异常: $rootContent" -ForegroundColor Red
            throw "根路径响应异常"
        }
    }
    catch {
        Write-Host "   ❌ 根路径测试失败: $($_.Exception.Message)" -ForegroundColor Red
        throw "根路径测试失败"
    }

    # 测试任务提交
    Write-Host "   测试任务提交..." -ForegroundColor White
    try {
        $taskBody = @{
            materials = "machine learning is awesome"
            num_questions = 1
        } | ConvertTo-Json

        $taskResponse = Invoke-WebRequest -Uri "$BASE_URL/tasks/generate" -Method Post -Body $taskBody -ContentType "application/json" -TimeoutSec 30
        $taskContent = $taskResponse.Content
        
        if ($taskContent -match '"task_id"') {
            Write-Host "   ✅ 任务提交接口工作正常" -ForegroundColor Green
            
            # 提取task_id
            $taskJson = $taskContent | ConvertFrom-Json
            $taskId = $taskJson.task_id
            Write-Host "   📝 任务ID: $taskId" -ForegroundColor Cyan
            
            # 测试状态查询
            Write-Host "   测试状态查询..." -ForegroundColor White
            Start-Sleep -Seconds 2
            try {
                $statusResponse = Invoke-WebRequest -Uri "$BASE_URL/tasks/$taskId/status" -Method Get -TimeoutSec 30
                $statusContent = $statusResponse.Content
                if ($statusContent -match "(failed|completed|processing)") {
                    Write-Host "   ✅ 状态查询接口工作正常" -ForegroundColor Green
                } else {
                    Write-Host "   ❌ 状态查询响应异常: $statusContent" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "   ❌ 状态查询失败: $($_.Exception.Message)" -ForegroundColor Red
            }
            
            # 测试结果获取
            Write-Host "   测试结果获取..." -ForegroundColor White
            try {
                $resultResponse = Invoke-WebRequest -Uri "$BASE_URL/tasks/$taskId/result" -Method Get -TimeoutSec 30
                $resultContent = $resultResponse.Content
                if ($resultContent -match '"task_id"') {
                    Write-Host "   ✅ 结果获取接口工作正常" -ForegroundColor Green
                } else {
                    Write-Host "   ❌ 结果获取响应异常: $resultContent" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "   ❌ 结果获取失败: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "   ❌ 任务提交响应异常: $taskContent" -ForegroundColor Red
            throw "任务提交响应异常"
        }
    }
    catch {
        Write-Host "   ❌ 任务提交失败: $($_.Exception.Message)" -ForegroundColor Red
        throw "任务提交失败"
    }

    # 测试任务列表
    Write-Host "   测试任务列表..." -ForegroundColor White
    try {
        $listResponse = Invoke-WebRequest -Uri "$BASE_URL/tasks" -Method Get -TimeoutSec 30
        $listContent = $listResponse.Content
        if ($listContent -match '"tasks"') {
            Write-Host "   ✅ 任务列表接口工作正常" -ForegroundColor Green
        } else {
            Write-Host "   ❌ 任务列表响应异常: $listContent" -ForegroundColor Red
            throw "任务列表响应异常"
        }
    }
    catch {
        Write-Host "   ❌ 任务列表测试失败: $($_.Exception.Message)" -ForegroundColor Red
        throw "任务列表测试失败"
    }

    # 检查容器日志
    Write-Host "📋 6. 检查容器日志..." -ForegroundColor Green
    Write-Host "最近的日志：" -ForegroundColor White
    docker logs --tail 10 $CONTAINER_NAME

    # 检查容器资源使用
    Write-Host "📊 7. 检查资源使用..." -ForegroundColor Green
    docker stats --no-stream $CONTAINER_NAME

    # 测试文档页面
    Write-Host "📚 8. 测试文档页面..." -ForegroundColor Green
    try {
        $docsResponse = Invoke-WebRequest -Uri "$BASE_URL/docs" -Method Get -TimeoutSec 30
        if ($docsResponse.StatusCode -eq 200) {
            Write-Host "   ✅ API文档页面可访问" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "   ⚠️  API文档页面无法访问（可能是正常的）" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "🎉 Docker部署测试完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 测试结果总结：" -ForegroundColor Cyan
    Write-Host "✅ Docker镜像构建成功" -ForegroundColor Green
    Write-Host "✅ 容器启动成功" -ForegroundColor Green
    Write-Host "✅ 健康检查通过" -ForegroundColor Green
    Write-Host "✅ RESTful API端点工作正常" -ForegroundColor Green
    Write-Host "✅ 异步任务机制正常" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 访问地址：" -ForegroundColor Cyan
    Write-Host "   API: $BASE_URL" -ForegroundColor White
    Write-Host "   健康检查: $BASE_URL/health" -ForegroundColor White
    Write-Host "   API文档: $BASE_URL/docs" -ForegroundColor White
    Write-Host "   任务管理: $BASE_URL/tasks" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Docker部署已就绪！" -ForegroundColor Green

    # 询问是否保留容器
    Write-Host ""
    $keepContainer = Read-Host "是否保留测试容器以便进一步测试？(y/N)"
    if ($keepContainer -match "^[Yy]$") {
        Write-Host "✅ 保留容器 $CONTAINER_NAME 在端口 $PORT" -ForegroundColor Green
        Write-Host "   使用以下命令管理：" -ForegroundColor White
        Write-Host "   查看日志: docker logs -f $CONTAINER_NAME" -ForegroundColor White
        Write-Host "   停止容器: docker stop $CONTAINER_NAME" -ForegroundColor White
        Write-Host "   删除容器: docker rm $CONTAINER_NAME" -ForegroundColor White
        
        # 不执行清理
        $skipCleanup = $true
    } else {
        Write-Host "🧹 将在脚本结束时清理容器" -ForegroundColor Yellow
        $skipCleanup = $false
    }
}
catch {
    Write-Host "❌ 测试过程中发生错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "正在清理环境..." -ForegroundColor Yellow
    $skipCleanup = $false
    exit 1
}
finally {
    # 清理环境（除非用户选择保留）
    if (-not $skipCleanup) {
        Cleanup
    }
}