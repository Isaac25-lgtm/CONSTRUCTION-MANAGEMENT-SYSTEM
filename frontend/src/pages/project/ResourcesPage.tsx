import { useParams } from 'react-router-dom'
import { useState } from 'react'
import {
  PageHeader, DataTable, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState,
} from '../../components/ui'
import {
  useResourceAssignments, useResources, useCreateAssignment,
  type ResourceAssignmentData,
} from '../../hooks/useResources'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

/**
 * Resources page -- assigned resources table, create assignment modal.
 * Uses exact serializer fields: resource_name, resource_code,
 * assignment_role, status_display, assigned_from, assigned_to.
 */

export function ResourcesPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: assignments, isLoading } = useResourceAssignments(projectId)
  const { canEditProject } = useProjectPermissions(projectId)
  const [showAdd, setShowAdd] = useState(false)

  if (isLoading) return <LoadingState rows={5} />

  const columns = [
    { key: 'resource_name', header: 'Resource', render: (a: ResourceAssignmentData) => <span className="font-medium text-bp-text">{a.resource_name || '-'}</span> },
    { key: 'resource_code', header: 'Code', width: '90px', render: (a: ResourceAssignmentData) => <span className="font-mono text-xs text-bp-accent">{a.resource_code || '-'}</span> },
    { key: 'assignment_role', header: 'Role', render: (a: ResourceAssignmentData) => <span className="text-xs text-bp-text">{a.assignment_role}</span> },
    { key: 'status', header: 'Status', render: (a: ResourceAssignmentData) => {
      const color = a.status === 'active' ? '#22c55e' : a.status === 'released' ? '#94a3b8' : a.status === 'planned' ? '#3b82f6' : '#94a3b8'
      return <StatusBadge text={a.status_display} color={color} />
    }},
    { key: 'assigned_from', header: 'From', width: '95px', render: (a: ResourceAssignmentData) => <span className="text-xs text-bp-muted">{a.assigned_from}</span> },
    { key: 'assigned_to', header: 'To', width: '95px', render: (a: ResourceAssignmentData) => <span className="text-xs text-bp-muted">{a.assigned_to || '-'}</span> },
  ]

  return (
    <div>
      <PageHeader title="Resources" icon="&#128101;" count={(assignments || []).length}>
        {canEditProject && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ Assign Resource</ActionButton>
        )}
      </PageHeader>

      {(assignments && assignments.length > 0) ? (
        <DataTable columns={columns} data={assignments} emptyText="No resources assigned" />
      ) : (
        <EmptyState icon="&#128101;" title="No resources assigned" description="Assign resources to this project to track utilisation." />
      )}

      {showAdd && <AddAssignmentModal projectId={pid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function AddAssignmentModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [resource, setResource] = useState('')
  const [assignmentRole, setAssignmentRole] = useState('')
  const [assignedFrom, setAssignedFrom] = useState(new Date().toISOString().slice(0, 10))
  const [assignedTo, setAssignedTo] = useState('')
  const { data: resources, isLoading: loadingResources } = useResources()
  const create = useCreateAssignment(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Assign Resource" width={420}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Resource *</label>
          {loadingResources ? (
            <select disabled><option>Loading resources...</option></select>
          ) : (
            <select value={resource} onChange={(e) => setResource(e.target.value)}>
              <option value="">-- Select resource --</option>
              {(resources || []).map(r => <option key={r.id} value={r.id}>{r.name} ({r.resource_type_display})</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Role *</label>
          <input value={assignmentRole} onChange={(e) => setAssignmentRole(e.target.value)} placeholder="e.g. Site Engineer" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Assigned From *</label>
            <input type="date" value={assignedFrom} onChange={(e) => setAssignedFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Assigned To</label>
            <input type="date" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
          </div>
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!resource || !assignmentRole) { showToast('Resource and role required', 'warning'); return }
          await create.mutateAsync({
            resource,
            assignment_role: assignmentRole,
            assigned_from: assignedFrom,
            assigned_to: assignedTo || undefined,
          })
          showToast('Resource assigned', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Assigning...' : 'Assign Resource'}</ActionButton>
      </div>
    </Modal>
  )
}
