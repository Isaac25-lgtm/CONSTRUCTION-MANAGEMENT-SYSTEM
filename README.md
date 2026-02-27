<div align="center">

# 🏗️ BuildPro

### Construction Project Management System

**A full-stack, AI-powered platform for modern construction firms**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Google Gemini](https://img.shields.io/badge/Gemini_2.0_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev)

[![Python](https://img.shields.io/badge/python-3.11+-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![Node](https://img.shields.io/badge/node-18+-green?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Academic-orange?style=flat-square)](#license)
[![Render](https://img.shields.io/badge/deploy-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)

<br/>

<img src="https://raw.githubusercontent.com/Isaac25-lgtm/CONSTRUCTION-MANAGEMENT-SYSTEM/main/docs/banner.png" alt="BuildPro Banner" width="100%" />

<br/>

[**Live Demo**](#-deployment-on-render) · [**API Docs**](#-api-documentation) · [**Getting Started**](#-getting-started) · [**Architecture**](#%EF%B8%8F-architecture)

---

*Developed as a dissertation project for the **MSc. Civil Engineering (Construction Project Management)** programme at **Kampala International University**, 2026.*

</div>

<br/>

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [AI Modules](#-ai-modules)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Architecture](#%EF%B8%8F-architecture)
- [Getting Started](#-getting-started)
- [Deployment on Render](#%EF%B8%8F-deployment-on-render)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Sample Data](#-sample-data)
- [Credits](#-credits)
- [License](#license)

<br/>

## 🔭 Overview

**BuildPro** is a web-based internal project management system purpose-built for construction firms. It consolidates real-time dashboards, Gantt scheduling, Bill of Quantities (BOQ) tracking, risk management, document management, budget tracking, and AI-powered insights into a single, cohesive platform.

> 💡 Unlike generic PM tools, BuildPro calculates project progress from **weighted BOQ line items** — providing accuracy aligned with construction industry standards rather than simple task counts.

<br/>

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 📊 Dashboard & Analytics
Real-time KPIs, project status overview, and budget utilisation charts with exportable PDF/Excel reports.

### 📅 Schedule & Gantt
Interactive Gantt chart with BOQ-weighted task progress and milestone tracking with completion percentages.

### 📄 Document Management
Upload, download, version, categorise and manage project documents — Drawings, Reports, Photos, Permits & Contracts.

### 💰 Budget & Finance
Expense tracking with budget vs. actual analysis and detailed financial reporting across projects.

</td>
<td width="50%">

### 📐 Bill of Quantities (BOQ)
Line-item BOQ management with weighted completion that drives overall project progress calculation.

### ⚠️ Risk Management
Risk register with likelihood/impact assessment matrices, mitigation plans, and AI-driven risk prediction.

### 💬 Communication
In-app messaging and notification system to keep project teams aligned and informed.

### ⚙️ Settings & RBAC
Organisation management, user role configuration, and granular per-module permission control.

</td>
</tr>
</table>

<br/>

## 🤖 AI Modules

Powered by **Google Gemini 2.0 Flash**, BuildPro integrates five intelligent modules:

```
┌─────────────────────────────────────────────────────────────────┐
│                      🧠 AI ENGINE (Gemini 2.0 Flash)            │
├──────────────┬──────────────┬──────────────┬────────┬───────────┤
│  💬 Chat     │  ⚠️ Risk     │  💰 Budget   │ 📝 Auto│ 👷 Resource│
│  Assistant   │  Prediction  │  Forecasting │ Report │ Allocation│
├──────────────┼──────────────┼──────────────┼────────┼───────────┤
│ Context-aware│ AI-driven    │ Predictive   │ Auto-  │ AI-       │
│ construction │ risk analysis│ cost analysis│ genera-│ optimised │
│ project Q&A  │ & early      │ & overrun    │ ted    │ workforce │
│              │ warnings     │ alerts       │ status │ suggest-  │
│              │              │              │ reports│ ions      │
└──────────────┴──────────────┴──────────────┴────────┴───────────┘
```

<br/>

## 🛠️ Tech Stack

<table>
<tr>
<th align="center">Layer</th>
<th align="center">Technology</th>
</tr>
<tr>
<td><strong>Backend</strong></td>
<td>
<img src="https://img.shields.io/badge/-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/-SQLAlchemy_2.0-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white" />
<img src="https://img.shields.io/badge/-Alembic-6BA81E?style=flat-square" />
<img src="https://img.shields.io/badge/-Gunicorn-499848?style=flat-square&logo=gunicorn&logoColor=white" />
<img src="https://img.shields.io/badge/-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" />
</td>
</tr>
<tr>
<td><strong>Frontend</strong></td>
<td>
<img src="https://img.shields.io/badge/-React_18-61DAFB?style=flat-square&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/-Vite_5-646CFF?style=flat-square&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/-Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/-Zustand-443E38?style=flat-square" />
<img src="https://img.shields.io/badge/-Recharts-22B5BF?style=flat-square" />
</td>
</tr>
<tr>
<td><strong>Database</strong></td>
<td>
<img src="https://img.shields.io/badge/-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/-SQLite_(dev)-003B57?style=flat-square&logo=sqlite&logoColor=white" />
</td>
</tr>
<tr>
<td><strong>AI</strong></td>
<td>
<img src="https://img.shields.io/badge/-Gemini_2.0_Flash-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" />
</td>
</tr>
<tr>
<td><strong>Infrastructure</strong></td>
<td>
<img src="https://img.shields.io/badge/-Render-46E3B7?style=flat-square&logo=render&logoColor=white" />
<img src="https://img.shields.io/badge/-Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/-Cloudflare_R2-F38020?style=flat-square&logo=cloudflare&logoColor=white" />
</td>
</tr>
</table>

<br/>

## 🏛️ Architecture

```
BuildPro/
├── 📂 apps/
│   ├── 📂 api/                          # ⚡ FastAPI Backend
│   │   ├── 📂 alembic/                  #    Database migrations
│   │   ├── 📂 app/
│   │   │   ├── 📂 api/v1/routes/        #    Route modules (auth, projects, tasks, docs…)
│   │   │   ├── 📄 api/v1/dependencies.py#    Auth & org resolution
│   │   │   ├── 📂 core/                 #    Config, security, RBAC, error handling
│   │   │   ├── 📂 db/                   #    Database session, init_db, base mixins
│   │   │   ├── 📂 middleware/           #    CORS, CSRF, rate limiting, audit logging
│   │   │   ├── 📂 models/              #    SQLAlchemy ORM models
│   │   │   ├── 📂 schemas/             #    Pydantic request/response schemas
│   │   │   └── 📂 services/            #    Storage service, AI integration
│   │   ├── 📄 requirements.txt          #    Production dependencies
│   │   ├── 📄 Dockerfile
│   │   └── 📄 run_local.py              #    Local dev runner (SQLite compat)
│   │
│   └── 📂 web/                          # ⚛️ React Frontend
│       ├── 📂 src/
│       │   ├── 📂 components/           #    Reusable UI (Layout, Modal, AIChat…)
│       │   ├── 📂 pages/               #    11 page-level components
│       │   ├── 📂 stores/              #    Zustand state stores
│       │   ├── 📂 lib/                 #    API client, axios config, session helpers
│       │   └── 📂 services/            #    Gemini AI service integration
│       ├── 📄 package.json
│       ├── 📄 vite.config.ts
│       └── 📄 Dockerfile
│
├── 📄 render.yaml                       # 🚀 Render deployment blueprint
├── 📄 docker-compose.yml                # 🐳 Local multi-service dev
├── 📄 start.sh / start.bat              # 🏃 Convenience start scripts
└── 📄 README.md
```

### Architecture Highlights

| Pattern | Description |
|---------|-------------|
| **BOQ-Driven Progress** | Project completion is calculated from weighted Bill of Quantities items — not simple task counts — aligned with construction industry standards. |
| **Storage Abstraction** | Pluggable storage backends: local filesystem for dev, Cloudflare R2 / AWS S3 for production with presigned URL support. |
| **Offline-First Data Layer** | Zustand stores maintain local state with API sync. `DEMO_MODE_ENABLED` provides mock data fallback during network interruptions. |
| **SQLite Compatibility** | `run_local.py` patches PostgreSQL-specific types (UUID, ARRAY) for SQLite, enabling zero-dependency local development. |

<br/>

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| Git | latest |

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Isaac25-lgtm/CONSTRUCTION-MANAGEMENT-SYSTEM.git
cd CONSTRUCTION-MANAGEMENT-SYSTEM
```

### 2️⃣ Backend Setup

```bash
cd apps/api

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set GEMINI_API_KEY for AI features

# Run locally (uses SQLite, auto-seeds sample data)
python run_local.py
```

> 🌐 API available at `http://localhost:8000` — interactive docs at [`/docs`](http://localhost:8000/docs)

### 3️⃣ Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

> 🌐 Frontend available at `http://localhost:5173`

### 🔑 Default Login

| Field | Value |
|-------|-------|
| **Email** | `admin@example.com` |
| **Password** | `Admin@123456` |
| **Role** | Administrator (full permissions) |

<br/>

## ☁️ Deployment on Render

### One-Click Blueprint Deploy

1. **Fork** this repository to your GitHub account
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New → Blueprint** and connect your forked repository
4. Render detects `render.yaml` and provisions all three services automatically:

| Service | Type | Description |
|---------|------|-------------|
| `buildpro-api` | Web Service | FastAPI backend with Gunicorn |
| `buildpro-web` | Static Site | React SPA with SPA rewrite rules |
| `buildpro-db` | PostgreSQL | Managed database instance |

<details>
<summary><strong>📋 Manual Setup & Environment Variables</strong></summary>

#### API Service (Web Service)

| Setting | Value |
|---------|-------|
| Runtime | Python 3.11 |
| Root Directory | `apps/api` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `alembic upgrade head && gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| Health Check Path | `/health` |

#### Frontend (Static Site)

| Setting | Value |
|---------|-------|
| Root Directory | `apps/web` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Rewrite Rule | `/* → /index.html` |

#### Required Environment Variables

**API Service:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-set from Render DB) |
| `SECRET_KEY` | Auto-generated strong secret (≥ 32 chars) |
| `ENVIRONMENT` | `production` |
| `ALLOWED_ORIGINS` | Frontend URL, e.g. `https://buildpro-web.onrender.com` |
| `GEMINI_API_KEY` | Google Gemini API key for AI features |

**Frontend:**

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL, e.g. `https://buildpro-api.onrender.com` |

#### Optional — Cloud Storage

| Variable | Description |
|----------|-------------|
| `USE_CLOUD_STORAGE` | `true` to enable R2/S3 (recommended — Render disk is ephemeral) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ENDPOINT_URL` | R2 endpoint URL |
| `R2_PUBLIC_URL` | Public URL for file access |

</details>

> ⚠️ **Production Note:** Render's free-tier disk is ephemeral — uploaded files are lost on redeploy. Enable `USE_CLOUD_STORAGE=true` with Cloudflare R2 for persistent document storage.

<br/>

## 📡 API Documentation

Once the backend is running, interactive documentation is available at:

| Interface | URL |
|-----------|-----|
| **Swagger UI** | [`http://localhost:8000/docs`](http://localhost:8000/docs) |
| **ReDoc** | [`http://localhost:8000/redoc`](http://localhost:8000/redoc) |

<details>
<summary><strong>📋 Core API Endpoints</strong></summary>

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | `POST` | User authentication (returns JWT) |
| `/api/v1/auth/refresh` | `POST` | Refresh access token via httpOnly cookie |
| `/api/v1/auth/logout` | `POST` | Revoke refresh token |
| `/api/v1/projects` | `GET` `POST` | List or create projects |
| `/api/v1/projects/{id}/tasks` | `GET` `POST` | Project tasks |
| `/api/v1/projects/{id}/expenses` | `GET` `POST` | Project expenses |
| `/api/v1/projects/{id}/risks` | `GET` `POST` | Project risks |
| `/api/v1/projects/{id}/documents` | `GET` `POST` | Project documents (upload/list) |
| `/api/v1/projects/{id}/milestones` | `GET` `POST` | Project milestones |
| `/api/v1/projects/{id}/boq` | `GET` `POST` | Bill of Quantities |
| `/api/v1/notifications` | `GET` | User notifications |
| `/api/v1/ai/chat` | `POST` | AI chat assistant |
| `/api/v1/ai/risk-prediction` | `POST` | AI risk prediction |
| `/api/v1/ai/budget-forecast` | `POST` | AI budget forecasting |
| `/api/v1/ai/auto-report` | `POST` | AI auto reporting |
| `/api/v1/ai/resource-allocation` | `POST` | AI resource allocation |
| `/health` | `GET` | Health check |

</details>

### Auth & Multi-Tenancy

- Access token sent as `Authorization: Bearer <token>`
- Organisation-scoped routes use `X-Organization-ID` header
- Single-organisation users auto-resolve without the header

<br/>

## 🔒 Security

BuildPro implements multiple layers of security:

| Feature | Implementation |
|---------|----------------|
| **Authentication** | JWT access tokens (15-min expiry) + httpOnly cookie refresh tokens (7-day expiry) |
| **Authorisation** | Role-Based Access Control with granular per-module permissions |
| **CSRF Protection** | Middleware-based CSRF token validation |
| **Rate Limiting** | 100 req/min general, 10 req/min on auth endpoints |
| **Audit Logging** | Full audit trail for all user actions |
| **Security Headers** | X-Frame-Options, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| **Password Security** | bcrypt hashing |
| **SQL Injection** | SQLAlchemy ORM parameterised queries |
| **File Uploads** | Extension whitelist + configurable size limits (up to 50 MB) |
| **Token Revocation** | Refresh token blacklisting support |

<br/>

## 📦 Sample Data

The system ships with **5 pre-seeded realistic construction projects** for immediate demonstration:

| # | Project | Status | Tasks | Expenses | Risks | Milestones | Docs |
|---|---------|--------|:-----:|:--------:|:-----:|:----------:|:----:|
| 1 | Headquarters Renovation | 🟢 In Progress | 6 | 5 | 3 | 4 | 7 |
| 2 | Lakeside Mixed-Use Complex | 🔵 Planning | 5 | 4 | 3 | 3 | 5 |
| 3 | Northern Logistics Hub Phase 1 | 🟢 In Progress | 6 | 5 | 3 | 4 | 6 |
| 4 | Metropolitan Health Center Upgrade | 🟡 On Hold | 5 | 4 | 3 | 3 | 7 |
| 5 | Greenfield Residential Estate Phase A | ✅ Completed | 6 | 5 | 2 | 3 | 6 |

> **Totals:** 28 tasks · 23 expenses · 14 risks · 17 milestones · 31 documents — all fully editable and deletable.

<br/>

## 👥 Credits

<table>
<tr>
<td align="center" width="50%">
<strong>Research Owner</strong><br/><br/>
<strong>Limo Jesse Mwanga</strong><br/>
MSc. Civil Engineering — Construction Project Management<br/>
Kampala International University, 2026
</td>
<td align="center" width="50%">
<strong>System Design Collaborator</strong><br/><br/>
<strong>Omoding Isaac</strong><br/>
Data Scientist<br/>
System architecture, AI integration & full-stack implementation
</td>
</tr>
</table>

<br/>

## License

This project was developed as part of an academic dissertation and is provided for **educational and research purposes**.

---

<div align="center">

**BuildPro v1.0** · February 2026

Made with ❤️ in Kampala, Uganda

<br/>

<sub>

[⬆ Back to Top](#-buildpro)

</sub>

</div>
