import { useState } from 'react';
import { Plus, Edit, Trash2, Calendar, User } from 'lucide-react';
import { useDataStore, Task } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function TasksPage() {
  const { tasks, projects, milestones, addTask, updateTask, deleteTask } = useDataStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

      {/* Milestones Section */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
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
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
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
                <tr key={task.id} className="border-t border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
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
