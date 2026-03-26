const SECTION_INFO: Record<string, string> = {
  'Overview & EVM': 'Project dashboard showing KPIs, progress, cost summary, Earned Value metrics (CPI, SPI, EAC, VAC), critical path, client details, and milestone status.',
  'Schedule & CPM': 'View and edit the project schedule using Critical Path Method (CPM). Update task durations, dates, predecessors, and monitor ES, EF, LS, LF, and Slack values. Changes sync with Gantt, Network, and Cost views.',
  'Cost & Budget': 'Track project costs against budget. Review budget versus actual spending per task, manage expenses and receipts, and monitor cost variance as the schedule progresses.',
  Milestones: 'Track key project milestones such as foundation completion, roof-on, and handover. Link milestones to tasks and monitor whether each is pending, achieved, or missed.',
  'Gantt Chart': 'Interactive Gantt view showing scheduled tasks as timeline bars. Use it to review sequencing, durations, milestone markers, and critical versus non-critical activities.',
  'Network Diagram': 'Activity-on-node network view showing task dependencies and the critical path. Each node summarizes ES, Duration, EF, LS, Slack, and LF values.',
  'S-Curve': 'Visualise planned versus actual cumulative expenditure over time. Use it to monitor cash flow, delivery pace, and early warning signs of cost overruns.',
  'Risk Register': 'Identify, assess, and track project risks. Each risk includes probability, impact, an owner, and a mitigation plan so the team can monitor exposure and responses.',
  RFIs: 'Manage Requests for Information between site teams, consultants, and other stakeholders. Track who raised each RFI, who should respond, due dates, and official responses.',
  'Change Orders': 'Track scope changes and variations, including cost and time impact. This helps separate original scope from approved extras and keeps variation control transparent.',
  'Punch List': 'Track deficiencies, snags, and outstanding closeout items. Assign owners, set priorities, and monitor status until all punch items are completed.',
  'Daily Logs': 'Record daily site conditions such as weather, workforce, equipment used, visitors, work performed, delays, and incidents. This acts as the project site diary.',
  'Safety Incidents': 'Report and monitor safety incidents and near-misses. Capture severity, location, actions taken, and follow-up so the team can improve site safety performance.',
  'Quality Checks': 'Maintain QA/QC inspection records, pass/fail outcomes, remarks, and corrective actions. This keeps the project quality trail complete and auditable.',
  'Site Photos': 'Maintain a time-stamped log of site photos with captions and context. Useful for progress evidence, reporting, and dispute resolution.',
  Procurement: 'Track procurement from RFQs through quotations, purchase orders, goods receipts, invoices, and payments. Use it to monitor suppliers, deliveries, and outstanding liabilities.',
  Timesheets: 'Log worker hours per task and per day. Use timesheets for payroll support, productivity analysis, and labour cost monitoring.',
  Resources: 'Manage the project resource pool, including labour and equipment assignments. Helps with availability tracking, workload balancing, and resource planning.',
  Meetings: 'Record meeting minutes, attendees, decisions, and action items. This keeps a formal communication trail and helps the team follow through on commitments.',
  Documents: 'Store and manage project documents such as drawings, contracts, permits, reports, and supporting files. Filter, review, and upload the latest versions here.',
  'Recycle Bin': 'Recover deleted items from project modules. Each entry records what was deleted, when it was deleted, and who deleted it.',
  'Project Chat': 'Project-specific discussion space for quick coordination, clarifications, and decision tracking among team members.',
  'Project Team': 'Manage project members, assign roles, and control who can access or edit each project section.',
  'AI Command Center': 'Use BuildPro AI to analyse project performance, generate narratives, draft reports, and answer project-specific questions from live project data.',
  'Notifications & Alerts': 'Review project alerts, warnings, and reminders generated across the system so important issues can be acted on quickly.',
  'Reports & Exports': 'Access project and cross-project reports, then export summaries, tables, and visuals for stakeholders and formal reporting.',
  Communications: 'Organisation-wide communication hub for company discussions and coordination that are broader than a single project.',
  Settings: 'Configure organisation details, users, roles, and system defaults that control how BuildPro behaves across the environment.',
}

const SECTION_INFO_ALIASES: Record<string, string> = {
  Overview: 'Overview & EVM',
  Schedule: 'Schedule & CPM',
  Cost: 'Cost & Budget',
  Gantt: 'Gantt Chart',
  Network: 'Network Diagram',
  Safety: 'Safety Incidents',
  Quality: 'Quality Checks',
  Reports: 'Reports & Exports',
  Chat: 'Project Chat',
  Notifications: 'Notifications & Alerts',
}

export function getSectionInfo(title: string): string | null {
  const exact = SECTION_INFO[title]
  if (exact) return exact

  const alias = SECTION_INFO_ALIASES[title]
  if (alias && SECTION_INFO[alias]) return SECTION_INFO[alias]

  return null
}
