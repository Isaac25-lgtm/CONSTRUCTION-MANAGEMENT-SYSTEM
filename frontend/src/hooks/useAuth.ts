/**
 * Auth hook -- manages session state via /api/v1/auth/me/.
 *
 * After login, re-fetches /auth/me/ to get the authoritative session state
 * (including organisation_id). This prevents "optimistic login success"
 * from sending users into the app with incomplete account state.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface AuthUser {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  job_title: string
  is_staff: boolean
  is_active: boolean
  is_admin: boolean
  organisation_id: string | null
  organisation_name: string | null
  system_role_name: string | null
  system_permissions: string[]
}

async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me/')
  return data
}

export function useAuth() {
  const queryClient = useQueryClient()

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })

  const login = async (username: string, password: string) => {
    // Authenticate -- creates session
    await api.post('/auth/login/', { username, password })
    // Re-fetch /auth/me/ for authoritative state (includes organisation_id)
    const confirmed = await fetchMe()
    queryClient.setQueryData(['auth', 'me'], confirmed)
    return confirmed
  }

  const logout = async () => {
    await api.post('/auth/logout/')
    queryClient.setQueryData(['auth', 'me'], null)
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
  }

  const hasSystemPerm = (perm: string): boolean => {
    if (!user) return false
    if (user.is_admin) return true
    return user.system_permissions.includes(perm)
  }

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user && !isError,
    isAdmin: user?.is_admin ?? false,
    login,
    logout,
    hasSystemPerm,
  }
}
