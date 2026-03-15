/**
 * Roles hook -- fetch system roles.
 */
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export interface SystemRole {
  id: string
  name: string
  description: string
  permissions: string[]
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get<SystemRole[]>('/auth/roles/')
      return data
    },
  })
}
