/**
 * RequireAuth -- route guard for protected routes.
 *
 * Checks:
 * 1. User is authenticated (has valid session)
 * 2. User belongs to an organisation (required for all BuildPro APIs)
 *
 * If not authenticated: redirects to /login
 * If authenticated but no organisation: shows setup-required message
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function RequireAuth() {
  const { user, isAuthenticated, isLoading } = useAuth()

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

  // Authenticated but no organisation -- app will 403 on everything
  if (!user?.organisation_id) {
    return (
      <div className="flex h-screen items-center justify-center bg-bp-bg">
        <div className="max-w-md rounded-xl border border-bp-border bg-bp-card p-8 text-center">
          <div className="mb-4 text-4xl">&#9888;&#65039;</div>
          <h2 className="mb-2 text-lg font-bold text-bp-text">Account Setup Required</h2>
          <p className="mb-4 text-sm text-bp-muted leading-relaxed">
            Your account is not attached to an organisation. BuildPro requires organisation membership to access projects and modules.
          </p>
          <p className="mb-4 text-xs text-bp-muted">
            An administrator needs to run the bootstrap command on the server:
          </p>
          <code className="block mb-4 rounded bg-bp-surface px-3 py-2 text-xs text-bp-accent font-mono text-left">
            python manage.py bootstrap_org_admin<br />
            &nbsp;&nbsp;--org-name &quot;Your Company&quot;<br />
            &nbsp;&nbsp;--username {user?.username || 'admin'}<br />
            &nbsp;&nbsp;--email {user?.email || 'admin@example.com'}<br />
            &nbsp;&nbsp;--password &quot;YourPassword&quot;
          </code>
          <p className="mb-4 text-xs text-bp-muted">
            After running the command, refresh this page.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-bp-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 border-none cursor-pointer"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                // Logout and return to login page
                window.location.href = '/login'
              }}
              className="rounded border border-bp-border bg-transparent px-4 py-2 text-sm text-bp-muted hover:text-bp-text cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <Outlet />
}
