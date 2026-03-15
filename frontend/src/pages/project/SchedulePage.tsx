import { useParams } from 'react-router-dom'
import { PageHeader, SectionCard, StatusBadge, ActionButton, DataTable, MetricCard, LoadingState } from '../../components/ui'
import { useTasks, useRecalculateCPM, useScheduleSummary, useUpdateTask, type Task } from '../../hooks/useSchedule'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

const statusColors: Record<string, string> = {
  not_started: '#94a3b8', in_progress: '#3b82f6', completed: '#22c55e',
  delayed: '#ef4444', on_hold: '#f97316',
}

export function SchedulePage() {
  const { projectId } = useParams()
  const { data: tasks, isLoading } = useTasks(projectId)
  const { data: summary } = useScheduleSummary(projectId)
  const { canEditSchedule } = useProjectPermissions(projectId)
  const recalculate = useRecalculateCPM(projectId!)
  const updateTask = useUpdateTask(projectId!)
  const { showToast } = useUIStore()

  if (isLoading) return <LoadingState rows={6} />

  const list = tasks || []

  const columns = [
    {
      key: 'code', header: 'ID', width: '60px',
      render: (t: Task) => (
        <span className={`font-mono text-xs ${t.is_critical ? 'text-bp-danger font-bold' : 'text-bp-muted'}`}>
          {t.code}
        </span>
      ),
    },
    {
      key: 'name', header: 'Activity',
      render: (t: Task) => (
        <span className={t.is_parent ? 'font-bold text-bp-text' : 'text-bp-text'} style={{ paddingLeft: t.is_parent ? 0 : 12 }}>
          {t.name}
        </span>
      ),
    },
    {
      key: 'pred', header: 'Pred',
      render: (t: Task) => (
        <span className="font-mono text-[11px] text-bp-muted">
          {t.predecessor_codes.join(', ') || '-'}
        </span>
      ),
    },
    { key: 'dur', header: 'Dur', width: '50px', render: (t: Task) => <span className="font-mono text-xs">{t.duration_days}</span> },
    { key: 'es', header: 'ES', width: '40px', render: (t: Task) => <span className="font-mono text-[11px] text-bp-muted">{t.early_start}</span> },
    { key: 'ef', header: 'EF', width: '40px', render: (t: Task) => <span className="font-mono text-[11px] text-bp-muted">{t.early_finish}</span> },
    { key: 'ls', header: 'LS', width: '40px', render: (t: Task) => <span className="font-mono text-[11px] text-bp-muted">{t.late_start}</span> },
    { key: 'lf', header: 'LF', width: '40px', render: (t: Task) => <span className="font-mono text-[11px] text-bp-muted">{t.late_finish}</span> },
    { key: 'slack', header: 'Slack', width: '50px', render: (t: Task) => <span className={`font-mono text-xs ${t.total_float === 0 ? 'text-bp-danger font-bold' : 'text-bp-muted'}`}>{t.total_float}</span> },
    {
      key: 'progress', header: 'Progress', width: '70px',
      render: (t: Task) => {
        if (!canEditSchedule) return <span className="text-xs">{t.progress}%</span>
        return (
          <input
            type="number"
            min={0} max={100}
            defaultValue={t.progress}
            className="!w-14 !py-0.5 !px-1 !text-xs font-mono text-center"
            onBlur={(e) => {
              const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
              if (val !== t.progress) {
                updateTask.mutate({ taskId: t.id, data: { progress: val } })
              }
            }}
          />
        )
      },
    },
    {
      key: 'status', header: 'Status',
      render: (t: Task) => <StatusBadge text={t.status_display} color={statusColors[t.status] || '#94a3b8'} />,
    },
  ]

  return (
    <div>
      <PageHeader title="Schedule & CPM" icon="📝" count={list.length}>
        {canEditSchedule && (
          <ActionButton
            variant="blue"
            onClick={async () => {
              const r = await recalculate.mutateAsync()
              showToast(`CPM recalculated: ${r.duration} days, ${r.critical_path.length} critical tasks`, 'success')
            }}
            disabled={recalculate.isPending}
          >
            {recalculate.isPending ? 'Calculating...' : '↻ Recalculate CPM'}
          </ActionButton>
        )}
      </PageHeader>

      {/* Schedule summary */}
      {summary && (
        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
          <MetricCard icon="📋" value={summary.total_tasks} label="Total Tasks" color="#3b82f6" />
          <MetricCard icon="✅" value={summary.completed} label="Completed" color="#22c55e" />
          <MetricCard icon="🔄" value={summary.in_progress} label="In Progress" color="#3b82f6" />
          <MetricCard icon="⚠️" value={summary.delayed} label="Delayed" color="#ef4444" />
          <MetricCard icon="🔴" value={summary.critical_count} label="Critical" color="#ef4444" />
          <MetricCard icon="📅" value={`${summary.project_duration}d`} label="Duration" color="#f59e0b" />
        </div>
      )}

      {/* Critical path */}
      {summary && summary.critical_path.length > 0 && (
        <SectionCard accentLeft="#ef4444" className="mb-4" padding="compact">
          <div className="px-1">
            <div className="mb-1 text-xs font-bold text-bp-danger">🔴 CRITICAL PATH</div>
            <div className="font-mono text-sm text-bp-text">
              {summary.critical_path.join(' → ')}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Task table */}
      <div style={{ overflowX: 'auto' }}>
        <DataTable columns={columns} data={list} emptyText="No tasks yet" />
      </div>
    </div>
  )
}
