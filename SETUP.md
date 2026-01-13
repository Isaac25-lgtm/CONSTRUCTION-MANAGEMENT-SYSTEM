# BuildPro Setup Instructions

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

---

## Backend Setup (Python FastAPI)

### 1. Navigate to API directory
```bash
cd apps/api
```

### 2. Create virtual environment
```bash
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Setup database
Make sure PostgreSQL and Redis are running (via Docker or locally):

```bash
# Using Docker Compose (recommended)
cd ../..
docker-compose up postgres redis -d
```

### 5. Run migrations
```bash
cd apps/api
alembic upgrade head
```

### 6. Seed database
```bash
python -m app.db.init_db
```

### 7. Start API server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ API running at: http://localhost:8000  
📖 API docs at: http://localhost:8000/docs

---

## Frontend Setup (React + Vite)

### 1. Navigate to web directory
```bash
cd apps/web
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```

✅ Frontend running at: http://localhost:3000

---

## 🔐 Default Login Credentials

After seeding the database, use these credentials:

**Email:** `admin@buildpro.ug`  
**Password:** `Admin@123456`

---

## 🎨 Features

✅ **Dark Mode by Default** (toggle with Sun/Moon icon)  
✅ Full **Role-Based Access Control** (Admin, PM, Site Supervisor, Team Member, Stakeholder)  
✅ **Dashboard** with KPIs, charts, and analytics  
✅ **Project Management** with hierarchy support  
✅ **Task Tracking** with progress indicators  
✅ **Document Management** with version control  
✅ **Budget Tracking** and expense approval  
✅ **Risk Register** with mitigation planning  
✅ **Real-time Communication** hub  
✅ **Comprehensive Reports**

---

## 📁 Project Structure

```
buildpro/
├── apps/
│   ├── api/                  # Python FastAPI backend
│   │   ├── app/
│   │   │   ├── api/          # API routes
│   │   │   ├── core/         # Security, config, RBAC
│   │   │   ├── db/           # Database session & seed
│   │   │   ├── models/       # SQLAlchemy models
│   │   │   └── schemas/      # Pydantic schemas
│   │   ├── alembic/          # Database migrations
│   │   └── requirements.txt
│   │
│   └── web/                  # React frontend
│       ├── src/
│       │   ├── pages/        # Dashboard, Login
│       │   ├── stores/       # Zustand state (auth, theme)
│       │   └── lib/          # Axios client
│       └── package.json
│
├── docker-compose.yml        # PostgreSQL + Redis
└── README.md
```

---

## 🔧 Environment Variables

### Backend (.env in apps/api/)
```
DATABASE_URL=postgresql://buildpro:buildpro_dev_password@localhost:5432/buildpro_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-min-32-chars
```

### Frontend (.env in apps/web/)
```
VITE_API_URL=http://localhost:8000
```

---

## 🐳 Docker Compose (All Services)

To run everything with Docker:

```bash
docker-compose up
```

---

## 🧪 Testing

### Backend
```bash
cd apps/api
pytest
```

### Frontend
```bash
cd apps/web
npm test
```

---

## 📝 Next Steps

1. ✅ Login to the system
2. ✅ Toggle dark/light mode (Sun/Moon icon in top right)
3. ✅ Explore the dashboard
4. ✅ Create projects, tasks, and manage budgets
5. Customize roles and permissions as needed
6. Add more features (Gantt chart interactions, offline sync, etc.)

---

## 👤 Author

**Limo Jesse Mwanga**  
MSc Civil Engineering Research Project  
Designed for Uganda's Construction Industry

---

## 📄 License

© 2025 Limo Jesse Mwanga
