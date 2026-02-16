# Setup Guide

This guide is for local development and Render deployment.

## Local Development

### Backend

```powershell
cd apps\api
C:\Users\USER\AppData\Local\Programs\Python\Python312\python.exe -m pip install -r requirements.txt
C:\Users\USER\AppData\Local\Programs\Python\Python312\python.exe run_local.py
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
- `USE_CLOUD_STORAGE=false` (unless configured)

### Frontend Environment Variables

- `VITE_API_URL` should include protocol (recommended), for example:
  - `http://localhost:8000`
  - `https://<backend-service>.onrender.com`
- `/api` is appended automatically if missing.

## Notes

- Backend normalizes `postgres://` to `postgresql://` automatically.
- In non-production mode, if a user belongs to exactly one org, missing `X-Organization-ID` is auto-resolved.
- In production, `X-Organization-ID` remains required for org-scoped endpoints.
- Mutating API endpoints authenticated with Bearer tokens do not require CSRF headers.
- In production, `ALLOWED_ORIGINS` must be explicit origins (no `*`).

