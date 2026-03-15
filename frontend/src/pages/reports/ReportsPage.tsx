import { useNavigate } from 'react-router-dom'
import {
  PageHeader, SectionCard, ActionButton, StatusBadge,
  LoadingState, EmptyState,
} from '../../components/ui'
import { useProjects, type ProjectSummary } from '../../hooks/useProjects'

/**
 * Global Reports page -- cross-project report hub.
 * Shows project cards as entry points to project-level reports.
 * Report generation happens at project level; this page is the launcher.
 */

const REPORT_CATEGORIES = [
  { key: 'progress', icon: '\uD83D\uDCCA', title: 'Progress Reports', desc: 'Task completion, milestone status, and overall project progress.' },
  { key: 'financial', icon: '\uD83D\uDCB0', title: 'Financial Reports', desc: 'Budget vs actual, EVM metrics, cost variance, and expenditure summaries.' },
  { key: 'schedule', icon: '\uD83D\uDCC5', title: 'Schedule Reports', desc: 'Task schedules, critical path analysis, and schedule variance.' },
  { key: 'procurement', icon: '\uD83D\uDCE6', title: 'Procurement Reports', desc: 'Purchase orders, supplier performance, delivery and payment tracking.' },
  { key: 'safety', icon: '\u26D1\uFE0F', title: 'Safety Reports', desc: 'Incident logs, near-miss tracking, and safety compliance.' },
  { key: 'quality', icon: '\u2714\uFE0F', title: 'Quality Reports', desc: 'Inspection results, QA/QC compliance, and deficiency tracking.' },
  { key: 'labour', icon: '\uD83D\uDC65', title: 'Labour Reports', desc: 'Timesheet summaries, worker allocation, and labour cost analysis.' },
  { key: 'risk', icon: '\u26A0\uFE0F', title: 'Risk Reports', desc: 'Risk register summary, probability/impact matrix, and mitigation status.' },
]

export function ReportsPage() {
  const navigate = useNavigate()
  const { data: projectsRaw, isLoading, isError } = useProjects()
  const projects: ProjectSummary[] = Array.isArray(projectsRaw) ? projectsRaw : []

  return (
    <div>
      <PageHeader title="Reports & Exports" icon="&#128202;">
        <span className="text-xs text-bp-muted">Select a project to generate reports</span>
      </PageHeader>

      {/* Report categories overview */}
      <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {REPORT_CATEGORIES.map((cat) => (
          <SectionCard key={cat.key} padding="compact">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{cat.icon}</span>
              <span className="text-[13px] font-semibold text-bp-text">{cat.title}</span>
            </div>
            <p className="text-[11px] text-bp-muted leading-relaxed">{cat.desc}</p>
          </SectionCard>
        ))}
      </div>

      {/* Projects with report access */}
      <div className="mb-2 text-sm font-semibold text-bp-text">Your Projects</div>
      <p className="mb-3 text-xs text-bp-muted">Click a project to access its reports and export tools.</p>

      {isLoading ? <LoadingState rows={3} /> : isError ? (
        <EmptyState icon="&#9888;" title="Failed to load projects" description="Could not connect to the server. Check your connection and try again." />
      ) : (
        (projects).length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {(projects).map((p: ProjectSummary) => (
              <SectionCard key={p.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs text-bp-accent">{p.code}</span>
                  <StatusBadge text={p.status_display || p.status} color={p.status === 'active' ? '#22c55e' : '#f59e0b'} />
                </div>
                <div className="text-[13px] font-semibold text-bp-text mb-1">{p.name}</div>
                <div className="text-[11px] text-bp-muted mb-2">{p.project_type_display} | {p.contract_type_display}</div>
                <ActionButton
                  variant="blue"
                  size="sm"
                  onClick={() => navigate(`/app/projects/${p.id}/project-reports`)}
                >
                  View Reports & Export
                </ActionButton>
              </SectionCard>
            ))}
          </div>
        ) : (
          <EmptyState icon="&#128202;" title="No projects" description="You don't have access to any projects yet." />
        )
      )}
    </div>
  )
}
