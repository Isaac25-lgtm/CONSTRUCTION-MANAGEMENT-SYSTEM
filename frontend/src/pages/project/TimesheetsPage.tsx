import { useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  PageHeader, CostCard, DataTable, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState,
} from '../../components/ui'
import { useTimesheets, useCreateTimesheet, useUpdateTimesheet, type TimesheetData } from '../../hooks/useLabour'
import { useResources } from '../../hooks/useResources'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

/**
 * Timesheets page -- hours summary, timesheet entries table, create entry modal.
 * Uses work_date (not date), hours, overtime_hours, resource_name, status_display.
 * Permission: canEditLabour.
 */

export function TimesheetsPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: timesheets, isLoading } = useTimesheets(projectId)
  const { canEditLabour } = useProjectPermissions(projectId)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<TimesheetData | null>(null)

  const totals = useMemo(() => {
    if (!timesheets) return { hours: 0, overtime: 0, entries: 0 }
    return {
      hours: timesheets.reduce((s, t) => s + t.hours, 0),
      overtime: timesheets.reduce((s, t) => s + t.overtime_hours, 0),
      entries: timesheets.length,
    }
  }, [timesheets])

  if (isLoading) return <LoadingState rows={5} />

  const columns = [
    { key: 'work_date', header: 'Date', width: '95px', render: (t: TimesheetData) => <span className="text-xs text-bp-muted">{t.work_date}</span> },
    { key: 'resource_name', header: 'Resource', render: (t: TimesheetData) => <span className="font-medium text-bp-text">{t.resource_name || '-'}</span> },
    { key: 'hours', header: 'Hours', width: '70px', render: (t: TimesheetData) => <span className="font-mono text-xs text-bp-info">{t.hours}</span> },
    { key: 'overtime_hours', header: 'Overtime', width: '80px', render: (t: TimesheetData) => <span className="font-mono text-xs text-bp-warning">{t.overtime_hours}</span> },
    { key: 'description', header: 'Description', render: (t: TimesheetData) => <span className="text-xs text-bp-muted">{t.description || '-'}</span> },
    { key: 'status', header: 'Status', render: (t: TimesheetData) => {
      const color = t.status === 'approved' ? '#22c55e' : t.status === 'submitted' ? '#3b82f6' : '#94a3b8'
      return <StatusBadge text={t.status_display} color={color} />
    }},
    ...(canEditLabour ? [{
      key: 'actions', header: '', width: '60px', render: (t: TimesheetData) => (
        <ActionButton variant="ghost" size="sm" onClick={() => setEditing(t)}>Edit</ActionButton>
      ),
    }] : []),
  ]

  return (
    <div>
      <PageHeader title="Timesheets" icon="&#9202;">
        {canEditLabour && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ Add Entry</ActionButton>
        )}
      </PageHeader>

      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
        <CostCard label="Total Entries" value={String(totals.entries)} color="#3b82f6" />
        <CostCard label="Regular Hours" value={String(totals.hours)} color="#22c55e" />
        <CostCard label="Overtime Hours" value={String(totals.overtime)} color="#f97316" />
      </div>

      {(timesheets && timesheets.length > 0) ? (
        <DataTable columns={columns} data={timesheets} emptyText="No timesheet entries" />
      ) : (
        <EmptyState icon="&#9202;" title="No timesheet entries" description="Add timesheet entries to track labour hours." />
      )}

      {showAdd && <AddTimesheetModal projectId={pid} onClose={() => setShowAdd(false)} />}
      {editing && <EditTimesheetModal projectId={pid} entry={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function AddTimesheetModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [resource, setResource] = useState('')
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [overtime, setOvertime] = useState('')
  const [description, setDescription] = useState('')
  const { data: resources, isLoading: loadingResources } = useResources()
  const create = useCreateTimesheet(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Add Timesheet Entry" width={420}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Resource *</label>
          {loadingResources ? (
            <select disabled><option>Loading resources...</option></select>
          ) : (
            <select value={resource} onChange={(e) => setResource(e.target.value)}>
              <option value="">-- Select resource --</option>
              {(resources || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Work Date *</label>
          <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Hours *</label>
            <input type="number" step="0.5" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="8" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Overtime Hours</label>
            <input type="number" step="0.5" min="0" max="24" value={overtime} onChange={(e) => setOvertime(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Work performed..." rows={2} />
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!resource || !hours) { showToast('Resource and hours required', 'warning'); return }
          await create.mutateAsync({
            resource,
            work_date: workDate,
            hours: parseFloat(hours),
            overtime_hours: parseFloat(overtime) || 0,
            description: description || undefined,
          })
          showToast('Timesheet entry added', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add Entry'}</ActionButton>
      </div>
    </Modal>
  )
}

function EditTimesheetModal({ projectId, entry, onClose }: { projectId: string; entry: TimesheetData; onClose: () => void }) {
  const [hours, setHours] = useState(String(entry.hours))
  const [overtime, setOvertime] = useState(String(entry.overtime_hours))
  const [description, setDescription] = useState(entry.description || '')
  const [entryStatus, setEntryStatus] = useState(entry.status)
  const update = useUpdateTimesheet(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Edit Timesheet Entry" width={420}>
      <div className="grid gap-3">
        <div className="text-xs text-bp-muted">
          {entry.resource_name} &mdash; {entry.work_date}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Hours</label>
            <input type="number" step="0.5" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Overtime</label>
            <input type="number" step="0.5" min="0" max="24" value={overtime} onChange={(e) => setOvertime(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
          <select value={entryStatus} onChange={(e) => setEntryStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          await update.mutateAsync({
            id: entry.id,
            hours: parseFloat(hours),
            overtime_hours: parseFloat(overtime) || 0,
            description: description || undefined,
            status: entryStatus,
          })
          showToast('Timesheet updated', 'success'); onClose()
        }} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</ActionButton>
      </div>
    </Modal>
  )
}
