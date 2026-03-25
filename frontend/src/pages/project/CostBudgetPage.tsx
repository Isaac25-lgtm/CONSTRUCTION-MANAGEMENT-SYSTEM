import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PageHeader, CostCard, ActionButton, Modal, LoadingState,
} from '../../components/ui'
import {
  useTaskCostTable, useTaskExpenses, useCreateTaskExpense,
  useDeleteExpense, useUpdateExpense, useClearBudgets,
  type TaskCostRow,
} from '../../hooks/useCost'
import { useUpdateTask, useDeleteTask, useCreateTask } from '../../hooks/useSchedule'
import { useProject } from '../../hooks/useProjects'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'
import { formatUGX } from '../../lib/formatters'

/* ---------- helpers ---------- */
function toISO(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'delayed', label: 'Delayed' },
]

const sIL: React.CSSProperties = {
  background: 'var(--bg-secondary, #1e293b)',
  border: '1px solid var(--border, #334155)',
  borderRadius: 4, color: 'inherit', padding: '2px 4px',
  fontSize: 11, fontFamily: 'ui-monospace, monospace', textAlign: 'center',
}

export function CostBudgetPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const navigate = useNavigate()
  const { data: costData, isLoading } = useTaskCostTable(projectId)
  const { data: project } = useProject(projectId)
  const { canEditBudget } = useProjectPermissions(projectId)
  const updateTask = useUpdateTask(pid)
  const deleteTask = useDeleteTask(pid)
  const createTask = useCreateTask(pid)
  const clearBudgets = useClearBudgets(pid)
  const { showToast } = useUIStore()

  const [expModalTask, setExpModalTask] = useState<TaskCostRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TaskCostRow | null>(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [newTask, setNewTask] = useState({ code: '', name: '', duration_days: 5, budget: '0', resource: '' })

  if (isLoading) return <LoadingState rows={6} />

  const rows = costData?.rows || []
  const totals = costData?.totals || { budget: 0, actual: 0, variance: 0 }
  const projectBudget = costData?.project_budget || 0
  const pStart = project?.start_date ? new Date(project.start_date) : new Date()

  function onBudgetChange(task: TaskCostRow, val: number) {
    updateTask.mutate({ taskId: task.id, data: { budget: String(val) } })
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

  function handleDeleteTask(task: TaskCostRow) {
    deleteTask.mutate(task.id, {
      onSuccess: () => { setConfirmDelete(null); showToast(`Deleted ${task.code}`, 'success') },
    })
  }

  function handleAddTask() {
    if (!newTask.code || !newTask.name) { showToast('Code and name required', 'error'); return }
    createTask.mutate({
      code: newTask.code, name: newTask.name,
      duration_days: newTask.duration_days, budget: newTask.budget, resource: newTask.resource,
    } as Parameters<typeof createTask.mutate>[0], {
      onSuccess: () => {
        setAddTaskOpen(false)
        setNewTask({ code: '', name: '', duration_days: 5, budget: '0', resource: '' })
        showToast('Task added', 'success')
      },
    })
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
                    <span className={t.is_parent ? 'font-bold text-bp-text' : 'text-bp-text'} style={{ paddingLeft: t.is_parent ? 0 : 12 }}>
                      {t.name}
                    </span>
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
        <Modal open={addTaskOpen} title="Add New Task" onClose={() => setAddTaskOpen(false)}>
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
            <ActionButton variant="green" onClick={handleAddTask} disabled={createTask.isPending} style={{ width: '100%' }}>
              {createTask.isPending ? 'Adding...' : 'Add Task'}
            </ActionButton>
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
  const { showToast } = useUIStore()

  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [vendor, setVendor] = useState('')

  const expList = expenses || []
  const totalSpent = expList.reduce((s, e) => s + parseFloat(e.amount), 0)
  const remaining = task.budget - totalSpent

  function handleAdd() {
    if (!desc || !amount) { showToast('Enter description and amount', 'error'); return }
    createExp.mutate({
      taskId: task.id,
      data: { description: desc, amount: parseFloat(amount), expense_date: date, vendor },
    }, {
      onSuccess: () => { setDesc(''); setAmount(''); setVendor(''); showToast('Expense added', 'success') },
    })
  }

  return (
    <Modal open={true} title={`Expenses: ${task.name}`} onClose={onClose}>
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
                  <div className="flex items-center gap-2">
                    <input type="text" defaultValue={exp.description}
                      onBlur={e => { if (e.target.value !== exp.description) updateExp.mutate({ id: exp.id, data: { description: e.target.value } }) }}
                      className="flex-1 rounded border border-bp-border bg-[#0f172a] px-2 py-1 text-sm font-semibold text-bp-text" />
                    <input type="number" defaultValue={exp.amount}
                      onBlur={e => { const v = parseFloat(e.target.value) || 0; if (String(v) !== exp.amount) updateExp.mutate({ id: exp.id, data: { amount: String(v) } }) }}
                      className="w-28 rounded border border-bp-border bg-[#0f172a] px-2 py-1 text-right font-mono text-sm text-bp-text" />
                    <input type="date" defaultValue={exp.expense_date}
                      onChange={e => updateExp.mutate({ id: exp.id, data: { expense_date: e.target.value } })}
                      className="rounded border border-bp-border bg-[#0f172a] px-2 py-1 text-xs text-bp-muted" />
                    {canEdit && (
                      <button onClick={() => { deleteExp.mutate(exp.id); showToast('Deleted', 'success') }}
                        className="border-none bg-transparent text-red-500 hover:text-red-400" style={{ cursor: 'pointer', fontSize: 16 }}>×</button>
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
            <ActionButton variant="accent" onClick={handleAdd} disabled={createExp.isPending} style={{ width: '100%' }}>
              {createExp.isPending ? 'Adding...' : '+ Add Expense'}
            </ActionButton>
          </div>
        )}
      </div>
    </Modal>
  )
}
