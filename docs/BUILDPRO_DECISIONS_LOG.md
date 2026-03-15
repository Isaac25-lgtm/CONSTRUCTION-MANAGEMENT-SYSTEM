# BuildPro Decisions Log

Each entry records a significant implementation decision, the reasoning, and any alternatives considered.

---

## DEC-001: Modular Monolith over Microservices
**Date:** 2026-03-14
**Decision:** Single Django project with 17 apps, not microservices.
**Reasoning:** ~20 users, single VPS, one team. Microservices add deployment complexity, network latency, and operational overhead with zero benefit at this scale. A well-structured monolith with clear app boundaries gives us the modularity benefits without the infrastructure tax.
**Alternatives rejected:** Microservices, Django + separate FastAPI services

## DEC-002: Session Auth over JWT
**Date:** 2026-03-14
**Decision:** Django session-based authentication with CSRF, not JWT.
**Reasoning:** Single-domain deployment. Sessions are simpler, more secure (server-side revocation), and Django has excellent built-in support. JWT adds complexity (refresh tokens, blacklisting) with no benefit for our use case.
**Alternatives rejected:** JWT, OAuth2 (unnecessary for single-org)

## DEC-003: PostgreSQL with Full Normalisation
**Date:** 2026-03-14
**Decision:** ~45 normalised tables. JSONB only for metadata/preferences/AI cache.
**Reasoning:** Core business records (tasks, costs, procurement items) need proper foreign keys, constraints, and query performance. Previous blueprint versions used JSONB for operational data and it caused real problems. Normalisation gives us data integrity, efficient queries, and clear schema documentation.
**Alternatives rejected:** JSONB for flexible schemas, MongoDB

## DEC-004: Polling over WebSockets for Async Status
**Date:** 2026-03-14
**Decision:** Use HTTP polling for background job status updates.
**Reasoning:** Simpler infrastructure (no WebSocket server, no connection management). Background jobs (AI, exports) are infrequent and polling every 2-3 seconds is perfectly adequate. Can add WebSockets later if needed.
**Alternatives rejected:** WebSockets, Server-Sent Events

