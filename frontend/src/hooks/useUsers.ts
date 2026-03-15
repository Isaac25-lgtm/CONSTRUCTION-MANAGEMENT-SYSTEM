/**
 * Users hook -- fetch org users, create user (admin only).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface UserSummary {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  job_title: string
  is_active: boolean
  system_role_name: string | null
  date_joined: string
}

export interface CreateUserData {
  username: string
  email: string
  first_name: string
  last_name: string
  password: string
  phone?: string
  job_title?: string
  system_role_id?: string | null
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<UserSummary[]>('/auth/users/')
      return data
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const { data } = await api.post('/auth/users/', userData)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
