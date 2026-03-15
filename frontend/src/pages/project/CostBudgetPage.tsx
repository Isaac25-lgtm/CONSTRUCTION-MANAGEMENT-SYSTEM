import { useParams } from 'react-router-dom'
import { useState } from 'react'
import {
  PageHeader, CostCard, DataTable, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState, Tabs,
} from '../../components/ui'
import { useBudgetLines, useExpenses, useCostSummary, useCreateBudgetLine, useCreateExpense, useDeleteBudgetLine, useDeleteExpense, useUpdateBudgetLine, useUpdateExpense, type BudgetLineData, type ExpenseData } from '../../hooks/useCost'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'
import { formatUGX } from '../../lib/formatters'

/**
 * Cost & Budget page -- matching prototype renderBudget().
 *
 * Shows: cost summary cards, budget lines table with variance,
 * expenses table, create budget line/expense modals.
 */

export function CostBudgetPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: summary, isLoading: loadingSummary } = useCostSummary(projectId)
  const { data: lines, isLoading: loadingLines } = useBudgetLines(projectId)
  const { data: expenses, isLoading: loadingExpenses } = useExpenses(projectId)
  const { canEditBudget } = useProjectPermissions(projectId)
  const deleteBL = useDeleteBudgetLine(pid)
  const deleteExp = useDeleteExpense(pid)
  const { showToast } = useUIStore()
  const [tab, setTab] = useState('budget')
  const [showAddLine, setShowAddLine] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [editLine, setEditLine] = useState<BudgetLineData | null>(null)
  const [editExpense, setEditExpense] = useState<ExpenseData | null>(null)

  if (loadingSummary) return <LoadingState rows={4} />

  const budgetTabs = [
    { key: 'budget', label: 'Budget Lines', icon: '📊' },
    { key: 'expenses', label: 'Expenses', icon: '💰' },
  ]

  const lineColumns = [
    { key: 'code', header: 'Code', width: '70px', render: (l: BudgetLineData) => <span className="font-mono text-xs text-bp-accent">{l.code}</span> },
    { key: 'name', header: 'Budget Item', render: (l: BudgetLineData) => <span className="font-medium text-bp-text">{l.name}</span> },
    { key: 'cat', header: 'Category', render: (l: BudgetLineData) => <span className="text-xs text-bp-muted">{l.category_display}</span> },
    { key: 'budget', header: 'Budget', render: (l: BudgetLineData) => <span className="font-mono text-xs text-bp-info">{formatUGX(parseFloat(l.budget_amount))}</span> },
    { key: 'actual', header: 'Actual', render: (l: BudgetLineData) => <span className="font-mono text-xs text-bp-warning">{formatUGX(parseFloat(l.actual_amount))}</span> },
    { key: 'variance', header: 'Variance', render: (l: BudgetLineData) => { const v = parseFloat(l.variance); return <span className={`font-mono text-xs font-semibold ${v >= 0 ? 'text-bp-success' : 'text-bp-danger'}`}>{formatUGX(v)}</span> } },
    { key: 'status', header: 'Status', render: (l: BudgetLineData) => <StatusBadge text={l.status_display} color={l.status === 'approved' ? '#22c55e' : '#94a3b8'} /> },
    ...(canEditBudget ? [
      { key: 'edit', header: '', width: '30px', render: (l: BudgetLineData) => <button onClick={() => setEditLine(l)} className="cursor-pointer border-none bg-transparent text-bp-info text-sm" title="Edit">✏️</button> },
      { key: 'del', header: '', width: '30px', render: (l: BudgetLineData) => <button onClick={() => { if (confirm(`Delete ${l.code}?`)) { deleteBL.mutate(l.id); showToast('Deleted', 'success') } }} className="cursor-pointer border-none bg-transparent text-bp-danger text-sm">✕</button> },
    ] : []),
  ]

  const expenseColumns = [
    { key: 'date', header: 'Date', width: '90px', render: (e: ExpenseData) => <span className="text-xs text-bp-muted">{e.expense_date}</span> },
    { key: 'desc', header: 'Description', render: (e: ExpenseData) => <span className="text-bp-text">{e.description}</span> },
    { key: 'vendor', header: 'Vendor', render: (e: ExpenseData) => <span className="text-xs text-bp-muted">{e.vendor || '-'}</span> },
    { key: 'budget_line', header: 'Budget Line', render: (e: ExpenseData) => <span className="text-xs text-bp-muted">{e.budget_line_name || '-'}</span> },
    { key: 'amount', header: 'Amount', render: (e: ExpenseData) => <span className="font-mono text-xs font-semibold text-bp-warning">{formatUGX(parseFloat(e.amount))}</span> },
    { key: 'status', header: 'Status', render: (e: ExpenseData) => <StatusBadge text={e.status_display} color={e.status === 'verified' ? '#22c55e' : '#3b82f6'} /> },
    ...(canEditBudget ? [
      { key: 'edit', header: '', width: '30px', render: (e: ExpenseData) => <button onClick={() => setEditExpense(e)} className="cursor-pointer border-none bg-transparent text-bp-info text-sm" title="Edit">✏️</button> },
      { key: 'del', header: '', width: '30px', render: (e: ExpenseData) => <button onClick={() => { if (confirm(`Delete expense?`)) { deleteExp.mutate(e.id); showToast('Deleted', 'success') } }} className="cursor-pointer border-none bg-transparent text-bp-danger text-sm">✕</button> },
    ] : []),
  ]

  return (
    <div>
      <PageHeader title="Cost & Budget" icon="💰">
        {canEditBudget && (
          <>
            <ActionButton variant="green" size="sm" onClick={() => setShowAddLine(true)}>+ Budget Line</ActionButton>
            <ActionButton variant="blue" size="sm" onClick={() => setShowAddExpense(true)}>+ Expense</ActionButton>
          </>
        )}
      </PageHeader>

      {/* Cost summary cards */}
      {summary && (
        <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
          <CostCard label="Total Budget" value={formatUGX(summary.total_budget)} color="#3b82f6" />
          <CostCard label="Total Actual" value={formatUGX(summary.total_actual)} color="#f97316" />
          <CostCard label="Variance" value={formatUGX(summary.variance)} color={summary.variance >= 0 ? '#22c55e' : '#ef4444'} />
          <CostCard label="Utilisation" value={`${summary.budget_utilisation.toFixed(1)}%`} color={summary.is_over_budget ? '#ef4444' : '#f59e0b'} />
        </div>
      )}

      <Tabs tabs={budgetTabs} active={tab} onChange={setTab} />

      {tab === 'budget' && (
        loadingLines ? <LoadingState rows={4} /> :
        (lines && lines.length > 0) ? (
          <DataTable columns={lineColumns} data={lines} emptyText="No budget lines" />
        ) : (
          <EmptyState icon="📊" title="No budget lines" description="Add budget lines to start tracking costs." />
        )
      )}

      {tab === 'expenses' && (
        loadingExpenses ? <LoadingState rows={4} /> :
        (expenses && expenses.length > 0) ? (
          <DataTable columns={expenseColumns} data={expenses} emptyText="No expenses" />
        ) : (
          <EmptyState icon="💰" title="No expenses recorded" description="Record expenses to track actual spending." />
        )
      )}

      {showAddLine && <AddBudgetLineModal projectId={pid} onClose={() => setShowAddLine(false)} />}
      {showAddExpense && <AddExpenseModal projectId={pid} budgetLines={lines || []} onClose={() => setShowAddExpense(false)} />}
      {editLine && <EditBudgetLineModal projectId={pid} line={editLine} onClose={() => setEditLine(null)} />}
      {editExpense && <EditExpenseModal projectId={pid} expense={editExpense} budgetLines={lines || []} onClose={() => setEditExpense(null)} />}
    </div>
  )
}

function AddBudgetLineModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [amount, setAmount] = useState('')
  const create = useCreateBudgetLine(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Add Budget Line" width={420}>
      <div className="grid gap-3">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PREL" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Preliminaries" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {["preliminaries","substructure","superstructure","roofing","mep","finishes","fittings","external","earthworks","drainage","pavement","specialist","equipment","labour","professional","contingency","other"].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Budget Amount (UGX)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!code || !name) { showToast('Code and name required', 'warning'); return }
          await create.mutateAsync({ code, name, category, budget_amount: parseFloat(amount) || 0 })
          showToast('Budget line added', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add Budget Line'}</ActionButton>
      </div>
    </Modal>
  )
}

function AddExpenseModal({ projectId, budgetLines, onClose }: { projectId: string; budgetLines: BudgetLineData[]; onClose: () => void }) {
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [vendor, setVendor] = useState('')
  const [blId, setBlId] = useState('')
  const create = useCreateExpense(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Record Expense" width={420}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description *</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Cement purchase" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Amount (UGX) *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Vendor</label>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Supplier name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Budget Line</label>
            <select value={blId} onChange={(e) => setBlId(e.target.value)}>
              <option value="">-- None --</option>
              {budgetLines.map(bl => <option key={bl.id} value={bl.id}>{bl.code} - {bl.name}</option>)}
            </select>
          </div>
        </div>
        <ActionButton variant="blue" className="!w-full !mt-1" onClick={async () => {
          if (!desc || !amount) { showToast('Description and amount required', 'warning'); return }
          await create.mutateAsync({ description: desc, amount: parseFloat(amount), expense_date: date, vendor, budget_line: blId || undefined })
          showToast('Expense recorded', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Recording...' : 'Record Expense'}</ActionButton>
      </div>
    </Modal>
  )
}

function EditBudgetLineModal({ projectId, line, onClose }: { projectId: string; line: BudgetLineData; onClose: () => void }) {
  const [name, setName] = useState(line.name)
  const [amount, setAmount] = useState(line.budget_amount)
  const [category, setCategory] = useState(line.category)
  const [status, setStatus] = useState(line.status)
  const update = useUpdateBudgetLine(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title={`Edit ${line.code}`} width={420}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Budget Amount (UGX)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {["preliminaries","substructure","superstructure","roofing","mep","finishes","fittings","external","earthworks","drainage","pavement","specialist","equipment","labour","professional","contingency","other"].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="revised">Revised</option>
          </select>
        </div>
        <ActionButton variant="accent" className="!w-full !mt-1" onClick={async () => {
          await update.mutateAsync({ id: line.id, data: { name, budget_amount: amount, category, status } })
          showToast('Budget line updated', 'success'); onClose()
        }} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</ActionButton>
      </div>
    </Modal>
  )
}

function EditExpenseModal({ projectId, expense, budgetLines, onClose }: { projectId: string; expense: ExpenseData; budgetLines: BudgetLineData[]; onClose: () => void }) {
  const [desc, setDesc] = useState(expense.description)
  const [amount, setAmount] = useState(expense.amount)
  const [expDate, setExpDate] = useState(expense.expense_date)
  const [vendor, setVendor] = useState(expense.vendor)
  const [blId, setBlId] = useState(expense.budget_line || '')
  const update = useUpdateExpense(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Edit Expense" width={420}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Amount (UGX)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Date</label>
            <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Vendor</label>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Budget Line</label>
            <select value={blId} onChange={(e) => setBlId(e.target.value)}>
              <option value="">-- None --</option>
              {budgetLines.map(bl => <option key={bl.id} value={bl.id}>{bl.code} - {bl.name}</option>)}
            </select>
          </div>
        </div>
        <ActionButton variant="accent" className="!w-full !mt-1" onClick={async () => {
          await update.mutateAsync({ id: expense.id, data: { description: desc, amount, expense_date: expDate, vendor, budget_line: blId || null } })
          showToast('Expense updated', 'success'); onClose()
        }} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</ActionButton>
      </div>
    </Modal>
  )
}
