/**
 * Reports hooks -- available reports, generate export, export history.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { triggerDownload } from '../lib/download'

export interface AvailableReport {
  key: string
  label: string
  formats: string[]
}

export interface ExportHistoryItem {
  id: string
  organisation: string
  project: string | null
  scope: string
  scope_display: string
  report_key: string
  report_key_display: string
  format: string
  format_display: string
  status: string
  status_display: string
  row_count: number
  file_name: string
  created_by_name: string
  download_available?: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Inline report data (JSON, for the report viewer table)
// ---------------------------------------------------------------------------

export interface ReportData {
  title: string
  headers: string[]
  rows: (string | number)[][]
  summary?: string
}

export function useReportData(projectId: string | undefined, reportKey: string) {
  return useQuery({
    queryKey: ['reports', projectId, 'data', reportKey],
    queryFn: async () => {
      const { data } = await api.get<ReportData>(`/reports/${projectId}/data/?key=${reportKey}`)
      return data
    },
    enabled: !!projectId && !!reportKey,
    staleTime: 30000,
  })
}

// ---------------------------------------------------------------------------
// Available reports & export
// ---------------------------------------------------------------------------

export function useAvailableReports(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['reports', projectId, 'available'],
    queryFn: async () => {
      const { data } = await api.get<AvailableReport[]>(`/reports/${projectId}/available/`)
      return data
    },
    enabled: !!projectId && enabled,
  })
}

export function useExportHistory(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['reports', projectId, 'history'],
    queryFn: async () => {
      const { data } = await api.get<ExportHistoryItem[]>(`/reports/${projectId}/history/`)
      return data
    },
    enabled: !!projectId && enabled,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFilename(response: { headers: any }, fallback: string): string {
  const disposition = response.headers['content-disposition'] || ''
  const match = disposition.match(/filename="?([^";\n]+)"?/)
  return match ? match[1] : fallback
}

export function useGenerateExport(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { report_key: string; format: string }) => {
      const response = await api.post(`/reports/${projectId}/generate/`, d, {
        responseType: 'blob',
      })
      const ext = { csv: '.csv', xlsx: '.xlsx', pdf: '.pdf', docx: '.docx' }[d.format] || '.csv'
      const filename = parseFilename(response, `${d.report_key}${ext}`)
      triggerDownload(new Blob([response.data]), filename)
      return { success: true }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['reports', projectId, 'history'] }),
  })
}

export function useRedownloadExport(projectId: string) {
  return useMutation({
    mutationFn: async (exportItem: ExportHistoryItem) => {
      const response = await api.get(`/reports/${projectId}/history/${exportItem.id}/download/`, {
        responseType: 'blob',
      })
      const filename = parseFilename(response, exportItem.file_name)
      triggerDownload(new Blob([response.data]), filename)
      return { success: true }
    },
  })
}
