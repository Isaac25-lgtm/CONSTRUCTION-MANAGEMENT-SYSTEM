import { useState } from 'react';
import { Plus, Check, X, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useDataStore, Expense } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatCurrency = (amount: number) => {
  if (amount >= 1000000000) return `UGX ${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `UGX ${(amount / 1000000).toFixed(1)}M`;
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
};

export default function BudgetPage() {
  const { expenses, projects, addExpense, updateExpense } = useDataStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');

  const [formData, setFormData] = useState({
    description: '',
    category: 'Materials',
    amount: '',
    projectId: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredExpenses = filterProject === 'all' 
    ? expenses 
    : expenses.filter(e => e.projectId === filterProject);

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const pendingApproval = expenses.filter(e => e.status === 'Pending').length;

  const categoryTotals = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const budgetData = [
    { category: 'Materials', budgeted: 1200, actual: 980 },
    { category: 'Labor', budgeted: 800, actual: 720 },
    { category: 'Equipment', budgeted: 400, actual: 380 },
    { category: 'Subcontract', budgeted: 600, actual: 550 },
    { category: 'Overhead', budgeted: 200, actual: 195 },
  ];

  const handleAddExpense = () => {
    if (!formData.description || !formData.amount || !formData.projectId || !formData.vendor) {
      toast.error('Please fill in all required fields');
      return;
    }
    const project = projects.find(p => p.id === parseInt(formData.projectId));
    addExpense({
      description: formData.description,
      category: formData.category,
      amount: parseFloat(formData.amount),
      projectId: parseInt(formData.projectId),
      project: project?.name || '',
      vendor: formData.vendor,
      date: formData.date,
      status: parseFloat(formData.amount) > 10000000 ? 'Pending' : 'Approved',
      loggedBy: 'Current User',
    });
    toast.success('Expense logged successfully!');
    setShowAddModal(false);
    resetForm();
  };

  const handleApprove = (id: number) => {
    updateExpense(id, { status: 'Approved' });
    toast.success('Expense approved');
  };

  const handleReject = (id: number) => {
    updateExpense(id, { status: 'Rejected' });
    toast.success('Expense rejected');
  };

  const resetForm = () => {
    setFormData({
      description: '',
      category: 'Materials',
      amount: '',
      projectId: '',
      vendor: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Budget & Finance</h1>
          <p className="text-gray-500 dark:text-gray-400">Track expenses and budget utilization</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} /> Log Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{Math.round(totalSpent / totalBudget * 100)}% utilized</p>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalBudget - totalSpent)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <TrendingDown className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingApproval}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget vs Actual (Millions UGX)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="category" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
              <Legend />
              <Bar dataKey="budgeted" fill="#e5e7eb" name="Budgeted" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#3b82f6" name="Actual" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Expense Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Filter */}
      <div className="flex items-center gap-4">
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
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-dark-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Description</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Category</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Project</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Vendor</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Amount</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(expense => (
                <tr key={expense.id} className="border-t border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{expense.description}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{expense.category}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{expense.project}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{expense.vendor}</td>
                  <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(expense.amount)}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{expense.date}</td>
                  <td className="p-4"><StatusBadge status={expense.status} /></td>
                  <td className="p-4">
                    {expense.status === 'Pending' && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleApprove(expense.id)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="Approve"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(expense.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Reject"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredExpenses.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No expenses found</div>
        )}
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }} title="Log New Expense" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              placeholder="What was this expense for?"
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
                <option value="Materials">Materials</option>
                <option value="Labor">Labor</option>
                <option value="Equipment">Equipment</option>
                <option value="Subcontract">Subcontract</option>
                <option value="Overhead">Overhead</option>
                <option value="Transportation">Transportation</option>
                <option value="Permits">Permits</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (UGX) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
                placeholder="0"
              />
            </div>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor *</label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              placeholder="Vendor/supplier name"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleAddExpense} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Log Expense
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
