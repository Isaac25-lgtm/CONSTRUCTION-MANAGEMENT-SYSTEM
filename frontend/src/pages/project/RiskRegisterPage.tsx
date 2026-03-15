import { useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  PageHeader, DataTable, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState, FilterBar, FilterChip,
} from '../../components/ui'
import {
  useRisks, useCreateRisk, useUpdateRisk, useDeleteRisk,
  type RiskData,
} from '../../hooks/useFieldOps'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'
import {
  RISK_LIKELIHOOD, RISK_IMPACT, RISK_STATUS, RISK_CATEGORY,
  riskScoreColor, statusColor,
} from '../../types/fieldOpsChoices'

export function RiskRegisterPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: risks, isLoading } = useRisks(projectId)
  const { canEditRisks } = useProjectPermissions(projectId)
  const deleteRisk = useDeleteRisk(pid)
  const { showToast } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<RiskData | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  const list = useMemo(() => {
    let items = risks || []
    if (filterStatus) items = items.filter(r => r.status === filterStatus)
    if (filterCategory) items = items.filter(r => r.category === filterCategory)
    return items
  }, [risks, filterStatus, filterCategory])

  if (isLoading) return <LoadingState rows={5} />

  const columns = [
    { key: 'code', header: 'Code', width: '70px', render: (r: RiskData) => <span className="font-mono text-xs text-bp-accent">{r.code}</span> },
    { key: 'title', header: 'Title', render: (r: RiskData) => <span className="font-medium text-bp-text">{r.title}</span> },
    { key: 'category', header: 'Category', render: (r: RiskData) => <span className="text-xs text-bp-muted">{r.category_display}</span> },
    { key: 'likelihood', header: 'Likelihood', render: (r: RiskData) => <span className="text-xs text-bp-muted">{r.likelihood_display}</span> },
    { key: 'impact', header: 'Impact', render: (r: RiskData) => <span className="text-xs text-bp-muted">{r.impact_display}</span> },
    { key: 'score', header: 'Score', width: '60px', render: (r: RiskData) => <StatusBadge text={String(r.risk_score)} color={riskScoreColor(r.risk_score)} /> },
    { key: 'status', header: 'Status', render: (r: RiskData) => <StatusBadge text={r.status_display} color={statusColor(r.status)} /> },
    { key: 'owner', header: 'Owner', render: (r: RiskData) => <span className="text-xs text-bp-muted">{r.owner_name || '-'}</span> },
    ...(canEditRisks ? [
      { key: 'edit', header: '', width: '30px', render: (r: RiskData) => <button onClick={() => setEditItem(r)} className="cursor-pointer border-none bg-transparent text-bp-info text-sm" title="Edit">&#9998;</button> },
      { key: 'del', header: '', width: '30px', render: (r: RiskData) => <button onClick={() => { if (confirm(`Delete risk "${r.code}"?`)) { deleteRisk.mutate(r.id); showToast('Risk deleted', 'success') } }} className="cursor-pointer border-none bg-transparent text-bp-danger text-sm">&#10005;</button> },
    ] : []),
  ]

  return (
    <div>
      <PageHeader title="Risk Register" icon="&#9888;&#65039;" count={(risks || []).length}>
        {canEditRisks && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ Add Risk</ActionButton>
        )}
      </PageHeader>

      <FilterBar>
        <FilterChip label="All Status" active={!filterStatus} onClick={() => setFilterStatus('')} />
        {RISK_STATUS.map(s => (
          <FilterChip key={s.value} label={s.label} active={filterStatus === s.value} onClick={() => setFilterStatus(filterStatus === s.value ? '' : s.value)} count={(risks || []).filter(r => r.status === s.value).length} />
        ))}
        <span className="mx-1 text-bp-border">|</span>
        <FilterChip label="All Categories" active={!filterCategory} onClick={() => setFilterCategory('')} />
        {RISK_CATEGORY.map(c => (
          <FilterChip key={c.value} label={c.label} active={filterCategory === c.value} onClick={() => setFilterCategory(filterCategory === c.value ? '' : c.value)} count={(risks || []).filter(r => r.category === c.value).length} />
        ))}
      </FilterBar>

      {list.length > 0 ? (
        <DataTable columns={columns} data={list} emptyText="No risks" />
      ) : (
        <EmptyState icon="&#9888;&#65039;" title="No risks registered" description="Add risks to track and mitigate project uncertainties." />
      )}

      {showAdd && <AddRiskModal projectId={pid} onClose={() => setShowAdd(false)} />}
      {editItem && <EditRiskModal projectId={pid} risk={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

function AddRiskModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(RISK_CATEGORY[0].value)
  const [likelihood, setLikelihood] = useState<string>(RISK_LIKELIHOOD[0].value)
  const [impact, setImpact] = useState<string>(RISK_IMPACT[0].value)
  const [mitigation, setMitigation] = useState('')
  const [status, setStatus] = useState<string>(RISK_STATUS[0].value)
  const create = useCreateRisk(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Add Risk" width={480}>
      <div className="grid gap-3">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Code *</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="R-001" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Risk title" required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the risk..." rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {RISK_CATEGORY.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {RISK_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Likelihood</label>
            <select value={likelihood} onChange={(e) => setLikelihood(e.target.value)}>
              {RISK_LIKELIHOOD.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Impact</label>
            <select value={impact} onChange={(e) => setImpact(e.target.value)}>
              {RISK_IMPACT.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Mitigation</label>
          <textarea value={mitigation} onChange={(e) => setMitigation(e.target.value)} placeholder="Mitigation strategy..." rows={2} />
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!code || !title) { showToast('Code and title required', 'warning'); return }
          await create.mutateAsync({ code, title, description, category, likelihood, impact, mitigation, status })
          showToast('Risk added', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add Risk'}</ActionButton>
      </div>
    </Modal>
  )
}

function EditRiskModal({ projectId, risk, onClose }: { projectId: string; risk: RiskData; onClose: () => void }) {
  const [title, setTitle] = useState<string>(risk.title)
  const [description, setDescription] = useState<string>(risk.description)
  const [category, setCategory] = useState<string>(risk.category)
  const [likelihood, setLikelihood] = useState<string>(risk.likelihood)
  const [impact, setImpact] = useState<string>(risk.impact)
  const [mitigation, setMitigation] = useState<string>(risk.mitigation)
  const [status, setStatus] = useState<string>(risk.status)
  const update = useUpdateRisk(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title={`Edit ${risk.code}`} width={480}>
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
              {RISK_CATEGORY.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {RISK_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Likelihood</label>
            <select value={likelihood} onChange={(e) => setLikelihood(e.target.value)}>
              {RISK_LIKELIHOOD.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Impact</label>
            <select value={impact} onChange={(e) => setImpact(e.target.value)}>
              {RISK_IMPACT.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Mitigation</label>
          <textarea value={mitigation} onChange={(e) => setMitigation(e.target.value)} rows={2} />
        </div>
        <ActionButton variant="accent" className="!w-full !mt-1" onClick={async () => {
          await update.mutateAsync({ id: risk.id, data: { title, description, category, likelihood, impact, mitigation, status } })
          showToast('Risk updated', 'success'); onClose()
        }} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</ActionButton>
      </div>
    </Modal>
  )
}
