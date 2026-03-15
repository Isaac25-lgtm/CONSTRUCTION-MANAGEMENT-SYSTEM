/**
 * Labour hooks -- timesheet entries.
 *
 * All interfaces match backend serializer field names exactly.
 * Uses work_date (not date), includes resource_name and total_hours.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

/* ------------------------------------------------------------------ */
/* Interfaces                                                          */
/* ------------------------------------------------------------------ */

export interface TimesheetData {
  id: string
  project: string
  resource: string
  resource_name: string | null
  task: string | null
  work_date: string
  hours: number
  overtime_hours: number
  total_hours: number
  description: string
  status: string
  status_display: string
  approved_by: string | null
  approved_by_name: string | null
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useTimesheets(projectId: string | undefined) {
  return useQuery({
    queryKey: ['labour', projectId, 'timesheets'],
    queryFn: async () => {
      const { data } = await api.get<TimesheetData[]>(
        `/labour/${projectId}/timesheets/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateTimesheet(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: {
      resource: string
      task?: string
      work_date: string
      hours: number
      overtime_hours?: number
      description?: string
      status?: string
      approved_by?: string
    }) => {
      const { data } = await api.post(
        `/labour/${projectId}/timesheets/`,
        d,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['labour', projectId] }),
  })
}

export function useUpdateTimesheet(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...d }: {
      id: string
      resource?: string
      task?: string
      work_date?: string
      hours?: number
      overtime_hours?: number
      description?: string
      status?: string
      approved_by?: string
    }) => {
      const { data } = await api.patch(
        `/labour/${projectId}/timesheets/${id}/`,
        d,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['labour', projectId] }),
  })
}
