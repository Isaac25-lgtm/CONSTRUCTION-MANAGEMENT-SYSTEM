/**
 * RequireAuth -- route guard that redirects unauthenticated users to /login.
 *
 * Wraps protected routes. Shows a loading state while checking auth.
 * When the backend returns 403/401 for /auth/me/, redirects to login.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bp-bg">
        <div className="text-bp-muted">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
