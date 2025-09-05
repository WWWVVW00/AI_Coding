@echo off
echo Testing Docker after startup...
echo ===============================

echo Testing basic Docker command:
docker --version
echo.

echo Testing Docker daemon connection:
docker ps
echo.

if %errorlevel%==0 (
    echo [SUCCESS] Docker is working properly!
    echo You can now run the Study Assistant application.
    echo.
    echo To start the application:
    echo 1. Run: .\docker-start.bat
    echo 2. Choose option 1 for development environment
) else (
    echo [ERROR] Docker daemon is not responding
    echo Please make sure Docker Desktop is running
)

pause