# Docker 管理脚本 (PowerShell)
# 用于管理 Study Assistant 应用的 Docker 容器

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod", "stop", "clean", "logs", "db-migrate", "db-reset", "status")]
    [string]$Action
)

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Show-Header {
    Write-ColorOutput Green "🚀 Study Assistant Docker 管理工具"
    Write-ColorOutput Green "=================================="
}

function Start-Development {
    Show-Header
    Write-ColorOutput Yellow "启动开发环境..."
    
    # 停止可能运行的生产环境
    docker-compose down 2>$null
    
    # 启动开发环境
    docker-compose -f docker-compose.dev.yml up -d --build
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ 开发环境启动成功！"
        Write-ColorOutput Cyan "前端地址: http://localhost:5173"
        Write-ColorOutput Cyan "后端地址: http://localhost:3001"
        Write-ColorOutput Cyan "数据库端口: 3306"
        Write-ColorOutput Yellow "使用 'docker-scripts.ps1 logs' 查看日志"
    } else {
        Write-ColorOutput Red "❌ 开发环境启动失败"
    }
}

function Start-Production {
    Show-Header
    Write-ColorOutput Yellow "启动生产环境..."
    
    # 停止可能运行的开发环境
    docker-compose -f docker-compose.dev.yml down 2>$null
    
    # 启动生产环境
    docker-compose up -d --build
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ 生产环境启动成功！"
        Write-ColorOutput Cyan "应用地址: http://localhost"
        Write-ColorOutput Cyan "API地址: http://localhost:3001"
        Write-ColorOutput Yellow "使用 'docker-scripts.ps1 logs' 查看日志"
    } else {
        Write-ColorOutput Red "❌ 生产环境启动失败"
    }
}

function Stop-Services {
    Show-Header
    Write-ColorOutput Yellow "停止所有服务..."
    
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    
    Write-ColorOutput Green "✅ 所有服务已停止"
}

function Clean-Environment {
    Show-Header
    Write-ColorOutput Yellow "清理 Docker 环境..."
    
    # 停止所有服务
    Stop-Services
    
    # 删除容器和网络
    docker-compose down --volumes --remove-orphans
    docker-compose -f docker-compose.dev.yml down --volumes --remove-orphans
    
    # 删除镜像
    docker image prune -f
    
    Write-ColorOutput Green "✅ Docker 环境清理完成"
}

function Show-Logs {
    Show-Header
    Write-ColorOutput Yellow "显示服务日志..."
    
    # 检查哪个环境在运行
    $devRunning = docker-compose -f docker-compose.dev.yml ps -q
    $prodRunning = docker-compose ps -q
    
    if ($devRunning) {
        Write-ColorOutput Cyan "显示开发环境日志:"
        docker-compose -f docker-compose.dev.yml logs -f
    } elseif ($prodRunning) {
        Write-ColorOutput Cyan "显示生产环境日志:"
        docker-compose logs -f
    } else {
        Write-ColorOutput Red "❌ 没有运行中的服务"
    }
}

function Run-DbMigration {
    Show-Header
    Write-ColorOutput Yellow "运行数据库迁移..."
    
    # 检查哪个环境在运行
    $devRunning = docker-compose -f docker-compose.dev.yml ps -q backend
    $prodRunning = docker-compose ps -q backend
    
    if ($devRunning) {
        docker-compose -f docker-compose.dev.yml exec backend npm run migrate
    } elseif ($prodRunning) {
        docker-compose exec backend npm run migrate
    } else {
        Write-ColorOutput Red "❌ 后端服务未运行，请先启动环境"
        return
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ 数据库迁移完成"
    } else {
        Write-ColorOutput Red "❌ 数据库迁移失败"
    }
}

function Reset-Database {
    Show-Header
    Write-ColorOutput Red "⚠️  重置数据库 - 这将删除所有数据！"
    
    $confirmation = Read-Host "确定要继续吗？输入 'YES' 确认"
    
    if ($confirmation -eq "YES") {
        # 检查哪个环境在运行
        $devRunning = docker-compose -f docker-compose.dev.yml ps -q backend
        $prodRunning = docker-compose ps -q backend
        
        if ($devRunning) {
            docker-compose -f docker-compose.dev.yml exec backend node scripts/migrate.js reset
        } elseif ($prodRunning) {
            docker-compose exec backend node scripts/migrate.js reset
        } else {
            Write-ColorOutput Red "❌ 后端服务未运行，请先启动环境"
            return
        }
        
        Write-ColorOutput Green "✅ 数据库重置完成"
    } else {
        Write-ColorOutput Yellow "操作已取消"
    }
}

function Show-Status {
    Show-Header
    Write-ColorOutput Yellow "服务状态:"
    
    Write-ColorOutput Cyan "`n开发环境:"
    docker-compose -f docker-compose.dev.yml ps
    
    Write-ColorOutput Cyan "`n生产环境:"
    docker-compose ps
    
    Write-ColorOutput Cyan "`nDocker 系统信息:"
    docker system df
}

# 主逻辑
switch ($Action) {
    "dev" { Start-Development }
    "prod" { Start-Production }
    "stop" { Stop-Services }
    "clean" { Clean-Environment }
    "logs" { Show-Logs }
    "db-migrate" { Run-DbMigration }
    "db-reset" { Reset-Database }
    "status" { Show-Status }
}