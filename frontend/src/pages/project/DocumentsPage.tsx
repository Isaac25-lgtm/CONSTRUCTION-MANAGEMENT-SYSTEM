import { useParams } from 'react-router-dom'
import { useState } from 'react'
import {
  PageHeader, CostCard, DataTable, StatusBadge,
  ActionButton, Modal, LoadingState, EmptyState,
} from '../../components/ui'
import {
  useDocuments, useDocumentSummary, useUploadDocument,
  useUploadVersion, useDeleteDocument,
  type DocumentData,
} from '../../hooks/useDocuments'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

const CATEGORIES = [
  { value: 'drawings', label: 'Drawings & Plans' },
  { value: 'contracts', label: 'Contract Documents' },
  { value: 'permits', label: 'Permits & Approvals' },
  { value: 'reports', label: 'Reports' },
  { value: 'photos', label: 'Photos' },
  { value: 'other', label: 'Other' },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: docs, isLoading } = useDocuments(projectId)
  const { data: summary } = useDocumentSummary(projectId)
  const { canUploadDocuments, canDeleteDocuments } = useProjectPermissions(projectId)
  const [showUpload, setShowUpload] = useState(false)
  const [showVersionFor, setShowVersionFor] = useState<DocumentData | null>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const deleteDoc = useDeleteDocument(pid)
  const { showToast } = useUIStore()

  if (isLoading) return <LoadingState rows={5} />

  const filtered = filterCat
    ? (docs || []).filter(d => d.category === filterCat)
    : (docs || [])

  const columns = [
    { key: 'code', header: 'Code', width: '85px', render: (d: DocumentData) => <span className="font-mono text-xs text-bp-accent">{d.code || '-'}</span> },
    { key: 'title', header: 'Document', render: (d: DocumentData) => (
      <div>
        <span className="font-medium text-bp-text">{d.title || d.name}</span>
        {d.description && <span className="ml-2 text-[10px] text-bp-muted">{d.description.slice(0, 40)}</span>}
      </div>
    )},
    { key: 'category', header: 'Category', width: '120px', render: (d: DocumentData) => <StatusBadge text={d.category_display} color="#6366f1" /> },
    { key: 'status', header: 'Status', width: '85px', render: (d: DocumentData) => {
      const color = d.status === 'approved' ? '#22c55e' : d.status === 'issued' ? '#3b82f6' : d.status === 'superseded' ? '#94a3b8' : '#f59e0b'
      return <StatusBadge text={d.status_display} color={color} />
    }},
    { key: 'version', header: 'Ver.', width: '50px', render: (d: DocumentData) => <span className="font-mono text-xs text-bp-accent">v{d.current_version_number}</span> },
    { key: 'file', header: 'File', render: (d: DocumentData) => <span className="text-xs text-bp-muted">{d.latest_file_name || '-'}</span> },
    { key: 'size', header: 'Size', width: '80px', render: (d: DocumentData) => <span className="text-xs text-bp-muted">{formatSize(d.latest_file_size)}</span> },
    { key: 'uploaded', header: 'Updated', width: '100px', render: (d: DocumentData) => (
      <span className="text-xs text-bp-muted">{d.last_uploaded_at ? new Date(d.last_uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}</span>
    )},
    { key: 'actions', header: '', width: '120px', render: (d: DocumentData) => (
      <div className="flex gap-1">
        {d.latest_download_url && <a href={d.latest_download_url} className="text-xs text-bp-info hover:underline" onClick={e => e.stopPropagation()}>Download</a>}
        {canUploadDocuments && <ActionButton variant="blue" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowVersionFor(d) }}>+ Ver</ActionButton>}
        {canDeleteDocuments && <ActionButton variant="red" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteDoc.mutate(d.id, { onSuccess: () => showToast('Document deleted', 'success') }) }}>Del</ActionButton>}
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Documents" icon="&#128196;" count={filtered.length}>
        <select className="text-xs" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {canUploadDocuments && (
          <ActionButton variant="green" size="sm" onClick={() => setShowUpload(true)}>+ Upload Document</ActionButton>
        )}
      </PageHeader>

      {summary && (
        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
          <CostCard label="Documents" value={String(summary.total_documents)} color="#3b82f6" />
          <CostCard label="Versions" value={String(summary.total_versions)} color="#8b5cf6" />
          <CostCard label="Total Size" value={formatSize(summary.total_size)} color="#f59e0b" />
          {summary.categories.filter(c => c.count > 0).map(c => (
            <CostCard key={c.key} label={c.label} value={String(c.count)} color="#22c55e" />
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <DataTable columns={columns} data={filtered} emptyText="No documents"
          onRowClick={(d: DocumentData) => setExpandedDoc(expandedDoc === d.id ? null : d.id)}
          renderExpanded={(d: DocumentData) => expandedDoc === d.id ? <VersionHistory doc={d} projectId={pid} /> : null}
        />
      ) : (
        <EmptyState icon="&#128196;" title="No documents" description="Upload a document to get started." />
      )}

      {showUpload && <UploadDocumentModal projectId={pid} onClose={() => setShowUpload(false)} />}
      {showVersionFor && <UploadVersionModal projectId={pid} document={showVersionFor} onClose={() => setShowVersionFor(null)} />}
    </div>
  )
}

function VersionHistory({ doc }: { doc: DocumentData; projectId: string }) {
  const v = doc.latest_version
  return (
    <div className="border-t border-bp-border bg-[#0d1526] px-4 py-3" onClick={e => e.stopPropagation()}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-bp-muted mb-2">
        Version History ({doc.versions_count} version{doc.versions_count !== 1 ? 's' : ''})
      </div>
      {v ? (
        <div className="grid gap-1">
          <div className="flex items-center gap-3 rounded bg-bp-surface px-2.5 py-1.5 text-xs">
            <span className="font-mono text-bp-accent font-semibold">{v.version_label || `v${v.version_number}`}</span>
            <span className="text-bp-text flex-1">{v.original_filename}</span>
            <span className="text-bp-muted">{formatSize(v.file_size)}</span>
            {v.approval_status && (
              <StatusBadge
                text={v.approval_status_display || v.approval_status}
                color={v.approval_status === 'approved' ? '#22c55e' : v.approval_status === 'rejected' ? '#ef4444' : '#f59e0b'}
              />
            )}
            <span className="text-bp-muted">{v.uploaded_by_name}</span>
            <span className="text-bp-muted">{new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            {v.download_url && <a href={v.download_url} className="text-bp-info hover:underline">Download</a>}
          </div>
          {v.notes && <p className="text-[11px] text-bp-muted pl-2">{v.notes}</p>}
          {v.issue_purpose_display && <p className="text-[10px] text-bp-muted pl-2">Purpose: {v.issue_purpose_display}</p>}
        </div>
      ) : (
        <p className="text-[11px] text-bp-muted">No versions uploaded yet.</p>
      )}
    </div>
  )
}

function UploadDocumentModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const upload = useUploadDocument(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Upload Document" width={440}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Document Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Foundation Drawing Rev A" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">File *</label>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Document description..." />
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!title || !file) { showToast('Title and file are required', 'warning'); return }
          const fd = new FormData()
          fd.append('title', title)
          fd.append('name', title)
          fd.append('category', category)
          fd.append('description', description)
          fd.append('file', file)
          await upload.mutateAsync(fd)
          showToast('Document uploaded', 'success'); onClose()
        }} disabled={upload.isPending}>{upload.isPending ? 'Uploading...' : 'Upload'}</ActionButton>
      </div>
    </Modal>
  )
}

function UploadVersionModal({ projectId, document, onClose }: { projectId: string; document: DocumentData; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const upload = useUploadVersion(projectId, document.id)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title={`New Version: ${document.name}`} width={420}>
      <div className="grid gap-3">
        <div className="text-xs text-bp-muted">Current version: v{document.current_version_number}</div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">File *</label>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Revision Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="What changed in this version..." />
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!file) { showToast('File is required', 'warning'); return }
          const fd = new FormData()
          fd.append('file', file)
          fd.append('notes', notes)
          await upload.mutateAsync(fd)
          showToast(`Version v${document.current_version_number + 1} uploaded`, 'success'); onClose()
        }} disabled={upload.isPending}>{upload.isPending ? 'Uploading...' : 'Upload Version'}</ActionButton>
      </div>
    </Modal>
  )
}
