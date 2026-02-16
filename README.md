# BuildPro

BuildPro is an internal construction/project management platform organized as a monorepo with a FastAPI backend and a React frontend.

## 1. What This Repository Contains

- Backend API (`apps/api`) built with FastAPI, SQLAlchemy, Alembic, and PostgreSQL.
- Frontend app (`apps/web`) built with React, TypeScript, Zustand, and Vite.
- Render Blueprint (`render.yaml`) for production deployment.
- Local developer scripts (`start.sh`, `start.bat`, `docker-compose.yml`) for convenience.

## 2. Technology Stack

### Backend

- FastAPI + Uvicorn + Gunicorn
- SQLAlchemy ORM + Alembic migrations
- PostgreSQL (Render managed DB in production)
- JWT auth (`python-jose`) + password hashing (`passlib`/`bcrypt`)
- Optional cloud file storage (Cloudflare R2 / S3-compatible)

### Frontend

- React + TypeScript + Vite
- Zustand state management
- Axios API client with auth/organization context interceptors
- Tailwind CSS

### Deployment

- Render Blueprint with:
  - API web service
  - Static frontend site
  - Managed PostgreSQL database

## 3. Monorepo Layout (High-Level)

```text
.
|-- apps/
|   |-- api/   # FastAPI backend
|   `-- web/   # React frontend
|-- render.yaml
|-- docker-compose.yml
|-- start.sh
|-- start.bat
|-- README.md
`-- SETUP.md
```

## 4. Backend Architecture (`apps/api`)

### Entry and app wiring

- `app/main.py`: FastAPI app creation, middleware, exception handlers, `/health`, router include.
- `app/api/v1/router.py`: mounts all `/api/v1/*` route groups.

### API layers

- `app/api/v1/routes/*`: route modules by domain (`auth`, `projects`, `tasks`, etc.).
- `app/api/v1/dependencies.py`: auth user/org resolution (`Authorization` + `X-Organization-ID`).

### Domain model and schemas

- `app/models/*`: SQLAlchemy models (canonical persistence contract).
- `app/schemas/*`: Pydantic request/response schemas.

### Data and migrations

- `app/db/session.py`: SQLAlchemy engine/session configuration.
- `app/db/init_db.py`: local seed/bootstrap utility.
- `alembic/versions/*`: migration history and schema evolution.

### Core services

- `app/core/config.py`: environment settings, CORS parsing, production validation.
- `app/core/security.py`: JWT + password helpers.
- `app/services/storage.py`: document storage service (local/R2, lazy init, streaming upload path).
- `app/middleware/*`: rate limiting, audit logging, csrf middleware module.

## 5. Frontend Architecture (`apps/web`)

### App shell and routing pages

- `src/App.tsx`: top-level composition.
- `src/pages/*`: feature pages (Projects, Tasks, Documents, Risks, etc.).

### API and data flow

- `src/lib/api.ts`: canonical API client wrapper.
- `src/lib/axios.ts`: secondary axios client.
- `src/stores/*`: Zustand stores by domain (auth, projects, tasks, documents, etc.).

### UI composition

- `src/components/*`: reusable components, layout, auth guard, modal/dialog UI.
- `src/components/AIChat/*`: AI chat feature widgets.

## 6. API, Auth, and Multi-Tenancy Conventions

- API base path is **always** `/api/v1`.
- Login endpoint: `POST /api/v1/auth/login`.
- Access token is sent as `Authorization: Bearer <token>`.
- Org-scoped routes use `X-Organization-ID`.
- If the user has exactly one active membership, org may auto-resolve.
- If the user has multiple active memberships, `X-Organization-ID` is required.

## 7. Canonical Local URLs

- Frontend: `http://localhost:5173`
- Backend API root: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## 8. Local Development

### Backend

```powershell
cd apps\api
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Optional for contributors
python run_local.py
```

### Frontend

```powershell
cd apps\web
npm ci
npm run dev
```

### Demo Seed Credentials (local only)

- Admin: `admin@example.com` / `Admin@123456`
- PM: `pm@example.com` / `Password@123`

## 9. Environment Configuration

### Backend (`apps/api/.env`)

Use `apps/api/.env.example`.

Required/important:

- `DATABASE_URL`
- `SECRET_KEY`
- `ENVIRONMENT`
- `DEBUG`
- `ALLOWED_ORIGINS`
- `USE_CLOUD_STORAGE`
- `MAX_UPLOAD_SIZE`

When `USE_CLOUD_STORAGE=true`, also set:

- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL` (recommended)

### Frontend (`apps/web/.env.local`)

Use `apps/web/.env.example`.

- `VITE_API_URL=http://localhost:8000` (or production API origin)
- The frontend appends `/api` automatically if missing.

## 10. Render Deployment (Blueprint)

The root `render.yaml` defines:

- PostgreSQL database: `buildpro-db`
- API service: `buildpro-api` (Python)
- Frontend service: `buildpro-web` (Static)

### API service behavior

- Build: `pip install -r requirements.txt`
- Start: `alembic upgrade head && gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT`
- Health check: `/health`

### Frontend service behavior

- Build: `npm ci && npm run build`
- Publish: `dist`
- Route rewrite: `/* -> /index.html`

### Production notes

- Do not use `*` for `ALLOWED_ORIGINS` in production.
- With cookies/credentials, allowed origins must be explicit.
- Render local disk is ephemeral; use cloud storage (`USE_CLOUD_STORAGE=true`) for persistent document uploads.

## 11. Dependency Strategy

Backend dependencies are split intentionally:

- Runtime only: `apps/api/requirements.txt`
- Dev/test/lint only: `apps/api/requirements-dev.txt`

This keeps production deploys smaller and faster.

