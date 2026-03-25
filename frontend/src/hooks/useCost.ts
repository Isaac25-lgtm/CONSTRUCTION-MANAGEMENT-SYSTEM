/**
 * Cost hooks -- budget lines, expenses, cost summary, EVM, project overview.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface BudgetLineData {
  id: string; code: string; name: string; description: string
  category: string; category_display: string
  budget_amount: string; actual_amount: string; variance: string
  status: string; status_display: string; sort_order: number
  linked_task: string | null; linked_task_code: string | null
}

export interface ExpenseData {
  id: string; description: string; amount: string
  expense_date: string; vendor: string; reference: string
  category: string; category_display: string
  status: string; status_display: string; notes: string
  budget_line: string | null; budget_line_name: string | null
  linked_task: string | null; linked_task_code: string | null
}

export interface CostSummary {
  total_budget: number; total_actual: number; variance: number
  is_over_budget: boolean; budget_utilisation: number
  budget_lines_count: number; expenses_count: number
  category_breakdown: Record<string, { budget: number; actual: number; variance: number }>
}

export interface EVMData {
  bac: number; bcwp: number; bcws: number; acwp: number
  cpi: number; spi: number; eac: number; vac: number
  has_baseline: boolean; overall_progress: number
}

export interface ProjectOverview {
  project: { id: string; code: string; name: string; status: string; status_display: string; location: string; start_date: string | null; end_date: string | null; budget: number; client_name: string; consultant: string }
  schedule: { total_tasks: number; completed: number; in_progress: number; delayed: number; critical_count: number; project_duration: number; overall_progress: number; critical_path: string[] }
  milestones: { total: number; achieved: number; pending: number; items: Array<{ name: string; status: string; target_date: string | null }> }
  cost: CostSummary
  evm: EVMData
}

export function useBudgetLines(projectId: string | undefined) {
  return useQuery({ queryKey: ['cost', projectId, 'budget-lines'], queryFn: async () => { const { data } = await api.get<BudgetLineData[]>(`/cost/${projectId}/budget-lines/`); return data }, enabled: !!projectId })
}

export function useCreateBudgetLine(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (d: { code: string; name: string; category: string; budget_amount: number; linked_task?: string }) => { const { data } = await api.post(`/cost/${projectId}/budget-lines/`, d); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['cost', projectId] }) })
}

export function useExpenses(projectId: string | undefined) {
  return useQuery({ queryKey: ['cost', projectId, 'expenses'], queryFn: async () => { const { data } = await api.get<ExpenseData[]>(`/cost/${projectId}/expenses/`); return data }, enabled: !!projectId })
}

export function useCreateExpense(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (d: { description: string; amount: number; expense_date: string; budget_line?: string; vendor?: string; category?: string }) => { const { data } = await api.post(`/cost/${projectId}/expenses/`, d); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['cost', projectId] }) })
}

export function useUpdateBudgetLine(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ id, data: d }: { id: string; data: Partial<BudgetLineData> }) => { const { data } = await api.patch(`/cost/${projectId}/budget-lines/${id}/`, d); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['cost', projectId] }) })
}

export function useDeleteBudgetLine(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => { await api.delete(`/cost/${projectId}/budget-lines/${id}/`) }, onSuccess: () => qc.invalidateQueries({ queryKey: ['cost', projectId] }) })
}

export function useUpdateExpense(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ id, data: d }: { id: string; data: Partial<ExpenseData> }) => { const { data } = await api.patch(`/cost/${projectId}/expenses/${id}/`, d); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['cost', projectId] }) })
}

export function useDeleteExpense(projectId: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => { await api.delete(`/cost/${projectId}/expenses/${id}/`) }, onSuccess: () => qc.invalidateQueries({ queryKey: ['cost', projectId] }) })
}

export function useCostSummary(projectId: string | undefined) {
  return useQuery({ queryKey: ['cost', projectId, 'summary'], queryFn: async () => { const { data } = await api.get<CostSummary>(`/cost/${projectId}/summary/`); return data }, enabled: !!projectId })
}

export function useEVM(projectId: string | undefined) {
  return useQuery({ queryKey: ['cost', projectId, 'evm'], queryFn: async () => { const { data } = await api.get<EVMData>(`/cost/${projectId}/evm/`); return data }, enabled: !!projectId })
}

export function useProjectOverview(projectId: string | undefined) {
  return useQuery({ queryKey: ['cost', projectId, 'overview'], queryFn: async () => { const { data } = await api.get<ProjectOverview>(`/cost/${projectId}/overview/`); return data }, enabled: !!projectId })
}
