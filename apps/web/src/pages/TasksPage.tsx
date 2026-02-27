import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Calendar, User } from 'lucide-react';
import { useDataStore, Task } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { boqAPI } from '../lib/api';

interface BoqItemNode {
  id: string;
  item_code?: string | null;
  description: string;
  unit?: string | null;
  quantity: number;
  rate: number;
  budget_cost: number;
  weight_out_of_10: number;
  percent_complete: number;
  actual_cost: number;
  variance: number;
  children?: BoqItemNode[];
}

const flattenBoqItems = (items: BoqItemNode[], level = 0): Array<BoqItemNode & { level: number }> => {
  const rows: Array<BoqItemNode & { level: number }> = [];
  items.forEach((item) => {
    rows.push({ ...item, level });
    if (item.children?.length) {
      rows.push(...flattenBoqItems(item.children, level + 1));
    }
  });
  return rows;
};

const updateBoqItemTree = (
  items: BoqItemNode[],
  id: string,
  updates: Partial<BoqItemNode>
): BoqItemNode[] =>
  items.map((item) => {
    if (item.id === id) {
      return { ...item, ...updates };
    }
    if (!item.children?.length) {
      return item;
    }
    return { ...item, children: updateBoqItemTree(item.children, id, updates) };
  });

export default function TasksPage() {
  const { tasks, projects, milestones, addTask, updateTask, deleteTask } = useDataStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [boqItems, setBoqItems] = useState<BoqItemNode[]>([]);
  const [boqSummary, setBoqSummary] = useState<{
    project_weighted_completion_percent: number;
    total_budget_cost: number;
    total_actual_cost: number;
    total_variance: number;
  } | null>(null);
  const [boqLoading, setBoqLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    assignee: '',
    status: 'Pending',
    priority: 'Medium',
    startDate: '',
    dueDate: '',
    progress: 0,
  });

  const filteredTasks = tasks.filter(t => {
    const projectMatch = filterProject === 'all' || t.projectId === filterProject;
    const statusMatch = filterStatus === 'all' || t.status === filterStatus;
    return projectMatch && statusMatch;
  });

  const selectedProject = useMemo(
    () => (filterProject === 'all' ? null : projects.find((p) => p.id === filterProject) || null),
    [filterProject, projects]
  );

  const refreshBoq = async () => {
    if (!selectedProject?._uuid) {
      setBoqItems([]);
      setBoqSummary(null);
      return;
    }

    setBoqLoading(true);
    try {
      const [boqData, summary] = await Promise.all([
        boqAPI.get(selectedProject._uuid),
        boqAPI.summary(selectedProject._uuid),
      ]);
      setBoqItems((boqData.items || []) as BoqItemNode[]);
      setBoqSummary({
        project_weighted_completion_percent: Number(summary.project_weighted_completion_percent || 0),
        total_budget_cost: Number(summary.total_budget_cost || 0),
        total_actual_cost: Number(summary.total_actual_cost || 0),
        total_variance: Number(summary.total_variance || 0),
      });
    } catch {
      setBoqItems([]);
      setBoqSummary(null);
    } finally {
      setBoqLoading(false);
    }
  };

  useEffect(() => {
    refreshBoq();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?._uuid]);

  const handleCreate = () => {
    if (!formData.name || !formData.projectId || !formData.assignee || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    const project = projects.find(p => p.id === parseInt(formData.projectId));
    addTask({
      name: formData.name,
      description: formData.description,
      projectId: parseInt(formData.projectId),
      project: project?.name || '',
      assignee: formData.assignee,
      status: formData.status,
      priority: formData.priority,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      progress: formData.progress,
    });
    toast.success('Task created successfully!');
    setShowCreateModal(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!selectedTask) return;
    const project = projects.find(p => p.id === parseInt(formData.projectId));
    updateTask(selectedTask.id, {
      name: formData.name,
      description: formData.description,
      projectId: parseInt(formData.projectId),
      project: project?.name || '',
      assignee: formData.assignee,
      status: formData.status,
      priority: formData.priority,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      progress: formData.progress,
    });
    toast.success('Task updated successfully!');
    setShowEditModal(false);
    resetForm();
  };

  const handleProgressChange = (taskId: number, newProgress: number) => {
    const status = newProgress === 100 ? 'Completed' : newProgress > 0 ? 'In Progress' : 'Pending';
    updateTask(taskId, { progress: newProgress, status });
    toast.success('Progress updated');
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(id);
      toast.success('Task deleted');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      projectId: '',
      assignee: '',
      status: 'Pending',
      priority: 'Medium',
      startDate: '',
      dueDate: '',
      progress: 0,
    });
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      name: task.name,
      description: task.description || '',
      projectId: task.projectId.toString(),
      assignee: task.assignee,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate || '',
      dueDate: task.dueDate,
      progress: task.progress,
    });
    setShowEditModal(true);
  };

  const [showBoqForm, setShowBoqForm] = useState(false);
  const [boqFormData, setBoqFormData] = useState({
    item_code: '',
    description: '',
    unit: '',
    quantity: '0',
    rate: '0',
    weight_out_of_10: '1',
    percent_complete: '0',
    actual_cost: '0',
  });

  const resetBoqForm = () => {
    setBoqFormData({
      item_code: '',
      description: '',
      unit: '',
      quantity: '0',
      rate: '0',
      weight_out_of_10: '1',
      percent_complete: '0',
      actual_cost: '0',
    });
  };

  const handleBoqCreate = async () => {
    if (!selectedProject?._uuid) {
      toast.error('Select a project first');
      return;
    }
    if (!boqFormData.description.trim()) {
      toast.error('Description is required');
      return;
    }
    try {
      await boqAPI.createHeader(selectedProject._uuid, {
        title: `${selectedProject.name} BOQ`,
      });
      await boqAPI.createItem(selectedProject._uuid, {
        item_code: boqFormData.item_code || undefined,
        description: boqFormData.description,
        unit: boqFormData.unit || undefined,
        quantity: Number(boqFormData.quantity),
        rate: Number(boqFormData.rate),
        weight_out_of_10: Number(boqFormData.weight_out_of_10),
        percent_complete: Number(boqFormData.percent_complete),
        actual_cost: Number(boqFormData.actual_cost),
      });
      await refreshBoq();
      toast.success('BOQ item added');
      resetBoqForm();
      setShowBoqForm(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to add BOQ item');
    }
  };

  const handleBoqDelete = async (itemId: string) => {
    if (!selectedProject?._uuid) return;
    if (!confirm('Delete this BOQ item?')) return;
    try {
      await boqAPI.deleteItem(selectedProject._uuid, itemId);
      await refreshBoq();
      toast.success('BOQ item deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to delete BOQ item');
    }
  };

  const handleBoqFieldChange = (
    itemId: string,
    updates: Partial<BoqItemNode>
  ) => {
    setBoqItems((prev) => updateBoqItemTree(prev, itemId, updates));
  };

  const handleBoqFieldSave = async (
    itemId: string,
    payload: Partial<BoqItemNode>
  ) => {
    if (!selectedProject?._uuid) return;
    try {
      await boqAPI.updateItem(selectedProject._uuid, itemId, payload);
      await refreshBoq();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update BOQ item');
    }
  };

  const boqRows = useMemo(() => flattenBoqItems(boqItems), [boqItems]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks & Milestones</h1>
          <p className="text-gray-500 dark:text-gray-400">Track and manage all project tasks</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filterProject === 'all' ? 'all' : filterProject}
          onChange={(e) => setFilterProject(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>

      {/* BOQ Section */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">BOQ (Tasks & Milestones Driver)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add BOQ items and track weighted completion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBoqForm((v) => !v)}
              disabled={!selectedProject}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-600 text-sm hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-60"
            >
              <Plus size={16} />
              Add BOQ Item
            </button>
          </div>
        </div>

        {showBoqForm && selectedProject && (
          <div className="mb-4 p-4 border border-gray-200 dark:border-dark-600 rounded-lg bg-gray-50 dark:bg-dark-700">
            <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">New BOQ Item</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Item Code</label>
                <input
                  type="text"
                  value={boqFormData.item_code}
                  onChange={(e) => setBoqFormData({ ...boqFormData, item_code: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800"
                  placeholder="e.g. 1.1"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Description *</label>
                <input
                  type="text"
                  value={boqFormData.description}
                  onChange={(e) => setBoqFormData({ ...boqFormData, description: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800"
                  placeholder="Item description"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unit</label>
                <input
                  type="text"
                  value={boqFormData.unit}
                  onChange={(e) => setBoqFormData({ ...boqFormData, unit: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800"
                  placeholder="e.g. m3, kg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={boqFormData.quantity}
                  onChange={(e) => setBoqFormData({ ...boqFormData, quantity: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rate</label>
                <input
                  type="number"
                  min="0"
                  value={boqFormData.rate}
                  onChange={(e) => setBoqFormData({ ...boqFormData, rate: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Weight /10</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={boqFormData.weight_out_of_10}
                  onChange={(e) => setBoqFormData({ ...boqFormData, weight_out_of_10: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">% Complete</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={boqFormData.percent_complete}
                  onChange={(e) => setBoqFormData({ ...boqFormData, percent_complete: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Actual Cost</label>
                <input
                  type="number"
                  min="0"
                  value={boqFormData.actual_cost}
                  onChange={(e) => setBoqFormData({ ...boqFormData, actual_cost: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => { setShowBoqForm(false); resetBoqForm(); }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleBoqCreate}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Add Item
              </button>
            </div>
          </div>
        )}

        {!selectedProject && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a project in filters above to view and edit BOQ data.
          </p>
        )}

        {selectedProject && boqSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
              <p className="text-xs text-gray-500">Weighted Completion</p>
              <p className="text-xl font-semibold text-primary-600">
                {boqSummary.project_weighted_completion_percent.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
              <p className="text-xs text-gray-500">Budget Cost</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {boqSummary.total_budget_cost.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
              <p className="text-xs text-gray-500">Actual Cost</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {boqSummary.total_actual_cost.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
              <p className="text-xs text-gray-500">Variance</p>
              <p
                className={`text-lg font-semibold ${
                  boqSummary.total_variance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {boqSummary.total_variance.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {selectedProject && (
          <div className="border border-gray-200 dark:border-dark-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-700">
                  <tr>
                    <th className="text-left p-3">Item</th>
                    <th className="text-left p-3">Qty</th>
                    <th className="text-left p-3">Rate</th>
                    <th className="text-left p-3">Budget</th>
                    <th className="text-left p-3">Weight/10</th>
                    <th className="text-left p-3">% Complete</th>
                    <th className="text-left p-3">Actual</th>
                    <th className="text-left p-3">Variance</th>
                    <th className="text-left p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {boqLoading && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-gray-500">Loading BOQ...</td>
                    </tr>
                  )}
                  {!boqLoading && boqRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-gray-500">No BOQ items yet. Click "Add BOQ Item" to get started.</td>
                    </tr>
                  )}
                  {!boqLoading &&
                    boqRows.map((item) => (
                      <tr key={item.id} className="border-t border-gray-200 dark:border-dark-700">
                        <td className="p-3">
                          <div style={{ paddingLeft: `${item.level * 16}px` }} className="space-y-1">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={item.item_code || ''}
                                placeholder="Code"
                                onChange={(e) => handleBoqFieldChange(item.id, { item_code: e.target.value })}
                                onBlur={(e) => handleBoqFieldSave(item.id, { item_code: e.target.value || null } as any)}
                                className="w-16 px-1 py-0.5 text-xs rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700"
                              />
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleBoqFieldChange(item.id, { description: e.target.value })}
                                onBlur={(e) => handleBoqFieldSave(item.id, { description: e.target.value })}
                                className="flex-1 min-w-[120px] px-1 py-0.5 text-sm font-medium rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700"
                              />
                            </div>
                            <input
                              type="text"
                              value={item.unit || ''}
                              placeholder="Unit"
                              onChange={(e) => handleBoqFieldChange(item.id, { unit: e.target.value })}
                              onBlur={(e) => handleBoqFieldSave(item.id, { unit: e.target.value || null } as any)}
                              className="w-20 px-1 py-0.5 text-xs rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={item.quantity}
                            onChange={(e) => handleBoqFieldChange(item.id, { quantity: Number(e.target.value || 0) })}
                            onBlur={(e) => handleBoqFieldSave(item.id, { quantity: Number(e.target.value || 0) })}
                            className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={item.rate}
                            onChange={(e) => handleBoqFieldChange(item.id, { rate: Number(e.target.value || 0) })}
                            onBlur={(e) => handleBoqFieldSave(item.id, { rate: Number(e.target.value || 0) })}
                            className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700"
                          />
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">{item.budget_cost}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={item.weight_out_of_10}
                            onChange={(e) =>
                              handleBoqFieldChange(item.id, {
                                weight_out_of_10: Math.max(0, Math.min(10, Number(e.target.value || 0))),
                              })
                            }
                            onBlur={(e) =>
                              handleBoqFieldSave(item.id, {
                                weight_out_of_10: Math.max(0, Math.min(10, Number(e.target.value || 0))),
                              })
                            }
                            className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.percent_complete}
                            onChange={(e) =>
                              handleBoqFieldChange(item.id, {
                                percent_complete: Math.max(0, Math.min(100, Number(e.target.value || 0))),
                              })
                            }
                            onBlur={(e) =>
                              handleBoqFieldSave(item.id, {
                                percent_complete: Math.max(0, Math.min(100, Number(e.target.value || 0))),
                              })
                            }
                            className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={item.actual_cost}
                            onChange={(e) =>
                              handleBoqFieldChange(item.id, { actual_cost: Number(e.target.value || 0) })
                            }
                            onBlur={(e) =>
                              handleBoqFieldSave(item.id, { actual_cost: Number(e.target.value || 0) })
                            }
                            className="w-28 px-2 py-1 rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700"
                          />
                        </td>
                        <td className={`p-3 font-medium ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.variance}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleBoqDelete(item.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-600 rounded"
                            title="Delete item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Milestones Section */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-dark-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Milestones</h2>
        <div className="flex flex-wrap gap-4">
          {milestones.map(milestone => (
            <div key={milestone.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg min-w-[200px]">
              <div className={`w-3 h-3 rounded-full ${milestone.status === 'Completed' ? 'bg-green-500' : milestone.status === 'On Track' ? 'bg-blue-500' : 'bg-gray-400'}`} />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{milestone.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{milestone.date}</p>
              </div>
              <StatusBadge status={milestone.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Task</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Project</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Assignee</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Due Date</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Progress</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Priority</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr key={task.id} className="border-t border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{task.name}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{task.project}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      {task.assignee}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {task.dueDate}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={task.progress}
                        onChange={(e) => handleProgressChange(task.id, parseInt(e.target.value))}
                        className="w-20 h-2 bg-gray-200 dark:bg-dark-600 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400 w-10">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4"><StatusBadge status={task.status} /></td>
                  <td className="p-4"><StatusBadge status={task.priority} /></td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(task)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(task.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No tasks found</div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create New Task" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter task name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee *</label>
              <input
                type="text"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleCreate} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Create Task
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); resetForm(); }} title="Edit Task" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee *</label>
              <input
                type="text"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Progress: {formData.progress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button onClick={() => { setShowEditModal(false); resetForm(); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleUpdate} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
