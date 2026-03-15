import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader, SectionCard, ActionButton, StatusBadge, LoadingState, EmptyState } from '../../components/ui'
import { useGenerateNarrative, useGenerateReportDraft, useCopilotQuery, useAIHistory, useJobStatus, type AsyncJobData } from '../../hooks/useAI'
import { useAvailableReports } from '../../hooks/useReports'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

/**
 * AI Assistant -- supports sync and async modes.
 * Async mode uses ?async=true, polls via useJobStatus, and displays output_reference.
 * Report keys loaded from available_reports endpoint.
 */

export function AIAssistantPage() {
  const { projectId } = useParams()
  const { showToast } = useUIStore()
  const { canUseAI, canViewAIHistory } = useProjectPermissions(projectId)

  const narrative = useGenerateNarrative(projectId)
  const reportDraft = useGenerateReportDraft(projectId)
  const copilot = useCopilotQuery(projectId)
  const { data: history, isLoading: historyLoading } = useAIHistory(projectId)
  const { data: availableReports } = useAvailableReports(projectId)

  const [narrativeText, setNarrativeText] = useState('')
  const [draftText, setDraftText] = useState('')
  const [draftKey, setDraftKey] = useState('progress')
  const [question, setQuestion] = useState('')
  const [copilotText, setCopilotText] = useState('')

  // Async job tracking
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)
  const [pendingJobLabel, setPendingJobLabel] = useState('')
  const { data: jobData } = useJobStatus(pendingJobId)

  // Process async job completion
  const handleJobResult = (job: AsyncJobData | undefined) => {
    if (!job || !pendingJobId) return
    if (job.status === 'completed' && job.output_reference) {
      if (pendingJobLabel === 'narrative') setNarrativeText(job.output_reference)
      else if (pendingJobLabel === 'draft') setDraftText(job.output_reference)
      else if (pendingJobLabel === 'copilot') setCopilotText(job.output_reference)
      setPendingJobId(null)
      setPendingJobLabel('')
      showToast('AI generation complete', 'success')
    } else if (job.status === 'failed') {
      showToast(job.error_message || 'AI job failed', 'error')
      setPendingJobId(null)
      setPendingJobLabel('')
    }
  }

  // Check if job just completed (called during render to avoid effect lint issues)
  if (jobData && pendingJobId && (jobData.status === 'completed' || jobData.status === 'failed')) {
    // Defer state updates to avoid set-state-during-render
    setTimeout(() => handleJobResult(jobData), 0)
  }

  const isJobRunning = pendingJobId !== null && jobData?.status !== 'completed' && jobData?.status !== 'failed'

  const reportKeys = (availableReports || []).map(r => ({ key: r.key, label: r.label }))
  if (reportKeys.length === 0) reportKeys.push({ key: 'progress', label: 'Progress' })

  // Handles both sync (returns {text}) and async (returns {id, status}) responses
  const handleAIAction = async (
    label: string,
    action: () => Promise<Record<string, unknown>>,
  ) => {
    try {
      const result = await action()
      // Check if this is an async job response (has status field)
      if (result.id && result.status && typeof result.status === 'string' && ['pending', 'running'].includes(result.status)) {
        setPendingJobId(result.id as string)
        setPendingJobLabel(label)
        showToast('AI job submitted -- processing...', 'info')
      } else {
        // Sync response with text
        const text = (result.text as string) || ''
        if (label === 'narrative') setNarrativeText(text)
        else if (label === 'draft') setDraftText(text)
        else if (label === 'copilot') { setCopilotText(text); setQuestion('') }
      }
    } catch {
      showToast(`${label} generation failed`, 'error')
    }
  }

  return (
    <div>
      <PageHeader title="AI Assistant" icon="&#129302;">
        <StatusBadge text="Gemini" color="#8b5cf6" />
        <span className="text-[11px] text-bp-muted">AI assists with narrative and summaries -- deterministic data remains authoritative</span>
      </PageHeader>

      {/* Async job banner */}
      {isJobRunning && (
        <SectionCard className="mb-4">
          <div className="flex items-center gap-3 text-xs">
            <div className="h-3 w-3 rounded-full bg-bp-accent animate-pulse" />
            <span className="text-bp-text font-medium">
              AI job running: {pendingJobLabel} ({jobData?.status || 'pending'})
            </span>
            <span className="text-bp-muted">Polling every 2s...</span>
          </div>
        </SectionCard>
      )}

      {!canUseAI ? (
        <SectionCard>
          <div className="py-6 text-center text-bp-muted text-sm">
            You do not have permission to use AI features on this project. Contact your project manager to request access.
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Feature 1: Narrative */}
            <SectionCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-bp-text">Cost & Schedule Narrative</h3>
                <ActionButton
                  variant="blue" size="sm"
                  onClick={() => handleAIAction('narrative', () => narrative.mutateAsync() as unknown as Promise<Record<string, unknown>>)}
                  disabled={narrative.isPending || isJobRunning}
                >
                  {narrative.isPending ? 'Generating...' : 'Generate'}
                </ActionButton>
              </div>
              <p className="text-[11px] text-bp-muted mb-2">
                Generates a management-ready status narrative from your project's schedule, cost, and risk data.
              </p>
              {narrativeText && (
                <div className="rounded bg-[#0d1526] p-3 text-xs text-bp-text leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-bp-border">
                  {narrativeText}
                </div>
              )}
            </SectionCard>

            {/* Feature 2: Report Draft */}
            <SectionCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-bp-text">AI Report Draft</h3>
                <div className="flex items-center gap-2">
                  <select className="text-xs" value={draftKey} onChange={e => setDraftKey(e.target.value)}>
                    {reportKeys.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                  <ActionButton
                    variant="blue" size="sm"
                    onClick={() => handleAIAction('draft', () => reportDraft.mutateAsync(draftKey) as unknown as Promise<Record<string, unknown>>)}
                    disabled={reportDraft.isPending || isJobRunning}
                  >
                    {reportDraft.isPending ? 'Drafting...' : 'Draft'}
                  </ActionButton>
                </div>
              </div>
              <p className="text-[11px] text-bp-muted mb-2">
                Produces a written summary from structured report data for formal project reporting.
              </p>
              {draftText && (
                <div className="rounded bg-[#0d1526] p-3 text-xs text-bp-text leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-bp-border">
                  {draftText}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Feature 3: Copilot */}
          <SectionCard>
            <h3 className="text-sm font-bold text-bp-text mb-2">Project Copilot</h3>
            <p className="text-[11px] text-bp-muted mb-3">
              Ask questions about this project. Answers are based on your project's structured data only.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                value={question} onChange={e => setQuestion(e.target.value)}
                placeholder="e.g. What is the current CPI and what does it mean for this project?"
                className="flex-1" maxLength={500}
                onKeyDown={e => {
                  if (e.key === 'Enter' && question.trim() && !copilot.isPending) {
                    handleAIAction('copilot', () => copilot.mutateAsync(question.trim()) as unknown as Promise<Record<string, unknown>>)
                  }
                }}
              />
              <ActionButton
                variant="green" size="sm"
                onClick={() => handleAIAction('copilot', () => copilot.mutateAsync(question.trim()) as unknown as Promise<Record<string, unknown>>)}
                disabled={copilot.isPending || !question.trim() || isJobRunning}
              >
                {copilot.isPending ? 'Thinking...' : 'Ask'}
              </ActionButton>
            </div>
            {copilotText && (
              <div className="rounded bg-[#0d1526] p-3 text-xs text-bp-text leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto border border-bp-border">
                {copilotText}
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* AI History */}
      {canViewAIHistory && (
        <>
          <h3 className="mt-6 mb-3 text-sm font-bold text-bp-text">AI Request History</h3>
          {historyLoading ? <LoadingState rows={3} /> : (
            history && history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-bp-border text-bp-muted">
                      <th className="py-1.5 text-left">Feature</th>
                      <th className="py-1.5 text-left">User</th>
                      <th className="py-1.5 text-left">Provider</th>
                      <th className="py-1.5 text-left">Status</th>
                      <th className="py-1.5 text-right">Duration</th>
                      <th className="py-1.5 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(log => (
                      <tr key={log.id} className="border-b border-bp-border/50">
                        <td className="py-1.5 capitalize">{log.feature.replace(/_/g, ' ')}</td>
                        <td className="py-1.5 text-bp-muted">{log.user_name}</td>
                        <td className="py-1.5"><span className="font-mono text-[10px] text-bp-accent">{log.model_id || log.provider}</span></td>
                        <td className="py-1.5">
                          <StatusBadge text={log.status} color={log.status === 'completed' ? '#22c55e' : log.status === 'failed' ? '#ef4444' : '#f59e0b'} />
                        </td>
                        <td className="py-1.5 text-right text-bp-muted">{log.duration_ms > 0 ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                        <td className="py-1.5 text-bp-muted">
                          {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="&#129302;" title="No AI requests yet" description="Generate a narrative, draft, or ask the copilot to see history here." />
            )
          )}
        </>
      )}
    </div>
  )
}
