# BuildPro Architecture Freeze

This document records the approved architecture decisions. These are frozen and should not be revisited without explicit discussion.

## Stack Decisions

### Frontend
- **React 19** with **TypeScript** (strict mode)
- **Vite** for build tooling
- **TanStack Query** for server state management
- **Zustand** for UI-only state
- **Tailwind CSS 4.x** for styling
- **React Router v7** for client-side routing

### Backend
- **Django 5.2 LTS** -- modular monolith pattern
- **Django REST Framework** for API layer
- **Session-based authentication** with CSRF protection
- **PBKDF2-SHA256** password hashing (Django default)

### Database
- **PostgreSQL 17**
- ~45 fully normalised tables
- JSONB permitted only for: metadata fields, user preferences, AI response cache, extension/config blobs
- All core business records (projects, tasks, costs, procurement items, etc.) are normalised columns

### Background Processing
- **Celery** with **Redis** as broker
- Used for: AI calls, PDF/Excel export, email notifications, scheduled reports
- Job status via **polling** (no WebSockets in initial release)

### File Storage
- **S3-compatible object storage** (Cloudflare R2 in production)
- Signed URLs for downloads
- MIME type whitelisting + file extension + size limit on upload (magic-byte verification deferred)
- Local filesystem in development (django-storages abstraction)

### Deployment
- **Primary:** Render (web service + worker + Key Value)
  - Django + Gunicorn serves API and built frontend SPA (same-origin via WhiteNoise)
  - Celery worker for async AI and background jobs
  - Render Key Value for Celery broker
  - Neon PostgreSQL (external)
  - Cloudflare R2 for production file storage
- **Secondary (self-hosted):** Docker Compose on single VPS
  - docker-compose.yml for local dev
  - deploy/docker-compose.prod.yml for VPS deployment with Caddy

### AI Layer
- **Provider-agnostic service layer** -- abstracts AI provider behind internal interface
- Initial provider: Google Gemini (gemini-2.0-flash) -- switchable via AI_PROVIDER env var
- Stub provider available for testing without API keys
- AI features are assistive, not authoritative
- All AI interactions logged and auditable via AIRequestLog
- AI permissions: ai.use (feature access), ai.history (audit log access)

## Architecture Pattern: Modular Monolith
- Single Django project with 17 well-bounded apps
- Apps communicate through Django's ORM and explicit service functions
- No internal message buses or event systems
- Clear import boundaries: apps import from `core` and their own models, cross-app imports go through service modules
- Each app owns its models, serializers, views, URLs, and tests

## API Design
- RESTful JSON API via DRF
- URL pattern: `/api/v1/{app}/{resource}/`
- ViewSets with explicit actions (no magic)
- Pagination: cursor-based for lists
- Filtering via django-filter
- Permissions checked on every request via DRF permission classes

## Authentication & Authorization
- Session-based auth (not JWT) -- simpler, more secure for single-domain deployment
- CSRF protection on all mutating endpoints
- Role-based permissions at org, project, and module levels
- All permission checks server-side -- frontend adapts UI but never enforces access

## Data Model Principles
- Every table has: `id` (UUID), `created_at`, `updated_at`
- Soft deletes where appropriate (recycle bin feature)
- Audit trail via model mixin (tracks who changed what and when)
- Foreign keys with proper ON DELETE behaviour
- No polymorphic inheritance -- use explicit tables
