#!/bin/bash

echo "🏗️  BuildPro - Construction Project Management System"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Start PostgreSQL and Redis
echo -e "${BLUE}📦 Starting PostgreSQL and Redis...${NC}"
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo -e "${BLUE}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Setup and start backend
echo -e "${BLUE}🐍 Setting up Python backend...${NC}"
cd apps/api

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install -q -r requirements.txt

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
alembic upgrade head

# Seed database
echo -e "${YELLOW}Seeding database with initial data...${NC}"
python -m app.db.init_db

# Start backend in background
echo -e "${GREEN}✅ Starting FastAPI backend at http://localhost:8000${NC}"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ../..

# Setup and start frontend
echo -e "${BLUE}⚛️  Setting up React frontend...${NC}"
cd apps/web

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing Node dependencies...${NC}"
    npm install
fi

# Start frontend
echo -e "${GREEN}✅ Starting React frontend at http://localhost:5173${NC}"
npm run dev &
FRONTEND_PID=$!

cd ../..

echo ""
echo -e "${GREEN}=================================================="
echo "🎉 BuildPro is running!"
echo "=================================================="
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🔐 Login Credentials:"
echo "   Email: admin@example.com"
echo "   Password: Admin@123456"
echo ""
echo "Press Ctrl+C to stop all services"
echo -e "==================================================${NC}"

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; docker-compose down; exit" INT
wait

