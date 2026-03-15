# BuildPro System Context

## Business Purpose
BuildPro is a construction-specific project management platform designed for Uganda's construction industry. It replaces spreadsheet-based workflows and generic PM tools with a system that understands construction -- project types, contract types, critical path scheduling, earned value management, procurement chains, and field operations.

## Target Deployment
- Single-organisation deployment on a single VPS
- ~20 concurrent users (project managers, engineers, QS, admin, site staff)
- Self-hosted via Docker Compose with Caddy reverse proxy

## User Model
Users belong to a single organisation. Access is controlled at three levels:
1. **Organisation level** -- global roles (Admin, Management, User, custom)
2. **Project level** -- project membership and project-specific roles
3. **Module level** -- granular permissions per module (e.g., "Approve Budget", "Upload Documents")

The prototype defines three user types with permission sets:
- **Admin User** -- full access to all features
- **Management User** -- create/edit projects, view budget, approve budget, manage risks, view reports, upload/download documents, export data
- **User** -- view budget, view reports, upload/download documents

## Construction Domain Awareness
BuildPro is not generic. It has built-in knowledge of:

### Project Types (9)
Residential House Construction, Commercial Building, Road Construction, Bridge Construction, Water Treatment Plant, Dam Construction, School Building, Hospital Construction, Custom Project

### Contract Types (8)
Lump Sum, Admeasure/Re-measurement, Cost Plus, Design & Build, Management, Turnkey, BOT (Build-Operate-Transfer), Other

### Activity Templates
Each project type has a hierarchical WBS template with realistic duration and budget weight distributions based on construction industry references (RSMeans, CIOB, RIBA, PMI PMBOK). Design & Build / Turnkey / BOT contracts automatically include design phase activities.

### Scheduling Engine
- Critical Path Method (CPM) with forward/backward pass
- Slack calculation (total float)
- Auto-generated milestones linked to CPM tasks
- Gantt chart with critical path highlighting

### Earned Value Management
BAC, BCWP (Earned Value), BCWS (Planned Value), ACWP (Actual Cost), CPI, SPI, EAC, VAC -- all calculated deterministically from task progress and cost data.

### Procurement Traceability
Full chain: RFQ Item -> Quotation Item -> PO Item -> GRN Item

## Currency
Uganda Shillings (UGX), formatted with commas and "UGX" prefix.

## Module Map Summary
See `BUILDPRO_MODULE_MAP.md` for the complete mapping of 27 product modules to 17 backend apps.

## Architectural Philosophy
- Modular monolith -- one Django project, many apps, clear boundaries
- Normalised PostgreSQL -- ~45 tables, no JSONB for core business data
- Server-side everything -- permissions, validation, business logic
- AI is assistive -- never authoritative, never bypasses permissions
- Boring and maintainable -- write code for the engineer who inherits it in two years
