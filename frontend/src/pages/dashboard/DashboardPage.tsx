import { useNavigate } from 'react-router-dom'
import { MetricCard, CostCard, SectionCard, StatusBadge, LoadingState, EmptyState } from '../../components/ui'
import { useProjects, type ProjectSummary } from '../../hooks/useProjects'
import { useNotifications } from '../../hooks/useNotifications'
import { formatUGX } from '../../lib/formatters'

/**
 * Dashboard -- portfolio-level summary built from real API data.
 *
 * Uses: useProjects() for project list, useNotifications() for alerts.
 * No hardcoded demo data.
 */

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: projectsRaw, isLoading: loadingProjects, isError: projectsError } = useProjects()
  const { data: notifData, isError: notifError } = useNotifications()

  const projects: ProjectSummary[] = Array.isArray(projectsRaw) ? projectsRaw : []
  const notifications = notifData?.results ?? []
  const unreadCount = notifData?.unread_count ?? 0

  if (loadingProjects) return <LoadingState rows={6} />
  if (projectsError) {
    return <EmptyState icon="&#9888;" title="Failed to load dashboard" description="Could not connect to the server. Check your connection and try again." />
  }

  const ongoing = projects.filter(p => p.status === 'active')
  const completed = projects.filter(p => p.status === 'completed')
  const totalBudget = projects.reduce((s, p) => s + (parseFloat(p.budget) || 0), 0)

  return (
    <div>
      <h2 className="mb-5 text-lg font-bold text-bp-text">Portfolio Dashboard</h2>

      {/* KPI Cards -- from real project data */}
      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
        <MetricCard icon="&#127959;" value={projects.length} label="Total Projects" color="#3b82f6" />
        <MetricCard icon="&#128260;" value={ongoing.length} label="Ongoing" color="#f59e0b" />
        <MetricCard icon="&#9989;" value={completed.length} label="Completed" color="#22c55e" />
        <MetricCard icon="&#128276;" value={unreadCount} label="Unread Alerts" color={unreadCount > 0 ? '#ef4444' : '#94a3b8'} />
      </div>

      {/* Cost Summary -- from real budgets */}
      {totalBudget > 0 && (
        <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5">
          <CostCard label="Total Portfolio Budget" value={formatUGX(totalBudget)} color="#3b82f6" />
          <CostCard label="Active Projects" value={String(ongoing.length)} color="#f59e0b" />
          <CostCard label="Completed" value={String(completed.length)} color="#22c55e" />
        </div>
      )}

      {/* Notifications error state */}
      {notifError && (
        <SectionCard accentLeft="#f97316" className="mb-5">
          <div className="text-xs text-bp-muted">Could not load notifications. Check backend connectivity.</div>
        </SectionCard>
      )}

      {/* Alerts from real notifications */}
      {!notifError && notifications.length > 0 && (
        <SectionCard accentLeft="#ef4444" className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-bp-text">Recent Notifications</div>
            <StatusBadge text={`${unreadCount} unread`} color={unreadCount > 0 ? '#ef4444' : '#94a3b8'} />
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 5).map(n => (
              <div
                key={n.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg bg-bp-surface px-3 py-2"
                onClick={() => n.link && navigate(n.link)}
              >
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium ${n.is_read ? 'text-bp-muted' : 'text-bp-text'}`}>{n.title}</div>
                  <div className="text-[10px] text-bp-muted">{n.message}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <button onClick={() => navigate('/app/notifications')} className="text-[11px] text-bp-info hover:underline bg-transparent border-none cursor-pointer">
              View all notifications
            </button>
          </div>
        </SectionCard>
      )}

      {/* Ongoing Projects -- from real API */}
      {ongoing.length > 0 && (
        <>
          <h3 className="mb-3 text-base font-bold text-bp-text">
            Ongoing Projects ({ongoing.length})
          </h3>
          <div className="mb-6 grid gap-2.5">
            {ongoing.map(p => {
              const budget = parseFloat(p.budget) || 0
              return (
                <SectionCard key={p.id} padding="compact">
                  <div
                    className="flex cursor-pointer items-center gap-4 px-1"
                    onClick={() => navigate(`/app/projects/${p.id}/overview`)}
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'rgba(245,158,11,0.15)' }}>
                      <span className="font-mono text-xs font-bold text-bp-accent">{p.code}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-bp-text">{p.name}</div>
                      <div className="mb-1 text-xs text-bp-muted">
                        {p.project_type_display} &bull; {p.location || 'No location'}
                      </div>
                      <StatusBadge text={p.status_display} color={p.status === 'active' ? '#22c55e' : '#f59e0b'} />
                    </div>
                    {budget > 0 && (
                      <div className="flex-shrink-0 text-right">
                        <div className="font-mono text-[13px] font-semibold text-bp-accent">{formatUGX(budget)}</div>
                      </div>
                    )}
                    <span className="flex-shrink-0 text-lg text-bp-muted">&#8250;</span>
                  </div>
                </SectionCard>
              )
            })}
          </div>
        </>
      )}

      {/* Completed Projects */}
      {completed.length > 0 && (
        <>
          <h3 className="mb-3 text-base font-bold text-bp-success">
            Completed ({completed.length})
          </h3>
          <div className="grid gap-2.5">
            {completed.map(p => (
              <SectionCard key={p.id} padding="compact">
                <div
                  className="flex cursor-pointer items-center gap-4 px-1 opacity-80"
                  onClick={() => navigate(`/app/projects/${p.id}/overview`)}
                >
                  <span className="text-xl">&#9989;</span>
                  <div className="flex-1">
                    <div className="font-semibold text-bp-text">{p.name}</div>
                    <div className="text-xs text-bp-muted">{p.project_type_display}</div>
                  </div>
                  {parseFloat(p.budget) > 0 && (
                    <div className="font-mono text-[13px] text-bp-success">{formatUGX(parseFloat(p.budget))}</div>
                  )}
                  <span className="text-lg text-bp-muted">&#8250;</span>
                </div>
              </SectionCard>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <EmptyState icon="&#127959;" title="No projects yet" description="Create your first project to see portfolio data here." />
      )}
    </div>
  )
}
