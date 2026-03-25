import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PageHeader, CostCard, ActionButton, Modal, LoadingState,
} from '../../components/ui'
import {
  useTaskCostTable, useTaskExpenses, useCreateTaskExpense,
  useDeleteExpense, useUpdateExpense, useClearBudgets,
  useUploadExpenseAttachments, useDeleteExpenseAttachment,
  type ExpenseAttachmentData, type ExpenseData, type TaskCostRow,
} from '../../hooks/useCost'
import {
  useUpdateTask, useDeleteTask, useCreateTask, useTasks, useRecalculateCPM, type Task,
} from '../../hooks/useSchedule'
import { useProject } from '../../hooks/useProjects'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'
import { formatUGX } from '../../lib/formatters'

/* ---------- helpers ---------- */
function toISO(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}
function attachmentTypeLabel(file: ExpenseAttachmentData) {
  if (file.content_type.includes('pdf')) return 'PDF'
  if (file.content_type.includes('word') || file.original_filename.toLowerCase().endsWith('.doc') || file.original_filename.toLowerCase().endsWith('.docx')) return 'Word'
  if (file.content_type.includes('sheet') || file.content_type.includes('excel') || file.original_filename.toLowerCase().endsWith('.xls') || file.original_filename.toLowerCase().endsWith('.xlsx')) return 'Excel'
  if (file.content_type.startsWith('image/')) return 'Image'
  const ext = file.original_filename.split('.').pop()
  return ext ? ext.toUpperCase() : 'File'
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'delayed', label: 'Delayed' },
]

const EMPTY_TASK_FORM = {
  code: '',
  name: '',
  description: '',
  duration_days: 5,
  budget: '0',
  resource: '',
  predecessors: '',
}

const sIL: React.CSSProperties = {
  background: 'var(--bg-secondary, #1e293b)',
  border: '1px solid var(--border, #334155)',
  borderRadius: 4, color: 'inherit', padding: '2px 4px',
  fontSize: 11, fontFamily: 'ui-monospace, monospace', textAlign: 'center',
}

type DeletableTask = { id: string; code: string; name: string }

