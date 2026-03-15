/**
 * Organisation hook -- fetch and update org settings.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface Organisation {
  id: string
  name: string
  address: string
  phone: string
  email: string
}

export function useOrganisation() {
  return useQuery({
    queryKey: ['organisation'],
    queryFn: async () => {
      const { data } = await api.get<Organisation>('/auth/organisation/')
      return data
    },
  })
}

export function useUpdateOrganisation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<Organisation>) => {
      const { data } = await api.patch<Organisation>('/auth/organisation/', updates)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organisation'] }),
  })
}
