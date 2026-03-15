import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export interface AIResponse {
  text: string
  log_id?: string
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

export function useGenerateNarrative(projectId: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AIResponse>(`/ai/${projectId}/narrative/`)
      return data
    },
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
      return 2000 // poll every 2s while pending/running
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

export function useAIHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ['ai-history', projectId],
    queryFn: async () => {
      const { data } = await api.get<AILogEntry[]>(`/ai/${projectId}/history/`)
      return data
    },
    enabled: !!projectId,
  })
}
