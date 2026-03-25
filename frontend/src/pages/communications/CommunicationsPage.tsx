import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionButton, EmptyState, LoadingState, PageHeader, SectionCard, StatusBadge } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useOrgChatMessages, useSendOrgChatMessage } from '../../hooks/useComms'
import { useProjects, type ProjectSummary } from '../../hooks/useProjects'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function CommunicationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: messages, isLoading, isError } = useOrgChatMessages()
  const send = useSendOrgChatMessage()
  const { data: projectsRaw } = useProjects()
  const projects: ProjectSummary[] = Array.isArray(projectsRaw) ? projectsRaw : []
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    await send.mutateAsync({ message: trimmed })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  let lastDate = ''

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-h-[calc(100vh-120px)] flex-col">
        <PageHeader title="Communications" icon="&#128172;">
          <span className="text-xs text-bp-muted">General organisation chat for company-wide coordination</span>
        </PageHeader>

        <div
          className="flex-1 overflow-y-auto rounded-lg bg-bp-surface p-4"
          style={{ border: '1px solid var(--bp-border, #2a2f3a)' }}
        >
          {isLoading ? (
            <LoadingState rows={6} />
          ) : isError ? (
            <EmptyState icon="&#9888;" title="Failed to load messages" description="Could not connect to the communications service." />
          ) : !messages || messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-bp-muted">
              No organisation messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((msg) => {
              const dateLabel = formatDateLabel(msg.created_at)
              const showDate = dateLabel !== lastDate
              lastDate = dateLabel
              const isOwn = user?.id === msg.sender
              const initials = (msg.sender_name || '??').slice(0, 2).toUpperCase()
              const roleLabel = msg.sender_role_name || msg.sender_job_title || 'Team Member'

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="my-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-bp-border" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-bp-muted">{dateLabel}</span>
                      <div className="h-px flex-1 bg-bp-border" />
                    </div>
                  )}
                  <div className={`mb-2.5 flex items-start gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: isOwn ? '#005c4b' : '#1f7a8c' }}
                    >
                      {initials}
                    </div>
                    <div
                      className="max-w-[72%] rounded-lg px-3 py-2"
                      style={{
                        backgroundColor: isOwn ? 'rgba(0,92,75,0.22)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isOwn ? 'rgba(0,92,75,0.45)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <div className={`mb-0.5 flex items-center gap-2 ${isOwn ? 'justify-end' : ''}`}>
                        <span className="text-xs font-semibold text-bp-text">{msg.sender_name || 'Unknown'}</span>
                        <StatusBadge text={roleLabel} color={isOwn ? '#0ea5a4' : '#6366f1'} />
                        <span className="text-[10px] text-bp-muted">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-bp-text">{msg.message}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div
          className="mt-3 flex items-end gap-2 rounded-lg p-2.5"
          style={{
            backgroundColor: 'var(--bp-surface, #1a1f2e)',
            border: '1px solid var(--bp-border, #2a2f3a)',
          }}
        >
          <textarea
            className="flex-1 resize-none rounded-md bg-transparent px-3 py-2 text-[13px] text-bp-text placeholder-bp-muted outline-none"
            style={{ border: '1px solid var(--bp-border, #2a2f3a)', minHeight: '38px', maxHeight: '120px' }}
            placeholder="Type a company-wide message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#005c4b' }}
            onClick={() => void handleSend()}
            disabled={!text.trim() || send.isPending}
            title="Send"
          >
            &#10148;
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <SectionCard>
          <div className="mb-3 text-sm font-semibold text-bp-text">Project Channels</div>
          <div className="space-y-3">
            {projects.length > 0 ? projects.slice(0, 5).map((project) => (
              <div key={project.id} className="rounded-lg border border-bp-border/70 bg-bp-panel px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono text-[11px] text-bp-accent">{project.code}</div>
                    <div className="text-[13px] font-semibold text-bp-text">{project.name}</div>
                  </div>
                  <StatusBadge
                    text={project.status_display || project.status}
                    color={project.status === 'active' ? '#22c55e' : '#f59e0b'}
                  />
                </div>
                <div className="flex gap-2">
                  <ActionButton variant="blue" size="sm" onClick={() => navigate(`/app/projects/${project.id}/chat`)}>
                    Chat
                  </ActionButton>
                  <ActionButton variant="accent" size="sm" onClick={() => navigate(`/app/projects/${project.id}/meetings`)}>
                    Meetings
                  </ActionButton>
                </div>
              </div>
            )) : (
              <div className="text-xs text-bp-muted">No project channels available for your account.</div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
