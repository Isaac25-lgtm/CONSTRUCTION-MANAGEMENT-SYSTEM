/**
 * Auth hook -- fetches current user from /api/v1/auth/me/.
 *
 * Returns the authenticated user with permissions, loading state,
 * and login/logout helpers. Used by RequireAuth and throughout the app.
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
    const { data } = await api.post<AuthUser>('/auth/login/', { username, password })
    queryClient.setQueryData(['auth', 'me'], data)
    return data
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