## 12. Full Repository Structure (Tracked Files)

```text
.gitignore
CHANGELOG.md
README.md
SETUP.md
apps/api/.env.example
apps/api/Dockerfile
apps/api/alembic.ini
apps/api/alembic/env.py
apps/api/alembic/versions/001_initial_migration.py
apps/api/alembic/versions/002_add_multi_tenancy_and_core_models.py
apps/api/alembic/versions/003_rename_audit_log_metadata.py
apps/api/alembic/versions/004_fix_risk_schema.py
apps/api/app/api/deps.py
apps/api/app/api/v1/dependencies.py
apps/api/app/api/v1/router.py
apps/api/app/api/v1/routes/analytics.py
apps/api/app/api/v1/routes/audit_logs.py
apps/api/app/api/v1/routes/auth.py
apps/api/app/api/v1/routes/documents.py
apps/api/app/api/v1/routes/expenses.py
apps/api/app/api/v1/routes/messages.py
apps/api/app/api/v1/routes/milestones.py
apps/api/app/api/v1/routes/organizations.py
apps/api/app/api/v1/routes/projects.py
apps/api/app/api/v1/routes/risks.py
apps/api/app/api/v1/routes/tasks.py
apps/api/app/api/v1/routes/users.py
apps/api/app/core/config.py
apps/api/app/core/errors.py
apps/api/app/core/rbac.py
apps/api/app/core/security.py
apps/api/app/core/storage.py
apps/api/app/db/base.py
apps/api/app/db/init_db.py
apps/api/app/db/session.py
apps/api/app/logging.py
apps/api/app/main.py
apps/api/app/middleware/__init__.py
apps/api/app/middleware/audit.py
apps/api/app/middleware/csrf.py
apps/api/app/middleware/rate_limit.py
apps/api/app/models/__init__.py
apps/api/app/models/audit_log.py
apps/api/app/models/document.py
apps/api/app/models/expense.py
apps/api/app/models/job.py
apps/api/app/models/message.py
apps/api/app/models/milestone.py
apps/api/app/models/organization.py
apps/api/app/models/project.py
apps/api/app/models/risk.py
apps/api/app/models/task.py
apps/api/app/models/user.py
apps/api/app/schemas/analytics.py
apps/api/app/schemas/auth.py
apps/api/app/schemas/document.py
apps/api/app/schemas/expense.py
apps/api/app/schemas/message.py
apps/api/app/schemas/milestone.py
apps/api/app/schemas/organization.py
apps/api/app/schemas/project.py
apps/api/app/schemas/risk.py
apps/api/app/schemas/task.py
apps/api/app/services/storage.py
apps/api/requirements-dev.txt
apps/api/requirements.txt
apps/api/run_local.py
apps/web/.env.example
apps/web/Dockerfile
apps/web/index.html
apps/web/package-lock.json
apps/web/package.json
apps/web/postcss.config.js
apps/web/public/_redirects
apps/web/src/App.tsx
apps/web/src/components/AIChat/AIChatWidget.tsx
apps/web/src/components/AIChat/ChatMessage.tsx
apps/web/src/components/AIChat/ChatWindow.tsx
apps/web/src/components/AIChat/QuickActions.tsx
apps/web/src/components/AIChat/index.ts
apps/web/src/components/ErrorBoundary.tsx
apps/web/src/components/Layout.tsx
apps/web/src/components/OrganizationSelector.tsx
apps/web/src/components/ProjectDetailsModal.tsx
apps/web/src/components/ProtectedRoute.tsx
apps/web/src/components/ui/EmptyState.tsx
apps/web/src/components/ui/LoadingState.tsx
apps/web/src/components/ui/Modal.tsx
apps/web/src/components/ui/ProgressBar.tsx
apps/web/src/components/ui/StatusBadge.tsx
apps/web/src/index.css
apps/web/src/lib/api.ts
apps/web/src/lib/axios.ts
apps/web/src/main.tsx
apps/web/src/pages/BudgetPage.tsx
apps/web/src/pages/CommunicationPage.tsx
apps/web/src/pages/Dashboard.tsx
apps/web/src/pages/DashboardPage.tsx
apps/web/src/pages/DocumentsPage.tsx
apps/web/src/pages/LoginPage.tsx
apps/web/src/pages/ProjectsPage.tsx
apps/web/src/pages/ReportsPage.tsx
apps/web/src/pages/RisksPage.tsx
apps/web/src/pages/SchedulePage.tsx
apps/web/src/pages/SettingsPage.tsx
apps/web/src/pages/TasksPage.tsx
apps/web/src/services/geminiService.ts
apps/web/src/stores/aiChatStore.ts
apps/web/src/stores/auditStore.ts
apps/web/src/stores/authStore.ts
apps/web/src/stores/dataStore.ts
apps/web/src/stores/documentStore.ts
apps/web/src/stores/expenseStore.ts
apps/web/src/stores/messageStore.ts
apps/web/src/stores/milestoneStore.ts
apps/web/src/stores/projectStore.ts
apps/web/src/stores/riskStore.ts
apps/web/src/stores/taskStore.ts
apps/web/src/stores/themeStore.ts
apps/web/src/stores/userStore.ts
apps/web/src/utils/projectContext.ts
apps/web/src/vite-env.d.ts
apps/web/tailwind.config.js
apps/web/tsconfig.json
apps/web/tsconfig.node.json
apps/web/vite.config.ts
apps/web/vite.config.ts.timestamp-1768988837587-c6e2b4f57fc31.mjs
docker-compose.yml
render.yaml
start.bat
start.sh
```

## 13. Related Docs

- `SETUP.md`: focused setup/deployment walkthrough.
- `CHANGELOG.md`: change history.


