# BuildPro Module Map

## Global Navigation -> Backend App Mapping

| # | Product Module | Nav Key | Backend App(s) | Notes |
|---|---------------|---------|----------------|-------|
| 1 | Dashboard | `dashboard` | `projects`, `scheduling`, `cost` | Aggregates KPIs from multiple apps |
| 2 | Projects | `projects` | `projects` | Project CRUD, filtering, project types |
| 3 | Notifications | `notifications` | `notifications` | Activity feed, alerts, read/unread |
| 4 | Communications | `comms` | `comms` | Org-wide messaging |
| 5 | Reports | `reports` | `reports` | Cross-project report generation |
| 6 | Settings | `settings` | `accounts`, `core` | Users, roles, permissions, org config |

## Project Workspace -> Backend App Mapping

| # | Product Module | Nav Key | Backend App(s) | Notes |
|---|---------------|---------|----------------|-------|
| 1 | Overview & EVM | `proj-dash` | `projects`, `scheduling`, `cost` | EVM calculations from schedule + cost data |
| 2 | Schedule & CPM | `schedule` | `scheduling` | Tasks, predecessors, CPM engine, status |
| 3 | Cost & Budget | `budget` | `cost` | Budget lines, expenses, cost tracking |
| 4 | Milestones | `milestones` | `scheduling` | Milestones linked to CPM tasks |
| 5 | Gantt Chart | `gantt` | `scheduling` | Visual representation of schedule data |
| 6 | Network Diagram | `network` | `scheduling` | AON network from task dependencies |
| 7 | S-Curve | `scurve` | `scheduling`, `cost` | Planned vs actual curves |
| 8 | Risk Register | `risks` | `risks` | Risk CRUD, probability/impact matrix |
| 9 | RFIs | `rfis` | `rfis` | Request for Information lifecycle |
| 10 | Change Orders | `changes` | `changes` | Variation orders, cost/schedule impact |
| 11 | Punch List | `punch` | `field_ops` | Deficiency tracking, resolution |
| 12 | Daily Logs | `daily-logs` | `field_ops` | Field diary entries |
| 13 | Safety | `safety` | `field_ops` | Incidents, inspections |
| 14 | Quality | `quality` | `field_ops` | Quality checklists, inspections |
| 15 | Site Photos | `photos` | `field_ops`, `documents` | Photo documentation |
| 16 | Procurement | `procurement` | `procurement` | RFQ -> Quote -> PO -> GRN chain |
| 17 | Timesheets | `timesheets` | `labour` | Worker time entries |
| 18 | Resources | `resource-pool` | `resources` | Equipment, materials, assignments |
| 19 | Meetings | `meetings` | `comms` | Meeting minutes, action items |
| 20 | Reports | `reports` | `reports` | Project-level filtered reports |
| 21 | Documents | `documents` | `documents` | File management, versioning |
| 22 | Recycle Bin | `recycle-bin` | `core` | Soft-deleted items across modules |
| 23 | Project Chat | `chat` | `comms` | Project-scoped messaging |

## Backend App Responsibilities

| App | Responsibility |
|-----|---------------|
| `core` | Base models, mixins (audit, soft-delete, timestamps), shared utilities, org settings, recycle bin |
| `accounts` | User model, authentication, roles, permissions, user types, sessions |
| `projects` | Project CRUD, project types, contract types, project membership, project settings |
| `scheduling` | Tasks, predecessors, CPM engine, milestones, Gantt/network data |
| `cost` | Budget lines, expenses, EVM calculations, cost summaries |
| `risks` | Risk register, probability/impact, mitigation plans |
| `rfis` | RFI lifecycle (draft -> submitted -> responded -> closed) |
| `changes` | Change orders, cost/schedule impact tracking, approval workflow |
| `field_ops` | Daily logs, punch list, safety incidents, quality inspections, site photos |
| `procurement` | Suppliers, RFQs, quotations, purchase orders, goods received notes |
| `labour` | Workers, timesheets, time entries, labour cost tracking |
| `resources` | Equipment, materials, resource pool, project assignments |
| `comms` | Messages (org + project chat), meetings, meeting minutes |
| `documents` | Document containers, versions, categories, file upload/download |
| `reports` | Report definitions, filters, export (PDF/Excel/Word/CSV) |
| `notifications` | Notification generation, delivery, read tracking |
| `ai` | AI service layer, prompt management, response cache, provider abstraction |
