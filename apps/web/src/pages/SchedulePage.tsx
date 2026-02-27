import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { useDataStore } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';
import { boqAPI } from '../lib/api';

export default function SchedulePage() {
  const { tasks, projects, milestones } = useDataStore();
  const [selectedProject, setSelectedProject] = useState<number | 'all'>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [zoomLevel, setZoomLevel] = useState<'week' | 'month' | 'quarter'>('month');
  const [isDownloading, setIsDownloading] = useState(false);
  const [boqWeightedCompletion, setBoqWeightedCompletion] = useState<number | null>(null);
  const [boqTotals, setBoqTotals] = useState<{ budget?: number; actual?: number; variance?: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const filteredTasks = selectedProject === 'all'
    ? tasks
    : tasks.filter((t) => t.projectId === selectedProject);

  const filteredMilestones = selectedProject === 'all'
    ? milestones
    : milestones.filter((m) => m.projectId === selectedProject);

  const selectedProjectDetails = selectedProject === 'all'
    ? null
    : projects.find((p) => p.id === selectedProject) || null;

  useEffect(() => {
    let isMounted = true;
    if (selectedProject === 'all' || !selectedProjectDetails?._uuid) {
      setBoqWeightedCompletion(null);
      setBoqTotals(null);
      return;
    }

    boqAPI.summary(selectedProjectDetails._uuid)
      .then((summary) => {
        if (!isMounted) return;
        setBoqWeightedCompletion(Number(summary.project_weighted_completion_percent || 0));
        setBoqTotals({
          budget: Number(summary.total_budget_cost || 0),
          actual: Number(summary.total_actual_cost || 0),
          variance: Number(summary.total_variance || 0),
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setBoqWeightedCompletion(null);
        setBoqTotals(null);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProject, selectedProjectDetails?._uuid]);

  const formatDate = (value?: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const computeDateRange = () => {
    const values = filteredTasks
      .flatMap((task) => [task.startDate || task.dueDate, task.dueDate])
      .filter(Boolean)
      .map((dateStr) => new Date(dateStr as string))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (values.length === 0) {
      return { start: 'N/A', end: 'N/A' };
    }

    const min = new Date(Math.min(...values.map((value) => value.getTime())));
    const max = new Date(Math.max(...values.map((value) => value.getTime())));

    return {
      start: min.toLocaleDateString(),
      end: max.toLocaleDateString(),
    };
  };

  const dateRange = computeDateRange();
  const fallbackWeightedCompletion = Math.round(
    filteredTasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(filteredTasks.length, 1)
  );
  const weightedCompletionForExport =
    boqWeightedCompletion !== null ? `${boqWeightedCompletion.toFixed(1)}% (BOQ weighted)` : `${fallbackWeightedCompletion}% (task average)`;

  const truncate = (value: string, max: number) => {
    if (!value) return '';
    if (value.length <= max) return value;
    return `${value.slice(0, max - 3)}...`;
  };

  const exportGanttPdf = async () => {
    if (!chartRef.current) {
      toast.error('Gantt chart container not found');
      return;
    }

    setIsDownloading(true);
    toast.loading('Generating Gantt PDF...', { id: 'gantt-export' });

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        scale: 3,
        logging: false,
        useCORS: true,
      });

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let y = margin;

      const projectName = selectedProjectDetails?.name || 'All Projects';
      const clientName = selectedProjectDetails?.clientName || 'Multiple / N/A';
      const contractType = selectedProjectDetails?.contractType || 'Multiple / N/A';
      const status = selectedProjectDetails?.status || 'Mixed';
      const progress = selectedProjectDetails
        ? `${selectedProjectDetails.progress}%`
        : `${Math.round(filteredTasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(filteredTasks.length, 1))}%`;

      pdf.setFontSize(16);
      pdf.setTextColor(15, 23, 42);
      pdf.text('BuildPro - Gantt Schedule Export', margin, y);
      y += 7;

      pdf.setFontSize(10);
      const headerLines = [
        `Project: ${projectName}`,
        `Client: ${clientName}`,
        `Contract Type: ${contractType}`,
        `Status: ${status}`,
        `Progress: ${progress}`,
        `Weighted Completion: ${weightedCompletionForExport}`,
        `Tasks: ${filteredTasks.length} | Milestones: ${filteredMilestones.length}`,
        `Date Range: ${dateRange.start} to ${dateRange.end}`,
        ...(boqTotals ? [`BOQ Budget: ${boqTotals.budget?.toFixed(2)} | Actual: ${boqTotals.actual?.toFixed(2)} | Variance: ${boqTotals.variance?.toFixed(2)}`] : []),
        `Generated: ${new Date().toLocaleString()}`,
      ];

      for (const line of headerLines) {
        pdf.text(line, margin, y);
        y += 5;
      }

      y += 2;

      const imageWidth = pageWidth - margin * 2;
      const rawImageHeight = (canvas.height * imageWidth) / canvas.width;
      const maxImageHeight = pageHeight - y - 70;
      const imageHeight = Math.max(60, Math.min(rawImageHeight, maxImageHeight));

      pdf.addImage(imageData, 'PNG', margin, y, imageWidth, imageHeight, undefined, 'FAST');
      y += imageHeight + 8;

      const columns = [
        { title: 'Task', width: 75 },
        { title: 'Assignee', width: 45 },
        { title: 'Start', width: 32 },
        { title: 'Due', width: 32 },
        { title: 'Status', width: 40 },
        { title: 'Progress', width: 25 },
      ];
      const rowHeight = 7;

      const drawTableHeader = () => {
        let x = margin;
        pdf.setFillColor(241, 245, 249);
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(9);

        for (const col of columns) {
          pdf.rect(x, y, col.width, rowHeight, 'F');
          pdf.text(col.title, x + 2, y + 4.7);
          x += col.width;
        }

        y += rowHeight;
      };

      const ensureSpace = () => {
        if (y + rowHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
          drawTableHeader();
        }
      };

      pdf.setFontSize(11);
      pdf.text('Task Details', margin, y);
      y += 4;
      drawTableHeader();

      pdf.setFontSize(8.5);
      for (const task of filteredTasks) {
        ensureSpace();

        const row = [
          truncate(task.name, 42),
          truncate(task.assignee || 'Unassigned', 24),
          formatDate(task.startDate || task.dueDate),
          formatDate(task.dueDate),
          truncate(task.status, 18),
          `${task.progress}%`,
        ];

        let x = margin;
        for (let i = 0; i < columns.length; i += 1) {
          pdf.rect(x, y, columns[i].width, rowHeight);
          pdf.text(row[i], x + 2, y + 4.7);
          x += columns[i].width;
        }
        y += rowHeight;
      }

      const filename = `buildpro-gantt-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      toast.success('Gantt PDF exported successfully', { id: 'gantt-export' });
    } catch (error) {
      console.error('Failed to export Gantt PDF:', error);
      toast.error('Failed to export Gantt PDF. Please try again.', { id: 'gantt-export' });
    } finally {
      setIsDownloading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const today = new Date();

  const getTimelineConfig = () => {
    if (zoomLevel === 'week') {
      const weeks = [];
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      for (let i = 0; i < 8; i++) {
        const weekStart = new Date(startOfWeek);
        weekStart.setDate(startOfWeek.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weeks.push({
          label: `Week ${i + 1}`,
          sublabel: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
          start: weekStart,
          end: weekEnd,
        });
      }

      return {
        headers: weeks,
        rangeStart: weeks[0].start,
        rangeEnd: weeks[weeks.length - 1].end,
      };
    }

    if (zoomLevel === 'quarter') {
      const quarters = [
        { label: 'Q1', sublabel: 'Jan-Mar', start: new Date(currentYear, 0, 1), end: new Date(currentYear, 2, 31) },
        { label: 'Q2', sublabel: 'Apr-Jun', start: new Date(currentYear, 3, 1), end: new Date(currentYear, 5, 30) },
        { label: 'Q3', sublabel: 'Jul-Sep', start: new Date(currentYear, 6, 1), end: new Date(currentYear, 8, 30) },
        { label: 'Q4', sublabel: 'Oct-Dec', start: new Date(currentYear, 9, 1), end: new Date(currentYear, 11, 31) },
      ];

      return {
        headers: quarters,
        rangeStart: quarters[0].start,
        rangeEnd: quarters[quarters.length - 1].end,
      };
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthHeaders = months.map((month, idx) => ({
      label: month,
      sublabel: currentYear.toString(),
      start: new Date(currentYear, idx, 1),
      end: new Date(currentYear, idx + 1, 0),
    }));

    return {
      headers: monthHeaders,
      rangeStart: monthHeaders[0].start,
      rangeEnd: monthHeaders[monthHeaders.length - 1].end,
    };
  };

  const timelineConfig = getTimelineConfig();

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
    const start = new Date(startDate || dueDate);
    const end = new Date(dueDate);
    const { rangeStart, rangeEnd } = timelineConfig;

    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    const startDay = Math.max(0, (start.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const endDay = Math.min(totalDays, (end.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, endDay - startDay);

    const isVisible = start <= rangeEnd && end >= rangeStart;

    return {
      left: `${Math.max(0, (startDay / totalDays) * 100)}%`,
      width: `${Math.max(2, (duration / totalDays) * 100)}%`,
      isVisible,
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
            onClick={exportGanttPdf}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            {isDownloading ? 'Exporting PDF...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Calendar size={20} className="text-gray-400" />
        <select
          value={selectedProject === 'all' ? 'all' : selectedProject}
          onChange={(e) => setSelectedProject(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
          className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-sm text-gray-700 dark:text-gray-200">
          Weighted Completion: {boqWeightedCompletion !== null ? `${boqWeightedCompletion.toFixed(1)}%` : `${fallbackWeightedCompletion}%`}
        </div>
      </div>

      <div ref={chartRef} className="space-y-4 p-4 -m-4">
        <div className="text-center pb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {selectedProject === 'all' ? 'All Projects' : projects.find((p) => p.id === selectedProject)?.name} - Gantt Chart
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Generated on {new Date().toLocaleDateString()}</p>
        </div>

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

        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-dark-700">
            <div className="w-80 flex-shrink-0 p-3 bg-gray-50 dark:bg-dark-700 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-dark-700">
              Task Name
            </div>
            <div className="flex-1 flex">
              {timelineConfig.headers.map((header, idx) => (
                <div
                  key={idx}
                  className="flex-1 p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-dark-700 last:border-r-0"
                >
                  <div>{header.label}</div>
                  <div className="text-xs text-gray-400">{header.sublabel}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {filteredTasks.map((task) => (
              <div key={task.id} className="flex border-b border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50">
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

                <div className="flex-1 relative py-3 px-1">
                  <div className="absolute inset-0 flex">
                    {timelineConfig.headers.map((_, idx) => (
                      <div key={idx} className="flex-1 border-r border-gray-200 dark:border-dark-700" />
                    ))}
                  </div>

                  <div
                    className="absolute h-6 rounded flex items-center overflow-hidden"
                    style={{ ...getTaskPosition(task.startDate || task.dueDate, task.dueDate), top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <div className="h-full w-full bg-gray-200 dark:bg-gray-700 rounded relative">
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

            {filteredMilestones.map((milestone) => (
              <div key={`m-${milestone.id}`} className="flex border-b border-gray-200 dark:border-dark-700 bg-purple-50/50 dark:bg-purple-900/10">
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
                    {timelineConfig.headers.map((_, idx) => (
                      <div key={idx} className="flex-1 border-r border-gray-200 dark:border-dark-700" />
                    ))}
                  </div>
                  <div
                    className="absolute w-4 h-4 bg-purple-500 transform rotate-45"
                    style={{
                      left: getTaskPosition(milestone.date, milestone.date).left,
                      top: '50%',
                      transform: 'translateY(-50%) translateX(-50%) rotate(45deg)',
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredTasks.length}</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{filteredTasks.filter((t) => t.status === 'Completed').length}</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{filteredTasks.filter((t) => t.status === 'In Progress').length}</p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Milestones</p>
          <p className="text-2xl font-bold text-purple-600">{filteredMilestones.length}</p>
        </div>
      </div>
    </div>
  );
}
