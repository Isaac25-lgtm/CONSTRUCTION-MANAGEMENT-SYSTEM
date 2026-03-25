import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, SectionCard, MetricCard, LoadingState, Modal, ActionButton } from '../../components/ui'
import {
  useTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useRecalculateCPM, useScheduleSummary, type Task,
} from '../../hooks/useSchedule'
import { useProject } from '../../hooks/useProjects'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

/* ---------- helpers ---------- */
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'delayed', label: 'Delayed' },
]

/* ---------- inline input styles ---------- */
const sIL: React.CSSProperties = {
  background: 'var(--bg-secondary, #1e293b)',
  border: '1px solid var(--border, #334155)',
  borderRadius: 4,
  color: 'inherit',
  padding: '2px 4px',
  fontSize: 11,
  fontFamily: 'ui-monospace, monospace',
  textAlign: 'center',
}

export function SchedulePage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { data: tasks, isLoading } = useTasks(projectId)
  const { data: summary } = useScheduleSummary(projectId)
  const { data: project } = useProject(projectId)
  const { canEditSchedule } = useProjectPermissions(projectId)
  const recalculate = useRecalculateCPM(projectId!)
  const updateTask = useUpdateTask(projectId!)
  const createTask = useCreateTask(projectId!)
  const deleteTask = useDeleteTask(projectId!)
  const { showToast } = useUIStore()

  const [manualOverride, setManualOverride] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [newTask, setNewTask] = useState({ code: '', name: '', description: '', duration_days: 5, budget: '0', resource: '', predecessors: '' })
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [editTaskOpen, setEditTaskOpen] = useState<Task | null>(null)
  const [addSiblingFor, setAddSiblingFor] = useState<Task | null>(null)
  const [addChildFor, setAddChildFor] = useState<Task | null>(null)
  const [clearScheduleOpen, setClearScheduleOpen] = useState(false)
  const [editProgress, setEditProgress] = useState(0)

  if (isLoading) return <LoadingState rows={6} />

  const list = tasks || []
  const pStart = project?.start_date ? new Date(project.start_date) : new Date()

  /* ---------- task field update ---------- */
  function onUpdate(task: Task, field: string, value: number | string) {
    updateTask.mutate({ taskId: task.id, data: { [field]: value } })
  }

  /* ---------- date change handlers ---------- */
  function onStartDateChange(task: Task, dateStr: string) {
    if (!dateStr) return
    const nd = new Date(dateStr)
    const newES = Math.max(0, Math.round((nd.getTime() - pStart.getTime()) / 864e5))
    const shift = newES - task.early_start
    updateTask.mutate({
      taskId: task.id,
      data: {
        planned_start: toISO(nd),
        early_start: newES,
        early_finish: Math.max(newES + 1, task.early_finish + shift),
      },
    })
    setManualOverride(true)
  }

  function onEndDateChange(task: Task, dateStr: string) {
    if (!dateStr) return
    const nd = new Date(dateStr)
    const newEF = Math.max(task.early_start + 1, Math.round((nd.getTime() - pStart.getTime()) / 864e5))
    updateTask.mutate({
      taskId: task.id,
      data: {
        planned_end: toISO(nd),
        early_finish: newEF,
        duration_days: newEF - task.early_start,
      },
    })
    setManualOverride(true)
  }

  /* ---------- CPM field manual edit with cascading ---------- */
  // ES changed → EF = ES + Dur, Slack = LS - ES, Start date shifts
  // EF changed → Dur = EF - ES, Slack = LF - EF, End date shifts
  // LS changed → LF = LS + Dur, Slack = LS - ES
  // LF changed → LS = LF - Dur, Slack = LS - ES  (LS derived first)
  function onCpmFieldChange(task: Task, field: string, val: number) {
    const es = field === 'early_start' ? val : task.early_start
    const ef = field === 'early_finish' ? val : (field === 'early_start' ? val + task.duration_days : task.early_finish)
    const dur = field === 'early_finish' ? val - task.early_start : (field === 'early_start' ? task.duration_days : task.duration_days)
    const ls = field === 'late_start' ? val : (field === 'late_finish' ? val - task.duration_days : task.late_start)
    const lf = field === 'late_finish' ? val : (field === 'late_start' ? val + task.duration_days : task.late_finish)

    const data: Record<string, unknown> = {
      early_start: es,
      early_finish: field === 'early_start' ? es + dur : ef,
      late_start: ls,
      late_finish: field === 'late_start' ? ls + dur : lf,
    }

    // Cascade duration when EF is directly edited
    if (field === 'early_finish') {
      data.duration_days = val - task.early_start
    }

    // Cascade planned dates to stay in sync
    data.planned_start = toISO(addDays(pStart, es))
    data.planned_end = toISO(addDays(pStart, data.early_finish as number))

    updateTask.mutate({ taskId: task.id, data: data as Record<string, number | string> })
    setManualOverride(true)
  }

  /* ---------- add task ---------- */
  function handleAddTask() {
    if (!newTask.code || !newTask.name) {
      showToast('Code and name are required', 'error')
      return
    }
    const payload: Record<string, unknown> = {
      code: newTask.code,
      name: newTask.name,
      description: newTask.description,
      duration_days: newTask.duration_days,
      budget: newTask.budget,
      resource: newTask.resource,
    }
    createTask.mutate(payload as Parameters<typeof createTask.mutate>[0], {
      onSuccess: () => {
        setAddTaskOpen(false)
        setNewTask({ code: '', name: '', description: '', duration_days: 5, budget: '0', resource: '', predecessors: '' })
        showToast('Task created', 'success')
      },
    })
  }

  /* ---------- add sibling/child task ---------- */
  function handleAddRelatedTask(parentTask: Task, isChild: boolean) {
    if (!newTask.code || !newTask.name) {
      showToast('Code and name are required', 'error')
      return
    }
    const data: Record<string, unknown> = {
      ...newTask,
      // Child: set parent to the target task
      // Sibling: inherit the target task's parent (so it stays under the same parent)
      ...(isChild
        ? { parent: parentTask.id }
        : parentTask.parent ? { parent: parentTask.parent } : {}),
    }
    createTask.mutate(data as Parameters<typeof createTask.mutate>[0], {
      onSuccess: () => {
        setAddSiblingFor(null)
        setAddChildFor(null)
        setNewTask({ code: '', name: '', description: '', duration_days: 5, budget: '0', resource: '', predecessors: '' })
        showToast(`Task created`, 'success')
      },
    })
  }

  /* ---------- delete task ---------- */
  function handleDeleteTask(task: Task) {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        setConfirmDelete(null)
        showToast(`Deleted task ${task.code}`, 'success')
      },
    })
  }

  /* ---------- clear schedule ---------- */
  function handleClearSchedule() {
    list.forEach(t => {
      updateTask.mutate({
        taskId: t.id,
        data: {
          duration_days: 0,
          early_start: 0,
          early_finish: 0,
          late_start: 0,
          late_finish: 0,
          planned_start: null as unknown as string,
          planned_end: null as unknown as string,
        },
      })
    })
    setManualOverride(true)
    setClearScheduleOpen(false)
    showToast('Schedule data cleared. Enter durations and recalculate CPM.', 'success')
  }

  return (
    <div>
      {/* Header with action buttons */}
      <PageHeader title="Schedule & CPM" icon="📝" count={list.length}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton variant="ghost" onClick={() => navigate('../gantt')}>
            📅 Gantt
          </ActionButton>
          <ActionButton variant="ghost" onClick={() => navigate('../budget')}>
            💰 Budget
          </ActionButton>
          {canEditSchedule && (
            <>
              <ActionButton variant="green" onClick={() => setAddTaskOpen(true)}>
                + Add Task
              </ActionButton>
              <ActionButton
                variant="blue"
                onClick={async () => {
                  const r = await recalculate.mutateAsync()
                  setManualOverride(false)
                  showToast(`CPM recalculated: ${r.duration} days, ${r.critical_path.length} critical tasks`, 'success')
                }}
                disabled={recalculate.isPending}
              >
                {recalculate.isPending ? 'Calculating...' : '↻ Recalculate CPM'}
              </ActionButton>
              <ActionButton variant="red" onClick={() => setClearScheduleOpen(true)}>
                Clear Schedule
              </ActionButton>
            </>
          )}
        </div>
      </PageHeader>

      {/* Manual override warning */}
      {manualOverride && (
        <div className="mb-3 rounded-lg border border-amber-600/50 bg-amber-900/20 px-4 py-2 text-[13px] text-amber-400">
          ⚠️ Manual overrides active. Click Recalculate CPM to reset.
        </div>
      )}

      {/* Linked hint */}
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-bp-muted">
        <span className="text-blue-400">🔗</span>
        Linked with Gantt Chart and Cost & Budget — edits sync automatically.
      </div>

      {/* Schedule summary metrics */}
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
      <div className="rounded-lg border border-bp-border bg-bp-card" style={{ overflow: 'auto', maxHeight: '65vh' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr>
              {['ID', 'Activity', 'Pred', 'Start', 'End', 'Dur', 'ES', 'EF', 'LS', 'LF', 'Slack', 'Progress', 'Status', ''].map(h => (
                <th key={h} className="sticky top-0 z-10 border-b border-bp-border bg-bp-card px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-bp-accent">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(t => {
              const sD = addDays(pStart, t.early_start)
              const eD = addDays(pStart, t.early_finish)
              const startVal = t.planned_start || toISO(sD)
              const endVal = t.planned_end || toISO(eD)

              return (
                <tr
                  key={t.id}
                  style={{ background: t.is_critical ? '#7f1d1d22' : 'transparent' }}
                  className="border-b border-bp-border/50 hover:bg-white/[0.02]"
                >
                  {/* ID */}
                  <td className="px-2 py-1.5">
                    <span className={`font-mono text-xs font-bold ${t.is_critical ? 'text-red-500' : 'text-bp-accent'}`}>
                      {t.code}
                    </span>
                  </td>

                  {/* Activity — clickable with ▼ dropdown */}
                  <td className="px-2 py-1.5" style={{ maxWidth: 180, position: 'relative' }}>
                    <div
                      className="flex cursor-pointer items-center gap-1"
                      onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === t.id ? null : t.id) }}
                    >
                      <span className={t.is_parent ? 'font-bold text-bp-text' : 'text-bp-text'} style={{ paddingLeft: t.is_parent ? 0 : 12 }}>
                        {t.name}
                      </span>
                      {canEditSchedule && (
                        <span className="text-[9px] text-bp-muted opacity-60">▼</span>
                      )}
                    </div>
                  </td>

                  {/* Predecessors */}
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-[11px] text-bp-muted">
                      {t.predecessor_codes.join(',') || '-'}
                    </span>
                  </td>

                  {/* Start date — onChange triggers immediately like prototype */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule ? (
                      <input
                        type="date"
                        defaultValue={startVal}
                        onChange={e => onStartDateChange(t, e.target.value)}
                        style={{ ...sIL, width: 112, fontSize: 10 }}
                      />
                    ) : (
                      <span className="font-mono text-[10px] text-bp-muted">{startVal}</span>
                    )}
                  </td>

                  {/* End date — onChange triggers immediately like prototype */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule ? (
                      <input
                        type="date"
                        defaultValue={endVal}
                        onChange={e => onEndDateChange(t, e.target.value)}
                        style={{ ...sIL, width: 112, fontSize: 10 }}
                      />
                    ) : (
                      <span className="font-mono text-[10px] text-bp-muted">{endVal}</span>
                    )}
                  </td>

                  {/* Duration — cascades to EF, LF, End date */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule ? (
                      <input
                        type="number"
                        defaultValue={t.duration_days}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0
                          if (v !== t.duration_days) {
                            const newEF = t.early_start + v
                            const newLF = t.late_start + v
                            updateTask.mutate({
                              taskId: t.id,
                              data: {
                                duration_days: v,
                                early_finish: newEF,
                                late_finish: newLF,
                                planned_end: toISO(addDays(pStart, newEF)),
                              },
                            })
                            setManualOverride(true)
                          }
                        }}
                        style={{ ...sIL, width: 48 }}
                      />
                    ) : (
                      <span className="font-mono text-xs">{t.duration_days}</span>
                    )}
                  </td>

                  {/* ES — editable */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule ? (
                      <input
                        type="number"
                        defaultValue={t.early_start}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0
                          if (v !== t.early_start) onCpmFieldChange(t, 'early_start', v)
                        }}
                        style={{ ...sIL, width: 48 }}
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-bp-muted">{t.early_start}</span>
                    )}
                  </td>

                  {/* EF — editable */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule ? (
                      <input
                        type="number"
                        defaultValue={t.early_finish}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0
                          if (v !== t.early_finish) onCpmFieldChange(t, 'early_finish', v)
                        }}
                        style={{ ...sIL, width: 48 }}
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-bp-muted">{t.early_finish}</span>
                    )}
                  </td>

                  {/* LS — editable */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule ? (
                      <input
                        type="number"
                        defaultValue={t.late_start}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0
                          if (v !== t.late_start) onCpmFieldChange(t, 'late_start', v)
                        }}
                        style={{ ...sIL, width: 48 }}
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-bp-muted">{t.late_start}</span>
                    )}
                  </td>

                  {/* LF — editable */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule ? (
                      <input
                        type="number"
                        defaultValue={t.late_finish}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0
                          if (v !== t.late_finish) onCpmFieldChange(t, 'late_finish', v)
                        }}
                        style={{ ...sIL, width: 48 }}
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-bp-muted">{t.late_finish}</span>
                    )}
                  </td>

                  {/* Slack — read-only display */}
                  <td className="px-2 py-1.5 text-center">
                    <span className={`font-mono text-xs font-bold ${t.total_float === 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {t.total_float}
                    </span>
                  </td>

                  {/* Progress — range slider + percentage */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          defaultValue={t.progress}
                          onChange={e => onUpdate(t, 'progress', parseInt(e.target.value))}
                          style={{ width: 50, cursor: 'pointer', accentColor: 'var(--accent, #60a5fa)' }}
                        />
                        <span
                          className="font-mono text-[10px] font-bold"
                          style={{
                            color: t.progress >= 100 ? '#22c55e' : t.progress > 50 ? '#60a5fa' : '#f97316',
                            minWidth: 28,
                          }}
                        >
                          {t.progress}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs">{t.progress}%</span>
                    )}
                  </td>

                  {/* Status dropdown */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule ? (
                      <select
                        defaultValue={t.status}
                        onChange={e => onUpdate(t, 'status', e.target.value)}
                        style={{ ...sIL, width: 95, fontSize: 10, cursor: 'pointer' }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-bp-muted">{t.status_display}</span>
                    )}
                  </td>

                  {/* Delete */}
                  <td className="px-2 py-1.5">
                    {canEditSchedule && (
                      <button
                        onClick={() => setConfirmDelete(t)}
                        className="border-none bg-transparent text-base text-red-500 hover:text-red-400"
                        style={{ cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-sm text-bp-muted">
                  No tasks yet. Click "+ Add Task" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Activity ▼ Bottom Sheet Menu (prototype-style) ---- */}
      {activeMenu && canEditSchedule && (() => {
        const menuTask = list.find(t => t.id === activeMenu)
        if (!menuTask) return null
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
            onClick={() => setActiveMenu(null)}
          >
            <div
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#111827', border: '1px solid #334155',
                borderRadius: '16px 16px 0 0', padding: '16px 20px 24px',
                maxWidth: 420, margin: '0 auto',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 4, background: '#334155', borderRadius: 2, margin: '0 auto 12px' }} />
              <div className="mb-3 text-center text-xs text-bp-muted">{menuTask.name}</div>
              {[
                { label: 'Edit Task', color: '#3b82f6', action: () => { setEditTaskOpen(menuTask); setEditProgress(menuTask.progress); setActiveMenu(null) } },
                { label: 'Add Sibling Task', color: '#22c55e', action: () => { setAddSiblingFor(menuTask); setNewTask({ code: '', name: '', description: '', duration_days: 5, budget: '0', resource: '', predecessors: '' }); setActiveMenu(null) } },
                { label: 'Add Child Task', color: '#f59e0b', action: () => { setAddChildFor(menuTask); setNewTask({ code: '', name: '', description: '', duration_days: 5, budget: '0', resource: '', predecessors: '' }); setActiveMenu(null) } },
                { label: 'Remove Task', color: '#ef4444', action: () => { setConfirmDelete(menuTask); setActiveMenu(null) } },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={opt.action}
                  style={{
                    display: 'block', width: '100%', padding: '14px 16px',
                    background: 'transparent', border: 'none',
                    borderTop: '1px solid #334155', color: opt.color,
                    fontSize: 15, textAlign: 'center', cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setActiveMenu(null)}
                style={{
                  display: 'block', width: '100%', padding: '14px 16px', marginTop: 8,
                  background: '#1e293b', border: 'none', borderRadius: 10,
                  color: '#94a3b8', fontSize: 15, textAlign: 'center', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {/* ---- Edit Task Modal ---- */}
      {editTaskOpen && (
        <Modal open={!!editTaskOpen} title="Edit Task" onClose={() => setEditTaskOpen(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Task Name</label>
              <input
                type="text"
                defaultValue={editTaskOpen.name}
                onBlur={e => { if (e.target.value !== editTaskOpen.name) onUpdate(editTaskOpen, 'name', e.target.value) }}
                className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Duration (days)</label>
                <input
                  type="number"
                  defaultValue={editTaskOpen.duration_days}
                  onBlur={e => { const v = parseInt(e.target.value) || 0; if (v !== editTaskOpen.duration_days) onUpdate(editTaskOpen, 'duration_days', v) }}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Resource</label>
                <input
                  type="text"
                  defaultValue={editTaskOpen.resource}
                  onBlur={e => { if (e.target.value !== editTaskOpen.resource) onUpdate(editTaskOpen, 'resource', e.target.value) }}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Progress</label>
                <input
                  type="range" min={0} max={100} step={5}
                  value={editProgress}
                  onChange={e => { const v = parseInt(e.target.value); setEditProgress(v); onUpdate(editTaskOpen, 'progress', v) }}
                  style={{ width: '100%', accentColor: '#f59e0b' }}
                />
                <div className="text-center text-xs font-bold text-bp-accent">{editProgress}%</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Status</label>
                <select
                  defaultValue={editTaskOpen.status}
                  onChange={e => onUpdate(editTaskOpen, 'status', e.target.value)}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text"
                >
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Predecessors</label>
              <input
                type="text"
                defaultValue={editTaskOpen.predecessor_codes.join(', ')}
                disabled
                className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-muted"
                placeholder="e.g. A, B"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Notes / Memo</label>
              <textarea
                defaultValue={editTaskOpen.description}
                onBlur={e => { if (e.target.value !== editTaskOpen.description) onUpdate(editTaskOpen, 'description', e.target.value) }}
                rows={2}
                className="w-full resize-y rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text"
                placeholder="Task notes..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ActionButton
                variant="blue"
                onClick={async () => {
                  await recalculate.mutateAsync()
                  setManualOverride(false)
                  setEditTaskOpen(null)
                  showToast('Task updated & CPM recalculated', 'success')
                }}
              >
                Save & Recalculate
              </ActionButton>
              <ActionButton variant="ghost" onClick={() => setEditTaskOpen(null)}>Close</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ---- Add Sibling Task Modal ---- */}
      {addSiblingFor && (
        <Modal open={!!addSiblingFor} title={`Add Sibling Task after: ${addSiblingFor.name}`} onClose={() => setAddSiblingFor(null)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">ID *</label>
                <input type="text" value={newTask.code} onChange={e => setNewTask(p => ({ ...p, code: e.target.value }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Task Name *</label>
                <input type="text" value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
                  placeholder="New task name" className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Duration (days)</label>
              <input type="number" value={newTask.duration_days} onChange={e => setNewTask(p => ({ ...p, duration_days: parseInt(e.target.value) || 0 }))}
                className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ActionButton variant="ghost" onClick={() => setAddSiblingFor(null)}>Cancel</ActionButton>
              <ActionButton variant="green" onClick={() => handleAddRelatedTask(addSiblingFor, false)}>Add Task</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ---- Add Child Task Modal ---- */}
      {addChildFor && (
        <Modal open={!!addChildFor} title={`Add Child Task under: ${addChildFor.name}`} onClose={() => setAddChildFor(null)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">ID *</label>
                <input type="text" value={newTask.code} onChange={e => setNewTask(p => ({ ...p, code: e.target.value }))}
                  placeholder={`${addChildFor.code}a`} className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Task Name *</label>
                <input type="text" value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
                  placeholder="New task name" className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Duration (days)</label>
              <input type="number" value={newTask.duration_days} onChange={e => setNewTask(p => ({ ...p, duration_days: parseInt(e.target.value) || 0 }))}
                className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ActionButton variant="ghost" onClick={() => setAddChildFor(null)}>Cancel</ActionButton>
              <ActionButton variant="green" onClick={() => handleAddRelatedTask(addChildFor, true)}>Add Task</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ---- Add Task Modal (standalone) ---- */}
      {addTaskOpen && (
        <Modal open={addTaskOpen} title="Add New Task" onClose={() => setAddTaskOpen(false)}>
          <div className="flex flex-col gap-3">
            {/* Row 1: Task ID + Task Name */}
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Task ID *</label>
                <input type="text" value={newTask.code} onChange={e => setNewTask(p => ({ ...p, code: e.target.value }))}
                  placeholder="K" className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Task Name *</label>
                <input type="text" value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Quality Inspection" className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            {/* Row 2: Description */}
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Description</label>
              <input type="text" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                placeholder="Task description" className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
            </div>
            {/* Row 3: Duration + Budget + Resources */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Duration (days)</label>
                <input type="number" value={newTask.duration_days} onChange={e => setNewTask(p => ({ ...p, duration_days: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Budget (UGX)</label>
                <input type="number" value={newTask.budget} onChange={e => setNewTask(p => ({ ...p, budget: e.target.value }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Resources</label>
                <input type="text" value={newTask.resource} onChange={e => setNewTask(p => ({ ...p, resource: e.target.value }))}
                  placeholder="e.g. QA Team" className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            {/* Row 4: Predecessors */}
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Predecessors (comma-separated IDs)</label>
              <input type="text" value={newTask.predecessors} onChange={e => setNewTask(p => ({ ...p, predecessors: e.target.value }))}
                placeholder="e.g. A,B" className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
            </div>
            <ActionButton variant="green" onClick={handleAddTask} disabled={createTask.isPending} style={{ width: '100%', marginTop: 4 }}>
              {createTask.isPending ? 'Creating...' : 'Add Task'}
            </ActionButton>
          </div>
        </Modal>
      )}

      {/* ---- Delete Confirmation Modal ---- */}
      {confirmDelete && (
        <Modal open={!!confirmDelete} title="Delete Task" onClose={() => setConfirmDelete(null)}>
          <p className="mb-4 text-sm text-bp-text">
            Delete task <strong>{confirmDelete.code}: {confirmDelete.name}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</ActionButton>
            <ActionButton variant="red" onClick={() => handleDeleteTask(confirmDelete)} disabled={deleteTask.isPending}>
              {deleteTask.isPending ? 'Deleting...' : 'Delete'}
            </ActionButton>
          </div>
        </Modal>
      )}

      {/* ---- Clear Schedule Confirmation Modal ---- */}
      {clearScheduleOpen && (
        <Modal open={clearScheduleOpen} title="Clear Schedule Data" onClose={() => setClearScheduleOpen(false)}>
          <p className="mb-2 text-sm text-bp-text">
            This will reset ALL task durations and planned dates to zero. You can then manually input your schedule.
          </p>
          <p className="mb-4 text-sm text-bp-muted">
            Existing task names, predecessors, progress, and budgets will be preserved.
          </p>
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setClearScheduleOpen(false)}>Cancel</ActionButton>
            <ActionButton variant="red" onClick={handleClearSchedule}>
              Yes, Clear Schedule
            </ActionButton>
          </div>
        </Modal>
      )}
    </div>
  )
}
