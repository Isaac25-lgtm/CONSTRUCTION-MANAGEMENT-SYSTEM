import { useParams } from 'react-router-dom'
import {
  ActionButton,
  CostCard,
  LoadingState,
  MetricCard,
  ProgressBar,
  SectionCard,
  StatusBadge,
} from '../../components/ui'
import { useProjectOverview } from '../../hooks/useCost'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useProject } from '../../hooks/useProjects'
import { useBaselines, useCreateBaseline } from '../../hooks/useSchedule'
import { formatUGX } from '../../lib/formatters'
import { useUIStore } from '../../stores/uiStore'

export function OverviewPage() {
  const { projectId } = useParams()
  const { data, isLoading } = useProjectOverview(projectId)
  const { data: project } = useProject(projectId)
  const { data: baselines } = useBaselines(projectId)
  const { canEditSchedule } = useProjectPermissions(projectId)
  const createBaseline = useCreateBaseline(projectId!)
  const { showToast } = useUIStore()

  if (isLoading) return <LoadingState rows={6} />
  if (!data) return <div className="text-bp-muted">Could not load overview.</div>

  const { project: summary, schedule, cost, evm, milestones } = data
  const clientName = project?.client_name || summary.client_name || 'Client'
  const clientInitials = clientName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div>
      <SectionCard className="mb-4" padding="compact">
        <div className="flex flex-wrap items-start justify-between gap-4 px-1">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <StatusBadge
                text={summary.status_display}
                color={summary.status === 'active' ? '#f59e0b' : summary.status === 'completed' ? '#22c55e' : '#94a3b8'}
              />
              <span className="font-mono text-[10px] text-bp-muted">{summary.code}</span>
            </div>
            <div className="text-xs text-bp-muted">
              {summary.location}
              {project?.project_manager_name && <> &bull; Manager: <span className="text-bp-text">{project.project_manager_name}</span></>}
              {summary.client_name && <> &bull; Client: <span className="text-bp-text">{summary.client_name}</span></>}
              {summary.consultant && <> &bull; Consultant: <span className="text-bp-text">{summary.consultant}</span></>}
            </div>
          </div>
          <div className="flex gap-4 text-xs text-bp-muted">
            {summary.start_date && <div>Start: <span className="text-bp-text">{summary.start_date}</span></div>}
            {summary.end_date && <div>End: <span className="text-bp-text">{summary.end_date}</span></div>}
          </div>
        </div>
      </SectionCard>

      <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-bold text-bp-text">Project Snapshot</div>
            {canEditSchedule && (
              <ActionButton
                variant="blue"
                size="sm"
                onClick={async () => {
                  try {
                    await createBaseline.mutateAsync(`Baseline v${(baselines?.length || 0) + 1}`)
                    showToast('Baseline saved', 'success')
                  } catch {
                    showToast('Failed to save baseline', 'error')
                  }
                }}
                disabled={createBaseline.isPending}
              >
                {createBaseline.isPending ? 'Saving...' : 'Save Baseline'}
              </ActionButton>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-bp-surface px-3 py-3">
              <div className="text-[10px] uppercase tracking-wide text-bp-muted">Project Manager</div>
              <div className="mt-1 text-sm font-semibold text-bp-text">{project?.project_manager_name || 'Not set'}</div>
            </div>
            <div className="rounded-lg bg-bp-surface px-3 py-3">
              <div className="text-[10px] uppercase tracking-wide text-bp-muted">Contract</div>
              <div className="mt-1 text-sm font-semibold text-bp-text">{project?.contract_type_display || 'Not set'}</div>
            </div>
            <div className="rounded-lg bg-bp-surface px-3 py-3">
              <div className="text-[10px] uppercase tracking-wide text-bp-muted">Consultant</div>
              <div className="mt-1 text-sm font-semibold text-bp-text">{summary.consultant || 'Not set'}</div>
            </div>
            <div className="rounded-lg bg-bp-surface px-3 py-3">
              <div className="text-[10px] uppercase tracking-wide text-bp-muted">Budget</div>
              <div className="mt-1 text-sm font-semibold text-bp-text">{formatUGX(cost.total_budget)}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-3 font-bold text-bp-text">Client Details</div>
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: '#1f7a8c' }}
            >
              {clientInitials || 'CL'}
            </div>
            <div className="flex-1 space-y-2 text-xs text-bp-muted">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-bp-muted">Name</div>
                <div className="text-sm font-semibold text-bp-text">{clientName}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-bp-muted">Organisation</div>
                <div className="text-bp-text">{project?.client_org || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-bp-muted">Phone</div>
                <div className="text-bp-text">{project?.client_phone || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-bp-muted">Email</div>
                <div className="text-bp-text">{project?.client_email || 'Not provided'}</div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2.5">
        <MetricCard icon="&#128203;" value={schedule.total_tasks} label="Total Tasks" color="#3b82f6" />
        <MetricCard icon="&#9989;" value={schedule.completed} label="Completed" color="#22c55e" />
        <MetricCard icon="&#128260;" value={schedule.in_progress} label="In Progress" color="#3b82f6" />
        <MetricCard icon="&#9888;" value={schedule.delayed} label="Delayed" color="#ef4444" />
        <MetricCard icon="&#128308;" value={schedule.critical_count} label="Critical" color="#ef4444" />
        <MetricCard icon="&#128197;" value={`${schedule.project_duration}d`} label="Duration" color="#f59e0b" />
      </div>

      <SectionCard className="mb-4" padding="compact">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[13px] text-bp-muted">Overall Progress</span>
          <span className="font-mono text-sm font-bold text-bp-accent">{schedule.overall_progress}%</span>
        </div>
        <div className="px-1">
          <ProgressBar value={schedule.overall_progress} height={10} />
        </div>
      </SectionCard>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
        <CostCard label="Total Budget" value={formatUGX(cost.total_budget)} color="#3b82f6" />
        <CostCard label="Utilisation" value={`${cost.budget_utilisation.toFixed(1)}%`} color={cost.is_over_budget ? '#ef4444' : '#f59e0b'} />
        <CostCard label="Actual Spend" value={formatUGX(cost.total_actual)} color="#f97316" />
        <CostCard label="Variance" value={formatUGX(cost.variance)} color={cost.variance >= 0 ? '#22c55e' : '#ef4444'} />
      </div>

      {schedule.critical_path.length > 0 && (
        <SectionCard accentLeft="#ef4444" className="mb-4" padding="compact">
          <div className="px-1">
            <div className="mb-1 text-xs font-bold text-bp-danger">Critical Path</div>
            <div className="font-mono text-sm text-bp-text">{schedule.critical_path.join(' -> ')}</div>
          </div>
        </SectionCard>
      )}

      <SectionCard className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-bold text-bp-text">Earned Value Management</span>
          <div className="flex items-center gap-2">
            {evm.has_baseline ? (
              <StatusBadge text="Baseline set" color="#22c55e" />
            ) : (
              <StatusBadge text="No baseline" color="#94a3b8" />
            )}
            {baselines && baselines.length > 0 && (
              <span className="text-[11px] text-bp-muted">
                {baselines.length} snapshot{baselines.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-1.5">
          {[
            { label: 'BAC', value: evm.bac, color: '#3b82f6', fmt: true },
            { label: 'BCWP', value: evm.bcwp, color: '#22c55e', fmt: true },
            { label: 'ACWP', value: evm.acwp, color: '#f97316', fmt: true },
            { label: 'CPI', value: evm.cpi, color: evm.cpi >= 1 ? '#22c55e' : '#ef4444', fmt: false },
            { label: 'SPI', value: evm.spi, color: evm.spi >= 1 ? '#22c55e' : '#ef4444', fmt: false },
            { label: 'EAC', value: evm.eac, color: '#e2e8f0', fmt: true },
            { label: 'VAC', value: evm.vac, color: evm.vac >= 0 ? '#22c55e' : '#ef4444', fmt: true },
          ].map((metric) => (
            <div key={metric.label} className="rounded-md bg-bp-surface p-2 text-center">
              <div className="text-[9px] text-bp-muted">{metric.label}</div>
              <div className="font-mono text-xs font-bold" style={{ color: metric.color }}>
                {metric.fmt && Math.abs(metric.value) > 99 ? formatUGX(metric.value) : metric.value}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {milestones.total > 0 && (
        <SectionCard>
          <div className="mb-3 font-bold text-bp-text">Milestones</div>
          <div className="grid gap-1">
            {milestones.items.map((milestone, index) => (
              <div key={`${milestone.name}-${index}`} className="flex items-center gap-2 rounded-md bg-bp-surface px-3 py-1.5">
                <span>{milestone.status === 'achieved' ? 'OK' : 'MS'}</span>
                <span className="flex-1 text-xs text-bp-text">{milestone.name}</span>
                {milestone.target_date && <span className="text-[10px] text-bp-muted">{milestone.target_date}</span>}
                <StatusBadge
                  text={milestone.status}
                  color={milestone.status === 'achieved' ? '#22c55e' : '#f59e0b'}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
