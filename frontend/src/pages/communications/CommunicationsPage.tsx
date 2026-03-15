import { useNavigate } from 'react-router-dom'
import { PageHeader, SectionCard, ActionButton, StatusBadge, LoadingState, EmptyState } from '../../components/ui'
import { useProjects, type ProjectSummary } from '../../hooks/useProjects'

/**
 * Communications -- org-wide communications landing page.
 *
 * Project-level chat and meetings live inside each project workspace.
 * This page provides navigation into those project-scoped communication tools.
 * No org-wide messaging backend exists -- this page is honest about that.
 */

export function CommunicationsPage() {
  const navigate = useNavigate()
  const { data: projectsRaw, isLoading, isError } = useProjects()
  const projects: ProjectSummary[] = Array.isArray(projectsRaw) ? projectsRaw : []

  return (
    <div>
      <PageHeader title="Communications" icon="&#128172;">
        <span className="text-xs text-bp-muted">Project chat and meetings are inside each project workspace</span>
      </PageHeader>

      <SectionCard className="mb-5">
        <div className="text-sm font-semibold text-bp-text mb-2">How Communications Work in BuildPro</div>
        <div className="text-xs text-bp-muted leading-relaxed space-y-1.5">
          <p>Each project has its own <strong className="text-bp-text">Project Chat</strong> for real-time team messaging and <strong className="text-bp-text">Meetings</strong> for recording minutes and tracking action items.</p>
          <p>Select a project below to access its communication tools.</p>
        </div>
      </SectionCard>

      <div className="mb-2 text-sm font-semibold text-bp-text">Your Projects</div>

      {isLoading ? <LoadingState rows={3} /> : isError ? (
        <EmptyState icon="&#9888;" title="Failed to load projects" description="Could not connect to the server. Check your connection and try again." />
      ) : (
        projects.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {projects.map(p => (
              <SectionCard key={p.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-bp-accent">{p.code}</span>
                  <StatusBadge text={p.status_display || p.status} color={p.status === 'active' ? '#22c55e' : '#f59e0b'} />
                </div>
                <div className="text-[13px] font-semibold text-bp-text mb-2">{p.name}</div>
                <div className="flex gap-2">
                  <ActionButton variant="blue" size="sm" onClick={() => navigate(`/app/projects/${p.id}/chat`)}>
                    Project Chat
                  </ActionButton>
                  <ActionButton variant="accent" size="sm" onClick={() => navigate(`/app/projects/${p.id}/meetings`)}>
                    Meetings
                  </ActionButton>
                </div>
              </SectionCard>
            ))}
          </div>
        ) : (
          <EmptyState icon="&#128172;" title="No projects" description="You don't have access to any projects yet." />
        )
      )}
    </div>
  )
}
