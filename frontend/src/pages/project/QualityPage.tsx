import { useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  PageHeader, DataTable, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState, FilterBar, FilterChip,
} from '../../components/ui'
import {
  useQualityChecks, useCreateQualityCheck, useUpdateQualityCheck, useDeleteQualityCheck,
  type QualityData,
} from '../../hooks/useFieldOps'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'
import { QUALITY_RESULT, QUALITY_CATEGORY, statusColor } from '../../types/fieldOpsChoices'

export function QualityPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: checks, isLoading } = useQualityChecks(projectId)
  const { canEditFieldOps } = useProjectPermissions(projectId)
  const deleteCheck = useDeleteQualityCheck(pid)
  const { showToast } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<QualityData | null>(null)
  const [filterResult, setFilterResult] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  const list = useMemo(() => {
    let data = checks || []
    if (filterResult) data = data.filter(q => q.result === filterResult)
    if (filterCategory) data = data.filter(q => q.category === filterCategory)
    return data
  }, [checks, filterResult, filterCategory])

  if (isLoading) return <LoadingState rows={5} />

  const columns = [
    { key: 'date', header: 'Date', width: '90px', render: (q: QualityData) => <span className="text-xs text-bp-muted">{q.check_date}</span> },
    { key: 'title', header: 'Title', render: (q: QualityData) => <span className="font-medium text-bp-text">{q.title}</span> },
    { key: 'category', header: 'Category', render: (q: QualityData) => <span className="text-xs text-bp-muted">{q.category_display}</span> },
    { key: 'result', header: 'Result', render: (q: QualityData) => <StatusBadge text={q.result_display} color={statusColor(q.result)} /> },
    { key: 'location', header: 'Location', render: (q: QualityData) => <span className="text-xs text-bp-muted">{q.location || '-'}</span> },
    { key: 'remarks', header: 'Remarks', render: (q: QualityData) => <span className="text-xs text-bp-muted">{q.remarks || '-'}</span> },
    ...(canEditFieldOps ? [
      { key: 'edit', header: '', width: '30px', render: (q: QualityData) => <button onClick={() => setEditItem(q)} className="cursor-pointer border-none bg-transparent text-bp-info text-sm" title="Edit">&#9998;</button> },
      { key: 'del', header: '', width: '30px', render: (q: QualityData) => <button onClick={() => { if (confirm(`Delete "${q.title}"?`)) { deleteCheck.mutate(q.id); showToast('Check deleted', 'success') } }} className="cursor-pointer border-none bg-transparent text-bp-danger text-sm">&#10005;</button> },
    ] : []),
  ]

  return (
    <div>
      <PageHeader title="Quality Checks" icon="&#9989;" count={(checks || []).length}>
        {canEditFieldOps && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ New Check</ActionButton>
        )}
      </PageHeader>

      <FilterBar>
        <FilterChip label="All Results" active={!filterResult} onClick={() => setFilterResult('')} />
        {QUALITY_RESULT.map(r => (
          <FilterChip key={r.value} label={r.label} active={filterResult === r.value} onClick={() => setFilterResult(filterResult === r.value ? '' : r.value)} count={(checks || []).filter(q => q.result === r.value).length} />
        ))}
        <span className="mx-1 text-bp-border">|</span>
        <FilterChip label="All Categories" active={!filterCategory} onClick={() => setFilterCategory('')} />
        {QUALITY_CATEGORY.map(c => (
          <FilterChip key={c.value} label={c.label} active={filterCategory === c.value} onClick={() => setFilterCategory(filterCategory === c.value ? '' : c.value)} count={(checks || []).filter(q => q.category === c.value).length} />
        ))}
      </FilterBar>

      {list.length > 0 ? (
        <DataTable columns={columns} data={list} emptyText="No quality checks" />
      ) : (
        <EmptyState icon="&#9989;" title="No quality checks" description="Record quality inspections and test results." />
      )}

      {showAdd && <AddQualityModal projectId={pid} onClose={() => setShowAdd(false)} />}
      {editItem && <EditQualityModal projectId={pid} check={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

function AddQualityModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [checkDate, setCheckDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<string>(QUALITY_CATEGORY[0].value)
  const [result, setResult] = useState<string>(QUALITY_RESULT[3].value) // pending
  const [location, setLocation] = useState('')
  const [remarks, setRemarks] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const create = useCreateQualityCheck(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="New Quality Check" width={460}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Concrete cube test - Block A" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Date *</label>
            <input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Column C3" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {QUALITY_CATEGORY.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Result</label>
            <select value={result} onChange={(e) => setResult(e.target.value)}>
              {QUALITY_RESULT.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Remarks</label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Observations and notes..." rows={2} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Corrective Action</label>
          <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} placeholder="Required corrective actions (if any)..." rows={2} />
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!title || !checkDate) { showToast('Title and date required', 'warning'); return }
          await create.mutateAsync({ title, check_date: checkDate, category, result, location, remarks, corrective_action: correctiveAction })
          showToast('Quality check recorded', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Save Check'}</ActionButton>
      </div>
    </Modal>
  )
}

function EditQualityModal({ projectId, check, onClose }: { projectId: string; check: QualityData; onClose: () => void }) {
  const [title, setTitle] = useState<string>(check.title)
  const [checkDate, setCheckDate] = useState<string>(check.check_date)
  const [category, setCategory] = useState<string>(check.category)
  const [result, setResult] = useState<string>(check.result)
  const [location, setLocation] = useState<string>(check.location)
  const [remarks, setRemarks] = useState<string>(check.remarks)
  const [correctiveAction, setCorrectiveAction] = useState<string>(check.corrective_action)
  const update = useUpdateQualityCheck(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title={`Edit Quality Check`} width={460}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Date</label>
            <input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {QUALITY_CATEGORY.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Result</label>
            <select value={result} onChange={(e) => setResult(e.target.value)}>
              {QUALITY_RESULT.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Remarks</label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Corrective Action</label>
          <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={2} />
        </div>
        <ActionButton variant="accent" className="!w-full !mt-1" onClick={async () => {
          await update.mutateAsync({ id: check.id, data: { title, check_date: checkDate, category, result, location, remarks, corrective_action: correctiveAction } })
          showToast('Quality check updated', 'success'); onClose()
        }} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</ActionButton>
      </div>
    </Modal>
  )
}
