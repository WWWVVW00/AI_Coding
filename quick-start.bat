@echo off
chcp 65001 >nul
echo Quick Start - Study Assistant
echo =============================

echo Step 1: Stopping any existing containers...
docker-compose down 2>nul
docker-compose -f docker-compose.dev.yml down 2>nul

echo.
echo Step 2: Starting MySQL database first...
docker run -d --name study-mysql ^
  -e MYSQL_ROOT_PASSWORD=admin123456 ^
  -e MYSQL_DATABASE=study_assistant ^
  -p 3306:3306 ^
  mysql:8.0

echo Waiting for MySQL to start (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo Step 3: Testing MySQL connection...
docker exec study-mysql mysqladmin ping -h localhost --silent
if %errorlevel%==0 (
    echo [SUCCESS] MySQL is running!
) else (
    echo [WARNING] MySQL might still be starting...
)

echo.
echo Step 4: Starting backend...
cd backend
docker build -t study-backend .
docker run -d --name study-backend ^
  --link study-mysql:database ^
  -e DB_HOST=database ^
  -e DB_PASSWORD=admin123456 ^
  -e JWT_SECRET=dev_secret_key ^
  -p 3001:3001 ^
  study-backend

echo.
echo Step 5: Running database migration...
timeout /t 10 /nobreak >nul
docker exec study-backend npm run migrate

echo.
echo [SUCCESS] Backend started!
echo Backend API: http://localhost:3001
echo Health check: http://localhost:3001/api/health

echo.
echo Step 6: Starting frontend...
cd ..
docker build -t study-frontend --target development .
docker run -d --name study-frontend ^
  -p 5173:5173 ^
  -v "%cd%:/app" ^
  study-frontend

echo.
echo [SUCCESS] All services started!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3001
echo.
echo To stop all services, run: docker stop study-frontend study-backend study-mysql
echo To remove all containers, run: docker rm study-frontend study-backend study-mysql

pause