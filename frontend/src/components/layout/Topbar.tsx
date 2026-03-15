import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { ActionButton } from '../ui'
import { useUIStore } from '../../stores/uiStore'
import { useAuth } from '../../hooks/useAuth'
import { useProject } from '../../hooks/useProjects'

/**
 * Topbar matching the prototype's sticky top bar.
 *
 * - Hamburger menu button on mobile (< lg breakpoint)
 * - Breadcrumb: global title or Portfolio > Project Name > Module Name
 */

const globalLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  notifications: 'Notifications & Alerts',
  communications: 'Communications',
  reports: 'Reports',
  settings: 'Settings',
}

const projectLabels: Record<string, string> = {
  overview: 'Overview & EVM',
  schedule: 'Schedule & CPM',
  budget: 'Cost & Budget',
  milestones: 'Milestones',
  gantt: 'Gantt Chart',
  network: 'Network',
  scurve: 'S-Curve',
  risks: 'Risk Register',
  rfis: 'RFIs',
  changes: 'Change Orders',
  punch: 'Punch List',
  'daily-logs': 'Daily Logs',
  safety: 'Safety',
  quality: 'Quality',
  photos: 'Site Photos',
  procurement: 'Procurement',
  timesheets: 'Timesheets',
  resources: 'Resources',
  meetings: 'Meetings',
  'project-reports': 'Reports',
  documents: 'Documents',
  'recycle-bin': 'Recycle Bin',
  chat: 'Project Chat',
}

export function Topbar() {
  const location = useLocation()
  const params = useParams()
  const navigate = useNavigate()
  const { toggleSidebar } = useUIStore()
  const { hasSystemPerm } = useAuth()
  const isInProject = !!params.projectId
  const { data: projectData } = useProject(params.projectId)

  const segments = location.pathname.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1] || 'dashboard'

  const showNewProject =
    location.pathname === '/app/dashboard' || location.pathname === '/app/projects'

  const projectName = projectData?.name || `Project ${params.projectId || ''}`

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-bp-border bg-bp-bg2 px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger -- visible below lg */}
        <button
          onClick={toggleSidebar}
          className="cursor-pointer border-none bg-transparent text-lg text-bp-muted hover:text-bp-text lg:hidden"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>

        {/* Breadcrumb */}
        {isInProject ? (
          <div className="flex items-center gap-2 text-[13px]">
            <span
              className="cursor-pointer text-bp-muted hover:text-bp-text"
              onClick={() => navigate('/app/projects')}
            >
              Portfolio
            </span>
            <span className="text-bp-muted">›</span>
            <span className="font-semibold text-bp-accent">{projectName}</span>
            <span className="text-bp-muted">›</span>
            <span className="text-bp-text">
              {projectLabels[lastSegment] || lastSegment}
            </span>
          </div>
        ) : (
          <span className="text-[15px] font-semibold text-bp-text">
            {globalLabels[lastSegment] || 'BuildPro'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showNewProject && hasSystemPerm('projects.create') && (
          <ActionButton variant="accent" onClick={() => navigate('/app/projects?create=1')}>
            + New Project
          </ActionButton>
        )}
      </div>
    </div>
  )
}
