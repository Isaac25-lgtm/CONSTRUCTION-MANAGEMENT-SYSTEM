# BuildPro -- Claude Code Project Instructions

## What BuildPro Is
BuildPro is a **construction-specific project management platform** for Uganda's construction industry.
Single-org deployment, ~20 concurrent users. It manages scheduling (CPM), cost tracking (EVM),
procurement, field operations, documents, RFIs, change orders, risks, labour, resources, and reporting
for real construction projects (residential, commercial, road, bridge, school, hospital, water treatment, dam).

## What BuildPro Is NOT
- Not a generic task manager or Trello clone
- Not a demo or prototype -- this is production software meant to survive real use and staff turnover
- Not a microservices system, not Kubernetes, not event-sourced

## Frozen Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Django 5.2 LTS (modular monolith) |
| API | Django REST Framework |
| Database | PostgreSQL 17 (~45 normalised tables) |
| Background jobs | Celery + Redis |
| File storage | S3-compatible (Cloudflare R2) |
| AI | Provider-agnostic service layer (initial: Google Gemini) |
| Deployment | Render (primary) or Docker Compose (self-hosted) |
| Frontend state | TanStack Query (server), Zustand (UI) |
| Styling | Tailwind CSS 4.x |

## Non-Negotiables
1. **Prototype fidelity** -- `buildpro.html` is the golden UI reference. Preserve appearance, density, navigation, module hierarchy.
2. **Boring maintainability** -- No architecture theater. Simple, readable, inheritable code.
3. **Normalised data** -- No JSONB for core business records. JSONB only for metadata/preferences/AI cache.
4. **Server-side permissions** -- All access control enforced server-side. Never trust the frontend.
5. **AI is assistive** -- Deterministic calculations stay deterministic. AI never bypasses permissions.
6. **Construction-aware** -- Project types, contract types, CPM, EVM, procurement traceability are first-class.
7. **No feature invention** -- Start from the prototype and map it into production architecture.

## Product Modules (27 visible areas)

### Global Navigation (6)
1. Dashboard -- org-wide KPIs and project cards
2. Projects -- project list, creation, filtering
3. Notifications -- activity feed, alerts
4. Communications -- org-wide messaging
5. Reports -- cross-project reporting
6. Settings -- account, users, roles, permissions, org config

### Project Workspace (23)
1. Overview & EVM -- project dashboard with earned value metrics
2. Schedule & CPM -- task list, critical path, forward/backward pass
3. Cost & Budget -- budget tracking, expense recording
4. Milestones -- milestone tracking linked to CPM tasks
5. Gantt Chart -- visual Gantt with critical path highlighting
6. Network Diagram -- activity-on-node network visualization
7. S-Curve -- planned vs actual progress curves
8. Risk Register -- risk identification, assessment, mitigation
9. RFIs -- request for information tracking
10. Change Orders -- variation/change order management
11. Punch List -- deficiency/snag list tracking
12. Daily Logs -- field diary entries
13. Safety -- safety incidents and inspections
14. Quality -- quality checklists and inspections
15. Site Photos -- photo documentation
16. Procurement -- RFQ -> Quotation -> PO -> GRN traceability
17. Timesheets -- labour time tracking
18. Resources -- equipment and material tracking
19. Meetings -- meeting minutes and action items
20. Reports -- project-level reporting with filters and export
21. Documents -- document management with versioning
22. Recycle Bin -- soft-deleted items
23. Project Chat -- project-scoped messaging

## Backend Apps (17)
`core` | `accounts` | `projects` | `scheduling` | `cost` | `risks` | `rfis` | `changes` | `field_ops` | `procurement` | `labour` | `resources` | `comms` | `documents` | `reports` | `notifications` | `ai`

Audit logging is handled via middleware + model mixins, not a separate app.

## Session Rules for Claude Code
1. **Before making changes**, read: `CLAUDE.md`, `docs/BUILDPRO_SESSION_HANDOFF.md`, `docs/BUILDPRO_ARCHITECTURE_FREEZE.md`, `docs/BUILDPRO_ROADMAP.md`
2. **After each major build step**, update `docs/BUILDPRO_SESSION_HANDOFF.md`
3. **For major decisions**, add an entry to `docs/BUILDPRO_DECISIONS_LOG.md`
4. **Never implement beyond** what is requested in the current prompt
5. **Always check** the prototype HTML before implementing any UI component
