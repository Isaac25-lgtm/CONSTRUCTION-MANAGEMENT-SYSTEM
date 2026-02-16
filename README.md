# BuildPro (Anonymized Internal Platform)

BuildPro is a client-contracted **internal project management platform** (anonymized for publication).

- Backend: FastAPI + SQLAlchemy + Alembic
- Frontend: React + TypeScript + Vite
- Database: PostgreSQL (Render managed Postgres in production)

## Canonical Local URLs

- Frontend: `http://localhost:5173`
- Backend API root: `http://localhost:8000`
- Backend health: `http://localhost:8000/health`
- Backend docs: `http://localhost:8000/docs`
- API base path: `/api/v1`

## Demo Seed Credentials (Local Development Only)

- Admin: `admin@example.com` / `Admin@123456`
- Project Manager: `pm@example.com` / `Password@123`

## API Path Convention

All API routes are served under:

- `http://localhost:8000/api/v1/...`

Examples:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/projects`

## Local Setup

### 1. Backend

```powershell
cd apps\api
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Optional for contributors
python run_local.py
```

`run_local.py` uses SQLite by default when `DATABASE_URL=sqlite:///./buildpro_local.db`.

### 2. Frontend

```powershell
cd apps\web
npm ci
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment Variables

### Backend (`apps/api/.env`)

Use `apps/api/.env.example` as a template.

Important values:

- `DATABASE_URL`
- `SECRET_KEY`
- `ENVIRONMENT`
- `ALLOWED_ORIGINS` (comma-separated or JSON array of exact origins)
- `USE_CLOUD_STORAGE`

### Frontend (`apps/web/.env.local`)

Use `apps/web/.env.example` as a template.

- `VITE_API_URL` should include protocol (recommended):
  - `http://localhost:8000`
  - `https://<your-api-service>.onrender.com`
- `/api` is appended automatically if missing.

No frontend API keys should be committed.

## Render Deployment (Blueprint)

This repo includes `render.yaml` with:

- Managed Postgres database
- Python web service (`apps/api`)
- Static site (`apps/web`)

### Backend service

- Build: `pip install -r requirements.txt`
- Start:
  `alembic upgrade head && gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT`
- Health check: `/health`

### Frontend static site

- Build: `npm ci && npm run build`
- Publish dir: `dist`
- Set `VITE_API_URL` to your backend URL with `/api`, for example:
  `https://<your-backend-service>.onrender.com/api`

### Required Render env vars

Backend:

- `DATABASE_URL` (from Render Postgres)
- `SECRET_KEY`
- `ENVIRONMENT=production`
- `DEBUG=false`
- `ALLOWED_ORIGINS=https://<your-frontend-site>.onrender.com,http://localhost:5173`
- `USE_CLOUD_STORAGE=true` with:
  `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- If `USE_CLOUD_STORAGE=false`, uploaded files are stored on local disk and are ephemeral on Render (lost on restart/redeploy).

Frontend:

- `VITE_API_URL=https://<your-backend-service>.onrender.com` (`/api` appended automatically if missing)

## Quick Verification

1. `GET /health` returns `{"status":"ok"}`
2. Login at `POST /api/v1/auth/login` returns:
   - `access_token`
   - `active_organization_id`
   - non-empty `user.organizations` for seeded users
3. Use `X-Organization-ID` for org-scoped endpoints like `/api/v1/projects`
4. Mutating API requests use `Authorization: Bearer <token>` and do not require CSRF headers.

## CORS Production Rule

- Do not use `*` for `ALLOWED_ORIGINS` in production.
- With `allow_credentials=true`, origins must be explicit (for Render: your static site origin).

