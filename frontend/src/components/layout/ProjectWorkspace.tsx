import { Outlet, useParams, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { SectionCard, MetricCard, LoadingState, StatusBadge } from '../ui'
import { FloatingProjectCopilot } from '../ai/FloatingProjectCopilot'
import { useProject, type ProjectSummary, type ProjectDetail } from '../../hooks/useProjects'
import { formatUGX } from '../../lib/formatters'
import { PROJECT_STATUSES } from '../../types'

/**
 * ProjectWorkspace -- layout wrapper for project-scoped views.
 *
 * Renders the workspace shell immediately using cached list data or
 * navigation state while the full project detail loads in the background.
 * This eliminates the blank-screen lag when clicking a project.
 */

const statusColors = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.value, s.color]))

export function ProjectWorkspace() {
  const { projectId } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: project, isLoading, isError } = useProject(projectId)

  // Attempt to get basic project info from navigation state or the projects list cache
  const navState = (location.state as { projectSummary?: ProjectSummary } | null)
  const projectSummary = navState?.projectSummary
  const cachedList = queryClient.getQueryData<ProjectSummary[]>(['projects'])
  const listEntry = cachedList?.find((p) => p.id === projectId)

  // Use full project detail when available, otherwise fall back to summary info
  const preview: Partial<ProjectDetail> | undefined = project || listEntry || projectSummary

  if (!isLoading && (isError || !project)) {
    return (
      <SectionCard accentLeft="#ef4444">
        <div className="py-6 text-center">
          <div className="mb-2 text-2xl">🔒</div>
          <div className="text-sm font-semibold text-bp-danger">Access Denied</div>
          <div className="mt-1 text-xs text-bp-muted">
            You do not have access to this project, or it does not exist.
          </div>
        </div>
      </SectionCard>
    )
  }

  // While loading with no preview data at all, show minimal loading
  if (isLoading && !preview) {
    return <LoadingState rows={3} />
  }

  const budget = parseFloat(preview?.budget || '0') || 0

  return (
    <div>
      {/* Project identity header -- renders immediately from cached/preview data */}
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-3">
          <span className="font-mono text-xs text-bp-muted">{preview?.code}</span>
          {preview?.status_display && (
            <StatusBadge
              text={preview.status_display}
              color={statusColors[preview.status || ''] || '#94a3b8'}
            />
          )}
          {project?.setup_config?.has_design_phase && (
            <StatusBadge text="Design & Build" color="#a855f7" />
          )}
        </div>
        <h2 className="mb-0.5 text-lg font-bold text-bp-text">{preview?.name}</h2>
        <div className="text-[13px] text-bp-muted">
          {preview?.location}
          {preview?.project_manager_name && ` \u2022 ${preview.project_manager_name}`}
          {preview?.contract_type_display && ` \u2022 ${preview.contract_type_display}`}
        </div>
        {(preview?.client_name || preview?.consultant || preview?.contractor) && (
          <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-bp-muted">
            {preview.client_name && (
              <span>Client: <span className="text-bp-text">{preview.client_name}</span>
                {project?.client_org && ` (${project.client_org})`}
              </span>
            )}
            {preview.consultant && (
              <span>Consultant: <span className="text-bp-text">{preview.consultant}</span></span>
            )}
            {preview.contractor && (
              <span>Contractor: <span className="text-bp-text">{preview.contractor}</span></span>
            )}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
        <MetricCard icon="💰" value={formatUGX(budget).replace('UGX ', '')} label="Budget" color="#f59e0b" />
        <MetricCard icon="👥" value={preview?.member_count ?? '--'} label="Team" color="#3b82f6" />
        <MetricCard
          icon="📅"
          value={preview?.start_date || '--'}
          label="Start Date"
          color="#94a3b8"
        />
        <MetricCard
          icon="🏁"
          value={preview?.end_date || '--'}
          label="End Date"
          color="#94a3b8"
        />
      </div>

      {/* Setup config summary -- only shown once full project detail arrives */}
      {project?.setup_config && (
        <SectionCard className="mb-5" padding="compact">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-bp-muted">
                📋 {project.setup_config.phase_templates.length} phases
              </span>
              <span className="text-bp-border">|</span>
              <span className="text-xs font-semibold text-bp-muted">
                🏁 {project.setup_config.milestone_templates.length} milestones
              </span>
              <span className="text-bp-border">|</span>
              <span className="text-xs text-bp-muted">
                {project.project_type_display} template applied
              </span>
            </div>
            <StatusBadge
              text={project.setup_complete ? 'Setup Complete' : 'Pending Setup'}
              color={project.setup_complete ? '#22c55e' : '#f97316'}
            />
          </div>
        </SectionCard>
      )}

      {/* Active module view -- show inline loader only while project detail still loading */}
      {isLoading ? <LoadingState rows={4} /> : <Outlet />}

      {projectId && <FloatingProjectCopilot projectId={projectId} />}
    </div>
  )
}
