import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/client'
import {
  ActionButton,
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../../components/ui'
import {
  useAIHistory,
  useAsyncCopilot,
  useAsyncNarrative,
  useAsyncReportDraft,
  useCopilotQuery,
  useGenerateNarrative,
  useGenerateReportDraft,
  useJobStatus,
  useProjectIntelligence,
  type AIWorkspaceIntelligence,
  type AsyncJobData,
} from '../../hooks/useAI'
import { useAvailableReports } from '../../hooks/useReports'
import { buildAIWorkspaceHtmlReport } from '../../lib/aiExports'
import { downloadText } from '../../lib/download'
import { formatUGX } from '../../lib/formatters'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUIStore } from '../../stores/uiStore'

const healthColors = {
  healthy: '#22c55e',
  watch: '#f59e0b',
  critical: '#ef4444',
} as const

const actionColors = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
} as const

function HealthTile({
  title,
  item,
}: {
  title: string
  item: AIWorkspaceIntelligence['health']['overall']
}) {
  return (
    <div
      className="rounded-[18px] border p-4"
      style={{
        borderColor: `${healthColors[item.state]}55`,
        background: `linear-gradient(180deg, ${healthColors[item.state]}18 0%, rgba(15, 23, 42, 0.06) 100%)`,
      }}
    >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-bp-muted">{title}</div>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: healthColors[item.state] }} />
        <div className="text-sm font-semibold text-bp-text">{item.label}</div>
      </div>
      <p className="text-xs leading-relaxed text-bp-muted">{item.reason}</p>
    </div>
  )
}

