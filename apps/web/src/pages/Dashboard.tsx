import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Home, FolderKanban, Calendar, CheckSquare, FileText, DollarSign, AlertTriangle, MessageSquare, BarChart3, Users, Bell, Search, Menu, X, Plus, ChevronRight, Clock, TrendingUp, TrendingDown, Building2, HardHat, Briefcase, Upload, Download, Filter, MoreVertical, Check, AlertCircle, Wifi, WifiOff, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Sample Data (same as your mockup)
const projectsData = [
  { id: 1, name: 'Kampala Office Complex', status: 'In Progress', progress: 65, budget: 2500000000, spent: 1625000000, manager: 'John Okello', startDate: '2025-01-15', endDate: '2026-06-30', priority: 'High' },
  { id: 2, name: 'Entebbe Highway Bridge', status: 'In Progress', progress: 42, budget: 4200000000, spent: 1764000000, manager: 'Sarah Nambi', startDate: '2025-03-01', endDate: '2026-12-15', priority: 'Critical' },
  { id: 3, name: 'Jinja Industrial Park', status: 'Planning', progress: 15, budget: 8500000000, spent: 1275000000, manager: 'Peter Wasswa', startDate: '2025-06-01', endDate: '2027-08-30', priority: 'Medium' },
];

const tasksData = [
  { id: 1, name: 'Foundation Excavation', project: 'Kampala Office Complex', assignee: 'Site Team A', status: 'Completed', priority: 'High', dueDate: '2025-02-28', progress: 100 },
  { id: 2, name: 'Steel Framework Installation', project: 'Kampala Office Complex', assignee: 'Steel Contractors', status: 'In Progress', priority: 'High', dueDate: '2025-04-15', progress: 68 },
  { id: 3, name: 'Concrete Pouring - Level 2', project: 'Kampala Office Complex', assignee: 'Site Team B', status: 'In Progress', priority: 'Medium', dueDate: '2025-03-20', progress: 45 },
  { id: 4, name: 'Electrical Conduit Layout', project: 'Kampala Office Complex', assignee: 'Electricians', status: 'Pending', priority: 'Medium', dueDate: '2025-05-01', progress: 0 },
  { id: 5, name: 'Bridge Pillar Construction', project: 'Entebbe Highway Bridge', assignee: 'Heavy Works Team', status: 'In Progress', priority: 'Critical', dueDate: '2025-06-30', progress: 35 },
];

const risksData = [
  { id: 1, description: 'Delayed steel delivery from supplier', probability: 'High', impact: 'High', status: 'Active', mitigation: 'Source alternative suppliers, maintain buffer stock', owner: 'John Okello' },
  { id: 2, description: 'Heavy rainfall during foundation work', probability: 'Medium', impact: 'High', status: 'Monitoring', mitigation: 'Arrange dewatering pumps, adjust schedule', owner: 'Sarah Nambi' },
  { id: 3, description: 'Labor shortage during peak season', probability: 'Medium', impact: 'Medium', status: 'Active', mitigation: 'Pre-book labor, offer competitive wages', owner: 'Peter Wasswa' },
  { id: 4, description: 'Currency fluctuation affecting material costs', probability: 'High', impact: 'Medium', status: 'Monitoring', mitigation: 'Lock in prices with suppliers, budget contingency', owner: 'Finance Team' },
];

const documentsData = [
  { id: 1, name: 'Architectural Plans v2.3.pdf', type: 'Drawing', project: 'Kampala Office Complex', uploadedBy: 'Arch. Mukasa', date: '2025-01-10', size: '15.2 MB' },
  { id: 2, name: 'Structural Engineering Report.pdf', type: 'Report', project: 'Kampala Office Complex', uploadedBy: 'Eng. Tumwine', date: '2025-01-08', size: '8.4 MB' },
  { id: 3, name: 'Site Progress Photos - Week 12.zip', type: 'Photos', project: 'Kampala Office Complex', uploadedBy: 'Site Supervisor', date: '2025-01-12', size: '45.6 MB' },
  { id: 4, name: 'Bridge Foundation Specs.dwg', type: 'Drawing', project: 'Entebbe Highway Bridge', uploadedBy: 'Eng. Kato', date: '2025-01-05', size: '22.1 MB' },
  { id: 5, name: 'Environmental Impact Assessment.pdf', type: 'Report', project: 'Jinja Industrial Park', uploadedBy: 'NEMA Consultant', date: '2024-12-20', size: '5.8 MB' },
];

const messagesData = [
  { id: 1, sender: 'John Okello', message: 'Steel delivery confirmed for Monday. Please prepare the site.', time: '10:30 AM', avatar: 'JO' },
  { id: 2, sender: 'Sarah Nambi', message: 'Bridge pillar inspection passed. We can proceed to next phase.', time: '9:15 AM', avatar: 'SN' },
  { id: 3, sender: 'Site Supervisor', message: 'Need additional 20 workers for concrete pouring tomorrow.', time: 'Yesterday', avatar: 'SS' },
  { id: 4, sender: 'Finance Team', message: 'Budget approval for Q2 materials has been processed.', time: 'Yesterday', avatar: 'FT' },
];

