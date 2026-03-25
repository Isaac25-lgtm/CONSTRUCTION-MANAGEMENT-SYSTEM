import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export interface AIResponse {
  text: string
  log_id?: string
}

export interface AIHealthItem {
  state: 'healthy' | 'watch' | 'critical'
  label: string
  reason: string
}

export interface AIHighlight {
  label: string
  value: string
  tone: 'healthy' | 'watch' | 'critical'
  detail: string
}

export interface AIPieDatum {
  label: string
  value: number
  color: string
}

export interface AIEvmDatum {
  label: string
  value: number
  target: number
  color: string
}

export interface AIBudgetDatum {
  label: string
  budget: number
  actual: number
  variance: number
  color: string
}

export interface AIModuleRiskSummary {
  visible: boolean
  total: number
  open: number
  open_high_impact: number
  impact_breakdown: AIPieDatum[]
  top_items: Array<{ code: string; title: string; impact: string; status: string }>
}

export interface AIModuleOperationsSummary {
  visible: boolean
  rfis: number
  open_rfis: number
  overdue_rfis: number
  change_orders: number
  pending_changes: number
  daily_logs: number
  open_safety_incidents: number
  pending_quality_checks: number
}

export interface AIModuleProcurementSummary {
  visible: boolean
  purchase_orders: number
  open_purchase_orders: number
  pending_invoices: number
}

export interface AIModuleDocumentsSummary {
  visible: boolean
  documents: number
  latest_upload: string | null
}

export interface AIModuleCommunicationsSummary {
  visible: boolean
  meetings: number
  open_actions: number
  overdue_actions: number
}

export interface AIWorkspaceIntelligence {
  project: {
    id: string
    code: string
    name: string
    status: string
    status_display: string
    location: string
    start_date: string | null
    end_date: string | null
    budget: number
    client_name: string
    consultant: string
  }
  health: Record<'overall' | 'schedule' | 'cost' | 'risk' | 'operations', AIHealthItem>
  highlights: AIHighlight[]
  module_summaries: {
    risks: AIModuleRiskSummary
    operations: AIModuleOperationsSummary
    procurement: AIModuleProcurementSummary
    documents: AIModuleDocumentsSummary
    communications: AIModuleCommunicationsSummary
  }
  charts: {
    progress_distribution: AIPieDatum[]
    evm_indices: AIEvmDatum[]
    budget_categories: AIBudgetDatum[]
    risk_mix: AIPieDatum[]
  }
  recommended_actions: Array<{ priority: 'critical' | 'high' | 'medium' | 'low'; title: string; detail: string }>
  suggested_questions: string[]
  narrative: {
    headline: string
    summary: string
    guidance: string
  }
  overview: {
    schedule: {
      total_tasks: number
      completed: number
      in_progress: number
      delayed: number
      critical_count: number
      project_duration: number
      overall_progress: number
      critical_path: string[]
    }
    milestones: {
      total: number
      achieved: number
      pending: number
      items: Array<{ name: string; status: string; target_date: string | null }>
    }
    cost: {
      total_budget: number
      total_actual: number
      variance: number
      is_over_budget: boolean
      budget_utilisation: number
      budget_lines_count: number
      expenses_count: number
      category_breakdown: Record<string, { budget: number; actual: number; variance: number }>
    }
    evm: {
      bac: number
      bcwp: number
      bcws: number
      acwp: number
      cpi: number
      spi: number
      eac: number
      vac: number
      has_baseline: boolean
      overall_progress: number
    }
  }
}

export interface AsyncJobData {
  id: string
  job_type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output_reference: string
  error_message: string
  created_at: string
  completed_at: string | null
}

/**
 * Sync AI hooks -- call endpoint directly, wait for response.
 * Used when no Celery worker is running.
 */
export function useGenerateNarrative(projectId: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AIResponse>(`/ai/${projectId}/narrative/`)
      return data
    },
  })
}

export function useProjectIntelligence(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['ai-intelligence', projectId],
    queryFn: async () => {
      const { data } = await api.get<AIWorkspaceIntelligence>(`/ai/${projectId}/intelligence/`)
      return data
    },
    enabled: !!projectId && enabled,
    staleTime: 1000 * 60,
  })
}

export function useGenerateReportDraft(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (reportKey: string) => {
      const { data } = await api.post<AIResponse>(`/ai/${projectId}/report-draft/`, { report_key: reportKey })
      return data
    },
  })
}

export function useCopilotQuery(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (question: string) => {
      const { data } = await api.post<AIResponse>(`/ai/${projectId}/copilot/`, { question })
      return data
    },
  })
}

/**
 * Async AI hooks -- call endpoint with ?async=true, get job ID back.
 * Requires Celery worker + Redis/Key Value running.
 */
export function useAsyncNarrative(projectId: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AsyncJobData>(`/ai/${projectId}/narrative/?async=true`)
      return data
    },
  })
}

export function useAsyncReportDraft(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (reportKey: string) => {
      const { data } = await api.post<AsyncJobData>(`/ai/${projectId}/report-draft/?async=true`, { report_key: reportKey })
      return data
    },
  })
}

export function useAsyncCopilot(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (question: string) => {
      const { data } = await api.post<AsyncJobData>(`/ai/${projectId}/copilot/?async=true`, { question })
      return data
    },
  })
}

/**
 * Job status polling -- polls every 2s until completed or failed.
 */
export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data } = await api.get<AsyncJobData>(`/ai/jobs/${jobId}/`)
      return data
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 2000
    },
  })
}

export interface AILogEntry {
  id: string
  user_name: string
  feature: string
  provider: string
  model_id: string
  status: string
  request_summary: string
  response_summary: string
  duration_ms: number
  created_at: string
}

export function useAIHistory(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['ai-history', projectId],
    queryFn: async () => {
      const { data } = await api.get<AILogEntry[]>(`/ai/${projectId}/history/`)
      return data
    },
    enabled: !!projectId && enabled,
  })
}
