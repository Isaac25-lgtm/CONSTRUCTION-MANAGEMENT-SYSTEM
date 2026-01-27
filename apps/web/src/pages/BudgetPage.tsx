import { useState, useRef } from 'react';
import { Plus, Check, X, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Upload, FileText, Download, Eye, Paperclip } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useDataStore, Expense } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatCurrency = (amount: number) => {
  if (amount >= 1000000000) return `UGX ${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `UGX ${(amount / 1000000).toFixed(1)}M`;
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
};

const formatFullCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
};

// Convert file to base64
const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve({ data: base64Data, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function BudgetPage() {
  const { expenses, projects, addExpense, updateExpense } = useDataStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Expense | null>(null);
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const reportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    description: '',
    category: 'Materials',
    amount: '',
    projectId: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [receiptFile, setReceiptFile] = useState<{
    file: File | null;
    preview: string | null;
    data: string | null;
    mimeType: string | null;
  }>({
    file: null,
    preview: null,
    data: null,
    mimeType: null,
  });

  // Apply all filters
  const filteredExpenses = expenses.filter(e => {
    if (filterProject !== 'all' && e.projectId !== filterProject) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterDateFrom && e.date < filterDateFrom) return false;
    if (filterDateTo && e.date > filterDateTo) return false;
    return true;
  });

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const pendingApproval = expenses.filter(e => e.status === 'Pending').length;
  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

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

  const categories = ['Materials', 'Labor', 'Equipment', 'Subcontract', 'Overhead', 'Transportation', 'Permits', 'Other'];

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type (images and PDFs only)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image (JPG, PNG, GIF) or PDF file');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Receipt file must be less than 10MB');
      return;
    }

    try {
      const { data, mimeType } = await fileToBase64(file);
      setReceiptFile({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        data,
        mimeType,
      });
      toast.success('Receipt attached successfully');
    } catch {
      toast.error('Failed to process receipt file');
    }
  };

  const removeReceipt = () => {
    if (receiptFile.preview) {
      URL.revokeObjectURL(receiptFile.preview);
    }
    setReceiptFile({ file: null, preview: null, data: null, mimeType: null });
  };

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
      receiptData: receiptFile.data || undefined,
      receiptName: receiptFile.file?.name || undefined,
      receiptMimeType: receiptFile.mimeType || undefined,
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

  const viewReceipt = (expense: Expense) => {
    setSelectedReceipt(expense);
    setShowReceiptModal(true);
  };

  const downloadReceipt = (expense: Expense) => {
    if (!expense.receiptData || !expense.receiptMimeType) return;

    const byteCharacters = atob(expense.receiptData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: expense.receiptMimeType });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = expense.receiptName || `receipt-${expense.id}.${expense.receiptMimeType.split('/')[1]}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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
    removeReceipt();
  };

  const clearFilters = () => {
    setFilterProject('all');
    setFilterStatus('all');
    setFilterCategory('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const generatePDFReport = async () => {
    if (!reportRef.current) return;

    toast.loading('Generating PDF report...', { id: 'pdf-gen' });

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const projectName = filterProject !== 'all'
        ? projects.find(p => p.id === filterProject)?.name || 'Project'
        : 'All-Projects';
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`Expense-Report-${projectName}-${dateStr}.pdf`);

      toast.success('PDF report generated successfully!', { id: 'pdf-gen' });
      setShowReportModal(false);
    } catch (error) {
      toast.error('Failed to generate PDF', { id: 'pdf-gen' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Budget & Finance</h1>
          <p className="text-gray-500 dark:text-gray-400">Track expenses and budget utilization</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <FileText size={18} /> Generate Report
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <Plus size={18} /> Log Expense
          </button>
        </div>
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

      {/* Filters */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Project</label>
            <select
              value={filterProject === 'all' ? 'all' : filterProject}
              onChange={(e) => setFilterProject(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="all">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From Date</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To Date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
            >
              Clear Filters
            </button>
          </div>
        </div>
        {(filterProject !== 'all' || filterStatus !== 'all' || filterCategory !== 'all' || filterDateFrom || filterDateTo) && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{filteredExpenses.length}</span> expenses
              totaling <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(filteredTotal)}</span>
            </p>
          </div>
        )}
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
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Receipt</th>
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
                  <td className="p-4">
                    {expense.receiptData ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => viewReceipt(expense)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="View Receipt"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => downloadReceipt(expense)}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="Download Receipt"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">No receipt</span>
                    )}
                  </td>
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
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
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
              placeholder="Vendor/supplier name (e.g., Uganda Steel Mills, Tororo Cement)"
            />
          </div>

          {/* Receipt Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Paperclip size={14} className="inline mr-1" />
              Attach Receipt (Optional)
            </label>
            {!receiptFile.file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-4 text-center cursor-pointer hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-dark-700 transition"
              >
                <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click to upload receipt
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  JPG, PNG, GIF or PDF (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleReceiptUpload}
                  accept="image/*,.pdf"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-gray-300 dark:border-dark-600 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {receiptFile.preview ? (
                      <img src={receiptFile.preview} alt="Receipt preview" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                        <FileText className="text-red-600" size={20} />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{receiptFile.file.name}</p>
                      <p className="text-xs text-gray-500">{(receiptFile.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={removeReceipt}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
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

      {/* View Receipt Modal */}
      <Modal isOpen={showReceiptModal} onClose={() => setShowReceiptModal(false)} title="Receipt" size="lg">
        {selectedReceipt && selectedReceipt.receiptData && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Expense:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedReceipt.description}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(selectedReceipt.amount)}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Vendor:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedReceipt.vendor}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Date:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedReceipt.date}</p>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-dark-600 rounded-lg overflow-hidden">
              {selectedReceipt.receiptMimeType?.startsWith('image/') ? (
                <img
                  src={`data:${selectedReceipt.receiptMimeType};base64,${selectedReceipt.receiptData}`}
                  alt="Receipt"
                  className="w-full max-h-[500px] object-contain"
                />
              ) : (
                <div className="p-8 text-center">
                  <FileText className="mx-auto text-gray-400 mb-3" size={48} />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">PDF Receipt: {selectedReceipt.receiptName}</p>
                  <button
                    onClick={() => downloadReceipt(selectedReceipt)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Download size={16} className="inline mr-2" />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => downloadReceipt(selectedReceipt)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={16} /> Download
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Generate Report Modal */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Generate Expense Report" size="xl">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Preview the expense report based on current filters. Click "Download PDF" to save.
          </p>

          {/* Report Preview */}
          <div ref={reportRef} className="bg-white p-6 rounded-lg border border-gray-200" style={{ color: '#111' }}>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">BuildPro - Expense Report</h1>
              <p className="text-gray-600 mt-1">
                {filterProject !== 'all'
                  ? projects.find(p => p.id === filterProject)?.name
                  : 'All Projects'}
              </p>
              <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-600">Total Expenses</p>
                <p className="text-xl font-bold text-blue-800">{formatFullCurrency(filteredTotal)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-green-600">Approved</p>
                <p className="text-xl font-bold text-green-800">
                  {formatFullCurrency(filteredExpenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0))}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-xl font-bold text-yellow-800">
                  {formatFullCurrency(filteredExpenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0))}
                </p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Expenses by Category</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-700">Category</th>
                    <th className="text-right py-2 text-gray-700">Amount</th>
                    <th className="text-right py-2 text-gray-700">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(categoryTotals).map(([cat, amount]) => (
                    <tr key={cat} className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">{cat}</td>
                      <td className="py-2 text-right text-gray-800">{formatFullCurrency(amount)}</td>
                      <td className="py-2 text-right text-gray-800">{((amount / filteredTotal) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="py-2 text-gray-900">Total</td>
                    <td className="py-2 text-right text-gray-900">{formatFullCurrency(filteredTotal)}</td>
                    <td className="py-2 text-right text-gray-900">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Detailed Expenses */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Detailed Expenses</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-700">Date</th>
                    <th className="text-left py-2 text-gray-700">Description</th>
                    <th className="text-left py-2 text-gray-700">Vendor</th>
                    <th className="text-left py-2 text-gray-700">Category</th>
                    <th className="text-right py-2 text-gray-700">Amount</th>
                    <th className="text-center py-2 text-gray-700">Status</th>
                    <th className="text-center py-2 text-gray-700">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map(expense => (
                    <tr key={expense.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">{expense.date}</td>
                      <td className="py-2 text-gray-800">{expense.description}</td>
                      <td className="py-2 text-gray-800">{expense.vendor}</td>
                      <td className="py-2 text-gray-800">{expense.category}</td>
                      <td className="py-2 text-right text-gray-800">{formatFullCurrency(expense.amount)}</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          expense.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          expense.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {expense.status}
                        </span>
                      </td>
                      <td className="py-2 text-center text-gray-600">
                        {expense.receiptData ? '✓' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
              <p>BuildPro Construction Management System</p>
              <p>Report generated automatically - {new Date().toISOString()}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button
              onClick={() => setShowReportModal(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={generatePDFReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
