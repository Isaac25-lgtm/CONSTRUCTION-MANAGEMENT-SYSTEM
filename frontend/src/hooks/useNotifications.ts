/**
 * Notification hooks -- list, mark read, mark all read.
 *
 * Backend returns { unread_count, results } -- not a flat array.
 * Interface uses notification_type (not category).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

/* ------------------------------------------------------------------ */
/* Interfaces                                                          */
/* ------------------------------------------------------------------ */

export interface NotificationData {
  id: string
  user: string
  project: string | null
  notification_type: string
  title: string
  message: string
  level: string
  level_display: string
  is_read: boolean
  link: string | null
  created_at: string
  read_at: string | null
}

export interface NotificationsResponse {
  unread_count: number
  results: NotificationData[]
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<NotificationsResponse>(
        '/notifications/notifications/',
      )
      return data
    },
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(
        `/notifications/notifications/${id}/read/`,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        '/notifications/notifications/read-all/',
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
