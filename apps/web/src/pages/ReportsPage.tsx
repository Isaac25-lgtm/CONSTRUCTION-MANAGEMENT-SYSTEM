import { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  BarChart3,
  PieChart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { useDataStore } from '../stores/dataStore';
import { reportsAPI } from '../lib/api';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const { projects, tasks, risks } = useDataStore();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | 'project' | 'financial' | null>(null);

  const progressData = [
    { month: 'Aug', planned: 10, actual: 8, variance: -2 },
    { month: 'Sep', planned: 20, actual: 18, variance: -2 },
    { month: 'Oct', planned: 32, actual: 28, variance: -4 },
    { month: 'Nov', planned: 45, actual: 42, variance: -3 },
    { month: 'Dec', planned: 55, actual: 52, variance: -3 },
    { month: 'Jan', planned: 65, actual: 65, variance: 0 },
  ];

  const budgetTrendData = [
    { month: 'Aug', budget: 500, spent: 420, forecast: 480 },
    { month: 'Sep', budget: 1000, spent: 890, forecast: 950 },
    { month: 'Oct', budget: 1500, spent: 1350, forecast: 1420 },
    { month: 'Nov', budget: 2000, spent: 1820, forecast: 1900 },
    { month: 'Dec', budget: 2500, spent: 2280, forecast: 2400 },
    { month: 'Jan', budget: 3000, spent: 2750, forecast: 2900 },
  ];

  const reportTemplates = [
    { id: 'weekly', name: 'Weekly Progress Report', icon: Calendar, description: 'Tasks completed, issues, and next week plan' },
    { id: 'monthly', name: 'Monthly Financial Report', icon: DollarSign, description: 'Budget vs actual, expense breakdown, forecast' },
    { id: 'risk', name: 'Risk Assessment Report', icon: AlertTriangle, description: 'Active risks, mitigation status, new risks' },
    { id: 'executive', name: 'Executive Summary', icon: BarChart3, description: 'High-level KPIs and project health' },
    { id: 'resource', name: 'Resource Utilization', icon: PieChart, description: 'Team allocation and workload analysis' },
    { id: 'milestone', name: 'Milestone Status Report', icon: TrendingUp, description: 'Milestone tracking and delivery status' },
  ];

  const recentReports = [
    { name: 'Weekly Progress Report - Week 2', date: '2025-01-12', type: 'PDF', size: '2.4 MB' },
    { name: 'Monthly Financial Report - December', date: '2025-01-05', type: 'Excel', size: '1.8 MB' },
    { name: 'Risk Assessment Report - Q4', date: '2024-12-28', type: 'PDF', size: '3.1 MB' },
    { name: 'Executive Summary - December', date: '2024-12-30', type: 'PDF', size: '1.2 MB' },
  ];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const overallProgress = Math.round((completedTasks / totalTasks) * 100) || 0;

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const budgetUtilization = Math.round((totalSpent / totalBudget) * 100) || 0;

  const activeRisks = risks.filter((r) => r.status === 'Active').length;
  const highRisks = risks.filter((r) => r.probability === 'High' && r.impact === 'High').length;

  const spi = 1.02;
  const cpi = 1.05;

  const handleGenerateReport = (reportId: string) => {
    setSelectedReport(reportId);
    toast.success(`Generating ${reportTemplates.find((r) => r.id === reportId)?.name}...`);
    setTimeout(() => {
      toast.success('Report generated successfully!');
    }, 1500);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsExporting(format);
    const exportLabel = format === 'excel' ? 'Excel' : 'PDF';

    try {
      toast.loading(`Preparing ${exportLabel} download...`, { id: 'report-export' });
      await reportsAPI.download(format);
      toast.success(`${exportLabel} report downloaded`, { id: 'report-export' });
    } catch (error: any) {
      toast.error(error.message || `Failed to download ${exportLabel} report`, { id: 'report-export' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleRecentReportDownload = async (type: string) => {
    const format = type.toLowerCase() === 'excel' ? 'excel' : 'pdf';
    await handleExport(format);
  };

  const handleCsvExport = async (kind: 'project' | 'financial') => {
    setIsExporting(kind);
    try {
      toast.loading(`Preparing ${kind === 'project' ? 'project' : 'financial'} CSV...`, { id: 'report-export-csv' });
      if (kind === 'project') {
        await reportsAPI.downloadProjectSummary();
      } else {
        await reportsAPI.downloadFinancialSummary();
      }
      toast.success('CSV downloaded', { id: 'report-export-csv' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to download CSV', { id: 'report-export-csv' });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">Project insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={18} /> {isExporting === 'pdf' ? 'Downloading PDF...' : 'Export PDF'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={18} /> {isExporting === 'excel' ? 'Downloading Excel...' : 'Export Excel'}
          </button>
          <button
            onClick={() => handleCsvExport('project')}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={18} /> {isExporting === 'project' ? 'Downloading...' : 'Project CSV'}
          </button>
          <button
            onClick={() => handleCsvExport('financial')}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={18} /> {isExporting === 'financial' ? 'Downloading...' : 'Financial CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">SPI</p>
          <p className={`text-2xl font-bold ${spi >= 1 ? 'text-green-600' : 'text-red-600'}`}>{spi.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{spi >= 1 ? 'Ahead' : 'Behind'} schedule</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">CPI</p>
          <p className={`text-2xl font-bold ${cpi >= 1 ? 'text-green-600' : 'text-red-600'}`}>{cpi.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{cpi >= 1 ? 'Under' : 'Over'} budget</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{overallProgress}%</p>
          <p className="text-xs text-gray-400">{completedTasks}/{totalTasks} tasks</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Budget Used</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{budgetUtilization}%</p>
          <p className="text-xs text-gray-400">of total budget</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Risks</p>
          <p className="text-2xl font-bold text-yellow-600">{activeRisks}</p>
          <p className="text-xs text-gray-400">{highRisks} high severity</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Projects</p>
          <p className="text-2xl font-bold text-primary-600">{projects.length}</p>
          <p className="text-xs text-gray-400">{projects.filter((p) => p.status === 'In Progress').length} in progress</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Progress Trend (Planned vs Actual)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
              <Legend />
              <Area type="monotone" dataKey="planned" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.3} name="Planned %" />
              <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Actual %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget Trend (Millions UGX)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={budgetTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
              <Legend />
              <Line type="monotone" dataKey="budget" stroke="#e5e7eb" strokeWidth={2} name="Budget" />
              <Line type="monotone" dataKey="spent" stroke="#3b82f6" strokeWidth={2} name="Spent" />
              <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Forecast" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Report Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTemplates.map((report) => (
            <div
              key={report.id}
              className={`bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border cursor-pointer transition hover:shadow-md ${
                selectedReport === report.id
                  ? 'border-primary-500 ring-2 ring-primary-500/20'
                  : 'border-gray-100 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-700'
              }`}
              onClick={() => handleGenerateReport(report.id)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <report.icon className="text-primary-600 dark:text-primary-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{report.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">Click to generate</span>
                <FileText size={16} className="text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700">
        <div className="p-4 border-b border-gray-100 dark:border-dark-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Reports</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-dark-700">
          {recentReports.map((report, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-700">
              <div className="flex items-center gap-3">
                <FileText className="text-gray-400" size={20} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{report.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{report.date} • {report.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-100 dark:bg-dark-700 rounded text-xs text-gray-600 dark:text-gray-400">{report.type}</span>
                <button
                  onClick={() => handleRecentReportDownload(report.type)}
                  className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                  title={`Download ${report.type}`}
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
