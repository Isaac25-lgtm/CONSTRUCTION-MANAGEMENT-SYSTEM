import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  SectionCard, SearchInput, FilterBar, LoadingState, EmptyState,
  StatusBadge, ActionButton,
} from '../../components/ui'
import { formatUGX } from '../../lib/formatters'
import { useProjects, useArchiveProject, type ProjectSummary } from '../../hooks/useProjects'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../stores/uiStore'
import { CreateProjectModal } from './CreateProjectModal'
import { EditProjectModal } from './EditProjectModal'
import { PROJECT_STATUSES, PROJECT_TYPES, CONTRACT_TYPES } from '../../types'

const statusColors: Record<string, string> = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.color])
)

export function ProjectsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editProject, setEditProject] = useState<ProjectSummary | null>(null)
  const { hasSystemPerm } = useAuth()
  const { data: projects, isLoading, isError } = useProjects()
  const archiveProject = useArchiveProject()
  const { showToast } = useUIStore()

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowCreate(true)
    }
  }, [searchParams])

  const list = projects || []
  const filtered = list.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false
    if (typeFilter && p.project_type !== typeFilter) return false
    if (contractFilter && p.contract_type !== contractFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.project_type_display.toLowerCase().includes(q)
      )
    }
    return true
  })

  async function handleArchive(p: ProjectSummary) {
    if (!confirm(`Archive project "${p.name}" (${p.code})? This sets status to Cancelled.`)) return
    try {
      await archiveProject.mutateAsync(p.id)
      showToast(`${p.code} archived`, 'success')
    } catch {
      showToast('Failed to archive project', 'error')
    }
  }

  function openCreateModal() {
    setShowCreate(true)
    if (searchParams.get('create') === '1') return
    const next = new URLSearchParams(searchParams)
    next.set('create', '1')
    setSearchParams(next, { replace: true })
  }

  function closeCreateModal() {
    setShowCreate(false)
    if (searchParams.get('create') !== '1') return
    const next = new URLSearchParams(searchParams)
    next.delete('create')
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <h2 className="mb-5 text-lg font-bold text-bp-text">All Projects</h2>

      {/* Filters */}
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, code, location..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="!w-auto !py-1.5 !px-2 !text-xs"
        >
          <option value="">All Statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="!w-auto !py-1.5 !px-2 !text-xs"
        >
          <option value="">All Types</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={contractFilter}
          onChange={(e) => setContractFilter(e.target.value)}
          className="!w-auto !py-1.5 !px-2 !text-xs"
        >
          <option value="">All Contracts</option>
          {CONTRACT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="text-xs text-bp-muted">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
        {hasSystemPerm('projects.create') && (
          <ActionButton variant="accent" onClick={openCreateModal}>
            + New Project
          </ActionButton>
        )}
      </FilterBar>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <EmptyState icon="⚠️" title="Could not load projects" description="Check that the backend is running." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🏗️"
          title="No projects found"
          description={search || statusFilter || typeFilter || contractFilter ? 'Try different filters.' : 'Create a project to get started.'}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {filtered.map((p) => (
            <SectionCard key={p.id}>
              <div>
                {/* Header: code + status */}
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-bp-muted">{p.code}</span>
                  <StatusBadge text={p.status_display} color={statusColors[p.status] || '#94a3b8'} />
                </div>

                {/* Name -- clickable to enter workspace */}
                <h3
                  className="mb-1 cursor-pointer text-[15px] font-semibold text-bp-text hover:text-bp-accent"
                  onClick={() => navigate(`/app/projects/${p.id}/overview`)}
                >
                  {p.name}
                </h3>

                <div className="mb-1 text-xs text-bp-muted">
                  {p.project_type_display} &bull; {p.location}
                </div>
                <div className="mb-3 text-[11px] text-bp-muted">{p.contract_type_display}</div>

                {/* Footer: members + budget + actions */}
                <div className="flex items-center justify-between border-t border-bp-border pt-2">
                  <div className="text-xs text-bp-muted">
                    👥 {p.member_count} &bull; <span className="font-mono font-semibold text-bp-accent">{formatUGX(parseFloat(p.budget))}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ActionButton
                      variant="blue"
                      size="sm"
                      onClick={() => navigate(`/app/projects/${p.id}/overview`)}
                    >
                      Open
                    </ActionButton>
                    {/* Edit/archive gated by server-computed per-project flags */}
                    {p.can_edit && (
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setEditProject(p) }}
                      >
                        ✏️
                      </ActionButton>
                    )}
                    {p.can_archive && (
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleArchive(p) }}
                      >
                        🗃️
                      </ActionButton>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showCreate}
        onClose={closeCreateModal}
        onCreated={(id) => {
          closeCreateModal()
          navigate(`/app/projects/${id}/overview`)
        }}
      />

      {editProject && (
        <EditProjectModal
          project={editProject}
          open={!!editProject}
          onClose={() => setEditProject(null)}
        />
      )}
    </div>
  )
}
