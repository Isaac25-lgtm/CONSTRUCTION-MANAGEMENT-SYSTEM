import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from './stores/themeStore';
import { useUserStore } from './stores/userStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import SchedulePage from './pages/SchedulePage';
import DocumentsPage from './pages/DocumentsPage';
import BudgetPage from './pages/BudgetPage';
import RisksPage from './pages/RisksPage';
import CommunicationPage from './pages/CommunicationPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const { isDark } = useThemeStore();
  const { isAuthenticated } = useUserStore();
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    // Check if user is already authenticated
    setShowApp(isAuthenticated);
  }, [isAuthenticated]);

  const handleLogin = () => {
    setShowApp(true);
  };

  const handleLogout = () => {
    setShowApp(false);
    setActiveSection('dashboard');
  };

  const renderPage = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'tasks':
        return <TasksPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'documents':
        return <DocumentsPage />;
      case 'budget':
        return <BudgetPage />;
      case 'risks':
        return <RisksPage />;
      case 'communication':
        return <CommunicationPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  if (!showApp) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'dark:bg-dark-800 dark:text-gray-100',
          duration: 3000,
        }}
      />
      <Layout 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Layout>
    </>
  );
}

export default App;
