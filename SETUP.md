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

## ☁️ Render Deployment (Production)

### Prerequisites
1. A [Render](https://render.com) account
2. A [Cloudflare](https://cloudflare.com) account (for R2 document storage)

### Step 1: Deploy to Render

1. Push your code to GitHub/GitLab
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your repository
5. Render will read `render.yaml` and create:
   - ✅ PostgreSQL database ($7/month)
   - ✅ FastAPI backend service ($7/month)
   - ✅ Static frontend (free)

### Step 2: Set Up Cloudflare R2 (Document Storage)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2**
2. Create a bucket named `buildpro-documents`
3. Create R2 API Token with read/write permissions
4. Add these environment variables to your Render backend service:

```env
USE_CLOUD_STORAGE=true
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=buildpro-documents
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### Step 3: Verify Deployment

1. **API Health**: Visit `https://buildpro-api.onrender.com/health`
2. **Frontend**: Visit `https://buildpro-web.onrender.com`
3. **Database**: Check Render logs for successful migration

### Data Retention

| Component | Retention |
|-----------|-----------|
| PostgreSQL | **Unlimited** - data persists as long as subscription is active |
| Documents (R2) | **Unlimited** - 10GB free/month, then $0.015/GB |
| Backups | Enable in Render dashboard for automatic daily backups |

> **5+ Year Retention**: Data will persist indefinitely. There are no automatic expiration policies. Just keep your Render subscription active.

---

## 🐳 Docker Compose (Local Development)

To run everything locally with Docker:

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
