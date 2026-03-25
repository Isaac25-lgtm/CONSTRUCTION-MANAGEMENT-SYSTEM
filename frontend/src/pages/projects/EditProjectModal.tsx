import { useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { Modal, ActionButton } from '../../components/ui'
import { useUpdateProject, type ProjectSummary } from '../../hooks/useProjects'
import { useUIStore } from '../../stores/uiStore'
import { PROJECT_TYPES, CONTRACT_TYPES, PROJECT_STATUSES } from '../../types'

interface EditProjectModalProps {
  project: ProjectSummary
  open: boolean
  onClose: () => void
}

/**
 * Wrapper that remounts the form when the project changes,
 * avoiding useEffect + setState for initial population.
 */
export function EditProjectModal({ project, open, onClose }: EditProjectModalProps) {
  if (!open) return null
  return <EditProjectForm key={project.id} project={project} onClose={onClose} />
}

function EditProjectForm({ project, onClose }: { project: ProjectSummary; onClose: () => void }) {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description || '',
    location: project.location,
    project_manager_name: project.project_manager_name || '',
    project_type: project.project_type,
    contract_type: project.contract_type,
    status: project.status,
    budget: project.budget,
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    client_name: project.client_name || '',
    consultant: project.consultant || '',
    contractor: project.contractor || '',
  })
  const updateProject = useUpdateProject(project.id)
  const { showToast } = useUIStore()

  const set = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await updateProject.mutateAsync({
        ...form,
        budget: parseFloat(form.budget) || 0,
      })
      showToast('Project updated', 'success')
      onClose()
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to update project'), 'error')
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Edit ${project.code}`} width={540}>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Project Name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Location</label>
              <input value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Project Manager</label>
              <input value={form.project_manager_name} onChange={(e) => set('project_manager_name', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Client</label>
              <input value={form.client_name} onChange={(e) => set('client_name', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Project Type</label>
              <select value={form.project_type} onChange={(e) => set('project_type', e.target.value)}>
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Contract Type</label>
              <select value={form.contract_type} onChange={(e) => set('contract_type', e.target.value)}>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Budget (UGX)</label>
              <input type="number" value={form.budget} onChange={(e) => set('budget', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Consultant</label>
              <input value={form.consultant} onChange={(e) => set('consultant', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Contractor</label>
              <input value={form.contractor} onChange={(e) => set('contractor', e.target.value)} />
            </div>
          </div>
          <div className="mt-1 text-[10px] text-bp-muted">
            Changing project type or contract type will regenerate the setup templates.
          </div>
          <ActionButton
            type="submit"
            variant="accent"
            className="!mt-2 !w-full !py-2.5"
            disabled={updateProject.isPending}
          >
            {updateProject.isPending ? 'Saving...' : 'Save Changes'}
          </ActionButton>
        </div>
      </form>
    </Modal>
  )
}
