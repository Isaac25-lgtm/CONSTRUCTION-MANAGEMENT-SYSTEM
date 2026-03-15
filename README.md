# BuildPro - Construction Project Management Platform

A construction-specific operations platform built for Uganda's construction industry. Manages scheduling (CPM), cost tracking (EVM), procurement, field operations, documents, RFIs, change orders, risks, labour, resources, and reporting for real construction projects.

**Live:** [https://buildpro-web.onrender.com](https://buildpro-web.onrender.com)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Local Development Setup](#local-development-setup)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [AI Features](#ai-features)
- [Production Deployment (Render)](#production-deployment-render)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Database Schema](#database-schema)
- [Contributing](#contributing)

---

## Overview

BuildPro is a **single-organisation deployment** designed for ~20 concurrent users. It replaces spreadsheets and generic project tools with a purpose-built platform that understands construction workflows:

- **9 project types:** Residential, Commercial, Road, Bridge, School, Hospital, Water/Utility, Industrial, Custom
- **7 contract types:** Lump Sum, Remeasurement, Design & Build, Turnkey, Management Contract, BOT/PPP, Custom
- **Critical Path Method (CPM)** scheduling engine with forward/backward pass, float calculation, and critical path detection
- **Earned Value Management (EVM)** with CPI, SPI, EAC, VAC metrics
- **Full procurement chain:** RFQ -> Quotation -> Purchase Order -> Goods Receipt -> Invoice -> Payment
- **Document control** with versioning, approval workflow, and revision tracking
- **AI-assisted reporting** using Google Gemini (provider-agnostic, swappable)
- **13 report types** exportable to CSV, Excel, PDF, and Word

---

## Architecture

```
Production (Render):

[Browser] --> [Render Web Service: Gunicorn + WhiteNoise]
                 |
                 |-- React SPA (same-origin, no CORS issues)
                 |-- Django REST API (/api/v1/*)
                 |-- Django Admin (/admin/*)
                 |-- Static files (/static/*)
                 |
                 |-- Celery tasks --> [Render Worker]
                 |-- Broker --------> [Render Key Value (Redis)]
                 |-- Database ------> [Neon PostgreSQL]
                 |-- Files ----------> [Cloudflare R2 (S3-compatible)]
```

**Same-origin architecture:** The Django web service serves both the API and the built React frontend. This eliminates all CORS and cross-origin cookie/CSRF complexity. Session-based authentication works naturally.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript + Vite | SPA with TanStack Query + Zustand |
| Styling | Tailwind CSS 4.x | Dark professional theme |
| Backend | Django 5.2 LTS | Modular monolith (17 apps) |
| API | Django REST Framework | RESTful JSON API |
| Database | PostgreSQL (Neon) | ~45 normalised tables |
| Background Jobs | Celery + Redis | Async AI, exports |
| File Storage | Cloudflare R2 | S3-compatible object storage |
| AI | Google Gemini | Provider-agnostic service layer |
| Static Files | WhiteNoise | Serves Django static + SPA |
| Deployment | Render | Web + Worker + Key Value |

---

## Features

### Global Navigation (6 areas)

| Module | Description | Status |
|--------|-------------|--------|
| **Dashboard** | Portfolio-level KPIs, project cards, notifications | Real API data |
| **Projects** | Project list, create/edit/archive, filters, search | Full CRUD |
| **Notifications** | Event-driven alerts with severity, read/unread, deep links | Real API |
| **Communications** | Landing page linking to project-level chat and meetings | Honest partial |
| **Reports** | Cross-project report hub with project links | Real API |
| **Settings** | Users (create), Roles, Organisation (edit), System info | Real API + mutations |

### Project Workspace (23 modules)

| Module | Description | Key Features |
|--------|-------------|-------------|
| **Overview & EVM** | Executive dashboard | Budget vs actual, CPI/SPI/EAC/VAC, progress, milestones |
| **Schedule & CPM** | Task management | Phase grouping, dependencies, critical path, recalculate |
| **Gantt Chart** | Visual timeline | Custom div-based bars, progress, critical highlighting |
| **Network Diagram** | Dependency graph | AON nodes with ES/DUR/EF, LS/SLACK/LF |
| **S-Curve** | Progress curves | Planned vs actual cumulative progress (SVG) |
| **Milestones** | Milestone tracking | Target dates, achievement status, task linking |
| **Cost & Budget** | Financial control | Budget lines (17 categories), expenses, variance |
| **Risk Register** | Risk management | Likelihood x impact scoring, mitigation plans |
| **RFIs** | Information requests | Due dates, overdue detection, response tracking |
| **Change Orders** | Variation management | Cost/time impact, approval workflow |
| **Punch List** | Deficiency tracking | Priority, assignee, close workflow |
| **Daily Logs** | Site diary | Weather, workforce, work performed, delays |
| **Safety** | Incident tracking | Severity, follow-up actions, lost time indicator |
| **Quality** | Inspection records | Pass/fail/conditional, corrective actions |
| **Site Photos** | Photo documentation | Image-only uploads, grid view, preview |
| **Procurement** | Full chain | RFQ -> Quotation -> PO -> GRN -> Invoice -> Payment (item-level) |
| **Timesheets** | Labour tracking | Hours, overtime, task linking, approval |
| **Resources** | Equipment & personnel | Org-scoped with project assignments |
| **Meetings** | Minutes & actions | Meeting types, action tracking, due dates |
| **Documents** | Version control | Code, status, discipline, approval, revision history |
| **Reports** | Project exports | 13 report types x 4 formats (CSV/Excel/PDF/Word) |
| **AI Assistant** | AI-powered analysis | Narrative, report drafts, project copilot |
| **Recycle Bin** | Soft-deleted items | Restore capability across all field modules |

---

## Local Development Setup

### Prerequisites

- **Python 3.12+** with venv support
- **Node.js 20+** with npm
- **PostgreSQL** running locally (or via Docker)
- **Redis** (optional -- only needed for async AI via Celery)
- **Git**

### Step 1: Clone the repository

```powershell
git clone https://github.com/Isaac25-lgtm/CONSTRUCTION-MANAGEMENT-SYSTEM.git
cd CONSTRUCTION-MANAGEMENT-SYSTEM
```

### Step 2: Backend setup

```powershell
cd backend

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # Windows PowerShell
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements/development.txt

# Set environment variables
$env:DJANGO_SETTINGS_MODULE = "buildpro.settings.development"
$env:GEMINI_API_KEY = "your-gemini-api-key"    # Required for AI features

# Create database (adjust for your local PostgreSQL)
# Default expects: host=localhost, port=5432, db=buildpro, user=postgres
# Create the database first:
#   psql -U postgres -c "CREATE DATABASE buildpro;"

# Run migrations
python manage.py migrate

# Seed sample data (5 users, 5 projects, tasks, budgets, etc.)
python manage.py seed_dev_data --flush

# Start the backend server
python manage.py runserver 0.0.0.0:8000
```

### Step 3: Frontend setup (new terminal)

```powershell
cd frontend

# Install dependencies
npm install

# Start development server (proxies /api to backend automatically)
npm run dev
```

### Step 4: Open in browser

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Frontend (Vite dev server with HMR) |
| http://localhost:8000 | Backend API (direct) |
| http://localhost:8000/api/health/ | Health check |
| http://localhost:8000/api/ready/ | Readiness (DB + Redis) |
| http://localhost:8000/admin/ | Django admin panel |

### Step 5: Login

All test account passwords: `buildpro123`

| Username | Role | System Access | Projects |
|----------|------|--------------|----------|
| `jesse` | Admin | Full access, manage users | All 5 projects |
| `sarah` | Management | Broad access, create projects | All 5 projects |
| `patrick` | Standard | Project-scoped access | 2 projects (manager) |
| `grace` | Standard | Project-scoped access | 3 projects (QS role) |
| `david` | Viewer | Read-only | 2 projects (viewer) |

### Optional: Redis + Celery (async AI)

```powershell
# Start Redis via Docker
docker run -d -p 6379:6379 redis:7-alpine

# In a new terminal, start Celery worker
cd backend
.\.venv\Scripts\Activate.ps1
$env:DJANGO_SETTINGS_MODULE = "buildpro.settings.development"
celery -A buildpro worker -l info
```

---

## Project Structure

```
CONSTRUCTION-MANAGEMENT-SYSTEM/
|
|-- render.yaml                    # Render Blueprint (web + worker + KV)
|-- Dockerfile.render              # Multi-stage production image
|-- docker-compose.yml             # Local dev (PostgreSQL + Redis)
|-- .env.example                   # Environment variable template
|-- .gitignore
|-- buildpro.html                  # Golden UI prototype reference
|
|-- backend/                       # Django 5.2 LTS
|   |-- manage.py
|   |-- pyproject.toml
|   |-- requirements/
|   |   |-- base.txt               # Shared dependencies
|   |   |-- development.txt        # Dev-only (includes base)
|   |   |-- production.txt         # Prod-only (whitenoise, storages, dj-database-url)
|   |
|   |-- buildpro/                  # Django project config
|   |   |-- settings/
|   |   |   |-- base.py            # Shared settings
|   |   |   |-- development.py     # Local dev (DEBUG=True)
|   |   |   |-- production.py      # Render prod (strict validation)
|   |   |-- urls.py                # Root URL config + SPA catch-all
|   |   |-- views.py               # Health, readiness, SPA serving
|   |   |-- wsgi.py                # WSGI entrypoint (strict env check)
|   |   |-- celery.py              # Celery app config
|   |   |-- tests/                 # Production config tests
|   |
|   |-- apps/                      # 17 Django apps
|       |-- core/                  # Base models, mixins, permissions
|       |-- accounts/              # Users, roles, org, auth (session + CSRF)
|       |-- projects/              # Projects, memberships, setup engine
|       |-- scheduling/            # CPM engine, tasks, deps, milestones, baselines
|       |-- cost/                  # Budget lines, expenses, EVM, overview
|       |-- risks/                 # Risk register
|       |-- rfis/                  # RFI tracking
|       |-- changes/               # Change orders
|       |-- field_ops/             # Punch list, daily logs, safety, quality
|       |-- procurement/           # RFQ, quotation, PO, GRN, invoice, payment
|       |-- labour/                # Timesheets
|       |-- resources/             # Org-scoped resources + project assignments
|       |-- comms/                 # Meetings, actions, project chat
|       |-- documents/             # Versioned document control, site photos
|       |-- reports/               # 13 report types, 4 export formats
|       |-- notifications/         # Event-driven notifications
|       |-- ai/                    # Provider-agnostic AI (Gemini adapter)
|
|-- frontend/                      # React 19 + TypeScript + Vite
|   |-- package.json
|   |-- vite.config.ts             # Dev proxy to backend
|   |-- tsconfig.json
|   |-- index.html
|   |-- src/
|       |-- api/client.ts          # Axios with CSRF handling
|       |-- hooks/                 # 18 TanStack Query hooks
|       |-- pages/                 # 31 page components
|       |-- components/
|       |   |-- layout/            # AppShell, Sidebar, Topbar, ProjectWorkspace
|       |   |-- shared/            # Reusable domain components
|       |   |-- ui/                # 17 UI primitives
|       |-- stores/                # Zustand (UI state)
|       |-- styles/                # Tailwind theme + custom CSS
|       |-- types/                 # Shared TypeScript types
|       |-- lib/                   # Formatters, utilities
|
|-- docs/                          # Architecture & handoff docs
|   |-- BUILDPRO_ARCHITECTURE_FREEZE.md
|   |-- BUILDPRO_SESSION_HANDOFF.md
|   |-- BUILDPRO_ROADMAP.md
|   |-- BUILDPRO_DECISIONS_LOG.md
|   |-- BUILDPRO_MODULE_MAP.md
|   |-- BUILDPRO_SYSTEM_CONTEXT.md
|
|-- deploy/                        # Self-hosted deployment (optional)
    |-- docker-compose.prod.yml
    |-- Caddyfile
    |-- backup.sh
    |-- restore.sh
```

---

## API Reference

All endpoints require session authentication unless noted. Base URL: `/api/v1/`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/csrf/` | Bootstrap CSRF cookie |
| POST | `/api/v1/auth/login/` | Login (username + password) |
| POST | `/api/v1/auth/logout/` | Logout |
| GET | `/api/v1/auth/me/` | Current user + permissions |
| GET | `/api/v1/auth/users/` | List org users (admin only) |
| POST | `/api/v1/auth/users/` | Create user (admin only) |
| GET | `/api/v1/auth/user-picker/` | Simple user list for pickers |
| GET | `/api/v1/auth/roles/` | List system roles |
| GET/PATCH | `/api/v1/auth/organisation/` | Get/update org settings |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/` | List accessible projects |
| POST | `/api/v1/projects/` | Create project |
| GET/PATCH | `/api/v1/projects/{id}/` | Get/update project |
| POST | `/api/v1/projects/{id}/archive/` | Archive project |
| GET/POST | `/api/v1/projects/{id}/members/` | List/add members |
| PATCH/DELETE | `/api/v1/projects/{id}/members/{mid}/` | Update/remove member |

### Scheduling

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/scheduling/{pid}/tasks/` | List/create tasks |
| GET/PATCH/DELETE | `/api/v1/scheduling/{pid}/tasks/{id}/` | Task detail |
| GET/POST | `/api/v1/scheduling/{pid}/dependencies/` | Dependencies |
| POST | `/api/v1/scheduling/{pid}/recalculate/` | Run CPM engine |
| GET | `/api/v1/scheduling/{pid}/summary/` | Schedule summary |
| GET | `/api/v1/scheduling/{pid}/gantt/` | Gantt chart data |
| GET | `/api/v1/scheduling/{pid}/network/` | Network diagram data |
| GET | `/api/v1/scheduling/{pid}/scurve/` | S-curve data |
| GET/POST | `/api/v1/scheduling/{pid}/milestones/` | Milestones |
| GET/POST | `/api/v1/scheduling/{pid}/baselines/` | Schedule baselines |

### Cost & Budget

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/cost/{pid}/budget-lines/` | Budget lines |
| GET/POST | `/api/v1/cost/{pid}/expenses/` | Expenses |
| GET | `/api/v1/cost/{pid}/summary/` | Cost summary |
| GET | `/api/v1/cost/{pid}/evm/` | EVM metrics |
| GET | `/api/v1/cost/{pid}/overview/` | Project overview |

### Field Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/risks/{pid}/risks/` | Risk register |
| GET/POST | `/api/v1/rfis/{pid}/rfis/` | RFIs |
| GET/POST | `/api/v1/changes/{pid}/change-orders/` | Change orders |
| GET/POST | `/api/v1/field-ops/{pid}/punch-items/` | Punch list |
| GET/POST | `/api/v1/field-ops/{pid}/daily-logs/` | Daily logs |
| GET/POST | `/api/v1/field-ops/{pid}/safety-incidents/` | Safety |
| GET/POST | `/api/v1/field-ops/{pid}/quality-checks/` | Quality |
| GET | `/api/v1/field-ops/{pid}/recycle-bin/` | Recycle bin |

### Procurement

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/procurement/suppliers/` | Suppliers (org-scoped) |
| GET/POST | `/api/v1/procurement/{pid}/rfqs/` | RFQs |
| GET/POST | `/api/v1/procurement/{pid}/quotations/` | Quotations |
| GET/POST | `/api/v1/procurement/{pid}/purchase-orders/` | Purchase orders |
| GET/POST | `/api/v1/procurement/{pid}/goods-receipts/` | Goods receipts |
| GET/POST | `/api/v1/procurement/{pid}/procurement-invoices/` | Invoices |
| GET/POST | `/api/v1/procurement/{pid}/procurement-payments/` | Payments |
| GET | `/api/v1/procurement/{pid}/procurement-summary/` | Summary |
| *nested* | `.../rfqs/{id}/items/`, `.../purchase-orders/{id}/items/` etc. | Line items |

### Resources, Labour, Communications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/resources/resources/` | Resources (org-scoped) |
| GET/POST | `/api/v1/resources/{pid}/resource-assignments/` | Project assignments |
| GET/POST | `/api/v1/labour/{pid}/timesheets/` | Timesheet entries |
| GET/POST | `/api/v1/comms/{pid}/meetings/` | Meetings |
| GET/POST | `/api/v1/comms/{pid}/meetings/{mid}/actions/` | Meeting actions |
| GET/POST | `/api/v1/comms/{pid}/chat/` | Project chat messages |

### Documents, Reports, Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/documents/{pid}/documents/` | Documents |
| POST | `/api/v1/documents/{pid}/documents/{did}/versions/` | New version |
| GET | `/api/v1/documents/{pid}/summary/` | Document summary |
| GET | `/api/v1/reports/{pid}/available/` | Available reports |
| POST | `/api/v1/reports/{pid}/generate/` | Generate export |
| GET | `/api/v1/reports/{pid}/history/` | Export history |
| GET | `/api/v1/notifications/notifications/` | User notifications |
| POST | `/api/v1/notifications/notifications/{id}/read/` | Mark read |
| POST | `/api/v1/notifications/notifications/read-all/` | Mark all read |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai/{pid}/narrative/` | Cost/schedule narrative |
| POST | `/api/v1/ai/{pid}/report-draft/` | AI report draft |
| POST | `/api/v1/ai/{pid}/copilot/` | Project copilot Q&A |
| GET | `/api/v1/ai/{pid}/history/` | AI request audit log |
| GET | `/api/v1/ai/jobs/{jobId}/` | Async job status |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health/` | No | Liveness probe |
| GET | `/api/ready/` | No | Readiness (DB + Redis) |

---

## Authentication & Authorization

### Auth Model

- **Session-based authentication** with CSRF protection
- **Single-organisation deployment** -- all users belong to one org
- **System roles** control org-wide capabilities (Admin, Management, Standard, Viewer)
- **Project memberships** control per-project access with role-based permissions

### Permission System

**System permissions** (org-wide):
- `admin.full_access` -- full system access
- `admin.manage_users` -- create/manage users
- `projects.create` -- create new projects
- `projects.view_all` -- see all projects
- `reports.view_cross_project` -- cross-project reporting

**Project permissions** (per-project, via membership):
- `project.view`, `project.edit`, `project.manage_members`
- `schedule.view`, `schedule.edit`
- `budget.view`, `budget.edit`, `budget.approve`
- `field_ops.view`, `field_ops.edit`
- `procurement.view`, `procurement.edit`, `procurement.approve`
- `risks.view`, `risks.edit`
- `rfis.view`, `rfis.edit`
- `changes.view`, `changes.edit`, `changes.approve`
- `documents.view`, `documents.upload`, `documents.delete`
- `reports.view`, `reports.export`
- `ai.use`, `ai.history`
- `labour.view`, `labour.edit`
- `comms.view`, `comms.edit`, `comms.send`

### Default Project Roles

| Role | Key Permissions |
|------|----------------|
| Manager | All permissions including manage_members, approve |
| Engineer | Schedule edit, field ops edit, docs upload |
| QS | Budget edit, procurement edit, changes edit, reports export |
| Supervisor | Field ops edit, docs upload, comms edit |
| Viewer | View-only across all modules |

---

## AI Features

### Architecture

- **Provider-agnostic service layer** -- adapters can be swapped via `AI_PROVIDER` env var
- **Current provider:** Google Gemini (gemini-2.0-flash)
- **Stub provider** available for testing without API keys
- **All interactions logged** in AIRequestLog for audit

### Phase 1 Features

1. **Cost & Schedule Narrative** -- generates management-ready status narrative from deterministic project data (schedule, cost, EVM, risks)
2. **AI Report Draft** -- produces written summaries from structured report data for all 13 report types
3. **Project Copilot** -- answers scoped questions using only the project's structured data (no RAG/document search)

### Boundaries

- AI is **assistive only** -- deterministic calculations remain authoritative
- AI **never bypasses permissions** -- context assembly only includes data the user can access
- AI requires `ai.use` permission (not granted to viewers)
- AI history requires `ai.history` permission (managers and admin only)
- Context windows are bounded -- structured summaries, not raw database dumps

---

## Production Deployment (Render)

### Prerequisites

1. **GitHub repo** connected to Render
2. **Neon PostgreSQL** database with connection string
3. **Cloudflare R2** bucket with API credentials
4. **Gemini API key** (rotated, never the dev key)

### Deploy Steps

1. In Render Dashboard: **New > Blueprint** and connect this repo
2. Render reads `render.yaml` and creates:
   - `buildpro-web` (web service -- Docker)
   - `buildpro-worker` (background worker -- Docker)
   - `buildpro-kv` (Key Value -- Redis-compatible)
3. Set manual env vars in Render dashboard (see [Environment Variables](#environment-variables))
4. Deploy
   - Docker build: compiles frontend, installs backend deps, runs collectstatic
   - preDeployCommand: runs database migrations
5. Create admin user:
   ```bash
   # Via Render Shell
   cd /app/backend && python manage.py createsuperuser
   ```

### How It Works

- **Frontend delivery:** Vite builds the SPA, which is copied into the Docker image. WhiteNoise serves it from Django at the root URL. SPA catch-all serves `index.html` for client-side routes.
- **Static files:** Django's `collectstatic` runs during image build (with `BUILD_MODE=true` to bypass runtime validation). WhiteNoise serves them with compression and caching.
- **File storage:** Documents, photos, and exports go to Cloudflare R2 via django-storages. Both web and worker access the same R2 bucket.
- **Background jobs:** Celery worker connects to the same database and R2 bucket. Broker is Render Key Value (Redis-compatible).

### Production Safety

- `REQUIRE_DATABASE_URL=true` -- app refuses to start without DATABASE_URL
- `REQUIRE_REMOTE_STORAGE=true` -- app refuses to start without R2 credentials
- `wsgi.py` and `celery.py` refuse to start without explicit `DJANGO_SETTINGS_MODULE`
- No silent fallbacks to development settings or local filesystem in production

---

## Environment Variables

### Local Development (.env)

```env
DJANGO_SETTINGS_MODULE=buildpro.settings.development
DJANGO_SECRET_KEY=any-dev-secret
POSTGRES_DB=buildpro
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-local-password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
CELERY_BROKER_URL=redis://localhost:6379/0
AI_PROVIDER=gemini
AI_MODEL=gemini-2.0-flash
GEMINI_API_KEY=your-key
```

### Render Production

| Variable | Required | Source | Description |
|----------|----------|--------|-------------|
| `DJANGO_SETTINGS_MODULE` | Yes | render.yaml | `buildpro.settings.production` |
| `DJANGO_SECRET_KEY` | Yes | render.yaml (auto) | Auto-generated strong secret |
| `REQUIRE_DATABASE_URL` | Yes | render.yaml | `true` |
| `REQUIRE_REMOTE_STORAGE` | Yes | render.yaml | `true` |
| `DATABASE_URL` | Yes | Manual | Neon PostgreSQL connection string |
| `ALLOWED_HOSTS` | Yes | Manual | e.g. `buildpro-web.onrender.com` |
| `CSRF_TRUSTED_ORIGINS` | Yes | Manual | e.g. `https://buildpro-web.onrender.com` |
| `CELERY_BROKER_URL` | Auto | render.yaml | From Key Value service |
| `CELERY_RESULT_BACKEND` | Auto | render.yaml | From Key Value service |
| `GEMINI_API_KEY` | Yes | Manual | Rotated API key |
| `AI_PROVIDER` | Yes | render.yaml | `gemini` |
| `AI_MODEL` | Yes | render.yaml | `gemini-2.0-flash` |
| `AWS_S3_ENDPOINT_URL` | Yes | Manual | R2 endpoint URL |
| `AWS_ACCESS_KEY_ID` | Yes | Manual | R2 access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | Manual | R2 secret key |
| `AWS_STORAGE_BUCKET_NAME` | Yes | Manual | R2 bucket name |
| `SENTRY_DSN` | Optional | Manual | Error tracking |

---

## Testing

### Backend Tests

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py test apps buildpro.tests --keepdb --noinput
```

Current: **186 tests** covering:
- Authentication and session management (7 tests)
- Organisation and user management (5 tests)
- Project access control (25 tests)
- Scheduling and CPM calculations (32 tests)
- Cost and EVM (11 tests)
- Field operations CRUD and permissions (34 tests)
- Procurement, resources, labour, comms, notifications (27 tests)
- Documents and file validation (11 tests)
- Reports and export authorization (14 tests)
- AI permissions, providers, and error handling (11 tests)
- Production config validation (9 tests)

### Frontend Checks

```powershell
cd frontend
npm run build    # TypeScript compilation + Vite build
npm run lint     # ESLint
```

---

## Database Schema

17 Django apps with ~45 normalised tables. Key models:

| App | Core Models |
|-----|------------|
| accounts | User, Organisation, SystemRole |
| projects | Project, ProjectMembership, ProjectSetupConfig |
| scheduling | ProjectTask, TaskDependency, Milestone, ScheduleBaseline, BaselineTaskSnapshot |
| cost | BudgetLine, Expense |
| risks | Risk |
| rfis | RFI |
| changes | ChangeOrder |
| field_ops | PunchItem, DailyLog, SafetyIncident, QualityCheck |
| procurement | Supplier, RFQ, RFQItem, Quotation, QuotationItem, PurchaseOrder, POItem, GoodsReceipt, GRNItem, ProcurementInvoice, ProcurementPayment |
| labour | TimesheetEntry |
| resources | Resource, ProjectResourceAssignment |
| comms | Meeting, MeetingAction, ChatMessage |
| documents | Document, DocumentVersion |
| reports | ReportExport |
| notifications | Notification |
| ai | AIRequestLog, AsyncJob |

### Design Principles

- **Normalised data** -- no JSONB for core business records
- **UUID primary keys** for all domain models
- **Soft-delete** via `deleted_at` on field operation records
- **Audit trail** via `created_by`, `updated_by`, `created_at`, `updated_at` mixins
- **Project-scoped** -- all operational data is scoped to a project
- **Org-scoped** -- suppliers and resources belong to the organisation

---

## Contributing

### Before Making Changes

1. Read `CLAUDE.md` for project rules
2. Read `docs/BUILDPRO_SESSION_HANDOFF.md` for current state
3. Read `docs/BUILDPRO_ARCHITECTURE_FREEZE.md` for approved decisions
4. Check the HTML prototype (`buildpro.html`) before changing UI

### Development Rules

- **No feature invention** -- work from the prototype and architecture docs
- **Server-side permissions** -- never trust the frontend for access control
- **Boring maintainability** -- simple, readable code over clever abstractions
- **Construction-aware** -- this is not a generic task manager
- **Test your changes** -- run `manage.py test apps --keepdb --noinput` before pushing
- **Update the handoff** -- update `docs/BUILDPRO_SESSION_HANDOFF.md` after major changes

---

## License

Proprietary. All rights reserved.
