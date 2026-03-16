/**
 * LoginPage -- session-based login form.
 *
 * On mount, checks /api/v1/auth/setup/status/ to detect if the system
 * needs first-time setup. If uninitialized, redirects to /setup.
 */
import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const navigate = useNavigate()
  const { login } = useAuth()

  // Check if system needs first-time setup
  useEffect(() => {
    api.get('/auth/setup/status/')
      .then(({ data }) => {
        if (!data.initialized) {
          navigate('/setup', { replace: true })
        }
      })
      .catch(() => {
        // If endpoint fails, proceed to normal login
      })
      .finally(() => setCheckingSetup(false))
  }, [navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/app/dashboard', { replace: true })
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0b1120' }}>
        <div className="text-bp-muted text-sm">Checking system status...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#0b1120' }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-bp-border p-8"
        style={{ background: '#111827' }}
      >
        <div className="mb-6 text-center">
          <span className="text-3xl">&#127959;&#65039;</span>
          <h1 className="mt-2 text-xl font-extrabold text-bp-accent">BuildPro</h1>
          <p className="mt-1 text-xs text-bp-muted">
            Construction Project Management
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-bp-danger/30 bg-bp-danger/10 px-3 py-2 text-[13px] text-bp-danger">
            {error}
          </div>
        )}

        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full cursor-pointer rounded-md border-none px-4 py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#f59e0b' }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="mt-4 text-center text-[10px] text-bp-muted">
          Session-based authentication with CSRF protection
        </div>
      </form>
    </div>
  )
}
