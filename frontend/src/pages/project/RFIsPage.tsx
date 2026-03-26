import { useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  PageHeader, DataTable, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState, FilterBar, FilterChip,
} from '../../components/ui'
import {
  useRFIs, useCreateRFI, useUpdateRFI, useDeleteRFI,
  type RFIData,
} from '../../hooks/useFieldOps'
import { useProjectMembers } from '../../hooks/useProjects'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'
import { RFI_STATUS, RFI_PRIORITY, statusColor } from '../../types/fieldOpsChoices'

export function RFIsPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: rfis, isLoading } = useRFIs(projectId)
  const { canEditRFIs } = useProjectPermissions(projectId)
  const deleteRFI = useDeleteRFI(pid)
  const { showToast } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<RFIData | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')

  const list = useMemo(() => {
    let items = rfis || []
    if (filterStatus) items = items.filter(r => r.status === filterStatus)
    if (filterPriority) items = items.filter(r => r.priority === filterPriority)
    return items
  }, [rfis, filterStatus, filterPriority])

  if (isLoading) return <LoadingState rows={5} />

  const columns = [
    { key: 'code', header: 'Code', width: '70px', render: (r: RFIData) => <span className="font-mono text-xs text-bp-accent">{r.code}</span> },
    { key: 'subject', header: 'Subject', render: (r: RFIData) => <span className="font-medium text-bp-text">{r.subject}</span> },
    { key: 'raised', header: 'Raised By', render: (r: RFIData) => <span className="text-xs text-bp-muted">{r.raised_by_name || '-'}</span> },
    { key: 'assigned', header: 'Assigned To', render: (r: RFIData) => <span className="text-xs text-bp-muted">{r.assigned_to_name || '-'}</span> },
    { key: 'priority', header: 'Priority', render: (r: RFIData) => <StatusBadge text={r.priority_display} color={statusColor(r.priority)} /> },
    { key: 'date_raised', header: 'Raised', render: (r: RFIData) => <span className="text-xs text-bp-muted">{r.date_raised}</span> },
    { key: 'due', header: 'Due', render: (r: RFIData) => (
      <span className={`text-xs ${r.is_overdue ? 'text-bp-danger font-bold' : 'text-bp-muted'}`}>{r.due_date || '-'}</span>
    )},
    { key: 'status', header: 'Status', render: (r: RFIData) => <StatusBadge text={r.status_display} color={statusColor(r.status)} /> },
    ...(canEditRFIs ? [
      { key: 'edit', header: '', width: '30px', render: (r: RFIData) => <button onClick={() => setEditItem(r)} className="cursor-pointer border-none bg-transparent text-bp-info text-sm" title="Edit">&#9998;</button> },
      { key: 'del', header: '', width: '30px', render: (r: RFIData) => <button onClick={() => { if (confirm(`Delete RFI "${r.code}"?`)) { deleteRFI.mutate(r.id); showToast('RFI deleted', 'success') } }} className="cursor-pointer border-none bg-transparent text-bp-danger text-sm">&#10005;</button> },
    ] : []),
  ]

  return (
    <div>
      <PageHeader title="RFIs" icon="&#128203;" count={(rfis || []).length}>
        {canEditRFIs && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ New RFI</ActionButton>
        )}
      </PageHeader>

      <FilterBar>
        <FilterChip label="All Status" active={!filterStatus} onClick={() => setFilterStatus('')} />
        {RFI_STATUS.map(s => (
          <FilterChip key={s.value} label={s.label} active={filterStatus === s.value} onClick={() => setFilterStatus(filterStatus === s.value ? '' : s.value)} count={(rfis || []).filter(r => r.status === s.value).length} />
        ))}
        <span className="mx-1 text-bp-border">|</span>
        <FilterChip label="All Priorities" active={!filterPriority} onClick={() => setFilterPriority('')} />
        {RFI_PRIORITY.map(p => (
          <FilterChip key={p.value} label={p.label} active={filterPriority === p.value} onClick={() => setFilterPriority(filterPriority === p.value ? '' : p.value)} count={(rfis || []).filter(r => r.priority === p.value).length} />
        ))}
      </FilterBar>

      {list.length > 0 ? (
        <DataTable columns={columns} data={list} emptyText="No RFIs" />
      ) : (
        <EmptyState icon="&#128203;" title="No RFIs" description="Create RFIs to request information from stakeholders." />
      )}

      {showAdd && <AddRFIModal projectId={pid} onClose={() => setShowAdd(false)} />}
      {editItem && <EditRFIModal projectId={pid} rfi={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

function AddRFIModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [code, setCode] = useState('')
  const [subject, setSubject] = useState('')
  const [question, setQuestion] = useState('')
  const [priority, setPriority] = useState<string>(RFI_PRIORITY[1].value)
  const [status, setStatus] = useState<string>(RFI_STATUS[0].value)
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const { data: members } = useProjectMembers(projectId)
  const create = useCreateRFI(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="New RFI" width={460}>
      <div className="grid gap-3">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Code *</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="RFI-01" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Subject *</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="RFI subject" required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Question *</label>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What information is needed?" rows={3} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">To Be Responded By</label>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">-- Select Respondent --</option>
            {(members || []).map(m => (
              <option key={m.user} value={m.user}>{m.user_name} ({m.role_display || m.role})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {RFI_PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {RFI_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!code || !subject) { showToast('Code and subject required', 'warning'); return }
          await create.mutateAsync({
            code, subject, question, priority, status,
            due_date: dueDate || undefined,
            assigned_to: assignedTo || undefined,
          } as Parameters<typeof create.mutateAsync>[0])
          showToast('RFI created', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create RFI'}</ActionButton>
      </div>
    </Modal>
  )
}

function EditRFIModal({ projectId, rfi, onClose }: { projectId: string; rfi: RFIData; onClose: () => void }) {
  const [subject, setSubject] = useState<string>(rfi.subject)
  const [question, setQuestion] = useState<string>(rfi.question)
  const [priority, setPriority] = useState<string>(rfi.priority)
  const [status, setStatus] = useState<string>(rfi.status)
  const [dueDate, setDueDate] = useState(rfi.due_date || '')
  const [response, setResponse] = useState(rfi.response || '')
  const [assignedTo, setAssignedTo] = useState(rfi.assigned_to || '')
  const { data: members } = useProjectMembers(projectId)
  const update = useUpdateRFI(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title={`Edit ${rfi.code}`} width={480}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Question</label>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">To Be Responded By</label>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">-- Select Respondent --</option>
            {(members || []).map(m => (
              <option key={m.user} value={m.user}>{m.user_name} ({m.role_display || m.role})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {RFI_PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {RFI_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Response</label>
          <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Enter response to this RFI..." rows={3} />
        </div>
        <ActionButton variant="accent" className="!w-full !mt-1" onClick={async () => {
          await update.mutateAsync({
            id: rfi.id,
            data: {
              subject, question, priority, status,
              due_date: dueDate || null,
              response,
              assigned_to: assignedTo || null,
            },
          })
          showToast('RFI updated', 'success'); onClose()
        }} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</ActionButton>
      </div>
    </Modal>
  )
}
