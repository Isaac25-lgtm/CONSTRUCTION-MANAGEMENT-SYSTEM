/**
 * Lightweight user picker hook for team member selection.
 *
 * Uses /api/v1/auth/user-picker/ which is available to any
 * authenticated org member (not admin-restricted).
 */
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export interface PickerUser {
  id: string
  username: string
  full_name: string
  job_title: string
}

export function useUserPicker() {
  return useQuery({
    queryKey: ['user-picker'],
    queryFn: async () => {
      const { data } = await api.get<PickerUser[]>('/auth/user-picker/')
      return data
    },
  })
}