function HighlightCard({ label, value, detail, tone }: AIWorkspaceIntelligence['highlights'][number]) {
  return (
    <div
      className="rounded-[18px] border p-4"
      style={{
        borderColor: `${healthColors[tone]}55`,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(10,16,28,0.92) 100%)',
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      <div className="mt-2 text-xs leading-relaxed text-white/72">{detail}</div>
    </div>
  )
}

function SimpleBarChart({
  title,
  items,
  emptyText,
}: {
  title: string
  items: Array<{ label: string; value: number; color: string }>
  emptyText: string
}) {
  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <SectionCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-bp-text">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="py-10 text-center text-xs text-bp-muted">{emptyText}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-bp-muted">{item.label}</span>
                <span className="font-mono font-semibold text-bp-text">{item.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800/70">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(6, (item.value / max) * 100)}%`, background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function BudgetComparisonChart({
  items,
}: {
  items: AIWorkspaceIntelligence['charts']['budget_categories']
}) {
  const max = Math.max(...items.map((item) => item.budget), 1)

  return (
    <SectionCard>
      <h3 className="mb-4 text-sm font-bold text-bp-text">Budget vs Actual Cost</h3>
      {items.length === 0 ? (
        <div className="py-10 text-center text-xs text-bp-muted">No budget categories are available yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-bp-muted">{item.label}</span>
                <span className="font-mono text-bp-text">
                  {formatUGX(item.actual)} / {formatUGX(item.budget)}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-slate-800/75">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-blue-400/35"
                  style={{ width: `${Math.max(6, (item.budget / max) * 100)}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Math.max(6, (item.actual / max) * 100)}%`,
                    background: item.variance >= 0 ? '#22c55e' : '#f97316',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function EvmIndexCard({
  items,
}: {
  items: AIWorkspaceIntelligence['charts']['evm_indices']
}) {
  return (
    <SectionCard>
      <h3 className="mb-4 text-sm font-bold text-bp-text">Delivery Indices</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const ratio = Math.min(item.value / Math.max(item.target, 0.1), 1.35)
          return (
            <div key={item.label} className="rounded-[16px] border border-bp-border bg-bp-surface p-4">
              <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-bp-muted">{item.label}</div>
              <div className="mb-3 flex items-end gap-2">
                <span className="font-mono text-2xl font-bold" style={{ color: item.color }}>
                  {item.value.toFixed(2)}
                </span>
                <span className="pb-1 text-xs text-bp-muted">target {item.target.toFixed(2)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800/75">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(8, ratio * 74)}%`, background: item.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function OutputSurface({
  title,
  subtitle,
  action,
  output,
}: {
  title: string
  subtitle: string
  action: ReactNode
  output: string
}) {
  return (
    <SectionCard>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-bp-text">{title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-bp-muted">{subtitle}</p>
        </div>
        {action}
      </div>
      {output ? (
        <div className="max-h-[360px] overflow-y-auto rounded-[16px] border border-bp-border bg-slate-950/80 p-4 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
          {output}
        </div>
      ) : (
        <div className="rounded-[16px] border border-dashed border-bp-border bg-bp-surface px-4 py-8 text-center text-xs text-bp-muted">
          Generated output will appear here.
        </div>
      )}
    </SectionCard>
  )
}

export function AIAssistantPage() {
  const { projectId } = useParams()
  const { showToast } = useUIStore()
  const { canUseAI, canViewAIHistory, canViewReports } = useProjectPermissions(projectId)

  const [asyncMode, setAsyncMode] = useState(false)
  const [narrativeText, setNarrativeText] = useState('')
  const [draftText, setDraftText] = useState('')
  const [draftKey, setDraftKey] = useState('progress')
  const [question, setQuestion] = useState('')
  const [copilotText, setCopilotText] = useState('')
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)
  const [pendingJobLabel, setPendingJobLabel] = useState('')

  const { data: intelligence, isLoading: loadingIntelligence } = useProjectIntelligence(projectId, canUseAI)
  const { data: availableReports } = useAvailableReports(projectId, canViewReports)
  const { data: history, isLoading: historyLoading } = useAIHistory(projectId, canViewAIHistory)
  const { data: jobData } = useJobStatus(pendingJobId)

  const narrativeSync = useGenerateNarrative(projectId)
  const draftSync = useGenerateReportDraft(projectId)
  const copilotSync = useCopilotQuery(projectId)

  const narrativeAsync = useAsyncNarrative(projectId)
  const draftAsync = useAsyncReportDraft(projectId)
  const copilotAsync = useAsyncCopilot(projectId)

  useEffect(() => {
    if (!jobData || !pendingJobId) return
    if (jobData.status === 'completed' && jobData.output_reference) {
      if (pendingJobLabel === 'narrative') setNarrativeText(jobData.output_reference)
      if (pendingJobLabel === 'draft') setDraftText(jobData.output_reference)
      if (pendingJobLabel === 'copilot') setCopilotText(jobData.output_reference)
      setPendingJobId(null)
      setPendingJobLabel('')
      showToast('AI generation complete', 'success')
    }
    if (jobData.status === 'failed') {
      showToast(jobData.error_message || 'AI job failed. Is the worker running?', 'error')
      setPendingJobId(null)
      setPendingJobLabel('')
    }
  }, [jobData, pendingJobId, pendingJobLabel, showToast])

  const reportKeys = useMemo(() => {
    const keys = (availableReports || []).map((report) => ({ key: report.key, label: report.label }))
    return keys.length ? keys : [{ key: 'progress', label: 'Progress' }]
  }, [availableReports])

  const isJobPending = pendingJobId !== null && (!jobData || jobData.status === 'pending' || jobData.status === 'running')
  const isBusy = narrativeSync.isPending || draftSync.isPending || copilotSync.isPending ||
    narrativeAsync.isPending || draftAsync.isPending || copilotAsync.isPending || isJobPending

  const runAI = async (
    label: string,
    syncAction: () => Promise<{ text: string }>,
    asyncAction: () => Promise<AsyncJobData>,
  ) => {
    if (asyncMode) {
      try {
        const job = await asyncAction()
        setPendingJobId(job.id)
        setPendingJobLabel(label)
        showToast('Background AI job submitted', 'info')
      } catch (error) {
        showToast(getApiErrorMessage(error, `${label} failed. Check that the worker is running.`), 'error')
      }
      return
    }

    try {
      const result = await syncAction()
      if (label === 'narrative') setNarrativeText(result.text)
      if (label === 'draft') setDraftText(result.text)
      if (label === 'copilot') {
        setCopilotText(result.text)
        setQuestion('')
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, `${label} generation failed`), 'error')
    }
  }

  const exportHtml = () => {
    if (!intelligence) return
    const html = buildAIWorkspaceHtmlReport(intelligence, {
      executiveBrief: narrativeText,
      reportDraft: draftText,
      copilotAnswer: copilotText,
    })
    downloadText(html, `${intelligence.project.code.toLowerCase()}-ai-workspace.html`, 'text/html;charset=utf-8')
  }

  const exportJson = () => {
    if (!intelligence) return
    downloadText(
      JSON.stringify(
        {
          intelligence,
          generated_output: {
            executive_brief: narrativeText,
            report_draft: draftText,
            latest_copilot_answer: copilotText,
          },
        },
        null,
        2,
      ),
      `${intelligence.project.code.toLowerCase()}-ai-workspace.json`,
      'application/json;charset=utf-8',
    )
  }

  if (!canUseAI) {
    return (
      <SectionCard>
        <div className="py-8 text-center text-sm text-bp-muted">
          You do not have permission to use AI features on this project.
        </div>
      </SectionCard>
    )
  }

  return (
    <div>
      <PageHeader title="AI Command Center" icon="&#129504;">
        <StatusBadge text={asyncMode ? 'Worker Mode' : 'Direct Mode'} color={asyncMode ? '#22c55e' : '#38bdf8'} />
        <ActionButton variant="ghost" size="sm" onClick={() => setAsyncMode((current) => !current)}>
          {asyncMode ? 'Use Direct AI' : 'Use Worker AI'}
        </ActionButton>
        <ActionButton variant="blue" size="sm" onClick={exportHtml} disabled={!intelligence}>
          Download HTML
        </ActionButton>
        <ActionButton variant="ghost" size="sm" onClick={exportJson} disabled={!intelligence}>
          Download JSON
        </ActionButton>
      </PageHeader>

      {asyncMode && (
        <SectionCard className="mb-4">
          <div className="text-xs leading-relaxed text-bp-muted">
            Worker mode sends AI tasks through Celery. If Redis or the worker is unavailable, switch back to direct mode.
          </div>
        </SectionCard>
      )}

      {isJobPending && (
        <SectionCard className="mb-4">
          <div className="flex items-center gap-3 text-xs">
            <div className="h-3 w-3 animate-pulse rounded-full bg-bp-accent" />
            <span className="font-medium text-bp-text">
              Background job running: {pendingJobLabel} ({jobData?.status || 'submitting'})
            </span>
            <span className="text-bp-muted">Polling every 2 seconds</span>
          </div>
        </SectionCard>
      )}

      {loadingIntelligence ? (
        <LoadingState rows={8} />
      ) : intelligence ? (
        <>
          <div
            className="mb-5 overflow-hidden rounded-[26px] border border-white/10"
            style={{
              background: 'linear-gradient(135deg, rgba(8,47,73,0.96) 0%, rgba(15,23,42,0.98) 55%, rgba(245,158,11,0.88) 130%)',
              boxShadow: '0 28px 80px rgba(2, 6, 23, 0.3)',
            }}
          >
            <div className="grid gap-5 p-6 lg:grid-cols-[1.45fr_0.95fr]">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge text={intelligence.health.overall.label} color={healthColors[intelligence.health.overall.state]} />
                  <StatusBadge text={intelligence.project.status_display} color="#38bdf8" />
                  <StatusBadge text={`${intelligence.overview.schedule.overall_progress}% progress`} color="#f59e0b" />
                </div>
                <div className="max-w-3xl text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  BuildPro Intelligence Workspace
                </div>
                <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.45rem)] font-black leading-tight text-white">
                  {intelligence.project.name}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/84">
                  {intelligence.narrative.headline}
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/72">
                  {intelligence.narrative.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {intelligence.suggested_questions.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setQuestion(prompt)
                        runAI('copilot', () => copilotSync.mutateAsync(prompt), () => copilotAsync.mutateAsync(prompt))
                      }}
                      className="cursor-pointer rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-left text-[11px] text-white/90 transition hover:bg-white/14"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <HealthTile title="Schedule" item={intelligence.health.schedule} />
                <HealthTile title="Cost" item={intelligence.health.cost} />
                <HealthTile title="Risk" item={intelligence.health.risk} />
                <HealthTile title="Operations" item={intelligence.health.operations} />
              </div>
            </div>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {intelligence.highlights.map((item) => (
              <HighlightCard key={item.label} {...item} />
            ))}
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <SimpleBarChart
              title="Progress Distribution"
              items={intelligence.charts.progress_distribution}
              emptyText="No schedule data is available yet."
            />
            <EvmIndexCard items={intelligence.charts.evm_indices} />
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <BudgetComparisonChart items={intelligence.charts.budget_categories} />
            <SimpleBarChart
              title="Risk Profile"
              items={intelligence.charts.risk_mix}
              emptyText="Risk information is not available for this project."
            />
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-bp-text">Recommended Actions</h3>
                <StatusBadge text={`${intelligence.recommended_actions.length} focus areas`} color="#38bdf8" />
              </div>
              <div className="space-y-3">
                {intelligence.recommended_actions.map((action, index) => (
                  <div
                    key={`${action.title}-${index}`}
                    className="rounded-[16px] border p-4"
                    style={{
                      borderColor: `${actionColors[action.priority]}44`,
                      background: `linear-gradient(180deg, ${actionColors[action.priority]}12 0%, rgba(15,23,42,0.02) 100%)`,
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <StatusBadge text={action.priority} color={actionColors[action.priority]} />
                      <div className="text-sm font-semibold text-bp-text">{action.title}</div>
                    </div>
                    <p className="text-xs leading-relaxed text-bp-muted">{action.detail}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <h3 className="mb-4 text-sm font-bold text-bp-text">Control Room</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[16px] border border-bp-border bg-bp-surface p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-bp-muted">Operations</div>
                  <div className="mt-2 text-2xl font-bold text-bp-text">{intelligence.module_summaries.operations.daily_logs}</div>
                  <div className="mt-2 text-xs leading-relaxed text-bp-muted">
                    {intelligence.module_summaries.operations.open_rfis} open RFIs and {intelligence.module_summaries.operations.pending_quality_checks} active quality checks.
                  </div>
                </div>
                <div className="rounded-[16px] border border-bp-border bg-bp-surface p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-bp-muted">Procurement</div>
                  <div className="mt-2 text-2xl font-bold text-bp-text">{intelligence.module_summaries.procurement.purchase_orders}</div>
                  <div className="mt-2 text-xs leading-relaxed text-bp-muted">
                    {intelligence.module_summaries.procurement.open_purchase_orders} open POs and {intelligence.module_summaries.procurement.pending_invoices} pending invoices.
                  </div>
                </div>
                <div className="rounded-[16px] border border-bp-border bg-bp-surface p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-bp-muted">Documents</div>
                  <div className="mt-2 text-2xl font-bold text-bp-text">{intelligence.module_summaries.documents.documents}</div>
                  <div className="mt-2 text-xs leading-relaxed text-bp-muted">
                    Latest upload: {intelligence.module_summaries.documents.latest_upload ? new Date(intelligence.module_summaries.documents.latest_upload).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not available'}.
                  </div>
                </div>
                <div className="rounded-[16px] border border-bp-border bg-bp-surface p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-bp-muted">Meetings</div>
                  <div className="mt-2 text-2xl font-bold text-bp-text">{intelligence.module_summaries.communications.meetings}</div>
                  <div className="mt-2 text-xs leading-relaxed text-bp-muted">
                    {intelligence.module_summaries.communications.open_actions} open actions and {intelligence.module_summaries.communications.overdue_actions} overdue follow-ups.
                  </div>
                </div>
              </div>
              {intelligence.overview.schedule.critical_path.length > 0 && (
                <div className="mt-4 rounded-[16px] border border-red-500/25 bg-red-500/8 p-4">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-red-300">Critical Path</div>
                  <div className="text-sm font-medium text-bp-text">
                    {intelligence.overview.schedule.critical_path.join(' -> ')}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-2">
            <OutputSurface
              title="Executive Brief"
              subtitle="Generate a management-ready summary from live cost, schedule, and risk data."
              action={(
                <ActionButton
                  variant="blue"
                  size="sm"
                  onClick={() => runAI('narrative', () => narrativeSync.mutateAsync(), () => narrativeAsync.mutateAsync())}
                  disabled={isBusy}
                >
                  {narrativeSync.isPending || narrativeAsync.isPending ? 'Generating...' : 'Generate Brief'}
                </ActionButton>
              )}
              output={narrativeText}
            />

            {canViewReports ? (
              <OutputSurface
                title="AI Report Draft"
                subtitle="Draft a formal report paragraph set from one of the structured project reports."
                action={(
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-md border border-bp-border bg-bp-surface px-2 py-1.5 text-xs text-bp-text"
                      value={draftKey}
                      onChange={(event) => setDraftKey(event.target.value)}
                    >
                      {reportKeys.map((report) => (
                        <option key={report.key} value={report.key}>{report.label}</option>
                      ))}
                    </select>
                    <ActionButton
                      variant="blue"
                      size="sm"
                      onClick={() => runAI('draft', () => draftSync.mutateAsync(draftKey), () => draftAsync.mutateAsync(draftKey))}
                      disabled={isBusy}
                    >
                      {draftSync.isPending || draftAsync.isPending ? 'Drafting...' : 'Draft'}
                    </ActionButton>
                  </div>
                )}
                output={draftText}
              />
            ) : (
              <SectionCard>
                <div className="mb-2 text-sm font-bold text-bp-text">AI Report Draft</div>
                <div className="rounded-[16px] border border-dashed border-bp-border bg-bp-surface px-4 py-8 text-center text-xs text-bp-muted">
                  Reports access is required to generate structured AI report drafts for this project.
                </div>
              </SectionCard>
            )}
          </div>

          <SectionCard className="mb-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-bp-text">Copilot Conversation</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-bp-muted">
                  Ask the assistant about this project’s schedule, cost, field operations, risks, procurement, or recommended next steps.
                </p>
              </div>
              <ActionButton
                variant="green"
                size="sm"
                onClick={() => runAI('copilot', () => copilotSync.mutateAsync(question.trim()), () => copilotAsync.mutateAsync(question.trim()))}
                disabled={isBusy || !question.trim()}
              >
                {copilotSync.isPending || copilotAsync.isPending ? 'Thinking...' : 'Ask'}
              </ActionButton>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {intelligence.suggested_questions.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setQuestion(prompt)}
                  className="cursor-pointer rounded-full border border-bp-border bg-bp-surface px-3 py-1.5 text-[11px] text-bp-text transition hover:border-bp-accent hover:text-bp-accent"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mb-4 flex gap-2">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="For example: What should management do this week to improve SPI and reduce cost pressure?"
                className="min-h-[104px] flex-1 resize-y rounded-[16px] border border-bp-border bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-bp-accent"
                maxLength={500}
              />
            </div>
            {copilotText ? (
              <div className="rounded-[16px] border border-bp-border bg-slate-950/80 p-4 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
                {copilotText}
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-bp-border bg-bp-surface px-4 py-8 text-center text-xs text-bp-muted">
                Your latest copilot answer will appear here.
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <EmptyState
          icon="&#129302;"
          title="AI workspace unavailable"
          description="The structured intelligence snapshot could not be loaded for this project."
        />
      )}

      {canViewAIHistory && (
        <>
          <h3 className="mb-3 text-sm font-bold text-bp-text">AI Request History</h3>
          {historyLoading ? (
            <LoadingState rows={3} />
          ) : history && history.length > 0 ? (
            <SectionCard padding="none">
              <div className="overflow-x-auto px-4 py-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-bp-border text-left text-bp-muted">
                      <th className="py-2">Feature</th>
                      <th className="py-2">User</th>
                      <th className="py-2">Provider</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Duration</th>
                      <th className="py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((log) => (
                      <tr key={log.id} className="border-b border-bp-border/50">
                        <td className="py-2 capitalize">{log.feature.replace(/_/g, ' ')}</td>
                        <td className="py-2 text-bp-muted">{log.user_name}</td>
                        <td className="py-2">
                          <span className="font-mono text-[10px] text-bp-accent">{log.model_id || log.provider}</span>
                        </td>
                        <td className="py-2">
                          <StatusBadge
                            text={log.status}
                            color={log.status === 'completed' ? '#22c55e' : log.status === 'failed' ? '#ef4444' : '#f59e0b'}
                          />
                        </td>
                        <td className="py-2 text-right text-bp-muted">
                          {log.duration_ms > 0 ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                        </td>
                        <td className="py-2 text-bp-muted">
                          {new Date(log.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : (
            <EmptyState
              icon="&#129302;"
              title="No AI requests yet"
              description="Generate a brief, a report draft, or ask the copilot to build your AI activity history."
            />
          )}
        </>
      )}
    </div>
  )
}
