import { NavLink, useLocation, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useProject } from '../../hooks/useProjects'
import { useUIStore } from '../../stores/uiStore'

interface NavItem {
  key: string
  label: string
  icon: string
  path: string
  /** Project permission needed to see this nav item. null = always visible. */
  requiredPerm?: string
}

const globalNav: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', path: '/app/dashboard' },
  { key: 'projects', label: 'Projects', icon: '🏗️', path: '/app/projects' },
  { key: 'notifications', label: 'Notifications', icon: '🔔', path: '/app/notifications' },
  { key: 'comms', label: 'Communications', icon: '💬', path: '/app/communications' },
  { key: 'reports', label: 'Reports', icon: '📋', path: '/app/reports' },
  { key: 'settings', label: 'Settings', icon: '⚙️', path: '/app/settings' },
]

const projectNav: NavItem[] = [
  { key: 'overview', label: 'Overview & EVM', icon: '📊', path: 'overview', requiredPerm: 'project.view' },
  { key: 'schedule', label: 'Schedule & CPM', icon: '📝', path: 'schedule', requiredPerm: 'schedule.view' },
  { key: 'budget', label: 'Cost & Budget', icon: '💰', path: 'budget', requiredPerm: 'budget.view' },
  { key: 'milestones', label: 'Milestones', icon: '🏁', path: 'milestones', requiredPerm: 'schedule.view' },
  { key: 'gantt', label: 'Gantt Chart', icon: '📅', path: 'gantt', requiredPerm: 'schedule.view' },
  { key: 'network', label: 'Network', icon: '🔗', path: 'network', requiredPerm: 'schedule.view' },
  { key: 'scurve', label: 'S-Curve', icon: '📈', path: 'scurve', requiredPerm: 'schedule.view' },
  { key: 'risks', label: 'Risk Register', icon: '⚠️', path: 'risks', requiredPerm: 'risks.view' },
  { key: 'rfis', label: 'RFIs', icon: '❓', path: 'rfis', requiredPerm: 'rfis.view' },
  { key: 'changes', label: 'Change Orders', icon: '🔄', path: 'changes', requiredPerm: 'changes.view' },
  { key: 'punch', label: 'Punch List', icon: '✅', path: 'punch', requiredPerm: 'field_ops.view' },
  { key: 'daily-logs', label: 'Daily Logs', icon: '📓', path: 'daily-logs', requiredPerm: 'field_ops.view' },
  { key: 'safety', label: 'Safety', icon: '🧺', path: 'safety', requiredPerm: 'field_ops.view' },
  { key: 'quality', label: 'Quality', icon: '✔️', path: 'quality', requiredPerm: 'field_ops.view' },
  { key: 'photos', label: 'Site Photos', icon: '📷', path: 'photos', requiredPerm: 'field_ops.view' },
  { key: 'procurement', label: 'Procurement', icon: '📦', path: 'procurement', requiredPerm: 'procurement.view' },
  { key: 'timesheets', label: 'Timesheets', icon: '⏰', path: 'timesheets', requiredPerm: 'field_ops.view' },
  { key: 'resources', label: 'Resources', icon: '👥', path: 'resources', requiredPerm: 'project.view' },
  { key: 'meetings', label: 'Meetings', icon: '📅', path: 'meetings', requiredPerm: 'comms.view' },
  { key: 'project-reports', label: 'Reports', icon: '📋', path: 'project-reports', requiredPerm: 'reports.view' },
  { key: 'documents', label: 'Documents', icon: '📁', path: 'documents', requiredPerm: 'documents.view' },
  { key: 'team', label: 'Team', icon: '🧑‍🤝‍🧑', path: 'team', requiredPerm: 'project.view' },
  { key: 'recycle-bin', label: 'Recycle Bin', icon: '🗑️', path: 'recycle-bin', requiredPerm: 'project.edit' },
  { key: 'chat', label: 'Project Chat', icon: '💬', path: 'chat', requiredPerm: 'comms.view' },
  { key: 'ai', label: 'AI Assistant', icon: '🤖', path: 'ai' },
]

export function Sidebar() {
  const location = useLocation()
  const params = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const isInProject = !!params.projectId
  const { data: projectData } = useProject(params.projectId)

  // Close sidebar on nav click for mobile
  const handleNavClick = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[99] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-[100] flex flex-col border-r border-bp-border bg-bp-bg2
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        style={{ width: 220 }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-bp-border px-[18px] py-4">
          <div>
            <span className="text-lg font-extrabold text-bp-accent">🏗️ BuildPro</span>
            <div className="mt-0.5 text-[10px] text-bp-muted">Construction Management</div>
          </div>
          {/* Close button -- mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="cursor-pointer border-none bg-transparent text-bp-muted hover:text-bp-text lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <div className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-wide text-bp-muted">
            Main Menu
          </div>
          {globalNav.map((item) => {
            const isActive = location.pathname === item.path && !isInProject
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}

          {/* Project section */}
          {isInProject && (
            <>
              <div className="mx-2 mt-3 mb-2 border-t border-bp-border" />
              <div className="mb-0.5 px-2.5 text-[10px] font-bold uppercase tracking-wide text-bp-muted">
                Active Project
              </div>
              <div className="mb-1 px-3 py-1.5">
                <div className="truncate text-xs font-bold text-bp-accent">
                  {projectData?.name || `Project ${params.projectId}`}
                </div>
                <div className="text-[10px] text-bp-muted">
                  {projectData?.location || 'Loading...'}
                </div>
              </div>
              {projectNav
              .filter((item) => {
                // Admin sees everything
                if (user?.is_admin) return true
                // If no permission required, show it
                if (!item.requiredPerm) return true
                // Check against project detail user_permissions
                if (!projectData?.user_permissions) return false
                return projectData.user_permissions.includes(item.requiredPerm)
              })
              .map((item) => {
                const fullPath = `/app/projects/${params.projectId}/${item.path}`
                const isActive = location.pathname === fullPath
                return (
                  <NavLink
                    key={item.key}
                    to={fullPath}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </NavLink>
                )
              })}
              <button
                onClick={() => { navigate('/app/projects'); handleNavClick() }}
                className="nav-item mt-1"
                style={{ color: '#ef4444', fontSize: 12 }}
              >
                ← Back to Portfolio
              </button>
            </>
          )}
        </div>

        {/* User section */}
        <div className="border-t border-bp-border px-3.5 py-3">
          <div
            className="flex cursor-pointer items-center gap-2.5"
            onClick={() => { navigate('/app/settings'); handleNavClick() }}
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-base"
              style={{ background: 'rgba(245,158,11,0.13)' }}
            >
              🧑‍💻
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-bp-text">
                {user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'User'}
              </div>
              <div className="truncate text-[10px] text-bp-muted">
                {user?.system_role_name || (user?.is_staff ? 'Admin' : 'User')}
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            className="mt-2 w-full cursor-pointer rounded border-none px-2 py-1.5 text-left text-[11px] text-bp-muted transition-colors hover:bg-bp-bg hover:text-bp-danger"
          >
            ↪ Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
