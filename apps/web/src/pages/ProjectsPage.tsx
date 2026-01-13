import { useState } from 'react';
import { Plus, Eye, Edit, Trash2, MapPin, Calendar, Users } from 'lucide-react';
import { useDataStore, Project } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
};

export default function ProjectsPage() {
  const { projects, tasks, addProject, updateProject, deleteProject } = useDataStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Planning',
    priority: 'Medium',
    manager: '',
    startDate: '',
    endDate: '',
    budget: '',
    location: '',
  });

  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => p.status === filter);

  const handleCreate = () => {
    if (!formData.name || !formData.manager || !formData.startDate || !formData.endDate || !formData.budget) {
      toast.error('Please fill in all required fields');
      return;
    }
    addProject({
      name: formData.name,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      manager: formData.manager,
      startDate: formData.startDate,
      endDate: formData.endDate,
      budget: parseFloat(formData.budget),
      spent: 0,
      progress: 0,
      location: formData.location,
    });
    toast.success('Project created successfully!');
    setShowCreateModal(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      manager: formData.manager,
      startDate: formData.startDate,
      endDate: formData.endDate,
      budget: parseFloat(formData.budget),
      location: formData.location,
    });
    toast.success('Project updated successfully!');
    setShowEditModal(false);
    resetForm();
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject(id);
      toast.success('Project deleted');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'Planning',
      priority: 'Medium',
      manager: '',
      startDate: '',
      endDate: '',
      budget: '',
      location: '',
    });
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      priority: project.priority,
      manager: project.manager,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget.toString(),
      location: project.location || '',
    });
    setShowEditModal(true);
  };

  const openViewModal = (project: Project) => {
    setSelectedProject(project);
    setShowViewModal(true);
  };

  const getProjectTasks = (projectId: number) => {
    return tasks.filter(t => t.projectId === projectId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage all your construction projects</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'Planning', 'In Progress', 'Completed', 'On Hold'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === status 
                ? 'bg-primary-600 text-white' 
                : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 border border-gray-200 dark:border-dark-700'
            }`}
          >
            {status === 'all' ? 'All Projects' : status}
          </button>
        ))}
      </div>

      {/* Projects List */}
      <div className="grid gap-6">
        {filteredProjects.map(project => (
          <div key={project.id} className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-dark-700 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{project.name}</h3>
                  <StatusBadge status={project.priority} />
                </div>
                <p className="text-gray-500 dark:text-gray-400">Manager: {project.manager}</p>
                {project.location && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin size={14} /> {project.location}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={project.status} />
                <button 
                  onClick={() => openViewModal(project)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
                  title="View Details"
                >
                  <Eye size={18} />
                </button>
                <button 
                  onClick={() => openEditModal(project)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(project.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Start Date</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{project.startDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">End Date</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{project.endDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Budget</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(project.budget)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Spent</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(project.spent)}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{project.progress}%</span>
              </div>
              <ProgressBar progress={project.progress} />
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-700">
          <p className="text-gray-500 dark:text-gray-400">No projects found</p>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create New Project" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              rows={3}
              placeholder="Project description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Manager *</label>
            <input
              type="text"
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              placeholder="Manager name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget (UGX) *</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
                placeholder="Project location"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleCreate} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Create Project
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); resetForm(); }} title="Edit Project" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name *</label>
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
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Manager *</label>
            <input
              type="text"
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget (UGX) *</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
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

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Project Details" size="xl">
        {selectedProject && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedProject.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                  <MapPin size={16} /> {selectedProject.location || 'No location specified'}
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={selectedProject.status} />
                <StatusBadge status={selectedProject.priority} />
              </div>
            </div>

            {selectedProject.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">{selectedProject.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manager</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1"><Users size={14} /> {selectedProject.manager}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Timeline</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1"><Calendar size={14} /> {selectedProject.startDate} - {selectedProject.endDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Budget</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(selectedProject.budget)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Spent</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(selectedProject.spent)} ({Math.round(selectedProject.spent / selectedProject.budget * 100)}%)</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">Overall Progress</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedProject.progress}%</span>
              </div>
              <ProgressBar progress={selectedProject.progress} />
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Project Tasks ({getProjectTasks(selectedProject.id).length})</h3>
              <div className="space-y-2">
                {getProjectTasks(selectedProject.id).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${task.status === 'Completed' ? 'bg-green-500' : task.status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                      <span className="text-gray-900 dark:text-gray-100">{task.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20">
                        <ProgressBar progress={task.progress} />
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                ))}
                {getProjectTasks(selectedProject.id).length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No tasks yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