const budgetData = [
  { category: 'Materials', budgeted: 1200, actual: 980 },
  { category: 'Labor', budgeted: 800, actual: 720 },
  { category: 'Equipment', budgeted: 400, actual: 380 },
  { category: 'Subcontract', budgeted: 600, actual: 550 },
  { category: 'Overhead', budgeted: 200, actual: 195 },
];

const progressData = [
  { month: 'Aug', planned: 10, actual: 8 },
  { month: 'Sep', planned: 20, actual: 18 },
  { month: 'Oct', planned: 32, actual: 28 },
  { month: 'Nov', planned: 45, actual: 42 },
  { month: 'Dec', planned: 55, actual: 52 },
  { month: 'Jan', planned: 65, actual: 65 },
];

const ganttTasks = [
  { id: 1, name: 'Site Preparation', start: 0, duration: 15, progress: 100, phase: 'Phase 1' },
  { id: 2, name: 'Foundation Work', start: 10, duration: 30, progress: 100, phase: 'Phase 1' },
  { id: 3, name: 'Steel Framework', start: 35, duration: 45, progress: 68, phase: 'Phase 2' },
  { id: 4, name: 'Concrete Structure', start: 50, duration: 60, progress: 45, phase: 'Phase 2' },
  { id: 5, name: 'MEP Installation', start: 80, duration: 50, progress: 20, phase: 'Phase 3' },
  { id: 6, name: 'Interior Finishing', start: 110, duration: 40, progress: 0, phase: 'Phase 4' },
  { id: 7, name: 'External Works', start: 120, duration: 35, progress: 0, phase: 'Phase 4' },
  { id: 8, name: 'Final Inspection', start: 150, duration: 10, progress: 0, phase: 'Phase 5' },
];

const milestones = [
  { id: 1, name: 'Foundation Complete', date: '2025-03-15', status: 'Completed' },
  { id: 2, name: 'Structure Complete', date: '2025-06-30', status: 'On Track' },
  { id: 3, name: 'MEP Complete', date: '2025-09-15', status: 'On Track' },
  { id: 4, name: 'Handover', date: '2025-12-30', status: 'Pending' },
];

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const { isDark, toggleTheme } = useThemeStore();

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
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      'Completed': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      'In Progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      'Pending': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
      'Planning': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      'Active': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      'Monitoring': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      'On Track': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      'At Risk': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      'Critical': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      'High': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      'Medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      'Low': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
        {status}
      </span>
    );
  };

  const ProgressBar = ({ progress, color = 'blue' }: { progress: number; color?: string }) => (
    <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
      <div className={`bg-${color}-500 h-2 rounded-full transition-all duration-500`} style={{ width: `${progress}%`, backgroundColor: color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : '#f59e0b' }}></div>
    </div>
  );

  // DASHBOARD SECTION
  const DashboardContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Project Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome back! Here's your project overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
            <Plus size={18} /> New Project
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">3</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Building2 className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-green-600 dark:text-green-400">
            <TrendingUp size={16} className="mr-1" /> 2 on track
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tasks This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">24</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckSquare className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-green-600 dark:text-green-400">
            <Check size={16} className="mr-1" /> 18 completed
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">15.2B</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400">
            <TrendingDown size={16} className="mr-1" /> 31% utilized
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open Risks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">4</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-orange-600 dark:text-orange-400">
            <AlertCircle size={16} className="mr-1" /> 2 high priority
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="month" stroke={isDark ? '#9ca3af' : '#9ca3af'} fontSize={12} />
              <YAxis stroke={isDark ? '#9ca3af' : '#9ca3af'} fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="planned" stroke="#9ca3af" strokeDasharray="5 5" name="Planned %" />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="Actual %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget Overview (Millions UGX)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="category" stroke={isDark ? '#9ca3af' : '#9ca3af'} fontSize={11} />
              <YAxis stroke={isDark ? '#9ca3af' : '#9ca3af'} fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="budgeted" fill={isDark ? '#374151' : '#e5e7eb'} name="Budgeted" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#3b82f6" name="Actual" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Active Tasks</h3>
            <button className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {tasksData.slice(0, 4).map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${task.status === 'Completed' ? 'bg-green-500' : task.status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{task.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{task.project}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <ProgressBar progress={task.progress} />
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Milestones</h3>
          </div>
          <div className="space-y-4">
            {milestones.map(milestone => (
              <div key={milestone.id} className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1.5 ${milestone.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{milestone.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{milestone.date}</p>
                </div>
                <StatusBadge status={milestone.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardContent />;
      // Add other sections here (Projects, Tasks, etc.)
      default: return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 dark:bg-dark-800 text-white transition-all duration-300 flex flex-col border-r border-gray-700`}>
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
              onClick={() => setActiveSection(item.id)}
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
              <button onClick={() => setIsOnline(!isOnline)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${isOnline ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                {isOnline ? 'Online' : 'Offline Mode'}
              </button>
              <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-dark-700">
                <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">PM</div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Project Manager</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">john@buildpro.ug</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderSection()}
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <p>BuildPro Construction PM v1.0 • Designed for Uganda's Construction Industry</p>
            <p>© 2025 Limo Jesse Mwanga - MSc Civil Engineering Research Project</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
