/**
 * Schedule hooks -- tasks, dependencies, milestones, CPM, Gantt, Network, S-Curve, baselines.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface Task {
  id: string; project: string; parent: string | null; code: string; name: string
  description: string; phase: string; duration_days: number
  planned_start: string | null; planned_end: string | null
  early_start: number; early_finish: number; late_start: number; late_finish: number
  total_float: number; is_critical: boolean; progress: number
  status: string; status_display: string; resource: string; budget: string
  sort_order: number; is_parent: boolean; predecessor_codes: string[]
}

export interface MilestoneData {
  id: string; name: string; code: string; description: string
  target_date: string | null; actual_date: string | null
  status: string; status_display: string
  linked_task: string | null; linked_task_code: string | null; sort_order: number
}

export interface ScheduleSummary {
  total_tasks: number; completed: number; in_progress: number; delayed: number
  critical_count: number; project_duration: number; overall_progress: number; critical_path: string[]
}

export interface GanttData {
  tasks: Array<{ id: string; code: string; name: string; phase: string; start: number; end: number; duration: number; progress: number; is_critical: boolean; is_parent: boolean; is_milestone: boolean }>
  dependencies: Array<{ from: string; to: string; type: string }>
  milestones: Array<{ name: string; task_code: string | null; day: number | null; status: string }>
  project_duration: number; project_start: string | null
}

export interface NetworkNode {
  id: string; code: string; name: string; duration: number
  es: number; ef: number; ls: number; lf: number; slack: number
  is_critical: boolean; progress: number
}
export interface NetworkEdge { from: string; to: string; type: string; lag: number }
export interface NetworkData { nodes: NetworkNode[]; edges: NetworkEdge[] }

export interface SCurveData {
  planned: Array<{ day: number; value: number }>
  actual: Array<{ day: number; value: number }>
  project_duration: number
}

export interface BaselineData {
  id: string; name: string; version: number; is_active: boolean
  notes: string; snapshot_count: number; created_at: string
}

export interface TaskCreateInput extends Partial<Task> {
  predecessors?: string
}

// --- Tasks ---
export function useTasks(projectId: string | undefined) {
  return useQuery({ queryKey: ['schedule', projectId, 'tasks'], queryFn: async () => { const { data } = await api.get<Task[]>(`/scheduling/${projectId}/tasks/`); return data }, enabled: !!projectId })
}
export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (data: TaskCreateInput) => { const { data: r } = await api.post<Task>(`/scheduling/${projectId}/tasks/`, data); return r }, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', projectId] }) })
}
export function useUpdateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => { const { data: r } = await api.patch<Task>(`/scheduling/${projectId}/tasks/${taskId}/`, data); return r }, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', projectId] }) })
}
export function useDeleteTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (taskId: string) => { await api.delete(`/scheduling/${projectId}/tasks/${taskId}/`) }, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', projectId] }) })
}
export function useClearSchedule(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ tasks_cleared: number }>(`/scheduling/${projectId}/clear/`)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', projectId] }),
  })
}
export function useRecalculateCPM(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async () => { const { data } = await api.post(`/scheduling/${projectId}/recalculate/`); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', projectId] }) })
}
export function useScheduleSummary(projectId: string | undefined) {
  return useQuery({ queryKey: ['schedule', projectId, 'summary'], queryFn: async () => { const { data } = await api.get<ScheduleSummary>(`/scheduling/${projectId}/summary/`); return data }, enabled: !!projectId })
}

// --- Milestones ---
export function useMilestones(projectId: string | undefined) {
  return useQuery({ queryKey: ['schedule', projectId, 'milestones'], queryFn: async () => { const { data } = await api.get<MilestoneData[]>(`/scheduling/${projectId}/milestones/`); return data }, enabled: !!projectId })
}
export function useCreateMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (d: { name: string; status?: string; target_date?: string; linked_task?: string }) => { const { data } = await api.post(`/scheduling/${projectId}/milestones/`, d); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', projectId, 'milestones'] }) })
}
export function useUpdateMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ id, data: d }: { id: string; data: Partial<MilestoneData> }) => { const { data } = await api.patch(`/scheduling/${projectId}/milestones/${id}/`, d); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', projectId, 'milestones'] }) })
}
export function useDeleteMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => { await api.delete(`/scheduling/${projectId}/milestones/${id}/`) }, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', projectId, 'milestones'] }) })
}

// --- View data ---
export function useGanttData(projectId: string | undefined) {
  return useQuery({ queryKey: ['schedule', projectId, 'gantt'], queryFn: async () => { const { data } = await api.get<GanttData>(`/scheduling/${projectId}/gantt/`); return data }, enabled: !!projectId })
}
export function useNetworkData(projectId: string | undefined) {
  return useQuery({ queryKey: ['schedule', projectId, 'network'], queryFn: async () => { const { data } = await api.get<NetworkData>(`/scheduling/${projectId}/network/`); return data }, enabled: !!projectId })
}
export function useSCurveData(projectId: string | undefined) {
  return useQuery({ queryKey: ['schedule', projectId, 'scurve'], queryFn: async () => { const { data } = await api.get<SCurveData>(`/scheduling/${projectId}/scurve/`); return data }, enabled: !!projectId })
}

// --- Baselines ---
export function useBaselines(projectId: string | undefined) {
  return useQuery({ queryKey: ['schedule', projectId, 'baselines'], queryFn: async () => { const { data } = await api.get<BaselineData[]>(`/scheduling/${projectId}/baselines/`); return data }, enabled: !!projectId })
}
export function useCreateBaseline(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (name: string) => { const { data } = await api.post(`/scheduling/${projectId}/baselines/`, { name }); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', projectId, 'baselines'] }) })
}
