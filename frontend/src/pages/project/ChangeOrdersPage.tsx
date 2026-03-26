import { useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  PageHeader, DataTable, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState, FilterBar, FilterChip,
} from '../../components/ui'
import {
  useChangeOrders, useCreateChangeOrder, useUpdateChangeOrder, useDeleteChangeOrder,
  type ChangeOrderData,
} from '../../hooks/useFieldOps'
import { useProjectMembers } from '../../hooks/useProjects'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'
import { formatUGX } from '../../lib/formatters'
import { CO_STATUS, CO_CATEGORY, statusColor } from '../../types/fieldOpsChoices'

export function ChangeOrdersPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: changeOrders, isLoading } = useChangeOrders(projectId)
  const { canEditChanges } = useProjectPermissions(projectId)
  const deleteCO = useDeleteChangeOrder(pid)
  const { showToast } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<ChangeOrderData | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  const list = useMemo(() => {
    let items = changeOrders || []
    if (filterStatus) items = items.filter(c => c.status === filterStatus)
    if (filterCategory) items = items.filter(c => c.category === filterCategory)
    return items
  }, [changeOrders, filterStatus, filterCategory])

  if (isLoading) return <LoadingState rows={5} />

  const columns = [
    { key: 'code', header: 'Code', width: '80px', render: (c: ChangeOrderData) => <span className="font-mono text-xs text-bp-accent">{c.code}</span> },
    { key: 'title', header: 'Title', render: (c: ChangeOrderData) => <span className="font-medium text-bp-text">{c.title}</span> },
    { key: 'category', header: 'Category', render: (c: ChangeOrderData) => <span className="text-xs text-bp-muted">{c.category_display}</span> },
    { key: 'cost', header: 'Cost Impact', render: (c: ChangeOrderData) => {
      const val = parseFloat(c.cost_impact)
      return <span className={`font-mono text-xs font-semibold ${val > 0 ? 'text-bp-danger' : val < 0 ? 'text-bp-success' : 'text-bp-muted'}`}>{formatUGX(val)}</span>
    }},
    { key: 'time', header: 'Time (days)', width: '80px', render: (c: ChangeOrderData) => (
      <span className={`font-mono text-xs ${c.time_impact_days > 0 ? 'text-bp-danger' : 'text-bp-muted'}`}>{c.time_impact_days > 0 ? `+${c.time_impact_days}` : c.time_impact_days}</span>
    )},
    { key: 'status', header: 'Status', render: (c: ChangeOrderData) => <StatusBadge text={c.status_display} color={statusColor(c.status)} /> },
    { key: 'requested', header: 'Requested By', render: (c: ChangeOrderData) => <span className="text-xs text-bp-muted">{c.requested_by_name || '-'}</span> },
    { key: 'approved', header: 'Approved By', render: (c: ChangeOrderData) => <span className="text-xs text-bp-muted">{c.approved_by_name || '-'}</span> },
    ...(canEditChanges ? [
      { key: 'edit', header: '', width: '30px', render: (c: ChangeOrderData) => <button onClick={() => setEditItem(c)} className="cursor-pointer border-none bg-transparent text-bp-info text-sm" title="Edit">&#9998;</button> },
      { key: 'del', header: '', width: '30px', render: (c: ChangeOrderData) => <button onClick={() => { if (confirm(`Delete "${c.code}"?`)) { deleteCO.mutate(c.id); showToast('Change order deleted', 'success') } }} className="cursor-pointer border-none bg-transparent text-bp-danger text-sm">&#10005;</button> },
    ] : []),
  ]

  return (
    <div>
      <PageHeader title="Change Orders" icon="&#128221;" count={(changeOrders || []).length}>
        {canEditChanges && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ New Change Order</ActionButton>
        )}
      </PageHeader>

      <FilterBar>
        <FilterChip label="All Status" active={!filterStatus} onClick={() => setFilterStatus('')} />
        {CO_STATUS.map(s => (
          <FilterChip key={s.value} label={s.label} active={filterStatus === s.value} onClick={() => setFilterStatus(filterStatus === s.value ? '' : s.value)} count={(changeOrders || []).filter(c => c.status === s.value).length} />
        ))}
        <span className="mx-1 text-bp-border">|</span>
        <FilterChip label="All Categories" active={!filterCategory} onClick={() => setFilterCategory('')} />
        {CO_CATEGORY.map(c => (
          <FilterChip key={c.value} label={c.label} active={filterCategory === c.value} onClick={() => setFilterCategory(filterCategory === c.value ? '' : c.value)} count={(changeOrders || []).filter(co => co.category === c.value).length} />
        ))}
      </FilterBar>

      {list.length > 0 ? (
        <DataTable columns={columns} data={list} emptyText="No change orders" />
      ) : (
        <EmptyState icon="&#128221;" title="No change orders" description="Create change orders to track scope, cost, and schedule changes." />
      )}

      {showAdd && <AddChangeOrderModal projectId={pid} onClose={() => setShowAdd(false)} />}
      {editItem && <EditChangeOrderModal projectId={pid} co={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

function AddChangeOrderModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(CO_CATEGORY[0].value)
  const [status, setStatus] = useState<string>(CO_STATUS[0].value)
  const [reason, setReason] = useState('')
  const [costImpact, setCostImpact] = useState('')
  const [timeDays, setTimeDays] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const { data: members } = useProjectMembers(projectId)
  const create = useCreateChangeOrder(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="New Change Order" width={480}>
      <div className="grid gap-3">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Code *</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CO-01" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Change order title" required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the change..." rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CO_CATEGORY.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {CO_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for change" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Cost Impact (UGX)</label>
            <input type="number" value={costImpact} onChange={(e) => setCostImpact(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Time Impact (days)</label>
            <input type="number" value={timeDays} onChange={(e) => setTimeDays(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Approved By</label>
          <select value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)}>
            <option value="">-- Select Approver --</option>
            {(members || []).map(m => (
              <option key={m.user} value={m.user}>{m.user_name} ({m.role_display || m.role})</option>
            ))}
          </select>
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!code || !title) { showToast('Code and title required', 'warning'); return }
          await create.mutateAsync({
            code,
            title,
            description,
            category,
            status,
            reason,
            cost_impact: costImpact || '0',
            time_impact_days: parseInt(timeDays) || 0,
            approved_by: approvedBy || undefined,
          })
          showToast('Change order created', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create Change Order'}</ActionButton>
      </div>
    </Modal>
  )
}

function EditChangeOrderModal({ projectId, co, onClose }: { projectId: string; co: ChangeOrderData; onClose: () => void }) {
  const [title, setTitle] = useState<string>(co.title)
  const [description, setDescription] = useState<string>(co.description)
  const [category, setCategory] = useState<string>(co.category)
  const [status, setStatus] = useState<string>(co.status)
  const [reason, setReason] = useState<string>(co.reason)
  const [costImpact, setCostImpact] = useState<string>(co.cost_impact)
  const [timeDays, setTimeDays] = useState(String(co.time_impact_days))
  const [approvedBy, setApprovedBy] = useState(co.approved_by || '')
  const { data: members } = useProjectMembers(projectId)
  const update = useUpdateChangeOrder(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title={`Edit ${co.code}`} width={480}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CO_CATEGORY.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {CO_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Cost Impact (UGX)</label>
            <input type="number" value={costImpact} onChange={(e) => setCostImpact(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Time Impact (days)</label>
            <input type="number" value={timeDays} onChange={(e) => setTimeDays(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Approved By</label>
          <select value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)}>
            <option value="">-- Select Approver --</option>
            {(members || []).map(m => (
              <option key={m.user} value={m.user}>{m.user_name} ({m.role_display || m.role})</option>
            ))}
          </select>
        </div>
        <ActionButton variant="accent" className="!w-full !mt-1" onClick={async () => {
          await update.mutateAsync({ id: co.id, data: { title, description, category, status, reason, cost_impact: costImpact, time_impact_days: parseInt(timeDays) || 0, approved_by: approvedBy || null } })
          showToast('Change order updated', 'success'); onClose()
        }} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</ActionButton>
      </div>
    </Modal>
  )
}
