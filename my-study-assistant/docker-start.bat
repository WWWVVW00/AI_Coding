@echo off
chcp 65001 >nul
echo Study Assistant Docker Manager
echo ================================

:menu
echo.
echo Select operation:
echo 1. Start Development Environment
echo 2. Start Production Environment
echo 3. Stop All Services
echo 4. View Logs
echo 5. Run Database Migration
echo 6. View Service Status
echo 7. Clean Environment
echo 0. Exit

set /p choice=Please enter your choice (0-7): 

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto prod
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto logs
if "%choice%"=="5" goto migrate
if "%choice%"=="6" goto status
if "%choice%"=="7" goto clean
if "%choice%"=="0" goto exit
goto menu

:dev
echo Starting development environment...
docker-compose down >nul 2>&1
docker-compose -f docker-compose.dev.yml up -d --build
if %errorlevel%==0 (
    echo [SUCCESS] Development environment started!
    echo Frontend: http://localhost:5173
    echo Backend: http://localhost:3001
) else (
    echo [ERROR] Failed to start development environment
)
pause
goto menu

:prod
echo Starting production environment...
docker-compose -f docker-compose.dev.yml down >nul 2>&1
docker-compose up -d --build
if %errorlevel%==0 (
    echo [SUCCESS] Production environment started!
    echo Application: http://localhost
    echo API: http://localhost:3001
) else (
    echo [ERROR] Failed to start production environment
)
pause
goto menu

:stop
echo Stopping all services...
docker-compose down
docker-compose -f docker-compose.dev.yml down
echo [SUCCESS] All services stopped
pause
goto menu

:logs
echo Showing service logs...
docker-compose logs -f
pause
goto menu

:migrate
echo Running database migration...
docker-compose exec backend npm run migrate
if %errorlevel%==0 (
    echo [SUCCESS] Database migration completed
) else (
    echo [ERROR] Database migration failed
)
pause
goto menu

:status
echo Service status:
echo.
echo Development environment:
docker-compose -f docker-compose.dev.yml ps
echo.
echo Production environment:
docker-compose ps
pause
goto menu

:clean
echo [WARNING] This will clean all Docker data!
set /p confirm=Are you sure you want to continue? (y/N): 
if /i "%confirm%"=="y" (
    docker-compose down --volumes --remove-orphans
    docker-compose -f docker-compose.dev.yml down --volumes --remove-orphans
    docker image prune -f
    echo [SUCCESS] Docker environment cleaned
) else (
    echo Operation cancelled
)
pause
goto menu

:exit
echo Goodbye!
exit /b 0