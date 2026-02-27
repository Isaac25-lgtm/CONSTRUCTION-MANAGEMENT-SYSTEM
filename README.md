# BuildPro — Construction Project Management System

A full-stack, AI-powered construction project management platform built as a dissertation project for the **Master of Science in Civil Engineering (Construction Project Management)** programme at **Kampala International University**.

---

## Research Information

| Field | Detail |
|-------|--------|
| **Student / Research Owner** | Limo Jesse Mwanga |
| **Registration Number** | 2023-01-14700 |
| **Programme** | MSc. Civil Engineering — Construction Project Management |
| **University** | Kampala International University |
| **Year** | 2026 |
| **System Design Collaborator** | Omoding Isaac — Data Scientist |

---

## Overview

BuildPro is a web-based internal project management system purpose-built for construction firms. It provides real-time dashboards, Gantt scheduling, Bill of Quantities (BOQ) tracking, risk management, document management, budget tracking, and AI-powered insights — all within a single platform.

### Key Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Real-time KPIs, project status overview, budget utilisation charts |
| **Projects** | Full CRUD for construction projects with status tracking (Planning, In Progress, On Hold, Completed) |
| **Schedule & Gantt** | Interactive Gantt chart with BOQ-weighted task progress |
| **Tasks & Milestones** | Task assignment, status management, milestone tracking with completion percentages |
| **Documents** | Upload, download, version, categorise, and manage project documents (Drawings, Reports, Photos, Permits, Contracts) |
| **Budget & Finance** | Expense tracking, budget vs. actual analysis, financial reporting |
| **Bill of Quantities (BOQ)** | Line-item BOQ management with weighted completion driving project progress |
| **Risk Management** | Risk register with likelihood/impact assessment, mitigation plans, and AI risk prediction |
| **Communication** | In-app messaging and notification system |
| **Reports & Analytics** | Exportable PDF/Excel reports, analytics dashboards |
| **Settings** | Organisation management, user roles, and system configuration |

### AI Modules (Gemini 2.0 Flash)

| Module | Capability |
|--------|------------|
| **AI Chat Assistant** | Context-aware construction project Q&A |
| **Risk Prediction** | AI-driven risk analysis and early-warning recommendations |
| **Budget Forecasting** | Predictive budget analysis and cost overrun alerts |
| **Auto Reporting** | Automated project status report generation |
| **Resource Allocation** | AI-optimised resource and workforce suggestions |

---

## Tech Stack

### Backend (`apps/api`)

- **Framework:** FastAPI (Python 3.11)
- **ORM:** SQLAlchemy 2.0 with Alembic migrations
- **Database:** PostgreSQL (production) / SQLite (local development)
- **Authentication:** JWT with httpOnly cookie refresh tokens
- **Authorisation:** Role-Based Access Control (RBAC) with granular permissions
- **AI:** Google Gemini 2.0 Flash API
- **Storage:** Local filesystem or Cloudflare R2 / AWS S3
- **Server:** Gunicorn + Uvicorn workers
- **Security:** CSRF protection, rate limiting, audit logging, security headers

### Frontend (`apps/web`)

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS 3.4 with dark mode support
- **State Management:** Zustand
- **Data Fetching:** Axios + TanStack React Query
- **Charts:** Recharts
- **Icons:** Lucide React
- **PDF/Excel Export:** jsPDF + html2canvas (frontend) / openpyxl (backend)

### Infrastructure

- **Hosting:** Render (Web Service + Static Site + PostgreSQL)
- **Monorepo:** `apps/api` (Python) + `apps/web` (Node/React)
- **CI/CD:** Render auto-deploy from GitHub

---

## Project Structure

