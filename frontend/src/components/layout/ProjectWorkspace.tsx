import { Outlet, useParams } from 'react-router-dom'
import { SectionCard, MetricCard, LoadingState, StatusBadge } from '../ui'
import { FloatingProjectCopilot } from '../ai/FloatingProjectCopilot'
import { useProject } from '../../hooks/useProjects'
import { formatUGX } from '../../lib/formatters'
import { PROJECT_STATUSES } from '../../types'

/**
 * ProjectWorkspace -- layout wrapper for project-scoped views.
 *
 * Loads real project data from the API. Shows project identity header
 * with code, name, type, contract, client, manager, consultant, status, and
 * quick stats above the active module Outlet.
 */

const statusColors = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.value, s.color]))

export function ProjectWorkspace() {
  const { projectId } = useParams()
  const { data: project, isLoading, isError } = useProject(projectId)

  if (isLoading) {
    return <LoadingState rows={3} />
  }

  if (isError || !project) {
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

  const budget = parseFloat(project.budget) || 0

  return (
    <div>
      {/* Project identity header */}
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-3">
          <span className="font-mono text-xs text-bp-muted">{project.code}</span>
          <StatusBadge
            text={project.status_display}
            color={statusColors[project.status] || '#94a3b8'}
          />
          {project.setup_config?.has_design_phase && (
            <StatusBadge text="Design & Build" color="#a855f7" />
          )}
        </div>
        <h2 className="mb-0.5 text-lg font-bold text-bp-text">{project.name}</h2>
        <div className="text-[13px] text-bp-muted">
          {project.location}
          {project.project_manager_name && ` \u2022 ${project.project_manager_name}`}
          {project.contract_type_display && ` \u2022 ${project.contract_type_display}`}
        </div>
        {(project.client_name || project.consultant || project.contractor) && (
          <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-bp-muted">
            {project.client_name && (
              <span>Client: <span className="text-bp-text">{project.client_name}</span>
                {project.client_org && ` (${project.client_org})`}
              </span>
            )}
            {project.consultant && (
              <span>Consultant: <span className="text-bp-text">{project.consultant}</span></span>
            )}
            {project.contractor && (
              <span>Contractor: <span className="text-bp-text">{project.contractor}</span></span>
            )}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
        <MetricCard icon="💰" value={formatUGX(budget).replace('UGX ', '')} label="Budget" color="#f59e0b" />
        <MetricCard icon="👥" value={project.member_count} label="Team" color="#3b82f6" />
        <MetricCard
          icon="📅"
          value={project.start_date || '--'}
          label="Start Date"
          color="#94a3b8"
        />
        <MetricCard
          icon="🏁"
          value={project.end_date || '--'}
          label="End Date"
          color="#94a3b8"
        />
      </div>

      {/* Setup config summary -- phases ready for scheduling */}
      {project.setup_config && (
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

      {/* Active module view */}
      <Outlet />

      {projectId && <FloatingProjectCopilot projectId={projectId} />}
    </div>
  )
}
