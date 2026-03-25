import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionButton, StatusBadge } from '../ui'
import { useCopilotQuery, useProjectIntelligence } from '../../hooks/useAI'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

interface FloatingProjectCopilotProps {
  projectId: string
}

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
}

const FALLBACK_PROMPTS = [
  'What should the site team focus on next?',
  'Summarize the biggest project risks right now.',
  'Draft a short progress update for management.',
]

export function FloatingProjectCopilot({ projectId }: FloatingProjectCopilotProps) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const copilot = useCopilotQuery(projectId)
  const { showToast } = useUIStore()
  const { canUseAI } = useProjectPermissions(projectId)
  const { data: intelligence } = useProjectIntelligence(projectId, open && canUseAI)

  useEffect(() => {
    if (!open || !intelligence || messages.length > 0) return
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `${intelligence.narrative.summary} ${intelligence.narrative.guidance}`,
      },
    ])
  }, [intelligence, messages.length, open])

  useEffect(() => {
    if (!open || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  const quickPrompts = useMemo(
    () => intelligence?.suggested_questions?.length ? intelligence.suggested_questions : FALLBACK_PROMPTS,
    [intelligence],
  )

  const askQuestion = async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed || !canUseAI) return

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text: trimmed,
    }
    setMessages((current) => [...current, userMessage])
    setQuestion('')

    try {
      const result = await copilot.mutateAsync(trimmed)
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: result.text,
        },
      ])
    } catch {
      showToast('Project copilot could not answer just now', 'error')
    }
  }

  if (!canUseAI) return null

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      {open && (
        <div
          className="mb-3 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-[22px] border border-white/10 shadow-2xl"
          style={{
            background: 'linear-gradient(180deg, rgba(7,18,34,0.98) 0%, rgba(13,27,42,0.98) 100%)',
            boxShadow: '0 30px 80px rgba(2, 6, 23, 0.55)',
          }}
        >
          <div
            className="border-b border-white/10 px-4 py-4"
            style={{ background: 'linear-gradient(135deg, rgba(8,47,73,0.96), rgba(245,158,11,0.92))' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Project Copilot</div>
                <div className="mt-1 text-base font-bold text-white">BuildPro Field Advisor</div>
                <div className="mt-1 text-xs leading-relaxed text-white/80">
                  Ask about this project’s progress, risks, spending, reports, and next actions.
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs text-white transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
            {intelligence && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge
                  text={intelligence.health.overall.label}
                  color={intelligence.health.overall.state === 'healthy' ? '#22c55e' : intelligence.health.overall.state === 'watch' ? '#f59e0b' : '#ef4444'}
                />
                <StatusBadge
                  text={`Progress ${intelligence.overview.schedule.overall_progress}%`}
                  color="#38bdf8"
                />
              </div>
            )}
          </div>

          <div className="border-b border-white/10 px-4 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-bp-muted">Quick Prompts</div>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => askQuestion(prompt)}
                  className="cursor-pointer rounded-full border border-bp-border bg-white/5 px-3 py-1.5 text-left text-[11px] text-white/85 transition hover:border-bp-accent hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="max-h-[340px] overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                    message.role === 'assistant' ? 'mr-auto text-white' : 'ml-auto text-slate-950'
                  }`}
                  style={{
                    background: message.role === 'assistant'
                      ? 'rgba(15, 23, 42, 0.92)'
                      : 'linear-gradient(135deg, #f8c84a 0%, #f59e0b 100%)',
                    border: message.role === 'assistant'
                      ? '1px solid rgba(148,163,184,0.2)'
                      : '1px solid rgba(245,158,11,0.35)',
                  }}
                >
                  {message.text}
                </div>
              ))}
              {copilot.isPending && (
                <div className="mr-auto max-w-[92%] rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white">
                  Thinking through the latest project data...
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            <div className="flex gap-2">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Ask about schedule, cost, risks, procurement, reports, or recommended actions..."
                className="min-h-[72px] flex-1 resize-none rounded-2xl border border-bp-border bg-slate-950/85 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-400 focus:border-bp-accent"
              />
              <div className="flex flex-col gap-2">
                <ActionButton
                  variant="accent"
                  size="sm"
                  onClick={() => askQuestion(question)}
                  disabled={copilot.isPending || !question.trim()}
                >
                  Ask
                </ActionButton>
                <Link
                  to={`/app/projects/${projectId}/ai`}
                  className="rounded-md border border-bp-border px-3 py-1.5 text-center text-[11px] font-semibold text-bp-muted transition hover:border-bp-accent hover:text-white"
                >
                  Open AI HQ
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-none text-2xl text-slate-950 shadow-2xl transition-transform hover:scale-[1.03]"
        style={{
          background: 'radial-gradient(circle at top, #fde68a 0%, #f59e0b 55%, #d97706 100%)',
          boxShadow: '0 16px 40px rgba(245, 158, 11, 0.45)',
        }}
        aria-label="Toggle project copilot"
      >
        ✦
      </button>
    </div>
  )
}
