/**
 * Field operations hooks -- risks, RFIs, change orders, punch list,
 * daily logs, safety incidents, quality checks, recycle bin.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

// --- Generic CRUD factory ---
function useProjectList<T>(projectId: string | undefined, path: string, key: string) {
  return useQuery({ queryKey: ['field', projectId, key], queryFn: async () => { const { data } = await api.get<T[]>(`/${path}/${projectId}/${key}/`); return data }, enabled: !!projectId })
}
function useProjectCreate<D>(projectId: string, path: string, key: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (d: D) => { const { data } = await api.post(`/${path}/${projectId}/${key}/`, d); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['field', projectId, key] }) })
}
function useProjectUpdate<D>(projectId: string, path: string, key: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ id, data: d }: { id: string; data: D }) => { const { data } = await api.patch(`/${path}/${projectId}/${key}/${id}/`, d); return data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['field', projectId] }) })
}
function useProjectDelete(projectId: string, path: string, key: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => { await api.delete(`/${path}/${projectId}/${key}/${id}/`) }, onSuccess: () => qc.invalidateQueries({ queryKey: ['field', projectId] }) })
}
function useProjectRestore(projectId: string, path: string, key: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => { await api.post(`/${path}/${projectId}/${key}/${id}/restore/`) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['field', projectId] }); qc.invalidateQueries({ queryKey: ['recycle-bin', projectId] }) } })
}

// --- Risk ---
export interface RiskData { id: string; code: string; title: string; description: string; category: string; category_display: string; likelihood: string; likelihood_display: string; impact: string; impact_display: string; risk_score: number; mitigation: string; status: string; status_display: string; owner_name: string | null; review_date: string | null }
export function useRisks(pid: string | undefined) { return useProjectList<RiskData>(pid, 'risks', 'risks') }
export function useCreateRisk(pid: string) { return useProjectCreate<Partial<RiskData>>(pid, 'risks', 'risks') }
export function useUpdateRisk(pid: string) { return useProjectUpdate<Partial<RiskData>>(pid, 'risks', 'risks') }
export function useDeleteRisk(pid: string) { return useProjectDelete(pid, 'risks', 'risks') }
export function useRestoreRisk(pid: string) { return useProjectRestore(pid, 'risks', 'risks') }

// --- RFI ---
export interface RFIData { id: string; code: string; subject: string; question: string; status: string; status_display: string; priority: string; priority_display: string; is_overdue: boolean; raised_by: string | null; raised_by_name: string | null; assigned_to: string | null; assigned_to_name: string | null; date_raised: string; due_date: string | null; response: string; response_date: string | null }
export function useRFIs(pid: string | undefined) { return useProjectList<RFIData>(pid, 'rfis', 'rfis') }
export function useCreateRFI(pid: string) { return useProjectCreate<Partial<RFIData>>(pid, 'rfis', 'rfis') }
export function useUpdateRFI(pid: string) { return useProjectUpdate<Partial<RFIData>>(pid, 'rfis', 'rfis') }
export function useDeleteRFI(pid: string) { return useProjectDelete(pid, 'rfis', 'rfis') }
export function useRestoreRFI(pid: string) { return useProjectRestore(pid, 'rfis', 'rfis') }

// --- Change Order ---
export interface ChangeOrderData { id: string; code: string; title: string; description: string; category: string; category_display: string; reason: string; cost_impact: string; time_impact_days: number; status: string; status_display: string; requested_by_name: string | null; approved_by_name: string | null; requested_date: string }
export function useChangeOrders(pid: string | undefined) { return useProjectList<ChangeOrderData>(pid, 'changes', 'change-orders') }
export function useCreateChangeOrder(pid: string) { return useProjectCreate<Partial<ChangeOrderData>>(pid, 'changes', 'change-orders') }
export function useUpdateChangeOrder(pid: string) { return useProjectUpdate<Partial<ChangeOrderData>>(pid, 'changes', 'change-orders') }
export function useDeleteChangeOrder(pid: string) { return useProjectDelete(pid, 'changes', 'change-orders') }
export function useRestoreChangeOrder(pid: string) { return useProjectRestore(pid, 'changes', 'change-orders') }

// --- Punch Item ---
export interface PunchItemData { id: string; title: string; description: string; location: string; priority: string; priority_display: string; status: string; status_display: string; assigned_to_name: string | null; due_date: string | null; closed_at: string | null }
export function usePunchItems(pid: string | undefined) { return useProjectList<PunchItemData>(pid, 'field-ops', 'punch-items') }
export function useCreatePunchItem(pid: string) { return useProjectCreate<Partial<PunchItemData>>(pid, 'field-ops', 'punch-items') }
export function useUpdatePunchItem(pid: string) { return useProjectUpdate<Partial<PunchItemData>>(pid, 'field-ops', 'punch-items') }
export function useDeletePunchItem(pid: string) { return useProjectDelete(pid, 'field-ops', 'punch-items') }
export function useRestorePunchItem(pid: string) { return useProjectRestore(pid, 'field-ops', 'punch-items') }

// --- Daily Log ---
export interface DailyLogData { id: string; log_date: string; weather: string; workforce: string; work_performed: string; delays: string; materials_notes: string; visitors: string; incidents: string; author_name: string | null }
export function useDailyLogs(pid: string | undefined) { return useProjectList<DailyLogData>(pid, 'field-ops', 'daily-logs') }
export function useCreateDailyLog(pid: string) { return useProjectCreate<Partial<DailyLogData>>(pid, 'field-ops', 'daily-logs') }
export function useUpdateDailyLog(pid: string) { return useProjectUpdate<Partial<DailyLogData>>(pid, 'field-ops', 'daily-logs') }
export function useDeleteDailyLog(pid: string) { return useProjectDelete(pid, 'field-ops', 'daily-logs') }
export function useRestoreDailyLog(pid: string) { return useProjectRestore(pid, 'field-ops', 'daily-logs') }

// --- Safety Incident ---
export interface SafetyData { id: string; incident_date: string; title: string; description: string; incident_type: string; type_display: string; severity: string; severity_display: string; location: string; immediate_action: string; follow_up: string; status: string; status_display: string; reported_by_name: string | null }
export function useSafetyIncidents(pid: string | undefined) { return useProjectList<SafetyData>(pid, 'field-ops', 'safety-incidents') }
export function useCreateSafetyIncident(pid: string) { return useProjectCreate<Partial<SafetyData>>(pid, 'field-ops', 'safety-incidents') }
export function useUpdateSafetyIncident(pid: string) { return useProjectUpdate<Partial<SafetyData>>(pid, 'field-ops', 'safety-incidents') }
export function useDeleteSafetyIncident(pid: string) { return useProjectDelete(pid, 'field-ops', 'safety-incidents') }
export function useRestoreSafetyIncident(pid: string) { return useProjectRestore(pid, 'field-ops', 'safety-incidents') }

// --- Quality Check ---
export interface QualityData { id: string; check_date: string; title: string; description: string; category: string; category_display: string; result: string; result_display: string; location: string; remarks: string; corrective_action: string; inspector_name: string | null }
export function useQualityChecks(pid: string | undefined) { return useProjectList<QualityData>(pid, 'field-ops', 'quality-checks') }
export function useCreateQualityCheck(pid: string) { return useProjectCreate<Partial<QualityData>>(pid, 'field-ops', 'quality-checks') }
export function useUpdateQualityCheck(pid: string) { return useProjectUpdate<Partial<QualityData>>(pid, 'field-ops', 'quality-checks') }
export function useDeleteQualityCheck(pid: string) { return useProjectDelete(pid, 'field-ops', 'quality-checks') }
export function useRestoreQualityCheck(pid: string) { return useProjectRestore(pid, 'field-ops', 'quality-checks') }

// --- Recycle Bin ---
export interface RecycleBinItem {
  id: string
  type: string          // machine key: risk, rfi, change_order, punch_item, daily_log, safety_incident, quality_check
  type_label: string    // human label: Risk, RFI, Change Order, etc.
  title: string
  deleted_at: string | null
  deleted_by_name: string | null
}
export function useRecycleBin(pid: string | undefined) {
  return useQuery({ queryKey: ['recycle-bin', pid], queryFn: async () => { const { data } = await api.get<RecycleBinItem[]>(`/field-ops/${pid}/recycle-bin/`); return data }, enabled: !!pid })
}
