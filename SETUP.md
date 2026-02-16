# Setup Guide

This guide is for local development and Render deployment.

## Local Development

### Backend

```powershell
cd apps\api
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Optional for contributors
python run_local.py
```

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

### Frontend

```powershell
cd apps\web
npm ci
npm run dev
```

- Frontend: `http://localhost:5173`

### Demo Credentials

- `admin@example.com` / `Admin@123456`
- `pm@example.com` / `Password@123`

## Required API Prefix

All API calls must use `/api/v1/...`.

Examples:

- `POST /api/v1/auth/login`
- `GET /api/v1/projects`

## Render Deployment

Use the included `render.yaml` Blueprint.

### Services

- Managed Postgres database
- Backend web service (`apps/api`)
- Frontend static site (`apps/web`)

### Backend Environment Variables

- `DATABASE_URL` (from Render Postgres)
- `SECRET_KEY`
- `ENVIRONMENT=production`
- `DEBUG=false`
- `ALLOWED_ORIGINS=https://<frontend-service>.onrender.com,http://localhost:5173`
- `USE_CLOUD_STORAGE=true` with:
  `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- If `USE_CLOUD_STORAGE=false`, document uploads are stored on Render local disk and are ephemeral (lost on restart/redeploy).

### Frontend Environment Variables

- `VITE_API_URL` should include protocol (recommended), for example:
  - `http://localhost:8000`
  - `https://<backend-service>.onrender.com`
- `/api` is appended automatically if missing.

## Notes

- Backend normalizes `postgres://` to `postgresql://` automatically.
- If a user belongs to exactly one active org, missing `X-Organization-ID` is auto-resolved.
- If a user belongs to multiple active orgs, `X-Organization-ID` is required for org-scoped endpoints (including production).
- Mutating API endpoints authenticated with Bearer tokens do not require CSRF headers.
- In production, `ALLOWED_ORIGINS` must be explicit origins (no `*`).

