/**
 * Communications hooks -- meetings, meeting actions, project chat.
 *
 * All interfaces match backend serializer field names exactly.
 * Uses meeting_type (not type), meeting_date (not date),
 * chaired_by_name, sender_name.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

/* ------------------------------------------------------------------ */
/* Interfaces                                                          */
/* ------------------------------------------------------------------ */

export interface MeetingActionData {
  id: string
  meeting: string
  description: string
  assigned_to: string | null
  assigned_to_name: string | null
  due_date: string | null
  status: string
  status_display: string
  notes: string
  created_at: string
}

export interface MeetingData {
  id: string
  project: string
  title: string
  meeting_type: string
  meeting_type_display: string
  meeting_date: string
  location: string
  attendees: string[]
  summary: string
  chaired_by: string | null
  chaired_by_name: string | null
  actions: MeetingActionData[]
  created_at: string
  updated_at: string
}

export interface ChatMessageData {
  id: string
  project: string
  sender: string
  sender_name: string | null
  message: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useMeetings(projectId: string | undefined) {
  return useQuery({
    queryKey: ['comms', projectId, 'meetings'],
    queryFn: async () => {
      const { data } = await api.get<MeetingData[]>(
        `/comms/${projectId}/meetings/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateMeeting(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: {
      title: string
      meeting_type: string
      meeting_date: string
      location?: string
      attendees?: string[]
      summary?: string
      chaired_by?: string
    }) => {
      const { data } = await api.post(
        `/comms/${projectId}/meetings/`,
        d,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['comms', projectId, 'meetings'] }),
  })
}

export function useChatMessages(projectId: string | undefined) {
  return useQuery({
    queryKey: ['comms', projectId, 'chat'],
    queryFn: async () => {
      const { data } = await api.get<ChatMessageData[]>(
        `/comms/${projectId}/chat/`,
      )
      return data
    },
    enabled: !!projectId,
    refetchInterval: 10000,
  })
}

export function useCreateMeetingAction(projectId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: {
      description: string
      assigned_to?: string
      due_date?: string
      status?: string
    }) => {
      const { data } = await api.post(
        `/comms/${projectId}/meetings/${meetingId}/actions/`,
        d,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['comms', projectId, 'meetings'] }),
  })
}

export function useSendMessage(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { message: string }) => {
      const { data } = await api.post(
        `/comms/${projectId}/chat/`,
        d,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['comms', projectId, 'chat'] }),
  })
}
