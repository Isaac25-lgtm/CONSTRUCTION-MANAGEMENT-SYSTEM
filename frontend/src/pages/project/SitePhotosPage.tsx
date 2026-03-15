import { useParams } from 'react-router-dom'
import { useState } from 'react'
import {
  PageHeader, ActionButton, Modal, LoadingState, EmptyState,
} from '../../components/ui'
import { useDocuments, useUploadDocument, type DocumentData } from '../../hooks/useDocuments'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

/**
 * Site Photos page -- filtered view of documents with category='photos'.
 * Shows image grid with preview, upload, and metadata.
 */
export function SitePhotosPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: allDocs, isLoading } = useDocuments(projectId)
  const { canUploadDocuments } = useProjectPermissions(projectId)
  const [showUpload, setShowUpload] = useState(false)
  const [preview, setPreview] = useState<DocumentData | null>(null)

  if (isLoading) return <LoadingState rows={4} />

  const photos = (allDocs || []).filter(d => d.category === 'photos')

  return (
    <div>
      <PageHeader title="Site Photos" icon="&#128247;" count={photos.length}>
        {canUploadDocuments && (
          <ActionButton variant="green" size="sm" onClick={() => setShowUpload(true)}>+ Upload Photo</ActionButton>
        )}
      </PageHeader>

      {photos.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="cursor-pointer rounded-lg border border-bp-border bg-bp-card p-2 hover:border-bp-accent transition-colors"
              onClick={() => setPreview(photo)}
            >
              {photo.latest_content_type?.startsWith('image/') && photo.latest_download_url ? (
                <div className="mb-2 h-32 overflow-hidden rounded bg-bp-surface flex items-center justify-center">
                  <img
                    src={photo.latest_download_url}
                    alt={photo.name}
                    className="h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              ) : (
                <div className="mb-2 flex h-32 items-center justify-center rounded bg-bp-surface text-3xl text-bp-muted">
                  &#128247;
                </div>
              )}
              <div className="text-[13px] font-medium text-bp-text truncate">{photo.name}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-bp-muted">
                <span>v{photo.current_version_number}</span>
                <span>{photo.latest_file_name}</span>
              </div>
              <div className="mt-0.5 text-[10px] text-bp-muted">
                {photo.created_by_name} &middot; {photo.last_uploaded_at ? new Date(photo.last_uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="&#128247;" title="No site photos" description="Upload photos to document site progress." />
      )}

      {showUpload && <UploadPhotoModal projectId={pid} onClose={() => setShowUpload(false)} />}

      {preview && (
        <Modal open={true} onClose={() => setPreview(null)} title={preview.name} width={600}>
          <div className="grid gap-3">
            {preview.latest_download_url && (
              <div className="rounded bg-bp-surface p-2 flex justify-center">
                <img src={preview.latest_download_url} alt={preview.name} className="max-h-[400px] object-contain" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-bp-muted">File:</span> <span className="text-bp-text">{preview.latest_file_name}</span></div>
              <div><span className="text-bp-muted">Version:</span> <span className="text-bp-text">v{preview.current_version_number}</span></div>
              <div><span className="text-bp-muted">Uploaded by:</span> <span className="text-bp-text">{preview.created_by_name}</span></div>
              <div><span className="text-bp-muted">Date:</span> <span className="text-bp-text">{preview.last_uploaded_at ? new Date(preview.last_uploaded_at).toLocaleString() : '-'}</span></div>
            </div>
            {preview.notes && <p className="text-xs text-bp-muted">{preview.notes}</p>}
            {preview.latest_download_url && (
              <a href={preview.latest_download_url} className="text-xs text-bp-info hover:underline" download>Download Original</a>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function UploadPhotoModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const upload = useUploadDocument(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="Upload Site Photo" width={420}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Photo Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Foundation inspection - Block A" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Photo File *</label>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Description or context..." />
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!name || !file) { showToast('Name and file are required', 'warning'); return }
          const fd = new FormData()
          fd.append('name', name)
          fd.append('category', 'photos')
          fd.append('notes', notes)
          fd.append('file', file)
          await upload.mutateAsync(fd)
          showToast('Photo uploaded', 'success'); onClose()
        }} disabled={upload.isPending}>{upload.isPending ? 'Uploading...' : 'Upload Photo'}</ActionButton>
      </div>
    </Modal>
  )
}
