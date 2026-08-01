import { Outlet, useMatch } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Toast } from '../ui'
import { FloatingProjectCopilot } from '../ai/FloatingProjectCopilot'
import { useUIStore } from '../../stores/uiStore'

/**
 * AppShell -- main layout matching prototype.
 *
 * Desktop (>= 1024px / lg): fixed 220px sidebar always visible, content offset by 220px.
 * Tablet/Mobile (< 1024px): sidebar hidden by default, hamburger menu to open as drawer overlay.
 */
export function AppShell() {
  const { sidebarOpen } = useUIStore()
  // Project workspace mounts its own project-scoped copilot; show the
  // org-level one everywhere else so AI is available across the app.
  const inProjectWorkspace = useMatch('/app/projects/:projectId/*')

  return (
    <div className="flex min-h-screen bg-bp-bg text-bp-text">
      <Sidebar />
      {/* Main content: offset on desktop when sidebar is visible, full-width on mobile */}
      <main
        className={`min-h-screen flex-1 transition-[margin] duration-200 ${
          sidebarOpen ? 'lg:ml-[220px]' : ''
        }`}
        style={!sidebarOpen ? undefined : undefined}
      >
        {/* Always apply margin on lg+ since sidebar is always visible there */}
        <style>{`@media (min-width: 1024px) { main { margin-left: 220px !important; } }`}</style>
        <Topbar />
        <div className="p-4 lg:p-6">
          <div style={{ maxWidth: 1100 }}>
            <Outlet />
          </div>
        </div>
      </main>
      {!inProjectWorkspace && <FloatingProjectCopilot />}
      <Toast />
    </div>
  )
}