## DEC-005: Tailwind CSS over Component Library
**Date:** 2026-03-14
**Decision:** Tailwind CSS 4.x for styling, matching prototype's visual language.
**Reasoning:** The prototype has a specific dark-theme visual identity (#0b1120 bg, #e2e8f0 text, #f59e0b amber accent). Tailwind gives us precise control to match these tokens without fighting a component library's opinions. Custom components built on Tailwind primitives.
**Alternatives rejected:** Material UI, Ant Design, Chakra UI

## DEC-006: Audit via Mixin, Not Separate App
**Date:** 2026-03-14
**Decision:** Audit logging handled by a model mixin in the `core` app + middleware, not a standalone `audit` app.
**Reasoning:** Audit is cross-cutting. A mixin on base models plus middleware for request context is simpler and more maintainable than a separate app with its own models duplicating business data. The mixin approach keeps audit fields (created_by, updated_by) directly on the models where they belong.
**Alternatives rejected:** Separate `audit` app, django-auditlog (adds dependency)

## DEC-007: 17 Backend Apps (Revised from 18)
**Date:** 2026-03-14
**Decision:** Merge audit into core, resulting in 17 apps: core, accounts, projects, scheduling, cost, risks, rfis, changes, field_ops, procurement, labour, resources, comms, documents, reports, notifications, ai.
**Reasoning:** Audit is a cross-cutting concern best served by mixins and middleware in `core`. A standalone audit app would create circular imports and add complexity without clear benefit.

## DEC-008: React 19 (Updated from React 18)
**Date:** 2026-03-14
**Decision:** Use React 19 instead of the originally specified React 18.
**Reasoning:** Vite 8 scaffolding installs React 19 by default. React 19 is stable, TanStack Query and React Router both support it, and there are no compatibility concerns for our use case. Updated all architecture docs to match the installed version rather than downgrading.
**Alternatives rejected:** Downgrading to React 18 (unnecessary, adds friction with latest tooling)

## DEC-009: Route prefix /app/* for protected routes
**Date:** 2026-03-14
**Decision:** All authenticated routes live under `/app/` prefix. Public routes (login) are at root level.
**Reasoning:** Clean separation between public and authenticated URL space. Makes route guards simpler and prevents ambiguity. The `/app/projects/:projectId/[module]` pattern gives clear, bookmarkable URLs for every project workspace view.
**Alternatives rejected:** Flat routes at root (harder to guard), hash routing (breaks bookmarks)

## DEC-010: CSS-in-prototype approach for nav styling
**Date:** 2026-03-14
**Decision:** Use custom CSS classes (`.nav-item`, `.bp-table`) alongside Tailwind for components that need exact prototype fidelity, particularly the sidebar nav with its border-left active indicator.
**Reasoning:** The prototype uses very specific styling patterns (border-left: 3px solid accent, border-radius: 0 6px 6px 0) that are awkward to express purely in Tailwind utility classes. Custom CSS for these specific patterns preserves fidelity without fighting the framework.
**Alternatives rejected:** Pure Tailwind for everything (verbose, hard to match exact prototype), inline styles everywhere (unmaintainable)

## DEC-011: Demo data in pages until backend is connected
**Date:** 2026-03-14
**Decision:** Global pages use hardcoded demo data matching prototype sample projects/alerts/messages. Data will be replaced with TanStack Query API calls in Phase 1.
**Reasoning:** The shell needs to look like the real product to validate UI fidelity and catch layout issues early. Demo data lets us do this without blocking on backend runtime. Data is localized in each page file, easy to find and replace.
**Alternatives rejected:** Empty pages (can't validate UI), MSW mock server (premature complexity)

## DEC-012: Permission codenames in JSON, not Django Permission model
**Date:** 2026-03-14
**Decision:** Store permission codenames as plain string lists in SystemRole.permissions (JSONField) and ProjectMembership.permissions (JSONField). Do not use Django's built-in Permission/Group model.
**Reasoning:** BuildPro permissions are two-tiered (system + project) and construction-specific. Django's Permission model is tied to content types and designed for model-level CRUD ops, which doesn't map well to our domain (e.g., "budget.approve", "procurement.edit"). Plain string lists in JSON are simpler to query, easier to seed, and trivially checked in DRF permission classes. There are only ~30 total codenames -- no need for relational overhead.
**Alternatives rejected:** Django Permissions + Groups (poor fit for project-scoped access), django-guardian (object-level perms add complexity), django-rules (extra dependency)

## DEC-013: Project-scoped permissions on membership, not separate table
**Date:** 2026-03-14
**Decision:** ProjectMembership carries both a role label (for display) and a permissions list (for enforcement). The role auto-populates default permissions on creation, but permissions can be customized per-membership.
**Reasoning:** This keeps the access check to a single query (get membership, check permissions list). No join through role tables. The role field gives human-readable context in the UI. Permission customization per-user-per-project is possible without a separate assignment table.
**Alternatives rejected:** Separate ProjectRole table with M2M to permissions (extra join, more tables), hardcoded role-to-permission mapping checked at runtime (inflexible)

## DEC-014: Admin bypasses all permission checks
**Date:** 2026-03-14
**Decision:** Users with SystemRole containing "admin.full_access" or is_staff=True bypass all permission checks at both system and project level.
**Reasoning:** Single-org deployment with ~20 users. The admin is the org owner/IT manager. Making them go through fine-grained permission checks adds friction without security benefit. This matches the prototype where Admin User has "full access to all features".
**Alternatives rejected:** Requiring explicit membership for admins on every project (tedious, no benefit)

## DEC-015: Project code format BP-{TYPE}-{SEQ}
**Date:** 2026-03-14
**Decision:** Auto-generate human-readable project codes as `BP-{TYPE_PREFIX}-{SEQ:03d}` where TYPE_PREFIX is a 2-3 letter abbreviation (RES, COM, RD, BR, WT, DAM, SCH, HOS, GEN) and SEQ is sequential per type.
**Reasoning:** Construction projects need stable, human-readable identifiers for correspondence, reports, and field reference. The prefix conveys project type at a glance. Sequential numbering within type keeps codes short and predictable. Database primary key (UUID) remains internal.
**Alternatives rejected:** UUID-only (not human-readable), date-based codes (collisions), org-prefix codes (unnecessary for single-org)

## DEC-016: Setup engine stores templates in ProjectSetupConfig, not live tasks
**Date:** 2026-03-14
**Decision:** The project setup engine creates a ProjectSetupConfig with phase templates and milestone templates as JSON. It does NOT create live Task or Milestone records -- that's the scheduling engine's job (Phase 2).
**Reasoning:** Clean separation of concerns. The setup engine defines "what should exist" based on project type + contract type. The scheduling engine (next phase) will consume these templates to create actual Task records with durations, predecessors, and CPM calculation. This avoids creating scheduling-dependent models before the scheduling app is built.
**Alternatives rejected:** Creating stub Task records immediately (premature, scheduling app not ready), storing templates only in Python code (loses per-project customization)

## DEC-017: PageNumberPagination for project lists
**Date:** 2026-03-14
**Decision:** Use PageNumberPagination instead of CursorPagination for the project list endpoint.
**Reasoning:** CursorPagination requires a stable ordering field and defaults to `created` which doesn't exist on our model (`created_at` does). PageNumberPagination is simpler for lists that are small enough to not need cursor-based scrolling (~20-50 projects in a single org). The frontend fetches page_size=200 to get all projects in one request.
**Alternatives rejected:** CursorPagination with custom ordering (works but overkill for small lists), no pagination (technically fine but bad practice)

## DEC-018: CPM engine as backend service, not frontend calculation
**Date:** 2026-03-14
**Decision:** The CPM engine runs server-side in scheduling/engine.py. Frontend displays persisted results but never computes ES/EF/LS/LF/float. Users trigger recalculation via POST /recalculate/ endpoint.
**Reasoning:** Server-side authority for schedule calculations prevents frontend-backend divergence. The prototype runs CPM in the browser, but the production system needs the database to be the source of truth. Frontend reactivity comes from TanStack Query cache invalidation after recalculation.
**Alternatives rejected:** Frontend-computed CPM (divergence risk), real-time auto-recalculation on every change (too expensive, users need control)

## DEC-019: Custom Gantt/Network/S-Curve rendering, no third-party library
**Date:** 2026-03-14
**Decision:** Build Gantt as custom div-based bars, Network as styled flex nodes, S-Curve as custom SVG. No third-party planning library.
**Reasoning:** The prototype uses inline rendering for all three views with specific dark-theme styling. Third-party Gantt libraries (dhtmlxGantt, TOAST UI, etc.) impose their own visual language and are hard to theme-match. Custom rendering gives us exact control over appearance, performance, and behavior. These views are read-heavy and don't need drag-and-drop editing yet.
**Alternatives rejected:** dhtmlxGantt (heavy, licensing), TOAST UI Gantt (theming friction), React-Gantt (limited), D3 (overengineered for this stage)

## DEC-020: Task codes use lowercase letter suffixes (Aa, Ab, Ac) not numbers
**Date:** 2026-03-14
**Decision:** Child task codes use parent code + lowercase letter: e.g., Aa, Ab, Ac instead of A1, A2, A3.
**Reasoning:** Design phases use codes D1, D2, D3 from the prototype. If we also numbered children as D1, D2, we'd get unique constraint violations on D&B/Turnkey projects that have both design phases and a main "D" phase. Lowercase letters avoid collisions while staying readable.
**Alternatives rejected:** Dot notation (A.1, hard in URLs), longer prefixes (verbose)

## DEC-021: Lock project type/contract type after schedule tasks exist
**Date:** 2026-03-14
**Decision:** Changing project_type or contract_type via PATCH is blocked once ProjectTask records exist for that project. The API returns a 400 ValidationError.
**Reasoning:** The setup engine generates type-specific phase templates and milestones. If the user changes type after tasks are created, the existing schedule would become inconsistent with the new template. Rather than silently regenerating (which would destroy manual edits), we block the change and require the user to either delete tasks first or create a new project.
**Alternatives rejected:** Silent reseed (destroys manual work), allow drift (confusing), separate "reinitialize" action (premature complexity)

## DEC-022: Flat budget lines with categories, not hierarchical BOQ
**Date:** 2026-03-14
**Decision:** BudgetLine uses a flat structure with a category field (17 construction-aware categories) rather than a hierarchical parent-child tree.
**Reasoning:** A flat structure with categories is simpler to query, display, and manage for a ~20-user deployment. Construction cost categories (preliminaries, substructure, MEP, finishes, contingency, etc.) provide meaningful grouping without the complexity of a full BOQ tree. The category_breakdown in the cost summary service groups by category for reporting. Can evolve to hierarchical later if needed.
**Alternatives rejected:** Hierarchical BOQ tree (premature complexity), task-only budgeting (loses commercial control identity)

## DEC-023: EVM calculated from schedule progress, not percent-complete override
**Date:** 2026-03-14
**Decision:** BCWP (Earned Value) = BAC * avg(task progress). No manual EV override field.
**Reasoning:** Keeps EVM deterministic and auditable. The schedule module already tracks per-task progress which is the proper basis for earned value in construction PM. Manual overrides invite gaming and divergence. If a task is 60% complete, the earned value reflects exactly that against budget.
**Assumptions documented:** BCWS uses baseline if available, else 50% mid-project assumption. CPI/SPI return 0 when divisor is 0 rather than infinity/NaN.

## DEC-024: Field ops spread across 4 apps matching CLAUDE.md architecture
**Date:** 2026-03-14
**Decision:** Risk -> risks app, RFI -> rfis app, ChangeOrder -> changes app, PunchItem/DailyLog/SafetyIncident/QualityCheck -> field_ops app. Each app owns its models, serializers, views, URLs, and tests.
**Reasoning:** Matches the 17-app architecture defined in CLAUDE.md. Risks, RFIs, and changes are distinct enough to warrant their own apps. The 4 field_ops models are operationally related (daily site management) and share the same edit permission (field_ops.edit), so they stay together.
**Alternatives rejected:** Single mega field_ops app for everything (too large), separate apps per model (too many tiny apps)

## DEC-025: Soft delete via BaseModel mixin, not separate recycle table
**Date:** 2026-03-14
**Decision:** Use the existing SoftDeleteMixin (is_deleted, deleted_at, deleted_by) from BaseModel. All field ops models inherit it. The default manager filters out deleted records. AllObjectsManager includes them for admin/recycle queries.
**Reasoning:** The mixin is already built and proven. No need for a separate RecycledItem table that would duplicate data. The recycle bin UI can query AllObjectsManager across models. Restore is trivial (set is_deleted=False).
**Alternatives rejected:** Separate RecycledItem table (data duplication), hard delete (no recovery)

## DEC-026: EVM v1 is simplified but deterministic -- documented assumptions
**Date:** 2026-03-14
**Decision:** Document EVM v1 as a practical simplified model, not a fully mature commercial-controls implementation.
**Assumptions:**
- BAC = sum of BudgetLine.budget_amount (not task-level budgets)
- BCWP = BAC * avg(leaf-task progress / 100) -- earned value from schedule progress
- BCWS = if active baseline exists with meaningful task budgets, use baseline-derived earned; otherwise fall back to BAC * 0.5 (mid-project assumption)
- ACWP = sum of Expense.amount
- Task budgets are distributed proportionally by duration during seeding -- not manually assigned
- CPI/SPI return 0 when divisor is 0 (no spend / no baseline)
- All progress uses leaf-task-only (is_parent=False) consistently
**Reasoning:** This gives meaningful CPI/SPI values from day one without requiring users to manually allocate budgets per task. The 50% fallback for BCWS is clearly a simplification but prevents EVM from being unusable until baselines are created. Can be tightened in later phases.

## DEC-027: Site Photos as document category, not separate model
**Date:** 2026-03-15
**Decision:** Site Photos uses the Document model with `category='photos'` and a filtered frontend view. No separate SitePhoto model.
**Reasoning:** Photos are just documents that happen to be images. Keeping them in the same model avoids duplicate storage, duplicate versioning, and duplicate API endpoints. The frontend SitePhotosPage filters by category and renders an image grid instead of a table. This keeps the data model clean and leverages the existing document versioning infrastructure.
**Alternatives rejected:** Separate SitePhoto model (duplicate storage and versioning), generic file model with polymorphic types (over-engineered)

## DEC-028: Report exports use openpyxl/reportlab/python-docx, synchronous for v1
**Date:** 2026-03-15
**Decision:** Export generation uses openpyxl (Excel), reportlab (PDF), and python-docx (Word). Exports run synchronously in the request cycle for v1. Each export saves a ReportExport record with the generated file for re-download.
**Reasoning:** These libraries are pure Python, well-maintained, and don't require system-level dependencies (unlike wkhtmltopdf or weasyprint). Synchronous generation is acceptable for v1 since reports are typically small (a few hundred rows). Can move to Celery worker in Phase 7 for large reports.
**Alternatives rejected:** weasyprint (requires system deps), wkhtmltopdf (binary dependency), Celery-first (premature for small reports)

## DEC-029: Document versioning via explicit version model with denormalized latest fields
**Date:** 2026-03-15
**Decision:** DocumentVersion is a separate immutable model. Document denormalizes `current_version_number`, `latest_file_name`, `latest_file_size`, `latest_content_type`, and `last_uploaded_at` for efficient list queries. The `apply_version()` method syncs these after each upload.
**Reasoning:** Construction document control requires traceable revision history. Immutable versions prevent accidental overwrites. Denormalized latest fields avoid N+1 queries on document lists. The `apply_version()` pattern keeps the sync logic in one place.
**Alternatives rejected:** Single-file model with overwrite (no history), version as JSON array (no FK integrity), separate latest-version FK (circular dependency)

## DEC-030: File upload validation with extension + content-type + size limits
**Date:** 2026-03-15
**Decision:** Centralized file validation in documents/validators.py. Enforces: allowed extensions whitelist (PDF, Office, CAD, images, archives), allowed content-types, 20MB size limit, and image-only restriction for photos category.
**Reasoning:** The Phase 6 prompt required practical file safety. Extension + content-type checking catches most misuse. Image-only enforcement for photos prevents non-image uploads in the Site Photos flow. 20MB is practical for construction documents. Magic-byte verification deferred to Phase 7.
**Alternatives rejected:** No validation (security gap), frontend-only validation (bypassable), magic-byte-only (complex for v1)

## DEC-031: Report authorization via reports.view and reports.export permissions
**Date:** 2026-03-15
**Decision:** available_reports, export_history, and export_download require reports.view. generate_export requires reports.export. Both are project-scoped permissions checked server-side.
**Reasoning:** The audit found these endpoints only checked project membership, not report-specific permissions. Tightening to reports.view/reports.export ensures that viewer-only members without report access cannot see or download reports.

## DEC-032: Document model upgrade with code, status, discipline, approval workflow
**Date:** 2026-03-15
**Decision:** Added to Document: code (auto-generated DOC-NNN), title, discipline (9 choices), status (6 choices), description, current_version FK. Added to DocumentVersion: version_label, approval_status, issue_purpose, effective_date, supersedes FK. Data migration copies name->title for existing records.
**Reasoning:** The Phase 6 prompt required construction-standard document control fields. The upgrade is backward-compatible: name field retained as alias, title defaults to empty with backfill migration. Supersedes FK creates a traceable revision chain. Approval status enables formal document workflows.

## DEC-033: Provider-agnostic AI with Gemini as initial provider
**Date:** 2026-03-15
**Decision:** AI subsystem uses a provider-agnostic adapter pattern. Initial provider is Google Gemini (gemini-2.0-flash) via google-generativeai SDK. Provider selected by AI_PROVIDER env var. Stub provider available for testing.
**Reasoning:** Architecture freeze specified "provider-agnostic service layer." Gemini was chosen as initial provider because the API key was available. The adapter pattern means switching to Anthropic Claude or another provider requires only adding a new adapter class and changing the env var. No business logic is coupled to any specific provider.
**Alternatives rejected:** Direct Anthropic coupling (locks to one vendor), OpenAI-first (not the user's preference), no AI at all for v1 (user explicitly requested phase-one features)

## DEC-034: Three phase-one AI features with sync+async support
**Date:** 2026-03-15
**Decision:** Phase-one AI features are: (1) Cost/Schedule Narrative, (2) Report Draft, (3) Project Copilot. All endpoints support synchronous execution by default and async via ?async=true query parameter.
**Reasoning:** The architecture freeze specified these three features. Synchronous is simpler for development and small projects. Async via Celery is available for production use where AI calls may take several seconds.

## DEC-035: AsyncJob model for background task tracking
**Date:** 2026-03-15
**Decision:** A single AsyncJob model tracks all long-running tasks (AI, exports, future processing). Frontend polls via /ai/jobs/{id}/ endpoint. No WebSockets.
**Reasoning:** The architecture freeze explicitly chose polling over WebSockets for v1. A single model avoids scattered status tracking across apps.

## DEC-036: AIRequestLog for audit trail
**Date:** 2026-03-15
**Decision:** Every AI interaction is logged in AIRequestLog with: user, project, feature, provider, model, request/response summaries (not raw prompts), duration, status.
**Reasoning:** AI auditability is a non-negotiable. Logging summaries rather than raw prompts balances traceability with privacy. The log enables future analysis of AI usage patterns and cost tracking.

## DEC-037: Production hardening decisions
**Date:** 2026-03-15
**Decision:** Production settings include HSTS, secure cookies, X-Frame-Options DENY, JSON-only renderer, stricter password validation. Sentry integration via SENTRY_DSN env var. Structured logging with app-level loggers.
**Reasoning:** These are standard Django production hardening measures. Sentry provides error tracking without building custom infrastructure. Structured logging enables log aggregation in production.

## DEC-038: Final remediation -- remove all demo fallback data from frontend
**Date:** 2026-03-15
**Decision:** Dashboard, Communications, and Notifications pages rebuilt to use only real API data. No demo/synthetic data used as fallback. Error states shown honestly on API failure.
**Reasoning:** Demo data that masks outages or pretends to be real is worse than an honest empty/error state. Users and developers must see the actual system state. The Communications page was replaced with an honest landing page since no org-wide messaging backend exists -- project-level chat is the real feature.

## DEC-039: AI permission model finalized
**Date:** 2026-03-15
**Decision:** Two project-level AI permissions: `ai.use` (generate narrative/draft/copilot) and `ai.history` (view AI request audit log). Granted to manager/engineer/QS roles by default; not granted to viewers. Context assembly is permission-aware -- omits data from modules the user cannot access.
**Reasoning:** AI endpoints assemble data from multiple modules. Rather than checking each module permission individually, `ai.use` gates access to all AI features, while the context assembler checks module-specific view permissions to filter what data feeds the AI. This prevents data leakage while keeping the permission model simple.

## DEC-040: Production Docker architecture
**Date:** 2026-03-15
**Decision:** Dev compose uses `runserver` with development settings. Production compose (deploy/docker-compose.prod.yml) uses Gunicorn, production settings, Nginx-served frontend, and Caddy reverse proxy. Backend Dockerfile installs production requirements by default.
**Reasoning:** The dev compose was incorrectly using production defaults previously. Separating dev and production compose files makes the intent explicit. The backend image installs production requirements (including Gunicorn) so it is ready for deployment without rebuild.

## DEC-041: Resource PATCH requires admin/management
**Date:** 2026-03-15
**Decision:** PATCH on org-scoped resources requires the same admin.full_access or admin.manage_users permission as resource creation.
**Reasoning:** Resources are org-level assets (equipment, personnel). Allowing any authenticated user to modify them was a security oversight. The same permission gate used for creation is applied to updates for consistency.

## DEC-042: Production entrypoints must not default to development
**Date:** 2026-03-15
**Decision:** wsgi.py and celery.py now refuse to start if DJANGO_SETTINGS_MODULE is not set, instead of silently defaulting to development. manage.py still defaults to development for CLI convenience.
**Reasoning:** A production container accidentally running with development settings is a serious security risk. Failing loudly is safer than failing silently. manage.py keeps the default because it is only used interactively.

## DEC-043: Frontend delivery via Caddy reverse proxy to Nginx container
**Date:** 2026-03-15
**Decision:** In production, Caddy reverse-proxies to the frontend Nginx container for SPA delivery, and serves Django static/media files directly from shared Docker volumes.
**Reasoning:** This keeps the frontend container self-contained (build + serve) while letting Caddy handle TLS, security headers, and routing. Static files are served from volumes to avoid proxying them through Django.

## DEC-044: File upload validation is extension + content-type + size only
**Date:** 2026-03-15
**Decision:** Upload validation checks file extension against whitelist, content-type against whitelist, and enforces 20MB size limit. Magic-byte verification is not implemented.
**Reasoning:** Magic-byte verification requires additional dependencies (python-magic, libmagic) that add deployment complexity. The current validation is sufficient for a low-volume single-org deployment. Magic-byte verification can be added later without schema changes.

## DEC-045: Settings mutations wired to real API
**Date:** 2026-03-15
**Decision:** Add User and Organisation Save are now wired to real backend endpoints (POST /api/v1/auth/users/, PATCH /api/v1/auth/organisation/). Profile and password remain read-only until backend endpoints are added.
**Reasoning:** Leaving visible buttons that do nothing is worse than not having the button. Wiring to real endpoints is straightforward since the backend already supported both operations. Profile/password self-edit requires new backend endpoints that do not exist yet.

## DEC-046: Render as primary deployment target
**Date:** 2026-03-16
**Decision:** Render replaces Docker Compose on VPS as the primary production deployment path. render.yaml Blueprint at repo root defines web service, worker, and Key Value. Docker Compose retained for local dev and optional self-hosted deployments.
**Reasoning:** Render provides managed deployment from GitHub, automatic TLS, zero-downtime deploys, and eliminates VPS management overhead. For a ~20-user single-org app, this is simpler and more reliable than self-managed Docker + Caddy on a VPS.

## DEC-047: Same-origin frontend delivery via WhiteNoise
**Date:** 2026-03-16
**Decision:** In production, Django serves the built Vite SPA via WhiteNoise from the same origin. No separate frontend service or CORS/CSRF cross-origin complexity. A single Render web service handles both API and SPA.
**Reasoning:** Session-based auth with CSRF cookies requires same-origin or careful cross-origin cookie configuration. Serving everything from one origin eliminates CORS, cookie domain, and SameSite complexity entirely. WhiteNoise is a proven, low-overhead static file middleware for Django.

## DEC-048: Neon PostgreSQL as external database
**Date:** 2026-03-16
**Decision:** Production database is Neon PostgreSQL, connected via DATABASE_URL with SSL. Not provisioned through Render's database service.
**Reasoning:** The user specified Neon as the database target. dj-database-url parses the standard PostgreSQL connection string cleanly. SSL is required for Neon connections.

## DEC-049: Cloudflare R2 for production file storage
**Date:** 2026-03-16
**Decision:** Production media/document/export files stored in Cloudflare R2 via django-storages S3Boto3Storage. Local filesystem for development only. S3 storage is activated via AWS_S3_ENDPOINT_URL env var presence.
**Reasoning:** Render services have ephemeral filesystems, and web + worker do not share a local filesystem. S3-compatible storage is the only coherent option for file persistence across deploys and between services.

## DEC-050: Strict production env validation with BUILD_MODE bypass
**Date:** 2026-03-16
**Decision:** Production settings raise ImproperlyConfigured when REQUIRE_DATABASE_URL=true and DATABASE_URL is missing, or when REQUIRE_REMOTE_STORAGE=true and R2 env vars are missing. BUILD_MODE=true suppresses these checks during Docker image build (collectstatic).
**Reasoning:** Silent fallbacks to SQLite-like defaults or local filesystem in production are dangerous on Render where the filesystem is ephemeral and web/worker do not share it. Failing loudly at startup is safer than silently losing data. BUILD_MODE is needed because collectstatic runs during image build before runtime env vars are available.

## DEC-051: collectstatic in Docker build, migrations in preDeployCommand
**Date:** 2026-03-16
**Decision:** collectstatic runs during the Docker image build step (with BUILD_MODE=true). preDeployCommand runs only migrations. collectstatic output is baked into the image.
**Reasoning:** Render's preDeployCommand runs on a separate ephemeral instance. Any files created there (like collectstatic output) are not available to the deployed web service. collectstatic must happen during image build so static files are part of the image.

## DEC-052: render.yaml uses type: keyvalue and dockerCommand
**Date:** 2026-03-16
**Decision:** Key Value service uses `type: keyvalue` (not `kvs`). Worker uses `dockerCommand` (not `startCommand`). Aligned with current official Render Blueprint specification.
**Reasoning:** Render's Blueprint spec uses `keyvalue` as the service type and `dockerCommand` for Docker-runtime services. Using incorrect field names would cause Blueprint sync failures.

## DEC-053: No shell builtins in Render command fields
**Date:** 2026-03-16
**Decision:** preDeployCommand uses `python manage.py migrate --noinput` (no `cd`). Worker dockerCommand uses `celery --workdir /app/backend -A buildpro worker`. No `cd ... && ...` patterns.
**Reasoning:** Render executes command fields directly without a shell. Shell builtins like `cd` cause `executable file not found` errors. The Dockerfile sets WORKDIR to /app/backend, so manage.py works without cd. Celery's --workdir flag achieves the same.

## DEC-054: Worker env vars sourced from web service
**Date:** 2026-03-16
**Decision:** Worker sources DJANGO_SECRET_KEY, DATABASE_URL, GEMINI_API_KEY, and AWS_* credentials from the web service via `fromService.envVarKey` in render.yaml.
**Reasoning:** Manual duplication of secrets across services is error-prone and causes config drift. Render's fromService reference keeps a single source of truth. Only CELERY_BROKER_URL comes from the Key Value service.

## DEC-055: Production validators extracted into testable module
**Date:** 2026-03-16
**Decision:** validate_database_url() and validate_remote_storage() extracted to buildpro/settings/validators.py. production.py calls these. Tests exercise the functions directly.
**Reasoning:** Testing production settings by reimporting the module is fragile and pollutes global state. Extracting validators into pure functions makes them unit-testable without Django settings side effects.
