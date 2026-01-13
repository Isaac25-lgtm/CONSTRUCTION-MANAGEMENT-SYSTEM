import { useState } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, Shield, Eye } from 'lucide-react';
import { useDataStore, Risk } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function RisksPage() {
  const { risks, projects, addRisk, updateRisk, deleteRisk } = useDataStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    description: '',
    category: 'Technical',
    probability: 'Medium',
    impact: 'Medium',
    status: 'Active',
    mitigation: '',
    owner: '',
    projectId: '',
  });

  const filteredRisks = filterStatus === 'all' 
    ? risks 
    : risks.filter(r => r.status === filterStatus);

  const getRiskScore = (prob: string, impact: string) => {
    const levels: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
    return levels[prob] * levels[impact];
  };

  const getRiskColor = (score: number) => {
    if (score >= 6) return 'bg-red-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const highRisks = risks.filter(r => getRiskScore(r.probability, r.impact) >= 6).length;
  const activeRisks = risks.filter(r => r.status === 'Active').length;

  const handleCreate = () => {
    if (!formData.description || !formData.owner || !formData.projectId) {
      toast.error('Please fill in all required fields');
      return;
    }
    addRisk({
      description: formData.description,
      category: formData.category,
      probability: formData.probability,
      impact: formData.impact,
      status: formData.status,
      mitigation: formData.mitigation,
      owner: formData.owner,
      projectId: parseInt(formData.projectId),
    });
    toast.success('Risk logged successfully!');
    setShowCreateModal(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!selectedRisk) return;
    updateRisk(selectedRisk.id, {
      description: formData.description,
      category: formData.category,
      probability: formData.probability,
      impact: formData.impact,
      status: formData.status,
      mitigation: formData.mitigation,
      owner: formData.owner,
      projectId: parseInt(formData.projectId),
    });
    toast.success('Risk updated successfully!');
    setShowEditModal(false);
    resetForm();
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this risk?')) {
      deleteRisk(id);
      toast.success('Risk deleted');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      category: 'Technical',
      probability: 'Medium',
      impact: 'Medium',
      status: 'Active',
      mitigation: '',
      owner: '',
      projectId: '',
    });
  };

  const openEditModal = (risk: Risk) => {
    setSelectedRisk(risk);
    setFormData({
      description: risk.description,
      category: risk.category || 'Technical',
      probability: risk.probability,
      impact: risk.impact,
      status: risk.status,
      mitigation: risk.mitigation,
      owner: risk.owner,
      projectId: risk.projectId.toString(),
    });
    setShowEditModal(true);
  };

  const openViewModal = (risk: Risk) => {
    setSelectedRisk(risk);
    setShowViewModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Risk Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Identify, assess, and mitigate project risks</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} /> Log Risk
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Risks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{risks.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Risks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeRisks}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">High Severity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{highRisks}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mitigated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{risks.filter(r => r.status === 'Mitigated').length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Shield className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Matrix */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Risk Matrix</h3>
        <div className="grid grid-cols-4 gap-1">
          <div className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"></div>
          <div className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Low Impact</div>
          <div className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Medium Impact</div>
          <div className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">High Impact</div>
          
          <div className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">High Prob</div>
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded text-center font-bold text-yellow-700 dark:text-yellow-400">{risks.filter(r => r.probability === 'High' && r.impact === 'Low').length}</div>
          <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded text-center font-bold text-orange-700 dark:text-orange-400">{risks.filter(r => r.probability === 'High' && r.impact === 'Medium').length}</div>
          <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded text-center font-bold text-red-700 dark:text-red-400">{risks.filter(r => r.probability === 'High' && r.impact === 'High').length}</div>
          
          <div className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Med Prob</div>
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded text-center font-bold text-green-700 dark:text-green-400">{risks.filter(r => r.probability === 'Medium' && r.impact === 'Low').length}</div>
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded text-center font-bold text-yellow-700 dark:text-yellow-400">{risks.filter(r => r.probability === 'Medium' && r.impact === 'Medium').length}</div>
          <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded text-center font-bold text-orange-700 dark:text-orange-400">{risks.filter(r => r.probability === 'Medium' && r.impact === 'High').length}</div>
          
          <div className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Low Prob</div>
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded text-center font-bold text-green-700 dark:text-green-400">{risks.filter(r => r.probability === 'Low' && r.impact === 'Low').length}</div>
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded text-center font-bold text-green-700 dark:text-green-400">{risks.filter(r => r.probability === 'Low' && r.impact === 'Medium').length}</div>
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded text-center font-bold text-yellow-700 dark:text-yellow-400">{risks.filter(r => r.probability === 'Low' && r.impact === 'High').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'Active', 'Monitoring', 'Mitigated'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStatus === status 
                ? 'bg-primary-600 text-white' 
                : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 border border-gray-200 dark:border-dark-700'
            }`}
          >
            {status === 'all' ? 'All Risks' : status}
          </button>
        ))}
      </div>

      {/* Risks Table */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Risk</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Category</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Probability</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Impact</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Score</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Owner</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRisks.map(risk => {
                const score = getRiskScore(risk.probability, risk.impact);
                return (
                  <tr key={risk.id} className="border-t border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{risk.description}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{risk.category}</td>
                    <td className="p-4"><StatusBadge status={risk.probability} /></td>
                    <td className="p-4"><StatusBadge status={risk.impact} /></td>
                    <td className="p-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${getRiskColor(score)}`}>
                        {score}
                      </span>
                    </td>
                    <td className="p-4"><StatusBadge status={risk.status} /></td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{risk.owner}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openViewModal(risk)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => openEditModal(risk)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(risk.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredRisks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No risks found</div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Log New Risk" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              rows={2}
              placeholder="Describe the risk..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Technical">Technical</option>
                <option value="Financial">Financial</option>
                <option value="Environmental">Environmental</option>
                <option value="Regulatory">Regulatory</option>
                <option value="Safety">Safety</option>
                <option value="Resource">Resource</option>
                <option value="Supply Chain">Supply Chain</option>
                <option value="External">External</option>
              </select>
            </div>
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
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Probability</label>
              <select
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Impact</label>
              <select
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Active">Active</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Mitigated">Mitigated</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Owner *</label>
            <input
              type="text"
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              placeholder="Who is responsible?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mitigation Plan</label>
            <textarea
              value={formData.mitigation}
              onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              rows={2}
              placeholder="How will this risk be mitigated?"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleCreate} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Log Risk
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); resetForm(); }} title="Edit Risk" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Technical">Technical</option>
                <option value="Financial">Financial</option>
                <option value="Environmental">Environmental</option>
                <option value="Regulatory">Regulatory</option>
                <option value="Safety">Safety</option>
                <option value="Resource">Resource</option>
                <option value="Supply Chain">Supply Chain</option>
                <option value="External">External</option>
              </select>
            </div>
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
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Probability</label>
              <select
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Impact</label>
              <select
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Active">Active</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Mitigated">Mitigated</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Owner *</label>
            <input
              type="text"
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mitigation Plan</label>
            <textarea
              value={formData.mitigation}
              onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              rows={2}
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

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Risk Details" size="lg">
        {selectedRisk && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-400">{selectedRisk.description}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{selectedRisk.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Probability</p>
                <StatusBadge status={selectedRisk.probability} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Impact</p>
                <StatusBadge status={selectedRisk.impact} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <StatusBadge status={selectedRisk.status} />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Risk Owner</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{selectedRisk.owner}</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Mitigation Plan</h3>
              <p className="text-blue-800 dark:text-blue-200">{selectedRisk.mitigation || 'No mitigation plan specified'}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
