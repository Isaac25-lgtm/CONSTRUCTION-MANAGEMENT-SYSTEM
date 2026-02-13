import React, { useState, useEffect } from 'react';
import { Home, FolderKanban, Calendar, CheckSquare, FileText, DollarSign, AlertTriangle, MessageSquare, BarChart3, Bell, Search, Menu, Sun, Moon, Wifi, WifiOff, HardHat, Settings, LogOut } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';
import { useUserStore } from '../stores/userStore';
import { useAuditStore } from '../stores/auditStore';
import { useDataStore } from '../stores/dataStore';
import { AIChatWidget } from './AIChat';


interface LayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
}

export default function Layout({ children, activeSection, onSectionChange, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isDark, toggleTheme } = useThemeStore();
  const { currentUser, logout } = useUserStore();
  const { addLog } = useAuditStore();
  const { syncFromAPI, isApiConnected, isLoading: isSyncing } = useDataStore();

  useEffect(() => {
    syncFromAPI();
  }, [syncFromAPI]);

  const isOnline = isApiConnected;

  const handleLogout = () => {
    if (currentUser) {
      addLog({
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        userEmail: currentUser.email,
        action: 'LOGOUT',
        entityType: 'System',
        details: 'User logged out of the system',
      });
    }
    logout();
    onLogout();
  };

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'projects', icon: FolderKanban, label: 'Projects' },
    { id: 'schedule', icon: Calendar, label: 'Schedule & Gantt' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks & Milestones' },
    { id: 'documents', icon: FileText, label: 'Documents' },
    { id: 'budget', icon: DollarSign, label: 'Budget & Finance' },
    { id: 'risks', icon: AlertTriangle, label: 'Risk Management' },
    { id: 'communication', icon: MessageSquare, label: 'Communication' },
    { id: 'reports', icon: BarChart3, label: 'Reports & Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 dark:bg-dark-800 text-white transition-all duration-300 flex flex-col border-r border-slate-700 dark:border-dark-700`}>
        <div className="p-4 border-b border-slate-700 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <HardHat size={24} />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-lg">BuildPro</h1>
                <p className="text-xs text-slate-400 dark:text-gray-500">Construction PM</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${activeSection === item.id ? 'bg-primary-600 text-white' : 'text-slate-300 dark:text-gray-400 hover:bg-slate-800 dark:hover:bg-dark-700'}`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 dark:border-dark-700">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-300 dark:text-gray-400 hover:bg-slate-800 dark:hover:bg-dark-700 transition">
            <Menu size={20} />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" placeholder="Search projects, tasks..." className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-dark-700 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${isOnline ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                {isSyncing ? 'Syncing...' : isOnline ? 'API Connected' : 'Demo Mode'}
              </div>
              <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-dark-700">
                <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {currentUser ? `${currentUser.firstName[0]}${currentUser.lastName[0]}` : 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {currentUser?.email || 'Not logged in'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <p>BuildPro Construction PM v1.0 • Designed for Uganda's Construction Industry</p>
            <p>© 2025 Limo Jesse Mwanga - MSc Civil Engineering Research Project</p>
          </div>
        </footer>
      </div>

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}
