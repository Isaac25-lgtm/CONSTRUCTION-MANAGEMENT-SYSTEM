/**
 * Resource hooks -- resources list, project resource assignments.
 *
 * All interfaces match backend serializer field names exactly.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

/* ------------------------------------------------------------------ */
/* Interfaces                                                          */
/* ------------------------------------------------------------------ */

export interface ResourceData {
  id: string
  organisation: string
  code: string
  resource_type: string
  resource_type_display: string
  name: string
  role: string
  daily_rate: string
  status: string
  status_display: string
  phone: string
  notes: string
  created_at: string
  updated_at: string
}

export interface ResourceAssignmentData {
  id: string
  project: string
  resource: string
  resource_name: string | null
  resource_code: string | null
  assignment_role: string
  assigned_from: string
  assigned_to: string | null
  status: string
  status_display: string
  notes: string
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useResources() {
  return useQuery({
    queryKey: ['resources', 'resources'],
    queryFn: async () => {
      const { data } = await api.get<ResourceData[]>('/resources/resources/')
      return data
    },
  })
}

export function useResourceAssignments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['resources', projectId, 'resource-assignments'],
    queryFn: async () => {
      const { data } = await api.get<ResourceAssignmentData[]>(
        `/resources/${projectId}/resource-assignments/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateAssignment(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: {
      resource: string
      assignment_role: string
      assigned_from: string
      assigned_to?: string
      status?: string
      notes?: string
    }) => {
      const { data } = await api.post(
        `/resources/${projectId}/resource-assignments/`,
        d,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['resources', projectId] }),
  })
}
