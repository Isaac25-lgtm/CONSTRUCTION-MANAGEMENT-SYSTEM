/**
 * Documents hooks -- project documents, versions, uploads, summary.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface DocumentVersionData {
  id: string
  document: string
  version_number: number
  version_label: string
  original_filename: string
  file_size: number
  content_type: string
  notes: string
  approval_status: string
  approval_status_display: string
  issue_purpose: string
  issue_purpose_display: string
  effective_date: string | null
  supersedes: string | null
  uploaded_by_name: string
  download_url: string
  created_at: string
}

export interface DocumentData {
  id: string
  project: string
  organisation: string
  code: string
  title: string
  name: string
  category: string
  category_display: string
  discipline: string
  discipline_display: string
  description: string
  status: string
  status_display: string
  notes: string
  current_version_number: number
  latest_file_name: string
  latest_file_size: number
  latest_content_type: string
  last_uploaded_at: string | null
  versions_count: number
  latest_version: DocumentVersionData | null
  latest_download_url: string
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface DocumentSummary {
  total_documents: number
  total_versions: number
  total_size: number
  categories: { key: string; label: string; count: number }[]
  recent: DocumentData[]
}

export function useDocuments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['documents', projectId, 'list'],
    queryFn: async () => {
      const { data } = await api.get<DocumentData[]>(`/documents/${projectId}/documents/`)
      return data
    },
    enabled: !!projectId,
  })
}

export function useDocumentSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['documents', projectId, 'summary'],
    queryFn: async () => {
      const { data } = await api.get<DocumentSummary>(`/documents/${projectId}/summary/`)
      return data
    },
    enabled: !!projectId,
  })
}

export function useDocumentVersions(projectId: string | undefined, documentId: string | undefined) {
  return useQuery({
    queryKey: ['documents', projectId, 'versions', documentId],
    queryFn: async () => {
      const { data } = await api.get<DocumentVersionData[]>(`/documents/${projectId}/documents/${documentId}/versions/`)
      return data
    },
    enabled: !!projectId && !!documentId,
  })
}

export function useUploadDocument(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post(`/documents/${projectId}/documents/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', projectId] }),
  })
}

export function useUploadVersion(projectId: string, documentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post(`/documents/${projectId}/documents/${documentId}/versions/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', projectId] }),
  })
}

export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (documentId: string) => {
      await api.delete(`/documents/${projectId}/documents/${documentId}/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', projectId] }),
  })
}
