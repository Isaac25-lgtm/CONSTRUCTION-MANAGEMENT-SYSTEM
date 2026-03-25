/**
 * Projects hooks -- CRUD operations for access-controlled projects.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface ProjectSummary {
  id: string
  code: string
  name: string
  description: string
  location: string
  project_type: string
  project_type_display: string
  contract_type: string
  contract_type_display: string
  status: string
  status_display: string
  start_date: string | null
  end_date: string | null
  budget: string
  client_name: string
  client_org: string
  consultant: string
  contractor: string
  member_count: number
  setup_complete: boolean
  can_edit: boolean
  can_archive: boolean
  created_at: string
}

export interface SetupConfig {
  phase_templates: Array<{
    id: string
    name: string
    durP?: number
    budP?: number
    res?: string
    children: Array<
      | string
      | {
          id: string
          name: string
          durP?: number
          budP?: number
          res?: string
        }
    >
  }>
  milestone_templates: Array<
    | string
    | {
        name: string
        task_code: string
      }
  >
  has_design_phase: boolean
  workspace_modules: string[]
}

export interface ProjectDetail extends ProjectSummary {
  client_phone: string
  client_email: string
  user_role: string | null
  user_permissions: string[]
  setup_config: SetupConfig | null
}

export interface ProjectCreateData {
  name: string
  description?: string
  location: string
  project_type: string
  contract_type: string
  start_date: string
  end_date: string
  budget: number | string
  client_name?: string
  client_phone?: string
  client_email?: string
  client_org?: string
  consultant?: string
  contractor?: string
}

export interface MembershipData {
  id: number
  project: string
  user: string
  username: string
  user_name: string
  user_email: string
  job_title: string
  role: string
  role_display: string
  permissions: string[]
  joined_at: string
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProjectSummary>>('/projects/?page_size=200')
      return data.results
    },
  })
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      const { data } = await api.get<ProjectDetail>(`/projects/${projectId}/`)
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ProjectCreateData) => {
      const { data: result } = await api.post<ProjectSummary>('/projects/', data)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<ProjectCreateData>) => {
      const { data: result } = await api.patch<ProjectDetail>(`/projects/${projectId}/`, data)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })
}

export function useArchiveProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.post(`/projects/${projectId}/archive/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'members'],
    queryFn: async () => {
      const { data } = await api.get<MembershipData[]>(`/projects/${projectId}/members/`)
      return data
    },
    enabled: !!projectId,
  })
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { user: string; role: string }) => {
      const { data: result } = await api.post<MembershipData>(
        `/projects/${projectId}/members/`,
        data,
      )
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })
}
