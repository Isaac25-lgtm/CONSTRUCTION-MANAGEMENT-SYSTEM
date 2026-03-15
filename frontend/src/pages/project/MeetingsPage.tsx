import { useParams } from 'react-router-dom'
import { useState } from 'react'
import {
  PageHeader, SectionCard, StatusBadge, ActionButton,
  Modal, LoadingState, EmptyState,
} from '../../components/ui'
import { useMeetings, useCreateMeeting, useCreateMeetingAction } from '../../hooks/useComms'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

/**
 * Meetings page -- meetings list with expandable action items, create meeting modal.
 * Uses meeting_type, meeting_type_display, meeting_date, attendees, summary,
 * chaired_by_name. Actions use status: open/in_progress/completed/cancelled.
 * Permission: canEditComms.
 */

const MEETING_TYPES = [
  { value: 'site', label: 'Site Meeting' },
  { value: 'progress', label: 'Progress Meeting' },
  { value: 'design', label: 'Design Review' },
  { value: 'safety', label: 'Safety Meeting' },
  { value: 'client', label: 'Client Meeting' },
  { value: 'other', label: 'Other' },
]

export function MeetingsPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: meetings, isLoading } = useMeetings(projectId)
  const { canEditComms } = useProjectPermissions(projectId)
  const [showAdd, setShowAdd] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addingActionTo, setAddingActionTo] = useState<string | null>(null)

  if (isLoading) return <LoadingState rows={4} />

  return (
    <div>
      <PageHeader title="Meetings" icon="&#128197;" count={(meetings || []).length}>
        {canEditComms && (
          <ActionButton variant="green" size="sm" onClick={() => setShowAdd(true)}>+ New Meeting</ActionButton>
        )}
      </PageHeader>

      {(meetings && meetings.length > 0) ? (
        <div className="grid gap-2">
          {meetings.map((m) => (
            <SectionCard key={m.id}>
              <div
                className="cursor-pointer"
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-bp-text">{m.title}</span>
                    <StatusBadge
                      text={m.meeting_type_display}
                      color={m.meeting_type === 'safety' ? '#ef4444' : m.meeting_type === 'client' ? '#8b5cf6' : '#3b82f6'}
                    />
                  </div>
                  <span className="text-xs text-bp-muted">{m.meeting_date}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-bp-muted">
                  {m.location && <span>&#128205; {m.location}</span>}
                  {m.chaired_by_name && <span>&#128100; {m.chaired_by_name}</span>}
                  {m.attendees && m.attendees.length > 0 && (
                    <span>&#128101; {m.attendees.length} attendee{m.attendees.length !== 1 ? 's' : ''}</span>
                  )}
                  {m.actions && m.actions.length > 0 && (
                    <span className="text-bp-warning">&#9889; {m.actions.length} action{m.actions.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                {m.summary && (
                  <p className="mt-1.5 text-[13px] text-bp-muted leading-relaxed">{m.summary}</p>
                )}
              </div>

              {expanded === m.id && (
                <div className="mt-3 border-t border-bp-border pt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-bp-muted uppercase tracking-wider">Action Items</span>
                    {canEditComms && (
                      <ActionButton variant="blue" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setAddingActionTo(addingActionTo === m.id ? null : m.id) }}>
                        + Add Action
                      </ActionButton>
                    )}
                  </div>
                  {addingActionTo === m.id && (
                    <AddActionInline projectId={pid} meetingId={m.id} onDone={() => setAddingActionTo(null)} />
                  )}
                  {m.actions && m.actions.length > 0 ? (
                    <div className="grid gap-1.5 mt-1.5">
                      {m.actions.map((a) => {
                        const actionColor =
                          a.status === 'completed' ? '#22c55e' :
                          a.status === 'cancelled' ? '#94a3b8' :
                          a.status === 'in_progress' ? '#3b82f6' :
                          '#f59e0b'
                        return (
                          <div key={a.id} className="flex items-center gap-2 rounded bg-bp-surface px-2.5 py-1.5">
                            <StatusBadge
                              text={a.status_display || a.status}
                              color={actionColor}
                            />
                            <span className="flex-1 text-[13px] text-bp-text">{a.description}</span>
                            {a.assigned_to_name && <span className="text-xs text-bp-muted">{a.assigned_to_name}</span>}
                            {a.due_date && <span className="text-xs text-bp-muted">{a.due_date}</span>}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-bp-muted mt-1">No actions recorded yet.</p>
                  )}
                </div>
              )}
            </SectionCard>
          ))}
        </div>
      ) : (
        <EmptyState icon="&#128197;" title="No meetings recorded" description="Schedule meetings to track discussions and action items." />
      )}

      {showAdd && <AddMeetingModal projectId={pid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function AddMeetingModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [meetingType, setMeetingType] = useState<string>('site')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10))
  const [location, setLocation] = useState('')
  const [summary, setSummary] = useState('')
  const create = useCreateMeeting(projectId)
  const { showToast } = useUIStore()

  return (
    <Modal open={true} onClose={onClose} title="New Meeting" width={460}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Type</label>
            <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)}>
              {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Date *</label>
            <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Site office" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Summary / Agenda</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Meeting summary or agenda..." rows={3} />
        </div>
        <ActionButton variant="green" className="!w-full !mt-1" onClick={async () => {
          if (!title) { showToast('Title is required', 'warning'); return }
          await create.mutateAsync({
            title,
            meeting_type: meetingType,
            meeting_date: meetingDate,
            location: location || undefined,
            summary: summary || undefined,
          })
          showToast('Meeting created', 'success'); onClose()
        }} disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create Meeting'}</ActionButton>
      </div>
    </Modal>
  )
}

function AddActionInline({ projectId, meetingId, onDone }: { projectId: string; meetingId: string; onDone: () => void }) {
  const [desc, setDesc] = useState('')
  const [dueDate, setDueDate] = useState('')
  const create = useCreateMeetingAction(projectId, meetingId)
  const { showToast } = useUIStore()

  return (
    <div className="mb-2 rounded bg-bp-surface p-2.5 grid gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Action description..."
        className="text-[13px]"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-xs flex-1" />
        <ActionButton variant="green" size="sm" onClick={async () => {
          if (!desc) { showToast('Description required', 'warning'); return }
          await create.mutateAsync({
            description: desc,
            due_date: dueDate || undefined,
            status: 'open',
          })
          showToast('Action added', 'success')
          onDone()
        }} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add'}</ActionButton>
        <ActionButton variant="ghost" size="sm" onClick={onDone}>Cancel</ActionButton>
      </div>
    </div>
  )
}