export function CostBudgetPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const navigate = useNavigate()
  const { data: costData, isLoading } = useTaskCostTable(projectId)
  const { data: project } = useProject(projectId)
  const { data: scheduleTasks } = useTasks(projectId)
  const { canEditBudget } = useProjectPermissions(projectId)
  const updateTask = useUpdateTask(pid)
  const deleteTask = useDeleteTask(pid)
  const createTask = useCreateTask(pid)
  const recalculate = useRecalculateCPM(pid)
  const clearBudgets = useClearBudgets(pid)
  const { showToast } = useUIStore()

  const [expModalTask, setExpModalTask] = useState<TaskCostRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<DeletableTask | null>(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [editTaskOpen, setEditTaskOpen] = useState<Task | null>(null)
  const [addSiblingFor, setAddSiblingFor] = useState<Task | null>(null)
  const [addChildFor, setAddChildFor] = useState<Task | null>(null)
  const [editProgress, setEditProgress] = useState(0)
  const [clearOpen, setClearOpen] = useState(false)
  const [newTask, setNewTask] = useState(EMPTY_TASK_FORM)

  if (isLoading) return <LoadingState rows={6} />

  const rows = costData?.rows || []
  const totals = costData?.totals || { budget: 0, actual: 0, variance: 0 }
  const projectBudget = costData?.project_budget || 0
  const pStart = project?.start_date ? new Date(project.start_date) : new Date()

  function onBudgetChange(task: TaskCostRow, val: number) {
    updateTask.mutate({ taskId: task.id, data: { budget: String(val) } })
  }

  function onUpdate(task: Task, field: string, value: number | string) {
    updateTask.mutate({ taskId: task.id, data: { [field]: value } })
  }

  function onStatusChange(task: TaskCostRow, val: string) {
    updateTask.mutate({ taskId: task.id, data: { status: val } })
  }

  function onStartDateChange(task: TaskCostRow, dateStr: string) {
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
  }

  function onEndDateChange(task: TaskCostRow, dateStr: string) {
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
  }

  function handleDeleteTask(task: DeletableTask) {
    deleteTask.mutate(task.id, {
      onSuccess: () => { setConfirmDelete(null); showToast(`Deleted ${task.code}`, 'success') },
    })
  }

  function handleAddTask() {
    if (!newTask.code || !newTask.name) { showToast('Code and name required', 'error'); return }
    createTask.mutate({
      code: newTask.code,
      name: newTask.name,
      description: newTask.description,
      duration_days: newTask.duration_days,
      budget: newTask.budget,
      resource: newTask.resource,
      predecessors: newTask.predecessors,
    } as Parameters<typeof createTask.mutate>[0], {
      onSuccess: () => {
        setAddTaskOpen(false)
        setNewTask(EMPTY_TASK_FORM)
        showToast('Task added', 'success')
      },
    })
  }

  async function handleAddRelatedTask(parentTask: Task, isChild: boolean) {
    if (!newTask.code || !newTask.name) {
      showToast('Code and name are required', 'error')
      return
    }
    try {
      await createTask.mutateAsync({
        ...newTask,
        ...(isChild ? { parent: parentTask.id } : parentTask.parent ? { parent: parentTask.parent } : {}),
      })
      setAddSiblingFor(null)
      setAddChildFor(null)
      setNewTask(EMPTY_TASK_FORM)
      showToast('Task added', 'success')
    } catch {
      showToast('Could not create task. Check the code and predecessor IDs.', 'error')
    }
  }

  function handleClearBudgets() {
    clearBudgets.mutate(undefined, {
      onSuccess: (r) => {
        setClearOpen(false)
        showToast(`Budget data cleared. ${r.tasks_reset} tasks reset, ${r.expenses_deleted} expenses deleted.`, 'success')
      },
    })
  }

  return (
    <div>
      {/* Header — matching prototype exactly */}
      <PageHeader title="Cost & Budget" icon="💰">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton variant="ghost" onClick={() => navigate('../schedule')}>
            📝 Schedule
          </ActionButton>
          {canEditBudget && (
            <>
              <ActionButton variant="green" onClick={() => setAddTaskOpen(true)}>
                + Add Task
              </ActionButton>
              <ActionButton variant="red" onClick={() => setClearOpen(true)}>
                Clear Budgets
              </ActionButton>
            </>
          )}
        </div>
      </PageHeader>

      {/* Summary cards — prototype: Estimated Cost, Total BOQ, Total Actual, Variance */}
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
        <CostCard label="Estimated Cost" value={formatUGX(projectBudget)} color="#3b82f6" />
        <CostCard label="Total BOQ" value={formatUGX(totals.budget)} color="#f59e0b" />
        <CostCard label="Total Actual" value={formatUGX(totals.actual)} color="#f97316" />
        <CostCard label="Variance" value={formatUGX(totals.variance)} color={totals.variance >= 0 ? '#22c55e' : '#ef4444'} />
      </div>

      {/* Linked hint */}
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-bp-muted">
        <span className="text-blue-400">🔗</span>
        Linked with Schedule & Gantt — edits sync automatically.
      </div>

      {/* Task-centric cost table */}
      <div className="rounded-lg border border-bp-border bg-bp-card" style={{ overflow: 'auto', maxHeight: '60vh' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 950 }}>
          <thead>
            <tr>
              {['ID', 'Activity', 'Pred', 'Start', 'End', 'Budget', 'Actual', 'Variance', 'Expenses', 'Status', ''].map(h => (
                <th key={h} className="sticky top-0 z-10 border-b border-bp-border bg-bp-card px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-bp-accent">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(t => {
              const startVal = t.start_date || ''
              const endVal = t.end_date || ''

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

                  {/* Activity */}
                  <td className="px-2 py-1.5" style={{ maxWidth: 180 }}>
                    <div
                      className="flex items-center gap-1"
                      style={{ cursor: canEditBudget ? 'pointer' : 'default' }}
                      onClick={canEditBudget ? (e) => {
                        e.stopPropagation()
                        setActiveMenu(activeMenu === t.id ? null : t.id)
                      } : undefined}
                    >
                      <span className={t.is_parent ? 'font-bold text-bp-text' : 'text-bp-text'} style={{ paddingLeft: t.is_parent ? 0 : 12 }}>
                        {t.name}
                      </span>
                      {canEditBudget && (
                        <span className="text-[9px] text-bp-muted opacity-60">▼</span>
                      )}
                    </div>
                  </td>

                  {/* Pred */}
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-[11px] text-bp-muted">
                      {t.predecessor_codes.join(',') || '-'}
                    </span>
                  </td>

                  {/* Start date */}
                  <td className="px-2 py-1.5">
                    {canEditBudget ? (
                      <input type="date" defaultValue={startVal}
                        onChange={e => onStartDateChange(t, e.target.value)}
                        style={{ ...sIL, width: 112, fontSize: 10 }} />
                    ) : (
                      <span className="font-mono text-[10px] text-bp-muted">{startVal}</span>
                    )}
                  </td>

                  {/* End date */}
                  <td className="px-2 py-1.5">
                    {canEditBudget ? (
                      <input type="date" defaultValue={endVal}
                        onChange={e => onEndDateChange(t, e.target.value)}
                        style={{ ...sIL, width: 112, fontSize: 10 }} />
                    ) : (
                      <span className="font-mono text-[10px] text-bp-muted">{endVal}</span>
                    )}
                  </td>

                  {/* Budget — inline editable */}
                  <td className="px-2 py-1.5">
                    {canEditBudget ? (
                      <input type="number" defaultValue={t.budget}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0
                          if (v !== t.budget) onBudgetChange(t, v)
                        }}
                        style={{ ...sIL, width: 100 }} />
                    ) : (
                      <span className="font-mono text-xs text-blue-400">{formatUGX(t.budget)}</span>
                    )}
                  </td>

                  {/* Actual — computed */}
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-xs text-bp-muted">{formatUGX(t.actual)}</span>
                  </td>

                  {/* Variance — colored */}
                  <td className="px-2 py-1.5">
                    <span className={`font-mono text-xs font-semibold ${t.variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatUGX(t.variance)}
                    </span>
                  </td>

                  {/* Expenses button — opens modal */}
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => setExpModalTask(t)}
                      style={{
                        background: '#1e293b', border: '1px solid #334155',
                        borderRadius: 6, color: '#e2e8f0', cursor: 'pointer',
                        fontSize: 11, padding: '4px 10px',
                      }}
                    >
                      💰 {t.expense_count}
                    </button>
                  </td>

                  {/* Status dropdown */}
                  <td className="px-2 py-1.5">
                    {canEditBudget ? (
                      <select defaultValue={t.status}
                        onChange={e => onStatusChange(t, e.target.value)}
                        style={{ ...sIL, width: 95, fontSize: 10, cursor: 'pointer' }}>
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
                    {canEditBudget && (
                      <button onClick={() => setConfirmDelete(t)}
                        className="border-none bg-transparent text-base text-red-500 hover:text-red-400"
                        style={{ cursor: 'pointer' }}>×</button>
                    )}
                  </td>
                </tr>
              )
            })}

            {/* TOTALS row */}
            {rows.length > 0 && (
              <tr>
                <td className="border-t-2 border-bp-accent px-2 py-2" />
                <td className="border-t-2 border-bp-accent px-2 py-2 font-bold text-bp-accent">TOTALS</td>
                <td className="border-t-2 border-bp-accent px-2 py-2" />
                <td className="border-t-2 border-bp-accent px-2 py-2" />
                <td className="border-t-2 border-bp-accent px-2 py-2" />
                <td className="border-t-2 border-bp-accent px-2 py-2 font-mono text-xs font-bold text-blue-400">{formatUGX(totals.budget)}</td>
                <td className="border-t-2 border-bp-accent px-2 py-2 font-mono text-xs font-bold text-orange-400">{formatUGX(totals.actual)}</td>
                <td className={`border-t-2 border-bp-accent px-2 py-2 font-mono text-xs font-bold ${totals.variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatUGX(totals.variance)}</td>
                <td className="border-t-2 border-bp-accent px-2 py-2" />
                <td className="border-t-2 border-bp-accent px-2 py-2" />
                <td className="border-t-2 border-bp-accent px-2 py-2" />
              </tr>
            )}

            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-bp-muted">
                  No tasks yet. Add tasks from Schedule & CPM.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expense Modal per task */}
      {expModalTask && (
        <ExpenseModal projectId={pid} task={expModalTask} canEdit={canEditBudget}
          onClose={() => setExpModalTask(null)} />
      )}

      {/* Add Task Modal */}
      {addTaskOpen && (
        <Modal open={addTaskOpen} title="Add New Task" onClose={() => setAddTaskOpen(false)} width={460}>
          <div className="flex flex-col gap-3">
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
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Description</label>
              <input type="text" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                placeholder="Task description" className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
            </div>
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
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Predecessors (comma-separated IDs)</label>
              <input type="text" value={newTask.predecessors} onChange={e => setNewTask(p => ({ ...p, predecessors: e.target.value }))}
                placeholder="e.g. A,B" className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
            </div>
            <ActionButton variant="green" onClick={handleAddTask} disabled={createTask.isPending} style={{ width: '100%' }}>
              {createTask.isPending ? 'Adding...' : 'Add Task'}
            </ActionButton>
          </div>
        </Modal>
      )}

      {/* Activity menu bottom sheet */}
      {activeMenu && (() => {
        const menuTask = (scheduleTasks || []).find((task) => task.id === activeMenu)
        if (!menuTask) return null
        return (
          <div className="fixed bottom-0 left-0 right-0 z-[200] mx-auto max-w-[420px] rounded-t-2xl border border-bp-border bg-bp-bg2 px-5 pb-6 pt-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-bp-border" />
            <div className="mb-3 text-center text-xs text-bp-muted">{menuTask.name}</div>
            {[
              { label: 'Edit Task', color: '#3b82f6', action: () => { setEditTaskOpen(menuTask); setEditProgress(menuTask.progress); setActiveMenu(null) } },
              { label: 'Add Sibling Task', color: '#22c55e', action: () => { setAddSiblingFor(menuTask); setNewTask(EMPTY_TASK_FORM); setActiveMenu(null) } },
              { label: 'Add Child Task', color: '#f59e0b', action: () => { setAddChildFor(menuTask); setNewTask(EMPTY_TASK_FORM); setActiveMenu(null) } },
              { label: 'Remove Task', color: '#ef4444', action: () => { setConfirmDelete(menuTask); setActiveMenu(null) } },
            ].map((option) => (
              <button
                key={option.label}
                onClick={option.action}
                className="block w-full border-0 border-t border-bp-border bg-transparent px-4 py-3 text-center text-[15px]"
                style={{ color: option.color, cursor: 'pointer' }}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={() => setActiveMenu(null)}
              className="mt-2 block w-full rounded-lg border-0 bg-bp-surface px-4 py-3 text-center text-[15px] text-bp-muted"
              style={{ cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )
      })()}

      {editTaskOpen && (
        <Modal open={!!editTaskOpen} title="Edit Task" onClose={() => setEditTaskOpen(null)} width={440}>
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
                  onBlur={e => {
                    const value = parseInt(e.target.value) || 0
                    if (value !== editTaskOpen.duration_days) onUpdate(editTaskOpen, 'duration_days', value)
                  }}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Budget (UGX)</label>
                <input
                  type="number"
                  defaultValue={editTaskOpen.budget}
                  onBlur={e => onUpdate(editTaskOpen, 'budget', e.target.value)}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-bp-muted">Assignee / Resource</label>
              <input
                type="text"
                defaultValue={editTaskOpen.resource}
                onBlur={e => { if (e.target.value !== editTaskOpen.resource) onUpdate(editTaskOpen, 'resource', e.target.value) }}
                className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Progress %</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={editProgress}
                  onChange={e => {
                    const value = parseInt(e.target.value)
                    setEditProgress(value)
                    onUpdate(editTaskOpen, 'progress', value)
                  }}
                  className="w-full accent-bp-accent"
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
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
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
                  setEditTaskOpen(null)
                  showToast('Task updated', 'success')
                }}
                disabled={recalculate.isPending}
              >
                {recalculate.isPending ? 'Recalculating...' : 'Save & Recalculate'}
              </ActionButton>
              <ActionButton variant="ghost" onClick={() => setEditTaskOpen(null)}>Close</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {addSiblingFor && (
        <Modal open={!!addSiblingFor} title={`Add Sibling Task after: ${addSiblingFor.name}`} onClose={() => setAddSiblingFor(null)} width={460}>
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
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Duration</label>
                <input type="number" value={newTask.duration_days} onChange={e => setNewTask(p => ({ ...p, duration_days: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Budget</label>
                <input type="number" value={newTask.budget} onChange={e => setNewTask(p => ({ ...p, budget: e.target.value }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Assignee</label>
                <input type="text" value={newTask.resource} onChange={e => setNewTask(p => ({ ...p, resource: e.target.value }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ActionButton variant="green" onClick={() => handleAddRelatedTask(addSiblingFor, false)}>Add Task</ActionButton>
              <ActionButton variant="ghost" onClick={() => setAddSiblingFor(null)}>Cancel</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {addChildFor && (
        <Modal open={!!addChildFor} title={`Add Child Task under: ${addChildFor.name}`} onClose={() => setAddChildFor(null)} width={460}>
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
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Duration</label>
                <input type="number" value={newTask.duration_days} onChange={e => setNewTask(p => ({ ...p, duration_days: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Budget</label>
                <input type="number" value={newTask.budget} onChange={e => setNewTask(p => ({ ...p, budget: e.target.value }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-bp-muted">Assignee</label>
                <input type="text" value={newTask.resource} onChange={e => setNewTask(p => ({ ...p, resource: e.target.value }))}
                  className="w-full rounded border border-bp-border bg-bp-input px-3 py-2 text-sm text-bp-text" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ActionButton variant="green" onClick={() => handleAddRelatedTask(addChildFor, true)}>Add Task</ActionButton>
              <ActionButton variant="ghost" onClick={() => setAddChildFor(null)}>Cancel</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Task Confirmation */}
      {confirmDelete && (
        <Modal open={!!confirmDelete} title="Delete Task" onClose={() => setConfirmDelete(null)}>
          <p className="mb-4 text-sm text-bp-text">
            Delete task <strong>{confirmDelete.code}: {confirmDelete.name}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</ActionButton>
            <ActionButton variant="red" onClick={() => handleDeleteTask(confirmDelete)}>Delete</ActionButton>
          </div>
        </Modal>
      )}

      {/* Clear Budgets Confirmation */}
      {clearOpen && (
        <Modal open={clearOpen} title="Clear Budget Data" onClose={() => setClearOpen(false)}>
          <p className="mb-2 text-sm text-bp-text">
            This will reset ALL task budgets and remove all expenses.
          </p>
          <p className="mb-4 text-sm text-bp-muted">
            Task names, schedule, predecessors, and progress will be preserved.
          </p>
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setClearOpen(false)}>Cancel</ActionButton>
            <ActionButton variant="red" onClick={handleClearBudgets} disabled={clearBudgets.isPending}>
              {clearBudgets.isPending ? 'Clearing...' : 'Yes, Clear Budgets'}
            </ActionButton>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ---------- Expense Modal per Task ---------- */
function ExpenseModal({ projectId, task, canEdit, onClose }: {
  projectId: string; task: TaskCostRow; canEdit: boolean; onClose: () => void
}) {
  const { data: expenses, isLoading } = useTaskExpenses(projectId, task.id)
  const createExp = useCreateTaskExpense(projectId)
  const deleteExp = useDeleteExpense(projectId)
  const updateExp = useUpdateExpense(projectId)
  const uploadAttachments = useUploadExpenseAttachments(projectId)
  const deleteAttachment = useDeleteExpenseAttachment(projectId)
  const { showToast } = useUIStore()

  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [vendor, setVendor] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [confirmDelete, setConfirmDelete] = useState<ExpenseData | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { description: string; amount: string; expense_date: string }>>({})

  const expList = expenses || []
  const totalSpent = expList.reduce((s, e) => s + parseFloat(e.amount), 0)
  const remaining = task.budget - totalSpent
  const pendingLabel = pendingFiles.length > 0 ? `${pendingFiles.length} file(s) ready` : 'No files selected'

  function getDraft(exp: ExpenseData) {
    return drafts[exp.id] || { description: exp.description, amount: exp.amount, expense_date: exp.expense_date }
  }

  function updateDraft(exp: ExpenseData, field: 'description' | 'amount' | 'expense_date', value: string) {
    const current = getDraft(exp)
    setDrafts((prev) => ({
      ...prev,
      [exp.id]: {
        ...current,
        [field]: value,
      },
    }))
  }

  function commitExpense(exp: ExpenseData, field: 'description' | 'amount' | 'expense_date') {
    const current = getDraft(exp)
    if (field === 'description' && current.description !== exp.description) {
      updateExp.mutate({ id: exp.id, data: { description: current.description } })
    }
    if (field === 'amount' && current.amount !== exp.amount) {
      updateExp.mutate({ id: exp.id, data: { amount: String(parseFloat(current.amount) || 0) } })
    }
    if (field === 'expense_date' && current.expense_date !== exp.expense_date) {
      updateExp.mutate({ id: exp.id, data: { expense_date: current.expense_date } })
    }
  }

  function handleExistingAttachmentUpload(expenseId: string, files: FileList | null) {
    if (!files?.length) return
    uploadAttachments.mutate(
      { expenseId, files: Array.from(files) },
      { onSuccess: () => showToast('Files attached', 'success') },
    )
  }

  function handleAdd() {
    if (!desc || !amount) { showToast('Enter description and amount', 'error'); return }
    createExp.mutate({
      taskId: task.id,
      data: { description: desc, amount: parseFloat(amount), expense_date: date, vendor, files: pendingFiles },
    }, {
      onSuccess: () => {
        setDesc('')
        setAmount('')
        setVendor('')
        setPendingFiles([])
        showToast(`Expense added${pendingFiles.length ? ` (${pendingFiles.length} files attached)` : ''}`, 'success')
      },
    })
  }

  return (
    <Modal open={true} title={`💰 Expenses: ${task.name}`} onClose={onClose} width={620}>
      <div>
        {/* Summary cards */}
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-lg border border-bp-border bg-bp-card p-2.5 text-center">
            <div className="text-[11px] text-bp-muted">Budget</div>
            <div className="font-mono text-sm font-bold text-blue-400">{formatUGX(task.budget)}</div>
          </div>
          <div className="rounded-lg border border-bp-border bg-bp-card p-2.5 text-center">
            <div className="text-[11px] text-bp-muted">Spent</div>
            <div className="font-mono text-sm font-bold text-orange-400">{formatUGX(totalSpent)}</div>
          </div>
          <div className="rounded-lg border border-bp-border bg-bp-card p-2.5 text-center">
            <div className="text-[11px] text-bp-muted">Remaining</div>
            <div className={`font-mono text-sm font-bold ${remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatUGX(remaining)}</div>
          </div>
        </div>

        {/* Expense list */}
        {isLoading ? <LoadingState rows={2} /> : (
          expList.length > 0 ? (
            <div className="mb-4 flex flex-col gap-2">
              {expList.map(exp => (
                <div key={exp.id} className="rounded-lg border border-bp-border bg-[#1e293b] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input type="text" value={getDraft(exp).description}
                      onChange={e => updateDraft(exp, 'description', e.target.value)}
                      onBlur={() => commitExpense(exp, 'description')}
                      className="flex-1 rounded border border-bp-border bg-[#0f172a] px-2 py-1 text-sm font-semibold text-bp-text" />
                    <input type="number" value={getDraft(exp).amount}
                      onChange={e => updateDraft(exp, 'amount', e.target.value)}
                      onBlur={() => commitExpense(exp, 'amount')}
                      className="w-28 rounded border border-bp-border bg-[#0f172a] px-2 py-1 text-right font-mono text-sm text-bp-text" />
                    <input type="date" value={getDraft(exp).expense_date}
                      onChange={e => {
                        updateDraft(exp, 'expense_date', e.target.value)
                        updateExp.mutate({ id: exp.id, data: { expense_date: e.target.value } })
                      }}
                      className="rounded border border-bp-border bg-[#0f172a] px-2 py-1 text-xs text-bp-muted" />
                    {canEdit && (
                      <button onClick={() => setConfirmDelete(exp)}
                        className="border-none bg-transparent text-red-500 hover:text-red-400" style={{ cursor: 'pointer', fontSize: 16 }}>×</button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-bp-muted">📎</span>
                    {exp.attachments.length > 0 ? exp.attachments.map((attachment) => (
                      <div key={attachment.id} className="inline-flex items-center gap-1 rounded border border-blue-400/30 bg-[#0f172a] px-2 py-1 text-[11px]">
                        <span className="text-bp-text">{attachment.original_filename}</span>
                        <span className="text-bp-muted">{attachmentTypeLabel(attachment)} ({formatFileSize(attachment.file_size)})</span>
                        <button
                          onClick={() => window.open(attachment.download_url, '_blank', 'noopener,noreferrer')}
                          className="rounded border-none bg-green-500/15 px-1.5 py-0.5 text-[10px] font-bold text-green-400"
                          style={{ cursor: 'pointer' }}
                        >
                          ⬇
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => deleteAttachment.mutate({ expenseId: exp.id, attachmentId: attachment.id }, { onSuccess: () => showToast('Attachment removed', 'success') })}
                            className="border-none bg-transparent px-0.5 text-[11px] text-red-500"
                            style={{ cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )) : (
                      <span className="text-[10px] italic text-bp-muted">No files attached</span>
                    )}
                    {canEdit && (
                      <label className="cursor-pointer rounded border border-blue-400/35 bg-blue-500/10 px-3 py-1 text-[11px] text-blue-400">
                        📎 Attach Files
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            handleExistingAttachmentUpload(exp.id, e.target.files)
                            e.currentTarget.value = ''
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-4 py-6 text-center text-sm text-bp-muted">No expenses recorded yet.</div>
          )
        )}

        {/* Add expense form */}
        {canEdit && (
          <div className="border-t border-bp-border pt-4">
            <div className="mb-2 text-xs font-bold text-bp-accent">Add New Expense</div>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-bp-muted">Description *</label>
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Cement purchase"
                  className="w-full rounded border border-bp-border bg-bp-input px-2 py-1.5 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-bp-muted">Amount (UGX) *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                  className="w-full rounded border border-bp-border bg-bp-input px-2 py-1.5 text-sm text-bp-text" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-bp-muted">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full rounded border border-bp-border bg-bp-input px-2 py-1.5 text-sm text-bp-text" />
              </div>
            </div>
            <div className="mb-2">
              <label className="mb-1 block text-[11px] text-bp-muted">Attach Receipt Files (optional)</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer rounded border border-blue-400/35 bg-blue-500/10 px-4 py-2 text-xs text-blue-400">
                  📂 Choose Files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
                  />
                </label>
                <span className="text-[11px] text-bp-muted">{pendingLabel}</span>
              </div>
            </div>
            <ActionButton variant="accent" onClick={handleAdd} disabled={createExp.isPending} style={{ width: '100%' }}>
              {createExp.isPending ? 'Adding...' : '+ Add Expense'}
            </ActionButton>
          </div>
        )}
      </div>
      {confirmDelete && (
        <Modal open={true} title="Delete Expense" onClose={() => setConfirmDelete(null)} width={420}>
          <p className="mb-4 text-sm text-bp-text">
            Delete <strong>{confirmDelete.description}</strong> ({formatUGX(parseFloat(confirmDelete.amount))})?
          </p>
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</ActionButton>
            <ActionButton
              variant="red"
              onClick={() => deleteExp.mutate(confirmDelete.id, {
                onSuccess: () => {
                  setConfirmDelete(null)
                  showToast('Deleted', 'success')
                },
              })}
            >
              Delete
            </ActionButton>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
