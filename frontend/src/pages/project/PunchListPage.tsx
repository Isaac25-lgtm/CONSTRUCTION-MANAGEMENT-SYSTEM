import { useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  PageHeader, DataTable, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState, FilterBar, FilterChip,
} from '../../components/ui'
import {
  usePunchItems, useCreatePunchItem, useUpdatePunchItem, useDeletePunchItem,
  type PunchItemData,
} from '../../hooks/useFieldOps'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'
import { PUNCH_STATUS, PUNCH_PRIORITY, statusColor } from '../../types/fieldOpsChoices'

export function PunchListPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: items, isLoading } = usePunchItems(projectId)
  const { canEditFieldOps } = useProjectPermissions(projectId)
  const deletePunch = useDeletePunchItem(pid)
  const { showToast } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<PunchItemData | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')

  const list = useMemo(() => {
    let data = items || []
    if (filterStatus) data = data.filter(p => p.status === filterStatus)
    if (filterPriority) data = data.filter(p => p.priority === filterPriority)
    return data
  }, [items, filterStatus, filterPriority])

  if (isLoading) return <LoadingState rows={5} />

  const columns = [
    { key: 'title', header: 'Title', render: (p: PunchItemData) => <span className="font-medium text-bp-text">{p.title}</span> },
    { key: 'location', header: 'Location', render: (p: PunchItemData) => <span className="text-xs text-bp-muted">{p.location || '-'}</span> },
    { key: 'priority', header: 'Priority', render: (p: PunchItemData) => <StatusBadge text={p.priority_display} color={statusColor(p.priority)} /> },
    { key: 'status', header: 'Status', render: (p: PunchItemData) => <StatusBadge text={p.status_display} color={statusColor(p.status)} /> },
    { key: 'assigned', header: 'Assigned To', render: (p: PunchItemData) => <span className="text-xs text-bp-muted">{p.assigned_to_name || '-'}</span> },
    { key: 'due', header: 'Due Date', render: (p: PunchItemData) => <span className="text-xs text-bp-muted">{p.due_date || '-'}</span> },
    ...(canEditFieldOps ? [
      { key: 'edit', header: '', width: '30px', render: (p: PunchItemData) => <button onClick={() => setEditItem(p)} className="cursor-pointer border-none bg-transparent text-bp-info text-sm" title="Edit">&#9998;</button> },
      { key: 'del', header: '', width: '30px', render: (p: PunchItemData) => <button onClick={() => { if (confirm(`Delete "${p.title}"?`)) { deletePunch.mutate(p.id); showToast('Item deleted', 'success') } }} className="cursor-pointer border-none bg-transparent text-bp-danger text-sm">&#10005;</button> },
    ] : []),
  ]

  return (
    <div>
      <PageHeader title="Punch List" icon="&#128204;" count={(items || []).length}>
        {canEditFieldOps && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ Add Item</ActionButton>
        )}
      </PageHeader>

      <FilterBar>
        <FilterChip label="All Status" active={!filterStatus} onClick={() => setFilterStatus('')} />
        {PUNCH_STATUS.map(s => (
          <FilterChip key={s.value} label={s.label} active={filterStatus === s.value} onClick={() => setFilterStatus(filterStatus === s.value ? '' : s.value)} count={(items || []).filter(p => p.status === s.value).length} />
        ))}
        <span className="mx-1 text-bp-border">|</span>
        <FilterChip label="All Priorities" active={!filterPriority} onClick={() => setFilterPriority('')} />
        {PUNCH_PRIORITY.map(p => (
          <FilterChip key={p.value} label={p.label} active={filterPriority === p.value} onClick={() => setFilterPriority(filterPriority === p.value ? '' : p.value)} count={(items || []).filter(i => i.priority === p.value).length} />
        ))}
      </FilterBar>

      {list.length > 0 ? (
        <DataTable columns={columns} data={list} emptyText="No punch items" />
      ) : (
        <EmptyState icon="&#128204;" title="No punch items" description="Add punch list items to track deficiencies and outstanding work." />
      )}

      {showAdd && <AddPunchItemModal projectId={pid} onClose={() => setShowAdd(false)} />}
      {editItem && <EditPunchItemModal projectId={pid} item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

function AddPunchItemModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState<string>(PUNCH_PRIORITY[1].value)
  const [status, setStatus] = useState<string>(PUNCH_STATUS[0].value)
  const [dueDate, setDueDate] = useState('')
  const create = useCreatePunchItem(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Add Punch Item" width={440}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Paint touch-up in Room 201" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Block A, Floor 2" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PUNCH_PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {PUNCH_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!title) { showToast('Title required', 'warning'); return }
          await create.mutateAsync({ title, description, location, priority, status, due_date: dueDate || undefined })
          showToast('Punch item added', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add Item'}</ActionButton>
      </div>
    </Modal>
  )
}

function EditPunchItemModal({ projectId, item, onClose }: { projectId: string; item: PunchItemData; onClose: () => void }) {
  const [title, setTitle] = useState<string>(item.title)
  const [description, setDescription] = useState<string>(item.description)
  const [location, setLocation] = useState<string>(item.location)
  const [priority, setPriority] = useState<string>(item.priority)
  const [status, setStatus] = useState<string>(item.status)
  const [dueDate, setDueDate] = useState(item.due_date || '')
  const update = useUpdatePunchItem(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title={`Edit Punch Item`} width={440}>
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
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PUNCH_PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {PUNCH_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <ActionButton variant="accent" className="!w-full !mt-1" onClick={async () => {
          const payload: Record<string, unknown> = { title, description, location, priority, status, due_date: dueDate || null }
          if (status === 'completed' && item.status !== 'completed') {
            payload.closed_at = new Date().toISOString()
          }
          await update.mutateAsync({ id: item.id, data: payload })
          showToast('Punch item updated', 'success'); onClose()
        }} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</ActionButton>
      </div>
    </Modal>
  )
}
