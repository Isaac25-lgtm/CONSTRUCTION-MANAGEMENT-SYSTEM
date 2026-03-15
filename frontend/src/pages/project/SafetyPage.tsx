import { useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  PageHeader, DataTable, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState, FilterBar, FilterChip,
} from '../../components/ui'
import {
  useSafetyIncidents, useCreateSafetyIncident, useUpdateSafetyIncident, useDeleteSafetyIncident,
  type SafetyData,
} from '../../hooks/useFieldOps'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'
import { SAFETY_TYPE, SAFETY_SEVERITY, SAFETY_STATUS, statusColor } from '../../types/fieldOpsChoices'

const severityColor = (sev: string) => {
  const map: Record<string, string> = { minor: '#f59e0b', moderate: '#f97316', serious: '#ef4444', critical: '#dc2626' }
  return map[sev] || '#94a3b8'
}

export function SafetyPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: incidents, isLoading } = useSafetyIncidents(projectId)
  const { canEditFieldOps } = useProjectPermissions(projectId)
  const deleteSafety = useDeleteSafetyIncident(pid)
  const { showToast } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<SafetyData | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const list = useMemo(() => {
    let data = incidents || []
    if (filterSeverity) data = data.filter(s => s.severity === filterSeverity)
    if (filterStatus) data = data.filter(s => s.status === filterStatus)
    return data
  }, [incidents, filterSeverity, filterStatus])

  if (isLoading) return <LoadingState rows={5} />

  const columns = [
    { key: 'date', header: 'Date', width: '90px', render: (s: SafetyData) => <span className="text-xs text-bp-muted">{s.incident_date}</span> },
    { key: 'title', header: 'Title', render: (s: SafetyData) => <span className="font-medium text-bp-text">{s.title}</span> },
    { key: 'type', header: 'Type', render: (s: SafetyData) => <span className="text-xs text-bp-muted">{s.type_display}</span> },
    { key: 'severity', header: 'Severity', render: (s: SafetyData) => <StatusBadge text={s.severity_display} color={severityColor(s.severity)} /> },
    { key: 'status', header: 'Status', render: (s: SafetyData) => <StatusBadge text={s.status_display} color={statusColor(s.status)} /> },
    { key: 'reported', header: 'Reported By', render: (s: SafetyData) => <span className="text-xs text-bp-muted">{s.reported_by_name || '-'}</span> },
    { key: 'location', header: 'Location', render: (s: SafetyData) => <span className="text-xs text-bp-muted">{s.location || '-'}</span> },
    ...(canEditFieldOps ? [
      { key: 'edit', header: '', width: '30px', render: (s: SafetyData) => <button onClick={() => setEditItem(s)} className="cursor-pointer border-none bg-transparent text-bp-info text-sm" title="Edit">&#9998;</button> },
      { key: 'del', header: '', width: '30px', render: (s: SafetyData) => <button onClick={() => { if (confirm(`Delete "${s.title}"?`)) { deleteSafety.mutate(s.id); showToast('Incident deleted', 'success') } }} className="cursor-pointer border-none bg-transparent text-bp-danger text-sm">&#10005;</button> },
    ] : []),
  ]

  return (
    <div>
      <PageHeader title="Safety Incidents" icon="&#129466;" count={(incidents || []).length}>
        {canEditFieldOps && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ Report Incident</ActionButton>
        )}
      </PageHeader>

      <FilterBar>
        <FilterChip label="All Severity" active={!filterSeverity} onClick={() => setFilterSeverity('')} />
        {SAFETY_SEVERITY.map(s => (
          <FilterChip key={s.value} label={s.label} active={filterSeverity === s.value} onClick={() => setFilterSeverity(filterSeverity === s.value ? '' : s.value)} count={(incidents || []).filter(i => i.severity === s.value).length} />
        ))}
        <span className="mx-1 text-bp-border">|</span>
        <FilterChip label="All Status" active={!filterStatus} onClick={() => setFilterStatus('')} />
        {SAFETY_STATUS.map(s => (
          <FilterChip key={s.value} label={s.label} active={filterStatus === s.value} onClick={() => setFilterStatus(filterStatus === s.value ? '' : s.value)} count={(incidents || []).filter(i => i.status === s.value).length} />
        ))}
      </FilterBar>

      {list.length > 0 ? (
        <DataTable columns={columns} data={list} emptyText="No safety incidents" />
      ) : (
        <EmptyState icon="&#129466;" title="No safety incidents" description="Report and track safety incidents on site." />
      )}

      {showAdd && <AddSafetyModal projectId={pid} onClose={() => setShowAdd(false)} />}
      {editItem && <EditSafetyModal projectId={pid} incident={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

function AddSafetyModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10))
  const [incidentType, setIncidentType] = useState<string>(SAFETY_TYPE[1].value)
  const [severity, setSeverity] = useState<string>(SAFETY_SEVERITY[0].value)
  const [status, setStatus] = useState<string>(SAFETY_STATUS[0].value)
  const [location, setLocation] = useState('')
  const [immediateAction, setImmediateAction] = useState('')
  const create = useCreateSafetyIncident(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Report Safety Incident" width={480}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Incident title" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what happened..." rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Date *</label>
            <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Block B, Ground Floor" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Type</label>
            <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
              {SAFETY_TYPE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {SAFETY_SEVERITY.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {SAFETY_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Immediate Action Taken</label>
          <textarea value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} placeholder="What action was taken immediately?" rows={2} />
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!title || !incidentDate) { showToast('Title and date required', 'warning'); return }
          await create.mutateAsync({ title, description, incident_date: incidentDate, incident_type: incidentType, severity, status, location, immediate_action: immediateAction })
          showToast('Incident reported', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Reporting...' : 'Report Incident'}</ActionButton>
      </div>
    </Modal>
  )
}

function EditSafetyModal({ projectId, incident, onClose }: { projectId: string; incident: SafetyData; onClose: () => void }) {
  const [title, setTitle] = useState<string>(incident.title)
  const [description, setDescription] = useState<string>(incident.description)
  const [incidentDate, setIncidentDate] = useState<string>(incident.incident_date)
  const [incidentType, setIncidentType] = useState<string>(incident.incident_type)
  const [severity, setSeverity] = useState<string>(incident.severity)
  const [status, setStatus] = useState<string>(incident.status)
  const [location, setLocation] = useState<string>(incident.location)
  const [immediateAction, setImmediateAction] = useState<string>(incident.immediate_action)
  const [followUp, setFollowUp] = useState<string>(incident.follow_up)
  const update = useUpdateSafetyIncident(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title={`Edit Incident`} width={480}>
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
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Date</label>
            <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Type</label>
            <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
              {SAFETY_TYPE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {SAFETY_SEVERITY.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {SAFETY_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Immediate Action</label>
          <textarea value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Follow Up</label>
          <textarea value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="Follow-up actions required..." rows={2} />
        </div>
        <ActionButton variant="accent" className="!w-full !mt-1" onClick={async () => {
          await update.mutateAsync({ id: incident.id, data: { title, description, incident_date: incidentDate, incident_type: incidentType, severity, status, location, immediate_action: immediateAction, follow_up: followUp } })
          showToast('Incident updated', 'success'); onClose()
        }} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</ActionButton>
      </div>
    </Modal>
  )
}