```
BuildPro/
├── apps/
│   ├── api/                        # FastAPI backend
│   │   ├── alembic/                # Database migrations
│   │   ├── app/
│   │   │   ├── api/v1/routes/      # Route modules (auth, projects, tasks, documents, etc.)
│   │   │   ├── api/v1/dependencies.py  # Auth & org resolution
│   │   │   ├── core/               # Config, security, RBAC, error handling
│   │   │   ├── db/                 # Database session, init_db, base mixins
│   │   │   ├── middleware/         # CORS, CSRF, rate limiting, audit logging
│   │   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── schemas/            # Pydantic request/response schemas
│   │   │   └── services/           # Storage service, AI integration
│   │   ├── requirements.txt        # Production dependencies
│   │   ├── requirements-dev.txt    # Dev/test dependencies
│   │   ├── Dockerfile
│   │   └── run_local.py            # Local dev runner (SQLite compatibility)
│   └── web/                        # React frontend
│       ├── src/
│       │   ├── components/         # Reusable UI components (Layout, Modal, AIChat, etc.)
│       │   ├── pages/              # Page-level components (11 pages)
│       │   ├── stores/             # Zustand state stores (auth, data, projects, etc.)
│       │   ├── lib/                # API client, axios config, session helpers
│       │   ├── services/           # Gemini AI service integration
│       │   └── App.tsx             # Root application component
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── Dockerfile
├── render.yaml                     # Render deployment blueprint
├── docker-compose.yml              # Docker Compose for local multi-service dev
├── start.sh / start.bat            # Convenience local start scripts
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+
- Git

### Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/Isaac25-lgtm/CONSTRUCTION-MANAGEMENT-SYSTEM.git
cd CONSTRUCTION-MANAGEMENT-SYSTEM
```

#### 2. Backend Setup

```bash
cd apps/api

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set GEMINI_API_KEY for AI features

# Run locally (uses SQLite, auto-seeds sample data)
python run_local.py
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

#### 3. Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Default Login Credentials

| Field | Value |
|-------|-------|
| **Email** | `admin@example.com` |
| **Password** | `Admin@123456` |
| **Role** | Administrator (full permissions) |

---

## Deployment on Render

### One-Click Blueprint Deploy

1. Fork this repository to your GitHub account
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** > **Blueprint** and connect your forked repository
4. Render will detect `render.yaml` and provision all three services automatically:
   - **buildpro-api** — Python web service
   - **buildpro-web** — Static site
   - **buildpro-db** — PostgreSQL database

### Manual Setup

#### API Service (Web Service)

| Setting | Value |
|---------|-------|
| **Runtime** | Python 3.11 |
| **Root Directory** | `apps/api` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `alembic upgrade head && gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| **Health Check Path** | `/health` |

#### Frontend (Static Site)

| Setting | Value |
|---------|-------|
| **Root Directory** | `apps/web` |
| **Build Command** | `npm ci && npm run build` |
| **Publish Directory** | `dist` |
| **Rewrite Rule** | `/* → /index.html` (SPA support) |

### Required Environment Variables

**API Service:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-set from Render DB) |
| `SECRET_KEY` | Auto-generated strong secret (>= 32 chars) |
| `ENVIRONMENT` | `production` |
| `ALLOWED_ORIGINS` | Frontend URL, e.g. `https://buildpro-web.onrender.com` |
| `GEMINI_API_KEY` | Google Gemini API key for AI features |

**Frontend (Static Site):**

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL, e.g. `https://buildpro-api.onrender.com` |

### Optional Environment Variables (Cloud Storage)

