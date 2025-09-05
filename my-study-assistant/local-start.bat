@echo off
chcp 65001 >nul
echo Study Assistant - Local Development Setup
echo =========================================

echo Step 1: Checking Node.js version...
node --version
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Step 2: Starting MySQL with Docker...
docker run -d --name study-mysql-local ^
  -e MYSQL_ROOT_PASSWORD=admin123456 ^
  -e MYSQL_DATABASE=study_assistant ^
  -p 3307:3306 ^
  mysql:8.0

echo Waiting for MySQL to start (20 seconds)...
timeout /t 20 /nobreak >nul

echo.
echo Step 3: Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo Step 4: Running database migration...
timeout /t 5 /nobreak >nul
call npm run migrate
if %errorlevel% neq 0 (
    echo [WARNING] Database migration failed, but continuing...
)

echo.
echo Step 5: Starting backend server...
start "Backend Server" cmd /k "npm run dev"

echo.
echo Step 6: Installing frontend dependencies...
cd ..
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo Step 7: Starting frontend server...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo [SUCCESS] All services started!
echo.
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3001
echo Database: localhost:3307
echo.
echo Press any key to open the application in browser...
pause >nul
start http://localhost:5173

echo.
echo To stop services:
echo 1. Close the backend and frontend command windows
echo 2. Run: docker stop study-mysql-local
echo 3. Run: docker rm study-mysql-local
pause