import { useParams } from 'react-router-dom'
import { MetricCard, CostCard, SectionCard, StatusBadge, ProgressBar, LoadingState } from '../../components/ui'
import { useProjectOverview } from '../../hooks/useCost'
import { formatUGX } from '../../lib/formatters'

/**
 * Overview & EVM -- project control dashboard.
 *
 * Matches prototype renderProjDash():
 * KPI cards -> progress bar -> cost cards -> critical path -> EVM metrics -> milestones
 */

export function OverviewPage() {
  const { projectId } = useParams()
  const { data, isLoading } = useProjectOverview(projectId)

  if (isLoading) return <LoadingState rows={6} />
  if (!data) return <div className="text-bp-muted">Could not load overview.</div>

  const { project: p, schedule: s, cost: c, evm: e, milestones: ms } = data

  return (
    <div>
      {/* Project header summary */}
      <SectionCard className="mb-4" padding="compact">
        <div className="flex flex-wrap items-start justify-between gap-4 px-1">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <StatusBadge text={p.status_display} color={p.status === 'active' ? '#f59e0b' : p.status === 'completed' ? '#22c55e' : '#94a3b8'} />
              <span className="font-mono text-[10px] text-bp-muted">{p.code}</span>
            </div>
            <div className="text-xs text-bp-muted">
              {p.location}
              {p.client_name && <> &bull; Client: <span className="text-bp-text">{p.client_name}</span></>}
              {p.consultant && <> &bull; Consultant: <span className="text-bp-text">{p.consultant}</span></>}
            </div>
          </div>
          <div className="flex gap-4 text-xs text-bp-muted">
            {p.start_date && <div>Start: <span className="text-bp-text">{p.start_date}</span></div>}
            {p.end_date && <div>End: <span className="text-bp-text">{p.end_date}</span></div>}
          </div>
        </div>
      </SectionCard>

      {/* Schedule KPI cards */}
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2.5">
        <MetricCard icon="📋" value={s.total_tasks} label="Total Tasks" color="#3b82f6" />
        <MetricCard icon="✅" value={s.completed} label="Completed" color="#22c55e" />
        <MetricCard icon="🔄" value={s.in_progress} label="In Progress" color="#3b82f6" />
        <MetricCard icon="⚠️" value={s.delayed} label="Delayed" color="#ef4444" />
        <MetricCard icon="🔴" value={s.critical_count} label="Critical" color="#ef4444" />
        <MetricCard icon="📅" value={`${s.project_duration}d`} label="Duration" color="#f59e0b" />
      </div>

      {/* Progress bar */}
      <SectionCard className="mb-4" padding="compact">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[13px] text-bp-muted">Overall Progress</span>
          <span className="font-mono text-sm font-bold text-bp-accent">{s.overall_progress}%</span>
        </div>
        <div className="px-1">
          <ProgressBar value={s.overall_progress} height={10} />
        </div>
      </SectionCard>

      {/* Cost summary cards */}
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
        <CostCard label="Total Budget" value={formatUGX(c.total_budget)} color="#3b82f6" />
        <CostCard label="Utilisation" value={`${c.budget_utilisation.toFixed(1)}%`} color={c.is_over_budget ? '#ef4444' : '#f59e0b'} />
        <CostCard label="Actual Spend" value={formatUGX(c.total_actual)} color="#f97316" />
        <CostCard label="Variance" value={formatUGX(c.variance)} color={c.variance >= 0 ? '#22c55e' : '#ef4444'} />
      </div>

      {/* Critical path */}
      {s.critical_path.length > 0 && (
        <SectionCard accentLeft="#ef4444" className="mb-4" padding="compact">
          <div className="px-1">
            <div className="mb-1 text-xs font-bold text-bp-danger">🔴 CRITICAL PATH</div>
            <div className="font-mono text-sm text-bp-text">
              {s.critical_path.join(' → ')}
            </div>
          </div>
        </SectionCard>
      )}

      {/* EVM metrics */}
      <SectionCard className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-bold text-bp-text">Earned Value Management</span>
          {e.has_baseline ? (
            <StatusBadge text="Baseline set" color="#22c55e" />
          ) : (
            <StatusBadge text="No baseline" color="#94a3b8" />
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-1.5">
          {[
            { label: 'BAC', value: e.bac, color: '#3b82f6', fmt: true },
            { label: 'BCWP', value: e.bcwp, color: '#22c55e', fmt: true },
            { label: 'ACWP', value: e.acwp, color: '#f97316', fmt: true },
            { label: 'CPI', value: e.cpi, color: e.cpi >= 1 ? '#22c55e' : '#ef4444', fmt: false },
            { label: 'SPI', value: e.spi, color: e.spi >= 1 ? '#22c55e' : '#ef4444', fmt: false },
            { label: 'EAC', value: e.eac, color: '#e2e8f0', fmt: true },
            { label: 'VAC', value: e.vac, color: e.vac >= 0 ? '#22c55e' : '#ef4444', fmt: true },
          ].map((m) => (
            <div key={m.label} className="rounded-md bg-bp-surface p-2 text-center">
              <div className="text-[9px] text-bp-muted">{m.label}</div>
              <div className="font-mono text-xs font-bold" style={{ color: m.color }}>
                {m.fmt && Math.abs(m.value) > 99 ? formatUGX(m.value) : m.value}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Milestones summary */}
      {ms.total > 0 && (
        <SectionCard>
          <div className="mb-3 font-bold text-bp-text">Milestones</div>
          <div className="grid gap-1">
            {ms.items.map((m, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bp-surface px-3 py-1.5">
                <span>{m.status === 'achieved' ? '✅' : '🏁'}</span>
                <span className="flex-1 text-xs text-bp-text">{m.name}</span>
                {m.target_date && <span className="text-[10px] text-bp-muted">{m.target_date}</span>}
                <StatusBadge
                  text={m.status}
                  color={m.status === 'achieved' ? '#22c55e' : '#f59e0b'}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
