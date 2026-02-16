@echo off
echo ============================================
echo BuildPro - Construction Project Management
echo ============================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Start PostgreSQL and Redis
echo [INFO] Starting PostgreSQL and Redis...
docker-compose up -d postgres redis

REM Wait for PostgreSQL
echo [INFO] Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

REM Setup backend
echo [INFO] Setting up Python backend...
cd apps\api

REM Create venv if needed
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
)

REM Activate venv
call venv\Scripts\activate.bat

REM Install dependencies
echo [INFO] Installing Python dependencies...
pip install -q -r requirements.txt

REM Run migrations
echo [INFO] Running database migrations...
alembic upgrade head

REM Seed database
echo [INFO] Seeding database...
python -m app.db.init_db

REM Start backend
echo [SUCCESS] Starting FastAPI backend at http://localhost:8000
start "BuildPro API" cmd /k "venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

cd ..\..

REM Setup frontend
echo [INFO] Setting up React frontend...
cd apps\web

REM Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing Node dependencies...
    call npm install
)

REM Start frontend
echo [SUCCESS] Starting React frontend at http://localhost:5173
start "BuildPro Web" cmd /k "npm run dev"

cd ..\..

echo.
echo ============================================
echo BuildPro is running!
echo ============================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Login: admin@example.com / Admin@123456
echo.
echo Press any key to stop services...
pause >nul

REM Stop services
taskkill /FI "WINDOWTITLE eq BuildPro*" /F >nul 2>&1
docker-compose down

