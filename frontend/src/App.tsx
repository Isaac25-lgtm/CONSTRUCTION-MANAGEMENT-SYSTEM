import { Suspense, lazy, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from './components/shared/RequireAuth'
import { AppShell } from './components/layout/AppShell'
import { ProjectWorkspace } from './components/layout/ProjectWorkspace'
import { LoadingState } from './components/ui'
import { LoginPage } from './pages/LoginPage'
import { SetupPage } from './pages/SetupPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ProjectsPage } from './pages/projects/ProjectsPage'
import { NotificationsPage } from './pages/notifications/NotificationsPage'
import { CommunicationsPage } from './pages/communications/CommunicationsPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { ProjectTeamPage } from './pages/project/ProjectTeamPage'
import { SchedulePage } from './pages/project/SchedulePage'
import { MilestonesPage } from './pages/project/MilestonesPage'
import { OverviewPage } from './pages/project/OverviewPage'
import { CostBudgetPage } from './pages/project/CostBudgetPage'
import { RiskRegisterPage } from './pages/project/RiskRegisterPage'
import { RFIsPage } from './pages/project/RFIsPage'
import { ChangeOrdersPage } from './pages/project/ChangeOrdersPage'
import { PunchListPage } from './pages/project/PunchListPage'
import { DailyLogsPage } from './pages/project/DailyLogsPage'
import { SafetyPage } from './pages/project/SafetyPage'
import { QualityPage } from './pages/project/QualityPage'
import { RecycleBinPage } from './pages/project/RecycleBinPage'
import { ResourcesPage } from './pages/project/ResourcesPage'
import { TimesheetsPage } from './pages/project/TimesheetsPage'
import { MeetingsPage } from './pages/project/MeetingsPage'
import { ChatPage } from './pages/project/ChatPage'
import { SitePhotosPage } from './pages/project/SitePhotosPage'

const GanttPage = lazy(() => import('./pages/project/GanttPage').then((module) => ({ default: module.GanttPage })))
const NetworkPage = lazy(() => import('./pages/project/NetworkPage').then((module) => ({ default: module.NetworkPage })))
const SCurvePage = lazy(() => import('./pages/project/SCurvePage').then((module) => ({ default: module.SCurvePage })))
const ProcurementPage = lazy(() => import('./pages/project/ProcurementPage').then((module) => ({ default: module.ProcurementPage })))
const DocumentsPage = lazy(() => import('./pages/project/DocumentsPage').then((module) => ({ default: module.DocumentsPage })))
const ProjectReportsPage = lazy(() => import('./pages/project/ProjectReportsPage').then((module) => ({ default: module.ProjectReportsPage })))
const AIAssistantPage = lazy(() => import('./pages/project/AIAssistantPage').then((module) => ({ default: module.AIAssistantPage })))

function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState rows={4} />}>
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />

      {/* Protected routes */}
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppShell />}>
          {/* Global navigation pages */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="communications" element={<CommunicationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Project workspace -- 23 module routes */}
          <Route path="projects/:projectId" element={<ProjectWorkspace />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="budget" element={<CostBudgetPage />} />
            <Route path="milestones" element={<MilestonesPage />} />
            <Route path="gantt" element={<LazyRoute><GanttPage /></LazyRoute>} />
            <Route path="network" element={<LazyRoute><NetworkPage /></LazyRoute>} />
            <Route path="scurve" element={<LazyRoute><SCurvePage /></LazyRoute>} />
            <Route path="risks" element={<RiskRegisterPage />} />
            <Route path="rfis" element={<RFIsPage />} />
            <Route path="changes" element={<ChangeOrdersPage />} />
            <Route path="punch" element={<PunchListPage />} />
            <Route path="daily-logs" element={<DailyLogsPage />} />
            <Route path="safety" element={<SafetyPage />} />
            <Route path="quality" element={<QualityPage />} />
            <Route path="photos" element={<SitePhotosPage />} />
            <Route path="procurement" element={<LazyRoute><ProcurementPage /></LazyRoute>} />
            <Route path="timesheets" element={<TimesheetsPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="team" element={<ProjectTeamPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="project-reports" element={<LazyRoute><ProjectReportsPage /></LazyRoute>} />
            <Route path="documents" element={<LazyRoute><DocumentsPage /></LazyRoute>} />
            <Route path="recycle-bin" element={<RecycleBinPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="ai" element={<LazyRoute><AIAssistantPage /></LazyRoute>} />
          </Route>
        </Route>
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  )
}
