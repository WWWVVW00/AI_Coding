# Docker 故障排除指南

## 🚨 当前问题
Docker 命令可以显示版本信息，但 `docker info` 和其他命令卡住，这表明 Docker Desktop 服务没有完全启动。

## 🔧 解决步骤

### 步骤 1: 启动 Docker Desktop
1. **打开开始菜单**，搜索 "Docker Desktop"
2. **点击启动** Docker Desktop 应用程序
3. **等待启动完成**（通常需要 1-2 分钟）
4. **检查系统托盘**，确保 Docker 图标显示为绿色

### 步骤 2: 验证 Docker 状态
启动 Docker Desktop 后，运行测试脚本：
```cmd
.\test-docker.bat
```

### 步骤 3: 如果 Docker Desktop 无法启动

#### 方法 A: 重启 Docker Desktop
1. 右键点击系统托盘中的 Docker 图标
2. 选择 "Restart Docker Desktop"
3. 等待重启完成

#### 方法 B: 完全重启 Docker 服务
1. 打开任务管理器 (Ctrl+Shift+Esc)
2. 找到所有 Docker 相关进程并结束它们
3. 重新启动 Docker Desktop

#### 方法 C: 重启计算机
如果上述方法都不行，重启计算机通常可以解决问题。

### 步骤 4: 检查系统要求
确保你的系统满足 Docker Desktop 要求：
- Windows 10/11 64位
- 启用 Hyper-V 或 WSL 2
- 至少 4GB RAM

## 🎯 启动应用程序

一旦 Docker 正常工作，你可以：

### 方法 1: 使用简化脚本
```cmd
.\test-docker.bat
```
如果显示 "[SUCCESS] Docker is working properly!"，则可以继续。

### 方法 2: 启动应用
```cmd
.\docker-start.bat
```
选择选项 1 (开发环境) 或选项 2 (生产环境)

## 🔍 常见错误和解决方案

### 错误 1: "Docker daemon is not running"
**解决方案**: 启动 Docker Desktop 应用程序

### 错误 2: "docker: command not found"
**解决方案**: 重新安装 Docker Desktop

### 错误 3: 命令卡住不动
**解决方案**: 
1. 按 Ctrl+C 取消命令
2. 重启 Docker Desktop
3. 重新运行命令

### 错误 4: 端口被占用
**解决方案**: 
```cmd
# 检查端口占用
netstat -ano | findstr :3306
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# 结束占用进程
taskkill /PID <进程ID> /F
```

## 🚀 替代方案

如果 Docker 问题持续存在，你可以：

### 选项 1: 使用本地环境
1. 安装 MySQL Server
2. 安装 Node.js
3. 直接运行后端和前端

### 选项 2: 使用在线数据库
1. 使用 PlanetScale、Railway 或其他云数据库
2. 修改 `.env` 文件中的数据库连接信息

## 📞 获取帮助

如果问题仍然存在：
1. 检查 Docker Desktop 的日志文件
2. 重启计算机
3. 重新安装 Docker Desktop

---

**记住**: Docker Desktop 需要一些时间来完全启动，特别是在第一次运行时。请耐心等待！