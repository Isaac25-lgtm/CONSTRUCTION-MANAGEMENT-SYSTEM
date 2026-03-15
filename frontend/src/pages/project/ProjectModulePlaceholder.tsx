import { useParams, useLocation } from 'react-router-dom'
import { SectionCard, EmptyState } from '../../components/ui'

const moduleLabels: Record<string, { title: string; icon: string; desc: string }> = {
  overview: { title: 'Overview & EVM', icon: '📊', desc: 'Project dashboard with KPIs, progress, cost summary, and Earned Value Management metrics.' },
  schedule: { title: 'Schedule & CPM', icon: '📝', desc: 'View and edit the project schedule using Critical Path Method. Track ES/EF/LS/LF/Slack values.' },
  budget: { title: 'Cost & Budget', icon: '💰', desc: 'Track project costs against budget. Manage expenses with receipt attachments and monitor variance.' },
  milestones: { title: 'Milestones', icon: '🏁', desc: 'Track key project milestones linked to CPM tasks. Mark as Pending, Achieved, or Missed.' },
  gantt: { title: 'Gantt Chart', icon: '📅', desc: 'Interactive Gantt chart showing tasks on a timeline with dependency arrows and critical path.' },
  network: { title: 'Network Diagram', icon: '🔗', desc: 'Activity-on-Node (AON) network diagram showing task dependencies and critical path.' },
  scurve: { title: 'S-Curve', icon: '📈', desc: 'Planned vs actual cumulative expenditure curves for cash flow monitoring.' },
  risks: { title: 'Risk Register', icon: '⚠️', desc: 'Identify, assess, and track project risks with probability/impact ratings and mitigation plans.' },
  rfis: { title: 'RFIs', icon: '❓', desc: 'Request for Information management. Track questions from site to consultants.' },
  changes: { title: 'Change Orders', icon: '🔄', desc: 'Track scope changes and variations with cost and time impacts.' },
  punch: { title: 'Punch List', icon: '✅', desc: 'Track deficiencies found during inspections. Set priority, assignee, and status.' },
  'daily-logs': { title: 'Daily Logs', icon: '📓', desc: 'Record daily site conditions: weather, headcount, equipment, work accomplished.' },
  safety: { title: 'Safety', icon: '🧺', desc: 'Report and track safety incidents and near-misses with severity and corrective actions.' },
  quality: { title: 'Quality', icon: '✔️', desc: 'Record quality inspection results at key hold points. Track pass/fail outcomes.' },
  photos: { title: 'Site Photos', icon: '📷', desc: 'Time-stamped site photo log with captions, locations, and linked tasks.' },
  procurement: { title: 'Procurement', icon: '📦', desc: 'Full procurement chain: RFQ -> Quotation -> PO -> GRN with line-item tracking.' },
  timesheets: { title: 'Timesheets', icon: '⏰', desc: 'Log worker hours per task per day. Track total hours and labour allocation.' },
  resources: { title: 'Resources', icon: '👥', desc: 'Manage project resource pool: workers, teams, equipment. Set rates and availability.' },
  meetings: { title: 'Meetings', icon: '📅', desc: 'Record meeting minutes with attendees, decisions, and trackable action items.' },
  'project-reports': { title: 'Reports', icon: '📋', desc: 'Downloadable project reports. Export as CSV, Excel, Word, or PDF.' },
  documents: { title: 'Documents', icon: '📁', desc: 'Store and manage project documents: drawings, contracts, permits, reports.' },
  'recycle-bin': { title: 'Recycle Bin', icon: '🗑️', desc: 'Recover deleted items from all modules. Restore or permanently delete.' },
  chat: { title: 'Project Chat', icon: '💬', desc: 'Project-specific team chat for discussions and coordination.' },
}

export function ProjectModulePlaceholder() {
  const params = useParams()
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const moduleKey = segments[segments.length - 1] || 'overview'
  const info = moduleLabels[moduleKey]

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-bp-text">
        {info?.icon} {info?.title || moduleKey}
      </h2>
      <p className="mb-5 text-xs text-bp-muted">
        Project: {params.projectId}
      </p>
      <SectionCard>
        <EmptyState
          icon={info?.icon || '🚧'}
          title={`${info?.title || moduleKey} module`}
          description={info?.desc || 'This module will be implemented in a later phase.'}
        />
      </SectionCard>
    </div>
  )
}
