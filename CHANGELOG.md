# Changelog

## 2026-02-16

### Fixed

- Resolved startup crash when `boto3` is missing by making cloud storage imports optional and guarded by `USE_CLOUD_STORAGE` checks.
- Fixed seed-data org gap so seeded users are members of the default organization with `ACTIVE` status.
- Standardized seed users across seed paths:
  - `admin@example.com` / `Admin@123456`
  - `pm@example.com` / `Password@123`
- Added `active_organization_id` to login response.
- Added development fallback for missing `X-Organization-ID` when a user has exactly one active org.
- Standardized API path usage to `/api/v1/...` in frontend API client.
- Standardized frontend dev port to `5173` in Vite and scripts/docs.
- Updated health endpoint response to `{"status":"ok"}`.
- Added database URL normalization (`postgres://` -> `postgresql://`) for SQLAlchemy/Alembic compatibility.

### Render readiness

- Replaced `render.yaml` with a Render Blueprint using:
  - Python web service (gunicorn + uvicorn worker)
  - Static site for frontend
  - Managed Postgres database
- Ensured backend start command binds to `0.0.0.0:$PORT`.

### Hygiene

- Cleaned `.gitignore` and ensured `node_modules`/build/env artifacts are ignored.
- Updated `.env.example` templates for backend and frontend.
- Updated docs (`README.md`, `SETUP.md`) for consistent endpoints, ports, and deployment steps.

