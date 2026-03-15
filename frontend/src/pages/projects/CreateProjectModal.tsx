import { useState, type FormEvent } from 'react'
import { Modal, ActionButton } from '../../components/ui'
import { useCreateProject } from '../../hooks/useProjects'
import { useUIStore } from '../../stores/uiStore'
import { PROJECT_TYPES, CONTRACT_TYPES } from '../../types'

/**
 * Create Project modal matching prototype's New Project form.
 *
 * Fields: name, description, location, project type, contract type,
 * estimated cost, start/end dates, client details, consultant, contractor.
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
  project_type: 'residential',
  contract_type: 'lump_sum',
  budget: '',
  start_date: '',
  end_date: '',
  client_name: '',
  client_phone: '',
  client_email: '',
  client_org: '',
  consultant: '',
  contractor: '',
}

export function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const [form, setForm] = useState(initialForm)
  const createProject = useCreateProject()
  const { showToast } = useUIStore()

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.location.trim() || !form.start_date || !form.end_date) {
      showToast('Fill all required fields', 'warning')
      return
    }

    try {
      const result = await createProject.mutateAsync({
        ...form,
        budget: parseFloat(form.budget) || 0,
      })
      showToast(`Project ${result.code} created!`, 'success')
      setForm(initialForm)
      onClose()
      onCreated?.(result.id)
    } catch {
      showToast('Failed to create project', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="🏗️ New Project" width={540}>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-3">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Project Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Kampala Heights Residence"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief scope description"
            />
          </div>

          {/* Location + Consultant */}
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
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Consultant</label>
              <input
                value={form.consultant}
                onChange={(e) => set('consultant', e.target.value)}
                placeholder="e.g. Arch. Birungi & Associates"
              />
            </div>
          </div>

          {/* Project Type */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Project Type</label>
            <select value={form.project_type} onChange={(e) => set('project_type', e.target.value)}>
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Contract Type + Budget */}
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
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Start Date *</label>
              <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">End Date *</label>
              <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} required />
            </div>
          </div>

          {/* Client Details divider */}
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