| Variable | Description |
|----------|-------------|
| `USE_CLOUD_STORAGE` | `true` to enable R2/S3 storage (recommended — Render disk is ephemeral) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ENDPOINT_URL` | R2 endpoint URL |
| `R2_PUBLIC_URL` | Public URL for file access |

### Production Notes

- Render's free-tier disk is **ephemeral** — uploaded files are lost on redeploy. Use `USE_CLOUD_STORAGE=true` with Cloudflare R2 for persistent document storage.
- Do **not** use `*` for `ALLOWED_ORIGINS` in production (incompatible with `allow_credentials=True`).
- The API automatically runs database migrations (`alembic upgrade head`) and seeds default data on startup.
- Gunicorn is configured with 2 workers and a 120-second timeout for handling large file uploads.

---

## API Documentation

Once the backend is running, interactive API documentation is available at:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### Core API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | User authentication (returns JWT) |
| `/api/v1/auth/refresh` | POST | Refresh access token via httpOnly cookie |
| `/api/v1/auth/logout` | POST | Revoke refresh token |
| `/api/v1/projects` | GET/POST | List or create projects |
| `/api/v1/projects/{id}/tasks` | GET/POST | Project tasks |
| `/api/v1/projects/{id}/expenses` | GET/POST | Project expenses |
| `/api/v1/projects/{id}/risks` | GET/POST | Project risks |
| `/api/v1/projects/{id}/documents` | GET/POST | Project documents (upload/list) |
| `/api/v1/projects/{id}/milestones` | GET/POST | Project milestones |
| `/api/v1/projects/{id}/boq` | GET/POST | Bill of Quantities |
| `/api/v1/notifications` | GET | User notifications |
| `/api/v1/ai/chat` | POST | AI chat assistant |
| `/api/v1/ai/risk-prediction` | POST | AI risk prediction |
| `/api/v1/ai/budget-forecast` | POST | AI budget forecasting |
| `/api/v1/ai/auto-report` | POST | AI auto reporting |
| `/api/v1/ai/resource-allocation` | POST | AI resource allocation |
| `/health` | GET | Health check |

### Auth & Multi-Tenancy

- Access token sent as `Authorization: Bearer <token>`
- Organisation-scoped routes use `X-Organization-ID` header
- If the user belongs to a single organisation, the header auto-resolves

---

## Sample Data

The system ships with **5 pre-seeded realistic construction projects** for demonstration:

1. **Headquarters Renovation** (In Progress) — 6 tasks, 5 expenses, 3 risks, 4 milestones, 7 documents
2. **Lakeside Mixed-Use Complex** (Planning) — 5 tasks, 4 expenses, 3 risks, 3 milestones, 5 documents
3. **Northern Logistics Hub Phase 1** (In Progress) — 6 tasks, 5 expenses, 3 risks, 4 milestones, 6 documents
4. **Metropolitan Health Center Upgrade** (On Hold) — 5 tasks, 4 expenses, 3 risks, 3 milestones, 7 documents
5. **Greenfield Residential Estate Phase A** (Completed) — 6 tasks, 5 expenses, 2 risks, 3 milestones, 6 documents

**Totals:** 28 tasks, 23 expenses, 14 risks, 17 milestones, 31 documents

All sample data is fully editable and deletable via the UI.

---

## Security Features

- JWT access tokens (15-min expiry) + httpOnly cookie refresh tokens (7-day expiry)
- Role-Based Access Control (RBAC) with granular per-module permissions
- CSRF protection middleware
- Rate limiting (100 req/min general, 10 req/min auth endpoints)
- Audit logging for all user actions
- Security headers (X-Frame-Options, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Password hashing with bcrypt
- SQL injection protection via SQLAlchemy ORM parameterised queries
- File upload validation (extension whitelist, configurable size limits up to 50 MB)
- Token revocation support

---

## Architecture Highlights

### BOQ-Driven Progress

Project completion is calculated from weighted Bill of Quantities items rather than simple task counts, providing accurate progress tracking aligned with construction industry standards.

### Storage Abstraction

The document management system supports pluggable storage backends:
- **Local:** filesystem storage for development
- **Cloudflare R2 / AWS S3:** cloud storage for production with presigned URL support

### Offline-First Data Layer

The frontend Zustand stores maintain local state with API sync, allowing the UI to remain responsive during network interruptions. A `DEMO_MODE_ENABLED` flag provides mock data fallback.

### SQLite Compatibility

The `run_local.py` script patches PostgreSQL-specific types (UUID, ARRAY) for SQLite compatibility, enabling zero-dependency local development without PostgreSQL.

---

## Credits

**Research Owner:**
Limo Jesse Mwanga — MSc. Civil Engineering (Construction Project Management), Kampala International University, 2026

**System Design Collaborator:**
Omoding Isaac — Data Scientist who collaborated in designing and developing the system architecture, AI integration, and full-stack implementation

---

## License

This project was developed as part of an academic dissertation and is provided for educational and research purposes.

---

*BuildPro v1.0 — February 2026*
