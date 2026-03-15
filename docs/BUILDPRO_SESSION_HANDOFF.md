# BuildPro Session Handoff

> **Last updated:** 2026-03-16 (Final Production Completion)
> **Phase:** Deployment-ready -- all blockers resolved
> **Build status:** 190 tests pass, build clean, lint clean

---

## Current Status

All build phases + remediation + Render deployment fixes complete. The Render startup failure (shell builtin in commands) is fixed. Worker env vars are shared from web service. Async AI is wired end-to-end with sync/async toggle. Production settings validators are properly extracted and tested.

## Render Production Hardening (This Session)

### Final Production Fixes (This Session)
1. **render.yaml commands** -- removed `cd` shell builtins that caused `"cd": executable file not found` on Render; preDeployCommand now uses `python manage.py migrate --noinput` directly (WORKDIR is /app/backend); worker uses `celery --workdir /app/backend`
2. **Worker env sharing** -- worker sources DJANGO_SECRET_KEY, DATABASE_URL, GEMINI_API_KEY, and all AWS_* vars from web service via `fromService.envVarKey` instead of manual duplication
3. **Production validators extracted** -- validation logic moved to `buildpro/settings/validators.py` with `validate_database_url()` and `validate_remote_storage()` functions; production.py calls these
4. **Production tests rewritten** -- 13 tests exercising actual validator functions (not toy reimplementations)
5. **Async AI wired end-to-end** -- useAI.ts has sync + async hook variants; AIAssistantPage has sync/async mode toggle; async calls `?async=true`, polls via useJobStatus, renders output_reference
6. **All docs updated** -- test count 190, stale claims removed, Render deploy steps corrected

### Production Architecture

```
GitHub --> render.yaml Blueprint
              |
              +-- buildpro-web (Docker, Gunicorn + WhiteNoise)
              |     API + SPA same-origin
              |     collectstatic in Docker build
              |     migrations in preDeployCommand
              |
              +-- buildpro-worker (Docker, Celery)
              |     dockerCommand: celery worker
              |
              +-- buildpro-kv (type: keyvalue)
              |     Celery broker + result backend
              |
              +-- Neon PostgreSQL (external, DATABASE_URL)
              +-- Cloudflare R2 (external, AWS_* env vars)
```

### Key Design Decisions
- **collectstatic runs in Docker build**, not in preDeployCommand (preDeployCommand runs on a fresh instance without build artifacts)
- **BUILD_MODE=true** during Docker build suppresses runtime validation (no DATABASE_URL/R2 needed at build time)
- **REQUIRE_DATABASE_URL** and **REQUIRE_REMOTE_STORAGE** flags enforce strict production config at startup
- **Same-origin SPA** via WhiteNoise WHITENOISE_ROOT -- no CORS/CSRF cross-domain issues

## Running Locally (Windows/PowerShell)

```powershell
# Terminal 1: Backend
cd backend
.\.venv\Scripts\Activate.ps1
$env:DJANGO_SETTINGS_MODULE = "buildpro.settings.development"
$env:GEMINI_API_KEY = "your-key"
python manage.py migrate
python manage.py seed_dev_data --flush
python manage.py runserver 0.0.0.0:8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

### URLs
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Health: http://localhost:8000/api/health/

### Login (all passwords: `buildpro123`)
| Username | Role | Access |
|----------|------|--------|
| jesse | Admin | All projects |
| sarah | Management | All projects |
| patrick | Standard | 2 projects |
| grace | Standard/QS | 3 projects |
| david | Viewer | 2 projects |

## Render Deploy Steps

1. Push repo to GitHub
2. Create Neon PostgreSQL database
3. Create Cloudflare R2 bucket
4. Render Dashboard > New > Blueprint > connect repo
5. Render creates: buildpro-web, buildpro-worker, buildpro-kv
6. Set manual env vars in Render (see Required Env Vars below)
7. Deploy -- Docker build runs collectstatic; preDeployCommand runs migrations
8. Create admin: SSH into web, `cd /app/backend && python manage.py createsuperuser`

## Required Render Env Vars

| Variable | Web | Worker | Source |
|----------|-----|--------|--------|
| DJANGO_SETTINGS_MODULE | auto (render.yaml) | auto | render.yaml |
| DJANGO_SECRET_KEY | auto-generated | must match web | render.yaml / manual |
| REQUIRE_DATABASE_URL | auto=true | auto=true | render.yaml |
| REQUIRE_REMOTE_STORAGE | auto=true | auto=true | render.yaml |
| DATABASE_URL | Neon string | same | Manual |
| ALLOWED_HOSTS | render hostname | N/A | Manual |
| CSRF_TRUSTED_ORIGINS | https://hostname | N/A | Manual |
| CELERY_BROKER_URL | from Key Value | from Key Value | render.yaml |
| CELERY_RESULT_BACKEND | from Key Value | from Key Value | render.yaml |
| GEMINI_API_KEY | rotated key | same | Manual |
| AWS_S3_ENDPOINT_URL | R2 endpoint | same | Manual |
| AWS_ACCESS_KEY_ID | R2 key | same | Manual |
| AWS_SECRET_ACCESS_KEY | R2 secret | same | Manual |
| AWS_STORAGE_BUCKET_NAME | bucket name | same | Manual |

## Cutover from Legacy App

Legacy: https://github.com/Isaac25-lgtm/CONSTRUCTION-MANAGEMENT-SYSTEM

1. Deploy BuildPro on Render (new services, new Neon DB)
2. Verify all modules on new Render URL
3. Point custom domain to new Render web service
4. Decommission old deployment
5. This is a new system -- no database migration from legacy

## What Is Intentionally Deferred
- Profile self-edit / password change
- Email notifications / password reset
- Frontend bundle code splitting
- Magic-byte file verification
- CI/CD pipeline
- **Production deployment has not been runtime-verified on live Render yet**

## FINAL SYSTEM AUDIT STATUS

### Critical Issues: None remaining
### Modules Fully API-Connected: All 31 pages
### Fake Data: None in any production path
### Localhost: Ready
### Production (Render): Deployment-ready, not yet runtime-verified
### Recommended Next: Deploy to Render, create admin, smoke-test all modules
