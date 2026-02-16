# BuildPro - Construction Project Management System

A full-stack construction project management platform built with FastAPI and React. Designed for managing projects, tasks, budgets, documents, and team collaboration in the construction industry.

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-336791?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Features

**Project Management** — Create and track construction projects with status, priority, budgets, timelines, client info, and contract types.

**Task Tracking** — Kanban-style task management with assignees, priorities, dependencies, and progress tracking.

**Budget & Expenses** — Track project expenses with receipt attachments, approval/rejection workflows, and budget vs. actual reporting.

**Document Management** — Upload, version, and download project documents with file storage (local or Cloudflare R2).

**Risk Assessment** — Identify project risks with probability/impact scoring, mitigation plans, and status tracking.

**Scheduling & Milestones** — Gantt chart visualization with week/month/quarter zoom, milestone tracking, and dependency management.

**Team Collaboration** — Real-time messaging, role-based access control (Admin, Project Manager, Supervisor, Team Member, Stakeholder).

**Reports & PDF Export** — Generate and export project reports as PDF documents.

**Multi-Tenant SaaS** — Organization-based multi-tenancy with subscription tiers and membership management.

**Audit Logging** — Complete audit trail of all actions for compliance and accountability.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy, Alembic, PostgreSQL, Redis |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Auth | JWT with refresh tokens (python-jose), bcrypt |
| Charts | Recharts |
| Deployment | Docker Compose, Render.com |

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Git

### 1. Clone and setup

```bash
git clone https://github.com/Isaac25-lgtm/CONSTRUCTION-MANAGEMENT-SYSTEM.git
cd CONSTRUCTION-MANAGEMENT-SYSTEM
```

### 2. Start the backend

```bash
cd apps/api
python -m venv venv

# Activate virtual environment
source venv/bin/activate        # Linux/Mac
.\venv\Scripts\activate         # Windows

pip install -r requirements.txt

# Run with SQLite (no PostgreSQL needed)
python run_local.py
```

The API starts at **http://localhost:8000** with auto-generated docs at **http://localhost:8000/docs**.

### 3. Start the frontend

```bash
cd apps/web
npm install
npm run dev
```

The frontend starts at **http://localhost:5000**.

### 4. Login

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@buildpro.ug` | `Admin@123456` |
| Project Manager | `pm@buildpro.ug` | `Password@123` |

---

## Docker Deployment

```bash
# Start all services (PostgreSQL, Redis, API, Frontend)
docker-compose up -d

# Stop
docker-compose down
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Project Structure

```
├── apps/
│   ├── api/                  # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/v1/       # API routes & dependencies
│   │   │   ├── core/         # Config, auth, RBAC, security
│   │   │   ├── db/           # Database session & base models
│   │   │   ├── models/       # SQLAlchemy models
│   │   │   ├── schemas/      # Pydantic request/response schemas
│   │   │   └── services/     # Business logic layer
│   │   ├── alembic/          # Database migrations
│   │   └── run_local.py      # Local dev runner (SQLite)
│   │
│   └── web/                  # React frontend
│       └── src/
│           ├── components/   # Reusable UI components
│           ├── pages/        # Page components (Dashboard, Projects, Tasks, etc.)
│           ├── stores/       # Zustand state management
│           └── lib/          # API client & utilities
│
├── docker-compose.yml
├── render.yaml               # Render.com deployment config
└── start.bat                 # Windows quick-start script
```

---

## Environment Variables

### Backend (`apps/api/.env`)

```env
DATABASE_URL=postgresql://user:pass@localhost/buildpro
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173
ENVIRONMENT=development

# Cloud storage (optional)
USE_CLOUD_STORAGE=false
R2_ENDPOINT_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

### Frontend (`apps/web/.env.local`)

```env
VITE_API_URL=http://localhost:8000
```

> For local development with SQLite, no `.env` configuration is needed — `run_local.py` handles everything.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/login` | Login |
| POST | `/v1/auth/refresh` | Refresh token |
| GET | `/v1/auth/me` | Current user |
| GET/POST | `/v1/projects` | List / Create projects |
| GET/PUT/DELETE | `/v1/projects/{id}` | Get / Update / Delete project |
| GET/POST | `/v1/projects/{id}/tasks` | List / Create tasks |
| GET/POST | `/v1/projects/{id}/expenses` | List / Create expenses |
| POST | `/v1/projects/{id}/documents` | Upload document |
| GET/POST | `/v1/projects/{id}/risks` | List / Create risks |
| GET/POST | `/v1/projects/{id}/milestones` | List / Create milestones |

Full interactive documentation available at `/docs` when the server is running.

---

## Deployment

### Render.com

1. Push to GitHub
2. Connect repo on [Render Dashboard](https://dashboard.render.com)
3. Render auto-detects `render.yaml` and provisions services
4. Set environment variables in Render dashboard
5. Run migrations: `alembic upgrade head`

---

## License

MIT
