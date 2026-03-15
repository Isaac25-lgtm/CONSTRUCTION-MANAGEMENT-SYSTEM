import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { PageHeader, DataTable, StatusBadge, ActionButton, Modal, EmptyState, LoadingState } from '../../components/ui'
import { useProjectMembers, useAddProjectMember, type MembershipData } from '../../hooks/useProjects'
import { useProjectPermissions } from '../../hooks/useProjectPermissions'
import { useUserPicker } from '../../hooks/useUserPicker'
import { PROJECT_ROLES } from '../../types'
import { api } from '../../api/client'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '../../stores/uiStore'

/**
 * Project Team page -- manage project memberships.
 *
 * Shows team list, add member, change role, remove member.
 * Gated by project.manage_members permission for write actions.
 */

const roleColors: Record<string, string> = {
  manager: '#f59e0b',
  engineer: '#3b82f6',
  qs: '#22c55e',
  supervisor: '#f97316',
  viewer: '#94a3b8',
}

export function ProjectTeamPage() {
  const { projectId } = useParams()
  const { canManageMembers } = useProjectPermissions(projectId)
  const { data: members, isLoading } = useProjectMembers(projectId)
  const [showAdd, setShowAdd] = useState(false)

  const columns = [
    {
      key: 'name', header: 'Name',
      render: (m: MembershipData) => (
        <div>
          <div className="font-medium text-bp-text">{m.user_name || m.username}</div>
          <div className="text-[11px] text-bp-muted">{m.user_email}</div>
        </div>
      ),
    },
    { key: 'job', header: 'Job Title', render: (m: MembershipData) => m.job_title || '--' },
    {
      key: 'role', header: 'Project Role',
      render: (m: MembershipData) => (
        <StatusBadge text={m.role_display} color={roleColors[m.role] || '#94a3b8'} />
      ),
    },
    {
      key: 'joined', header: 'Joined',
      render: (m: MembershipData) => (
        <span className="text-xs text-bp-muted">
          {m.joined_at ? new Date(m.joined_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
        </span>
      ),
    },
    ...(canManageMembers ? [{
      key: 'actions', header: '',
      render: (m: MembershipData) => (
        <MemberActions projectId={projectId!} membership={m} />
      ),
    }] : []),
  ]

  if (isLoading) return <LoadingState rows={3} />

  return (
    <div>
      <PageHeader title="Project Team" icon="👥" count={members?.length}>
        {canManageMembers && (
          <ActionButton variant="green" onClick={() => setShowAdd(true)}>
            + Add Member
          </ActionButton>
        )}
      </PageHeader>

      {members && members.length > 0 ? (
        <DataTable columns={columns} data={members} />
      ) : (
        <EmptyState icon="👥" title="No team members yet" description="Add members to this project to get started." />
      )}

      {showAdd && projectId && (
        <AddMemberModal
          projectId={projectId}
          open={showAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Member actions (role change + remove)
// ---------------------------------------------------------------------------

function MemberActions({ projectId, membership }: { projectId: string; membership: MembershipData }) {
  const queryClient = useQueryClient()
  const { showToast } = useUIStore()

  async function handleRoleChange(newRole: string) {
    try {
      await api.patch(`/projects/${projectId}/members/${membership.id}/`, { role: newRole })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'members'] })
      showToast(`Role updated to ${newRole}`, 'success')
    } catch {
      showToast('Failed to update role', 'error')
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${membership.user_name || membership.username} from this project?`)) return
    try {
      await api.delete(`/projects/${projectId}/members/${membership.id}/`)
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
      showToast('Member removed', 'success')
    } catch {
      showToast('Failed to remove member', 'error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={membership.role}
        onChange={(e) => handleRoleChange(e.target.value)}
        className="!w-auto !py-1 !px-2 !text-[11px]"
      >
        {PROJECT_ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <button
        onClick={handleRemove}
        className="cursor-pointer border-none bg-transparent text-bp-danger text-sm hover:opacity-80"
        title="Remove member"
      >
        ✕
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add member modal
// ---------------------------------------------------------------------------

function AddMemberModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('viewer')
  const { data: users, isLoading } = useUserPicker()
  const addMember = useAddProjectMember(projectId)
  const { showToast } = useUIStore()

  async function handleAdd() {
    if (!userId) { showToast('Select a user', 'warning'); return }
    try {
      await addMember.mutateAsync({ user: userId, role })
      showToast('Member added', 'success')
      onClose()
    } catch {
      showToast('Failed to add member (may already be assigned)', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Team Member" width={400}>
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">User</label>
          {isLoading ? (
            <div className="text-xs text-bp-muted">Loading users...</div>
          ) : (
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select a user...</option>
              {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.username})
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-bp-muted">Project Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {PROJECT_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <ActionButton
          variant="green"
          className="!mt-2 !w-full"
          onClick={handleAdd}
          disabled={addMember.isPending}
        >
          {addMember.isPending ? 'Adding...' : 'Add Member'}
        </ActionButton>
      </div>
    </Modal>
  )
}
