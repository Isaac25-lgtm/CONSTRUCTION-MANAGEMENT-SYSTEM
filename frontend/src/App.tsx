import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from './components/shared/RequireAuth'
import { AppShell } from './components/layout/AppShell'
import { ProjectWorkspace } from './components/layout/ProjectWorkspace'
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
import { GanttPage } from './pages/project/GanttPage'
import { NetworkPage } from './pages/project/NetworkPage'
import { SCurvePage } from './pages/project/SCurvePage'
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
import { ProcurementPage } from './pages/project/ProcurementPage'
import { ResourcesPage } from './pages/project/ResourcesPage'
import { TimesheetsPage } from './pages/project/TimesheetsPage'
import { MeetingsPage } from './pages/project/MeetingsPage'
import { ChatPage } from './pages/project/ChatPage'
import { DocumentsPage } from './pages/project/DocumentsPage'
import { SitePhotosPage } from './pages/project/SitePhotosPage'
import { ProjectReportsPage } from './pages/project/ProjectReportsPage'
import { AIAssistantPage } from './pages/project/AIAssistantPage'

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
            <Route path="gantt" element={<GanttPage />} />
            <Route path="network" element={<NetworkPage />} />
            <Route path="scurve" element={<SCurvePage />} />
            <Route path="risks" element={<RiskRegisterPage />} />
            <Route path="rfis" element={<RFIsPage />} />
            <Route path="changes" element={<ChangeOrdersPage />} />
            <Route path="punch" element={<PunchListPage />} />
            <Route path="daily-logs" element={<DailyLogsPage />} />
            <Route path="safety" element={<SafetyPage />} />
            <Route path="quality" element={<QualityPage />} />
            <Route path="photos" element={<SitePhotosPage />} />
            <Route path="procurement" element={<ProcurementPage />} />
            <Route path="timesheets" element={<TimesheetsPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="team" element={<ProjectTeamPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="project-reports" element={<ProjectReportsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="recycle-bin" element={<RecycleBinPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="ai" element={<AIAssistantPage />} />
          </Route>
        </Route>
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  )
}
