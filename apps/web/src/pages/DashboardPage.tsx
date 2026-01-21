import { Building2, CheckSquare, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Check, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDataStore } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressBar from '../components/ui/ProgressBar';

const formatCurrency = (amount: number) => {
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}M`;
  return amount.toString();
};

export default function DashboardPage() {
  const { projects, tasks, risks, milestones } = useDataStore();

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const activeRisks = risks.filter(r => r.status === 'Active').length;
  const highRisks = risks.filter(r => r.probability === 'High' || r.impact === 'High').length;
  const onTrackProjects = projects.filter(p => p.status === 'In Progress' && p.progress >= (p.progress / 100) * 60).length;

  const progressData = [
    { month: 'Aug', planned: 10, actual: 8 },
    { month: 'Sep', planned: 20, actual: 18 },
    { month: 'Oct', planned: 32, actual: 28 },
    { month: 'Nov', planned: 45, actual: 42 },
    { month: 'Dec', planned: 55, actual: 52 },
    { month: 'Jan', planned: 65, actual: 65 },
  ];

  const budgetData = [
    { category: 'Materials', budgeted: 1200, actual: 980 },
    { category: 'Labor', budgeted: 800, actual: 720 },
    { category: 'Equipment', budgeted: 400, actual: 380 },
    { category: 'Subcontract', budgeted: 600, actual: 550 },
    { category: 'Overhead', budgeted: 200, actual: 195 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Project Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Welcome back! Here's your project overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projects.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Building2 className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-green-600 dark:text-green-400">
            <TrendingUp size={16} className="mr-1" /> {onTrackProjects} on track
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tasks This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckSquare className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-green-600 dark:text-green-400">
            <Check size={16} className="mr-1" /> {completedTasks} completed
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400">
            <TrendingDown size={16} className="mr-1" /> {Math.round(totalSpent / totalBudget * 100)}% utilized
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open Risks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{risks.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-orange-600 dark:text-orange-400">
            <AlertCircle size={16} className="mr-1" /> {highRisks} high priority
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
              <Legend />
              <Line type="monotone" dataKey="planned" stroke="#9ca3af" strokeDasharray="5 5" name="Planned %" />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="Actual %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget Overview (Millions UGX)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="category" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
              <Legend />
              <Bar dataKey="budgeted" fill="#e5e7eb" name="Budgeted" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#3b82f6" name="Actual" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Active Tasks</h3>
            <button className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${task.status === 'Completed' ? 'bg-green-500' : task.status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-400'}`} />
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

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Milestones</h3>
          </div>
          <div className="space-y-4">
            {milestones.slice(0, 4).map(milestone => (
              <div key={milestone.id} className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1.5 ${milestone.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}`} />
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

      {/* Projects Overview */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Projects Overview</h3>
          <button className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map(project => (
            <div key={project.id} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{project.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{project.manager}</p>
                </div>
                <StatusBadge status={project.status} />
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Progress</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{project.progress}%</span>
                </div>
                <ProgressBar progress={project.progress} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Budget</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">UGX {formatCurrency(project.budget)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
