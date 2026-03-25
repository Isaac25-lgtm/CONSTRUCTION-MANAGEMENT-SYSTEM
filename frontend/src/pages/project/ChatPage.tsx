import { useParams } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { PageHeader, LoadingState } from '../../components/ui'
import { useChatMessages, useSendMessage } from '../../hooks/useComms'
import { useAuth } from '../../hooks/useAuth'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'

/**
 * Project Chat page -- real-time message thread with auto-refresh.
 * Uses sender_name from serializer. Permission: canSendChat for compose area.
 * Dark BuildPro theme, clean chat UI.
 */

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

export function ChatPage() {
  const { projectId } = useParams()
  const pid = projectId!
  const { data: messages, isLoading } = useChatMessages(projectId)
  const send = useSendMessage(pid)
  const { user } = useAuth()
  const { canSendChat } = useProjectPermissions(projectId)
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) return <LoadingState rows={6} />

  // Group messages by date for date separators
  let lastDate = ''

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <PageHeader title="Project Chat" icon="&#128172;" />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto rounded-lg bg-bp-surface p-4" style={{ border: '1px solid var(--bp-border, #2a2f3a)' }}>
        {(!messages || messages.length === 0) ? (
          <div className="flex h-full items-center justify-center text-bp-muted text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const dateLabel = formatDateLabel(msg.created_at)
            const showDate = dateLabel !== lastDate
            lastDate = dateLabel
            const isOwn = user?.id === msg.sender
            const initials = msg.sender_name ? msg.sender_name.slice(0, 2).toUpperCase() : '??'

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
                  {/* Avatar */}
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: isOwn ? '#005c4b' : '#6366f1' }}
                  >
                    {initials}
                  </div>
                  {/* Bubble */}
                  <div
                    className="max-w-[70%] rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: isOwn ? 'rgba(0,92,75,0.22)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isOwn ? 'rgba(0,92,75,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-bp-text">{msg.sender_name || 'Unknown'}</span>
                      <span className="text-[10px] text-bp-muted">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-bp-text whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose bar -- only shown if canSendChat */}
      {canSendChat && (
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
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#005c4b' }}
            onClick={handleSend}
            disabled={!text.trim() || send.isPending}
            title="Send"
          >
            &#10148;
          </button>
        </div>
      )}
    </div>
  )
}
