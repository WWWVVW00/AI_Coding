@echo off
echo Checking Docker Desktop Status...
echo ================================

echo 1. Docker Version:
docker --version
echo.

echo 2. Docker Info:
docker info
echo.

echo 3. Running Containers:
docker ps
echo.

echo 4. All Containers:
docker ps -a
echo.

echo 5. Docker Images:
docker images
echo.

pause