import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Calendar, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useDataStore } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';

export default function SchedulePage() {
  const { tasks, projects, milestones } = useDataStore();
  const [selectedProject, setSelectedProject] = useState<number | 'all'>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [zoomLevel, setZoomLevel] = useState<'week' | 'month' | 'quarter'>('month');
  const [isDownloading, setIsDownloading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const downloadChart = async () => {
    if (!chartRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `gantt-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download chart:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredTasks = selectedProject === 'all'
    ? tasks
    : tasks.filter(t => t.projectId === selectedProject);

  const filteredMilestones = selectedProject === 'all'
    ? milestones
    : milestones.filter(m => m.projectId === selectedProject);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = 2025;

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTasks(newExpanded);
  };

  const getTaskPosition = (startDate: string, dueDate: string) => {
    const start = new Date(startDate || '2025-01-01');
    const end = new Date(dueDate);
    const yearStart = new Date('2025-01-01');
    const yearEnd = new Date('2025-12-31');

    const totalDays = (yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
    const startDay = Math.max(0, (start.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    return {
      left: `${(startDay / totalDays) * 100}%`,
      width: `${Math.max(2, (duration / totalDays) * 100)}%`,
    };
  };

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'Completed') return 'bg-green-500';
    if (status === 'Blocked') return 'bg-red-500';
    if (progress > 50) return 'bg-blue-500';
    return 'bg-blue-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schedule & Gantt Chart</h1>
          <p className="text-gray-500 dark:text-gray-400">Visual project timeline and task dependencies</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel('week')}
            className={`px-3 py-1.5 rounded-lg text-sm ${zoomLevel === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'}`}
          >
            Week
          </button>
          <button
            onClick={() => setZoomLevel('month')}
            className={`px-3 py-1.5 rounded-lg text-sm ${zoomLevel === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'}`}
          >
            Month
          </button>
          <button
            onClick={() => setZoomLevel('quarter')}
            className={`px-3 py-1.5 rounded-lg text-sm ${zoomLevel === 'quarter' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'}`}
          >
            Quarter
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-dark-600 mx-2" />
          <button
            onClick={downloadChart}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            {isDownloading ? 'Downloading...' : 'Download PNG'}
          </button>
        </div>
      </div>

      {/* Project Filter */}
      <div className="flex items-center gap-4">
        <Calendar size={20} className="text-gray-400" />
        <select
          value={selectedProject === 'all' ? 'all' : selectedProject}
          onChange={(e) => setSelectedProject(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Chart container for download - includes legend and chart */}
      <div ref={chartRef} className="space-y-4 p-4 -m-4">
        {/* Chart Title for Export */}
        <div className="text-center pb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {selectedProject === 'all' ? 'All Projects' : projects.find(p => p.id === selectedProject)?.name} - Gantt Chart
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Generated on {new Date().toLocaleDateString()}</p>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className="text-gray-600 dark:text-gray-400">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            <span className="text-gray-600 dark:text-gray-400">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-gray-600 dark:text-gray-400">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">Milestone</span>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
          {/* Timeline Header */}
          <div className="flex border-b border-gray-200 dark:border-dark-700">
            <div className="w-80 flex-shrink-0 p-3 bg-gray-50 dark:bg-dark-700 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-dark-700">
              Task Name
            </div>
            <div className="flex-1 flex">
              {months.map(month => (
                <div
                  key={month}
                  className="flex-1 p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-dark-700 last:border-r-0"
                >
                  {month} {currentYear}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="max-h-[500px] overflow-y-auto">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50">
                {/* Task Name */}
                <div className="w-80 flex-shrink-0 p-3 border-r border-gray-200 dark:border-dark-700">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
                    >
                      {expandedTasks.has(task.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{task.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{task.assignee}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                </div>

                {/* Gantt Bar */}
                <div className="flex-1 relative py-3 px-1">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex">
                    {months.map((_, idx) => (
                      <div key={idx} className="flex-1 border-r border-gray-100 dark:border-dark-700" />
                    ))}
                  </div>

                  {/* Task bar */}
                  <div
                    className="absolute h-6 rounded flex items-center overflow-hidden"
                    style={{ ...getTaskPosition(task.startDate || task.dueDate, task.dueDate), top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <div className={`h-full w-full bg-gray-200 dark:bg-gray-700 rounded relative`}>
                      <div
                        className={`h-full ${getProgressColor(task.progress, task.status)} rounded transition-all`}
                        style={{ width: `${task.progress}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white drop-shadow">
                        {task.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Milestones */}
            {filteredMilestones.map(milestone => (
              <div key={`m-${milestone.id}`} className="flex border-b border-gray-100 dark:border-dark-700 bg-purple-50/50 dark:bg-purple-900/10">
                <div className="w-80 flex-shrink-0 p-3 border-r border-gray-200 dark:border-dark-700">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-purple-900 dark:text-purple-100">{milestone.name}</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">{milestone.date}</p>
                    </div>
                    <StatusBadge status={milestone.status} />
                  </div>
                </div>
                <div className="flex-1 relative py-3 px-1">
                  <div className="absolute inset-0 flex">
                    {months.map((_, idx) => (
                      <div key={idx} className="flex-1 border-r border-gray-100 dark:border-dark-700" />
                    ))}
                  </div>
                  {/* Milestone diamond */}
                  <div
                    className="absolute w-4 h-4 bg-purple-500 transform rotate-45"
                    style={{
                      left: getTaskPosition(milestone.date, milestone.date).left,
                      top: '50%',
                      transform: 'translateY(-50%) translateX(-50%) rotate(45deg)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && filteredMilestones.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No tasks or milestones to display
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredTasks.length}</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{filteredTasks.filter(t => t.status === 'Completed').length}</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{filteredTasks.filter(t => t.status === 'In Progress').length}</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Milestones</p>
          <p className="text-2xl font-bold text-purple-600">{filteredMilestones.length}</p>
        </div>
      </div>
    </div>
  );
}
