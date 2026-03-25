/**
 * SetupPage -- first-run bootstrap for production.
 *
 * Only shown when the system has no organisation-backed admin.
 * Requires BOOTSTRAP_SETUP_SECRET from the server environment.
 * After successful setup, redirects to login.
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export function SetupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    org_name: '',
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    bootstrap_secret: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/setup/bootstrap/', form)
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || 'Setup failed. Check your inputs and bootstrap secret.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0b1120' }}>
        <div className="w-full max-w-md rounded-xl border border-bp-border p-8 text-center" style={{ background: '#111827' }}>
          <div className="mb-4 text-4xl">&#9989;</div>
          <h2 className="mb-2 text-lg font-bold text-bp-text">System Initialized</h2>
          <p className="mb-4 text-sm text-bp-muted">
            Organisation and admin account have been created. You can now log in.
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="rounded-md border-none px-6 py-2.5 text-sm font-semibold text-black cursor-pointer"
            style={{ background: '#f59e0b' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#0b1120' }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-bp-border p-8"
        style={{ background: '#111827' }}
      >
        <div className="mb-6 text-center">
          <span className="text-3xl">&#127959;</span>
          <h1 className="mt-2 text-xl font-extrabold text-bp-accent">BuildPro Setup</h1>
          <p className="mt-1 text-xs text-bp-muted">
            First-time system initialization
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
            {error}
          </div>
        )}

        <div className="mb-4 rounded-lg border border-bp-border bg-bp-surface px-3 py-2">
          <p className="text-[11px] text-bp-muted">
            This page is only available during first-time setup. After creating the admin account, it will be permanently disabled. You need the <strong className="text-bp-accent">Bootstrap Secret</strong> from your server environment.
          </p>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Organisation Name *</label>
          <input
            type="text" required value={form.org_name}
            onChange={e => update('org_name', e.target.value)}
            placeholder="e.g. Locus Analytics"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">First Name</label>
            <input
              type="text" value={form.first_name}
              onChange={e => update('first_name', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Last Name</label>
            <input
              type="text" value={form.last_name}
              onChange={e => update('last_name', e.target.value)}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Admin Username *</label>
          <input
            type="text" required value={form.username}
            onChange={e => update('username', e.target.value)}
            placeholder="e.g. jesse"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Admin Email *</label>
          <input
            type="email" required value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="e.g. admin@company.com"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Admin Password * (must meet the server password policy)</label>
          <input
            type="password" required value={form.password}
            onChange={e => update('password', e.target.value)}
          />
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-xs font-semibold text-bp-accent">Bootstrap Secret *</label>
          <input
            type="password" required value={form.bootstrap_secret}
            onChange={e => update('bootstrap_secret', e.target.value)}
            placeholder="From BOOTSTRAP_SETUP_SECRET env var"
            className="!border-amber-500/50"
          />
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full cursor-pointer rounded-md border-none px-4 py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#f59e0b' }}
        >
          {loading ? 'Initializing...' : 'Initialize System'}
        </button>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[11px] text-bp-muted hover:text-bp-text bg-transparent border-none cursor-pointer"
          >
            Already set up? Go to Login
          </button>
        </div>
      </form>
    </div>
  )
}
