import { useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { Modal, ActionButton } from '../../components/ui'
import { useCreateProject } from '../../hooks/useProjects'
import { useUIStore } from '../../stores/uiStore'
import { PROJECT_TYPES, CONTRACT_TYPES } from '../../types'

/**
 * Create Project modal mirroring the prototype new-project form.
 *
 * Fields: name, description, location, project manager, project type,
 * contract type, estimated cost, start/end dates, and client details.
 */

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onCreated?: (projectId: string) => void
}

const initialForm = {
  name: '',
  description: '',
  location: '',
  project_manager_name: '',
  project_type: 'residential',
  contract_type: 'lump_sum',
  budget: '',
  start_date: '',
  end_date: '',
  client_name: '',
  client_phone: '',
  client_email: '',
  client_org: '',
}

type CreateProjectFormState = typeof initialForm

export function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const [form, setForm] = useState<CreateProjectFormState>(initialForm)
  const createProject = useCreateProject()
  const { showToast } = useUIStore()

  const set = (field: keyof CreateProjectFormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const handleClose = () => {
    setForm(initialForm)
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (
      !form.name.trim() ||
      !form.location.trim() ||
      !form.project_manager_name.trim() ||
      !form.start_date ||
      !form.end_date ||
      !form.budget.trim()
    ) {
      showToast('Fill all required fields', 'warning')
      return
    }

    const budgetValue = parseFloat(form.budget)
    if (!Number.isFinite(budgetValue) || budgetValue <= 0) {
      showToast('Estimated cost must be greater than zero', 'warning')
      return
    }

    if (new Date(form.end_date) < new Date(form.start_date)) {
      showToast('End date must be on or after the start date', 'warning')
      return
    }

    try {
      const result = await createProject.mutateAsync({
        ...form,
        budget: budgetValue,
      })
      showToast(`Project ${result.code} created!`, 'success')
      setForm(initialForm)
      onClose()
      onCreated?.(result.id)
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to create project'), 'error')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="🏗️ New Project" width={520}>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Project Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Kampala Heights Residence"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Location *</label>
              <input
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. Muyenga, Kampala"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Project Manager *</label>
              <input
                value={form.project_manager_name}
                onChange={(e) => set('project_manager_name', e.target.value)}
                placeholder="e.g. Eng. Sarah Nakamya"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Project Type</label>
            <select value={form.project_type} onChange={(e) => set('project_type', e.target.value)}>
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Contract Type</label>
              <select value={form.contract_type} onChange={(e) => set('contract_type', e.target.value)}>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Estimated Cost (UGX) *</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => set('budget', e.target.value)}
                placeholder="e.g. 450000000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Start Date *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">End Date *</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => set('end_date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mt-1 border-t border-bp-border pt-3">
            <div className="mb-2 text-xs font-bold text-bp-accent">👤 Client Details</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Client Name</label>
              <input
                value={form.client_name}
                onChange={(e) => set('client_name', e.target.value)}
                placeholder="e.g. Mr. & Mrs. Mukiibi"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Phone</label>
              <input
                value={form.client_phone}
                onChange={(e) => set('client_phone', e.target.value)}
                placeholder="+256 7XX XXX XXX"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Email</label>
              <input
                value={form.client_email}
                onChange={(e) => set('client_email', e.target.value)}
                placeholder="client@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Organisation</label>
              <input
                value={form.client_org}
                onChange={(e) => set('client_org', e.target.value)}
                placeholder="Company / Individual"
              />
            </div>
          </div>

          <ActionButton
            type="submit"
            variant="accent"
            className="!mt-3 !w-full !py-3 !text-[15px]"
            disabled={createProject.isPending}
          >
            {createProject.isPending ? 'Creating...' : 'Create Project'}
          </ActionButton>
        </div>
      </form>
    </Modal>
  )
}
