import { useState } from 'react'
import {
  PageHeader, SectionCard, Tabs, ActionButton, DataTable, StatusBadge,
  LoadingState, EmptyState,
} from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useUsers, type UserSummary } from '../../hooks/useUsers'
import { useRoles, type SystemRole } from '../../hooks/useRoles'
import { useOrganisation, useUpdateOrganisation } from '../../hooks/useOrganisation'
import { useCreateUser, type CreateUserData } from '../../hooks/useUsers'
import { useUIStore } from '../../stores/uiStore'

/**
 * Settings -- account, users, roles, system configuration.
 *
 * - Account tab: current user profile (from useAuth)
 * - Users tab: real user list from API (admin.manage_users required)
 * - Roles tab: real roles from API
 * - System tab: real org data from API (admin-only for editing)
 */

export function SettingsPage() {
  const [tab, setTab] = useState('account')
  const { hasSystemPerm } = useAuth()

  // Only build tabs the user can see
  const tabs = [
    { key: 'account', label: 'Account', icon: '👤' },
    // Users and Roles tabs only for admin or manage_users
    ...(hasSystemPerm('admin.manage_users')
      ? [
          { key: 'users', label: 'Users', icon: '👥' },
          { key: 'roles', label: 'Roles & Permissions', icon: '🔒' },
        ]
      : []),
    { key: 'system', label: 'System', icon: '⚙️' },
  ]

  return (
    <div>
      <PageHeader title="Settings" icon="⚙️" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'account' && <AccountTab />}
      {tab === 'users' && hasSystemPerm('admin.manage_users') && <UsersTab />}
      {tab === 'roles' && hasSystemPerm('admin.manage_users') && <RolesTab />}
      {tab === 'system' && <SystemTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Account tab
// ---------------------------------------------------------------------------

function AccountTab() {
  const { user } = useAuth()

  return (
    <div className="grid gap-4" style={{ maxWidth: 600 }}>
      <SectionCard>
        <h3 className="mb-4 text-sm font-bold text-bp-text">Profile Information</h3>
        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Full Name</label>
            <input type="text" defaultValue={user ? `${user.first_name} ${user.last_name}`.trim() : ''} disabled className="!opacity-60" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Email</label>
            <input type="email" defaultValue={user?.email || ''} disabled className="!opacity-60" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Phone</label>
            <input type="text" defaultValue={user?.phone || ''} disabled className="!opacity-60" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Job Title</label>
            <input type="text" defaultValue={user?.job_title || ''} disabled className="!opacity-60" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-bp-muted">Role</label>
            <input type="text" defaultValue={user?.system_role_name || 'Standard'} disabled className="!opacity-60" />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-bp-muted">Profile editing is read-only. Contact your administrator to update your details.</p>
      </SectionCard>

      <SectionCard>
        <h3 className="mb-4 text-sm font-bold text-bp-text">Change Password</h3>
        <p className="text-[11px] text-bp-muted">Password changes are managed by your administrator. Self-service password reset is not yet available.</p>
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users tab (admin/management only -- gated by tab visibility)
// ---------------------------------------------------------------------------

const userColumns = [
  {
    key: 'name', header: 'Name',
    render: (u: UserSummary) => (
      <span className="font-medium">
        {u.first_name} {u.last_name}
      </span>
    ),
  },
  { key: 'email', header: 'Email', render: (u: UserSummary) => <span className="text-bp-info">{u.email}</span> },
  { key: 'job_title', header: 'Job Title', render: (u: UserSummary) => u.job_title || '--' },
  {
    key: 'role', header: 'System Role',
    render: (u: UserSummary) => {
      const name = u.system_role_name || 'None'
      const color = name === 'Admin' ? '#f59e0b' : name === 'Management' ? '#3b82f6' : '#94a3b8'
      return <StatusBadge text={name} color={color} />
    },
  },
  {
    key: 'status', header: 'Status',
    render: (u: UserSummary) => (
      <StatusBadge
        text={u.is_active ? 'Active' : 'Inactive'}
        color={u.is_active ? '#22c55e' : '#ef4444'}
      />
    ),
  },
]

function UsersTab() {
  const { data: users, isLoading, isError } = useUsers()
  const createUser = useCreateUser()
  const { showToast } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '' })

  if (isLoading) return <LoadingState rows={4} />
  if (isError) return <EmptyState icon="&#9888;" title="Could not load users" description="Check that the backend is running." />

  const list = users || []

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-bp-muted">{list.length} user{list.length !== 1 ? 's' : ''}</span>
        <ActionButton variant="green" onClick={() => setShowAdd(!showAdd)}>+ Add User</ActionButton>
      </div>

      {showAdd && (
        <SectionCard className="mb-4">
          <h4 className="text-sm font-bold text-bp-text mb-3">Create New User</h4>
          <div className="grid grid-cols-2 gap-3" style={{ maxWidth: 500 }}>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Username *</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="e.g. john.doe" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">First Name</label>
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Last Name</label>
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Password * (min 8 characters)</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Temporary password" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <ActionButton
              variant="green"
              onClick={async () => {
                if (!form.username || !form.email || !form.password || form.password.length < 8) {
                  showToast('Username, email, and password (8+ chars) are required', 'warning')
                  return
                }
                try {
                  await createUser.mutateAsync(form as CreateUserData)
                  showToast('User created', 'success')
                  setShowAdd(false)
                  setForm({ username: '', email: '', first_name: '', last_name: '', password: '' })
                } catch {
                  showToast('Failed to create user', 'error')
                }
              }}
              disabled={createUser.isPending}
            >
              {createUser.isPending ? 'Creating...' : 'Create User'}
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => setShowAdd(false)}>Cancel</ActionButton>
          </div>
        </SectionCard>
      )}

      <DataTable columns={userColumns} data={list} emptyText="No users found" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Roles tab
// ---------------------------------------------------------------------------

function RolesTab() {
  const { data: roles, isLoading, isError } = useRoles()

  if (isLoading) return <LoadingState rows={3} />
  if (isError) return <EmptyState icon="⚠️" title="Could not load roles" description="Check that the backend is running." />

  const list = roles || []
  const roleColors: Record<string, string> = {
    Admin: '#f59e0b', Management: '#3b82f6', Standard: '#94a3b8', Viewer: '#94a3b8',
  }

  return (
    <SectionCard>
      <h3 className="mb-3 text-sm font-bold text-bp-text">System Roles & Permissions</h3>
      <p className="mb-4 text-xs text-bp-muted">
        Roles define organisation-wide capabilities. Project-level access is controlled by project membership.
      </p>
      <div className="grid gap-3">
        {list.map((role: SystemRole) => (
          <div key={role.id} className="rounded-lg border border-bp-border bg-bp-surface p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: roleColors[role.name] || '#e2e8f0' }}>
                {role.name}
              </span>
              <span className="text-[10px] text-bp-muted">
                {role.permissions.length === 0
                  ? 'No system permissions'
                  : role.permissions.includes('admin.full_access')
                    ? 'Full access'
                    : `${role.permissions.length} permission${role.permissions.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="text-[11px] text-bp-muted">{role.description}</div>
            {role.permissions.length > 0 && !role.permissions.includes('admin.full_access') && (
              <div className="mt-2 flex flex-wrap gap-1">
                {role.permissions.map((p: string) => (
                  <span
                    key={p}
                    className="rounded bg-bp-bg px-1.5 py-0.5 text-[9px] text-bp-muted"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// System tab
// ---------------------------------------------------------------------------

function SystemTab() {
  const { isAdmin } = useAuth()
  const { data: org, isLoading, isError } = useOrganisation()
  const updateOrg = useUpdateOrganisation()
  const { showToast } = useUIStore()
  const [orgForm, setOrgForm] = useState({ name: '', address: '', phone: '', email: '' })
  const [formInit, setFormInit] = useState(false)

  // Init form from loaded data once
  if (org && !formInit) {
    setOrgForm({ name: org.name || '', address: org.address || '', phone: org.phone || '', email: org.email || '' })
    setFormInit(true)
  }

  if (isLoading) return <LoadingState rows={2} />

  return (
    <div className="grid gap-4" style={{ maxWidth: 600 }}>
      <SectionCard>
        <h3 className="mb-3 text-sm font-bold text-bp-text">Organisation</h3>
        {isError ? (
          <div className="text-xs text-bp-muted">Could not load organisation data.</div>
        ) : (
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Organisation Name</label>
              <input type="text" value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} disabled={!isAdmin} className={!isAdmin ? '!opacity-60' : ''} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Address</label>
              <input type="text" value={orgForm.address} onChange={e => setOrgForm({ ...orgForm, address: e.target.value })} disabled={!isAdmin} className={!isAdmin ? '!opacity-60' : ''} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Phone</label>
              <input type="text" value={orgForm.phone} onChange={e => setOrgForm({ ...orgForm, phone: e.target.value })} disabled={!isAdmin} className={!isAdmin ? '!opacity-60' : ''} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Email</label>
              <input type="email" value={orgForm.email} onChange={e => setOrgForm({ ...orgForm, email: e.target.value })} disabled={!isAdmin} className={!isAdmin ? '!opacity-60' : ''} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-bp-muted">Currency</label>
              <input type="text" defaultValue="UGX (Uganda Shillings)" disabled className="!opacity-60" />
            </div>
          </div>
        )}
        {isAdmin && !isError && (
          <div className="mt-4">
            <ActionButton
              variant="accent"
              onClick={async () => {
                try {
                  await updateOrg.mutateAsync(orgForm)
                  showToast('Organisation updated', 'success')
                } catch { showToast('Failed to update organisation', 'error') }
              }}
              disabled={updateOrg.isPending}
            >
              {updateOrg.isPending ? 'Saving...' : 'Save'}
            </ActionButton>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <h3 className="mb-2 text-sm font-bold text-bp-text">System Information</h3>
        <div className="grid gap-1 text-xs text-bp-muted">
          <div>Platform: <span className="text-bp-text">BuildPro Construction Management</span></div>
          <div>Stack: <span className="text-bp-text">Django 5.2 LTS + React 19 + PostgreSQL</span></div>
          <div>AI Provider: <span className="text-bp-text">Google Gemini (provider-agnostic layer)</span></div>
        </div>
      </SectionCard>
    </div>
  )
}
