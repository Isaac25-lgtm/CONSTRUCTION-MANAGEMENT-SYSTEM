# BuildPro Build Roadmap

## Build Philosophy
BuildPro is built in **architectural slices** -- each prompt/session delivers a complete vertical slice of functionality. We scaffold the foundation first, then build module by module, always keeping the system runnable.

---

## Phase 0: Foundation
**Status: SCAFFOLDED** (2026-03-14) -- files exist and compile; backend not yet runnable (needs Python env + migrations)

Deliverables:
- [x] Project memory system (CLAUDE.md, docs/)
- [x] Architecture freeze documentation
- [x] Repository scaffold (frontend + backend + deploy)
- [x] Django project with 17 app skeletons
- [x] React + Vite app shell with routing and layout
- [x] Core models and mixins (audit, soft-delete, timestamps)
- [x] Auth foundation (User model, session auth)
- [x] DRF setup, health endpoint, API router
- [x] Docker Compose for local development
- [x] Developer tooling (linting, .env, gitignore, scripts)

**Not included:** Business logic, full models, full UI components, AI features

---

## Phase 0.5: Frontend Shell
**Status: COMPLETE** (2026-03-14)

Deliverables:
- [x] Production-ready app shell (sidebar, topbar, content area) matching prototype
- [x] All 6 global pages polished with demo data (Dashboard, Projects, Notifications, Communications, Reports, Settings)
- [x] Routing structure: /app/* global pages + /app/projects/:id/* workspace routes
- [x] Project workspace with all 23 module routes and placeholder views
- [x] 14 reusable UI components (PageHeader, SectionCard, MetricCard, etc.)
- [x] Theme foundation matching prototype colors, spacing, typography
- [x] RequireAuth guard, login page, public/protected route split

**Not included:** Real data, backend runtime, business logic

---

## Phase 1A: Auth + Identity + Access Control
**Status: COMPLETE** (2026-03-14)

Deliverables:
- [x] SystemRole model with permission codenames
- [x] User extended with system_role, job_title, permission helpers
- [x] ProjectMembership with project-scoped permissions
- [x] DRF permission classes (IsOrgMember, IsAdmin, HasSystemPermission, ProjectPermission)
- [x] Auth endpoints (login/logout/me) with full permission data
- [x] User management endpoints (list/create, admin-only writes)
- [x] Access-controlled project list/detail
- [x] Project membership management endpoints
- [x] Seed data command (5 users, 5 projects, 14 memberships)
- [x] Frontend wired to real auth and project API
- [x] 16 targeted tests (auth + access control)

---

## Phase 1B: Project Domain + Setup Engine
**Status: COMPLETE** (2026-03-14)

Deliverables:
- [x] Python environment setup and database migrations
- [x] Project model extended with code, consultant, contractor, setup_complete
- [x] Auto-generated project codes (BP-RES-001, BP-RD-001, etc.)
- [x] Setup engine: phase templates + milestones by project type, design phase for D&B/Turnkey/BOT
- [x] Project creation modal matching prototype
- [x] Project CRUD API with PageNumberPagination
- [x] Project workspace shows code, setup config, client/consultant
- [x] Logout button in sidebar
- [x] Seed data with 5 projects, codes, setup configs
- [x] 12 project tests (code gen, setup engine, CRUD)

---

## Phase 2: Scheduling & Planning Engine
**Status: COMPLETE** (2026-03-14)

Deliverables:
- [x] ProjectTask, TaskDependency, Milestone, ScheduleBaseline, BaselineTaskSnapshot models
- [x] CPM engine (Kahn's topo sort, forward/backward pass, float, critical path, cycle detection)
- [x] Task seeding from setup engine templates (219 tasks across 5 projects)
- [x] Schedule API (17 endpoints: tasks, deps, CPM, milestones, baselines, gantt, scurve)
- [x] Schedule & CPM view (task table with CPM values, editable progress, recalculate)
- [x] Gantt chart (custom div-based bars with progress and critical highlighting)
- [x] Network diagram (AON nodes with ES/DUR/EF and LS/SLACK/LF)
- [x] S-Curve (custom SVG planned vs actual curves)
- [x] Milestones view (table with status badges)
- [x] Baseline creation and versioning
- [x] 16 scheduling tests (CPM, baselines, seeding, API)

---

## Phase 3: Cost, Budget, and Overview Analytics
**Status: COMPLETE** (2026-03-14)

Deliverables:
- [x] BudgetLine model (17 construction categories, variance properties)
- [x] Expense model (budget line FK, vendor, reference, status)
- [x] Cost service (summary, variance, category breakdown)
- [x] EVM service (BAC/BCWP/BCWS/ACWP/CPI/SPI/EAC/VAC)
- [x] Project overview service (assembles schedule + cost + milestones + EVM)
- [x] 7 API endpoints (budget CRUD, expense CRUD, summary, evm, overview)
- [x] Cost & Budget frontend (tables, modals, summary cards)
- [x] Overview & EVM frontend (KPIs, progress, cost cards, EVM grid, milestones)
- [x] 50 budget lines + 32 expenses seeded
- [x] 11 cost tests

---

## Phase 4: Field Operations
**Status: COMPLETE** (2026-03-14)

Deliverables:
- [x] Risk Register (Risk model, CRUD API, severity scoring, frontend)
- [x] RFIs (RFI model, overdue detection, CRUD API, frontend)
- [x] Change Orders (ChangeOrder model, cost/time impact, CRUD API, frontend)
- [x] Punch List (PunchItem model, CRUD API, frontend)
- [x] Daily Logs (DailyLog model, card-based UI, CRUD API, frontend)
- [x] Safety Incidents (SafetyIncident model, severity badges, CRUD API, frontend)
- [x] Quality Checks (QualityCheck model, pass/fail/conditional, CRUD API, frontend)
- [x] Recycle Bin (soft-delete via BaseModel, placeholder page)
- [x] Seed data: risks, RFIs, change orders, punch items, daily logs, safety, quality
- [x] 12 field ops tests (CRUD, permissions, soft delete, overdue, risk score)

---

## Phase 5: Procurement, Resources, Labour, Meetings, Chat, Notifications
**Status: COMPLETE** (2026-03-14)

Deliverables:
- [x] Procurement chain: Supplier, PO, POItem, GRN, GRNItem, Invoice, Payment
- [x] Resources: org-scoped Resource + ProjectResourceAssignment
- [x] Labour: TimesheetEntry with hours/overtime/approval
- [x] Meetings: Meeting + MeetingAction with tracking
- [x] Project Chat: ChatMessage with 10s polling
- [x] Notifications: user-scoped with levels, read/unread, mark-read
- [x] Frontend pages for all 6 modules
- [x] Seed data: suppliers, POs, resources, timesheets, meetings, chat, notifications

---

## Phase 6: Documents, Files, Versioning, Reports, Exports
**Status: COMPLETE** (2026-03-15)

Deliverables:
- [x] Document model with 6 categories and versioning
- [x] DocumentVersion model with immutable revisions
- [x] Document services (create, version, download)
- [x] Full CRUD API with authorization
- [x] Site Photos as document category with image grid UI
- [x] 13 report types with data assembly services
- [x] 4 export formats: CSV, Excel (openpyxl), PDF (reportlab), Word (python-docx)
- [x] Export history and re-download
- [x] DocumentsPage, SitePhotosPage, ProjectReportsPage frontends
- [x] 10 seed documents across 4 projects
- [x] 15 tests (documents + reports)

---

## Phase 7: AI, Background Jobs, Hardening, and Deployment Readiness
**Status: COMPLETE** (2026-03-15)

Deliverables:
- [x] Provider-agnostic AI layer with adapter pattern
- [x] Gemini adapter (google-generativeai) + stub adapter for testing
- [x] 3 AI features: Cost/Schedule Narrative, Report Draft, Project Copilot
- [x] AIRequestLog audit model for AI interactions
- [x] AsyncJob model for background task tracking
- [x] Celery tasks for all AI features with sync+async support
- [x] AI frontend page with narrative, draft, copilot, and history
- [x] Production settings hardening (HSTS, secure cookies, X-Frame DENY)
- [x] Structured logging with app-level loggers
- [x] Sentry integration hook (via SENTRY_DSN env var)
- [x] Docker Compose with 5 services (db, redis, web, worker, beat)
- [x] Updated .env.example with all configuration variables
- [x] 14 AI tests (model, provider, views, permissions, audit)
- [x] 161 total tests passing

---

## Final Remediation Pass
**Status: COMPLETE** (2026-03-15)

Deliverables:
- [x] Resource PATCH permission fixed (admin/management only)
- [x] Readiness test fixed for no-Redis environments
- [x] Dashboard rebuilt from real API data (no demo data)
- [x] Communications page rebuilt as honest landing (no fake channels)
- [x] Notifications demo fallback removed (real error state)
- [x] Settings no-op actions disabled honestly
- [x] Reports re-download from export history + Content-Disposition filenames
- [x] AI report keys loaded from available_reports endpoint (all 13)
- [x] AI async job polling surfaced in UI
- [x] Production Docker (Gunicorn, production requirements, Caddy, frontend Nginx)
- [x] README rewritten for Windows/PowerShell
- [x] AI permission gating (ai.use, ai.history) enforced frontend + backend

---

## Final Remediation Sprint
**Status: COMPLETE** (2026-03-15)

Deliverables:
- [x] Production delivery path fixed (Caddy -> Nginx + Gunicorn, static/media volumes)
- [x] wsgi.py / celery.py refuse to start without explicit DJANGO_SETTINGS_MODULE
- [x] Settings: Add User wired to real API
- [x] Settings: Org Save wired to real PATCH endpoint
- [x] AI async mode surfaced in UI with job polling
- [x] Dashboard/Communications/Reports: honest error states on API failure
- [x] File validation docs downgraded honestly (no magic-byte claims)
- [x] frontend/README.md replaced with BuildPro-specific content
- [x] Beat service claims removed (not implemented)
- [x] Tests: org PATCH, user creation, report re-download authorization
- [x] All docs reconciled with actual codebase

---

## Render Productionization + Hardening
**Status: COMPLETE** (2026-03-16)

Deliverables:
- [x] render.yaml Blueprint (type: keyvalue, dockerCommand for worker, migrations-only preDeploy)
- [x] Dockerfile.render (multi-stage build, explicit collectstatic with BUILD_MODE, no silent failures)
- [x] Same-origin SPA via WhiteNoise + SPA catch-all
- [x] Neon PostgreSQL via DATABASE_URL + dj-database-url + SSL
- [x] Cloudflare R2 via django-storages (required when REQUIRE_REMOTE_STORAGE=true)
- [x] Strict production validation: missing DATABASE_URL or R2 vars raise ImproperlyConfigured
- [x] BUILD_MODE bypass for collectstatic during image build
- [x] SECURE_PROXY_SSL_HEADER for Render TLS proxy
- [x] Production requirements (whitenoise, dj-database-url, django-storages, boto3)
- [x] Production config tests (missing DB, missing R2, BUILD_MODE)
- [x] All docs updated and honest

---

## Post-Build: Recommended Future Work
1. **Deploy to Render** -- sync Blueprint, set env vars, create admin
2. **GEMINI_API_KEY rotation** -- key exposed in dev conversation, must be rotated
3. **Smoke test on Render** -- verify all modules, AI, file upload, exports
4. **Cutover from legacy app** -- point domain, decommission old system
5. **Profile/password endpoints** -- backend self-edit + password change
6. **CI/CD** -- GitHub Actions for test/lint/build on PR
7. **Frontend code splitting** -- route-level lazy loading
8. **Email** -- password reset, notification emails
9. **Advanced EVM** -- BOQ-linked budget allocation
9. **Advanced EVM** -- BOQ-linked budget allocation
10. **Org settings save** -- wire frontend form to PATCH endpoint
