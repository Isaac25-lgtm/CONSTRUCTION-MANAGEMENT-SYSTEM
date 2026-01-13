import { useState } from 'react';
import { User, Shield, Key, Trash2, Edit, Plus, Eye, EyeOff, Clock, AlertTriangle, UserPlus, Settings2, History } from 'lucide-react';
import { useUserStore, User as UserType, UserRole, defaultPermissions } from '../stores/userStore';
import { useAuditStore, AuditLog } from '../stores/auditStore';
import { useDataStore } from '../stores/dataStore';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { users, currentUser, addUser, updateUser, deleteUser, changePassword } = useUserStore();
  const { logs, addLog } = useAuditStore();
  const { projects, tasks, documents, risks, expenses, deleteProject, deleteTask, deleteDocument, deleteRisk } = useDataStore();
  
  const [activeTab, setActiveTab] = useState<'account' | 'users' | 'permissions' | 'data' | 'audit'>('account');
  
  // Account settings
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  // User management
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'Team_Member' as UserRole,
    isActive: true,
  });
  
  // Audit filters
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditUserFilter, setAuditUserFilter] = useState<number | 'all'>('all');

  // Data management
  const [deleteType, setDeleteType] = useState<string>('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canManageUsers = currentUser?.permissions.canManageUsers;
  const canDeleteRecords = currentUser?.permissions.canDeleteRecords;

  // Password change handler
  const handleChangePassword = () => {
    if (!currentUser) return;
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    const user = users.find(u => u.id === currentUser.id);
    if (user?.password !== passwordForm.current) {
      toast.error('Current password is incorrect');
      return;
    }
    
    changePassword(currentUser.id, passwordForm.new);
    addLog({
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      userEmail: currentUser.email,
      action: 'PASSWORD_CHANGE',
      entityType: 'User',
      entityId: currentUser.id,
      details: 'Changed account password',
    });
    toast.success('Password changed successfully');
    setShowPasswordModal(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  // User management handlers
  const handleCreateUser = () => {
    if (!userForm.email || !userForm.password || !userForm.firstName || !userForm.lastName) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (users.some(u => u.email === userForm.email)) {
      toast.error('Email already exists');
      return;
    }
    
    addUser({
      email: userForm.email,
      password: userForm.password,
      firstName: userForm.firstName,
      lastName: userForm.lastName,
      role: userForm.role,
      isActive: userForm.isActive,
      permissions: defaultPermissions[userForm.role],
    });
    
    addLog({
      userId: currentUser!.id,
      userName: `${currentUser!.firstName} ${currentUser!.lastName}`,
      userEmail: currentUser!.email,
      action: 'CREATE',
      entityType: 'User',
      entityName: `${userForm.firstName} ${userForm.lastName}`,
      details: `Created new user with role: ${userForm.role}`,
    });
    
    toast.success('User created successfully');
    setShowUserModal(false);
    resetUserForm();
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    updateUser(selectedUser.id, {
      email: userForm.email,
      firstName: userForm.firstName,
      lastName: userForm.lastName,
      role: userForm.role,
      isActive: userForm.isActive,
    });
    
    addLog({
      userId: currentUser!.id,
      userName: `${currentUser!.firstName} ${currentUser!.lastName}`,
      userEmail: currentUser!.email,
      action: 'UPDATE',
      entityType: 'User',
      entityId: selectedUser.id,
      entityName: `${userForm.firstName} ${userForm.lastName}`,
      details: `Updated user details`,
    });
    
    toast.success('User updated successfully');
    setShowEditUserModal(false);
    resetUserForm();
  };

  const handleDeleteUser = (user: UserType) => {
    if (user.id === currentUser?.id) {
      toast.error('Cannot delete your own account');
      return;
    }
    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      deleteUser(user.id);
      addLog({
        userId: currentUser!.id,
        userName: `${currentUser!.firstName} ${currentUser!.lastName}`,
        userEmail: currentUser!.email,
        action: 'DELETE',
        entityType: 'User',
        entityId: user.id,
        entityName: `${user.firstName} ${user.lastName}`,
        details: `Deleted user account`,
      });
      toast.success('User deleted');
    }
  };

  const openEditUser = (user: UserType) => {
    setSelectedUser(user);
    setUserForm({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    });
    setShowEditUserModal(true);
  };

  const resetUserForm = () => {
    setUserForm({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'Team_Member',
      isActive: true,
    });
    setSelectedUser(null);
  };

  // Data deletion handler
  const handleDeleteData = () => {
    if (!deleteId || !deleteType) return;
    
    let entityName = '';
    switch (deleteType) {
      case 'project':
        const project = projects.find(p => p.id === deleteId);
        entityName = project?.name || '';
        deleteProject(deleteId);
        break;
      case 'task':
        const task = tasks.find(t => t.id === deleteId);
        entityName = task?.name || '';
        deleteTask(deleteId);
        break;
      case 'document':
        const doc = documents.find(d => d.id === deleteId);
        entityName = doc?.name || '';
        deleteDocument(deleteId);
        break;
      case 'risk':
        const risk = risks.find(r => r.id === deleteId);
        entityName = risk?.description || '';
        deleteRisk(deleteId);
        break;
    }
    
    addLog({
      userId: currentUser!.id,
      userName: `${currentUser!.firstName} ${currentUser!.lastName}`,
      userEmail: currentUser!.email,
      action: 'DELETE',
      entityType: deleteType.charAt(0).toUpperCase() + deleteType.slice(1) as any,
      entityId: deleteId,
      entityName,
      details: `Deleted ${deleteType}: ${entityName}`,
    });
    
    toast.success(`${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)} deleted`);
    setShowDeleteConfirm(false);
    setDeleteId(null);
    setDeleteType('');
  };

  const confirmDelete = (type: string, id: number) => {
    setDeleteType(type);
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  // Filter audit logs
  const filteredLogs = logs.filter(log => {
    const actionMatch = auditFilter === 'all' || log.action === auditFilter;
    const userMatch = auditUserFilter === 'all' || log.userId === auditUserFilter;
    return actionMatch && userMatch;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'UPDATE': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'DELETE': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'LOGIN': return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
      case 'LOGOUT': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
      case 'APPROVE': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'REJECT': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const tabs = [
    { id: 'account', label: 'My Account', icon: User },
    { id: 'users', label: 'User Management', icon: UserPlus, requiresAdmin: true },
    { id: 'permissions', label: 'Permissions', icon: Shield, requiresAdmin: true },
    { id: 'data', label: 'Data Management', icon: Trash2, requiresAdmin: true },
    { id: 'audit', label: 'Audit Trail', icon: History, requiresAdmin: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your account and system settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-dark-700 pb-2 overflow-x-auto">
        {tabs.filter(tab => !tab.requiresAdmin || canManageUsers).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* My Account Tab */}
      {activeTab === 'account' && currentUser && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400">Full Name</label>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{currentUser.firstName} {currentUser.lastName}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{currentUser.email}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400">Role</label>
                <StatusBadge status={currentUser.role.replace('_', ' ')} />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400">Account Created</label>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{currentUser.createdAt}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400">Last Login</label>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Security</h2>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <Key size={18} /> Change Password
            </button>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Permissions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(currentUser.permissions).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {key.replace(/([A-Z])/g, ' $1').replace('can ', '').trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && canManageUsers && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <Plus size={18} /> Create User
            </button>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">User</th>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Email</th>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Role</th>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Last Login</th>
                  <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-t border-gray-100 dark:border-dark-700">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-semibold">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="p-4"><StatusBadge status={user.role.replace('_', ' ')} /></td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditUser(user)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg"
                        >
                          <Edit size={16} />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && canManageUsers && (
        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-dark-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Role Permissions Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-700">
                  <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Permission</th>
                  <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300">Administrator</th>
                  <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300">Project Manager</th>
                  <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300">Site Supervisor</th>
                  <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300">Team Member</th>
                  <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300">Stakeholder</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(defaultPermissions.Administrator).map(perm => (
                  <tr key={perm} className="border-b border-gray-100 dark:border-dark-700">
                    <td className="p-3 text-gray-700 dark:text-gray-300">{perm.replace(/([A-Z])/g, ' $1').replace('can ', '').trim()}</td>
                    {(['Administrator', 'Project_Manager', 'Site_Supervisor', 'Team_Member', 'Stakeholder'] as UserRole[]).map(role => (
                      <td key={role} className="p-3 text-center">
                        {defaultPermissions[role][perm as keyof typeof defaultPermissions.Administrator] ? (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">✗</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Management Tab */}
      {activeTab === 'data' && canDeleteRecords && (
        <div className="space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle size={20} />
              <span className="font-medium">Warning: Deletions are permanent and will be logged in the audit trail.</span>
            </div>
          </div>

          {/* Projects */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Projects ({projects.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {projects.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-700 rounded-lg">
                  <span className="text-gray-900 dark:text-gray-100">{p.name}</span>
                  <button
                    onClick={() => confirmDelete('project', p.id)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Tasks ({tasks.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-700 rounded-lg">
                  <span className="text-gray-900 dark:text-gray-100">{t.name}</span>
                  <button
                    onClick={() => confirmDelete('task', t.id)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Documents ({documents.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {documents.map(d => (
                <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-700 rounded-lg">
                  <span className="text-gray-900 dark:text-gray-100">{d.name}</span>
                  <button
                    onClick={() => confirmDelete('document', d.id)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Risks */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Risks ({risks.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {risks.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-700 rounded-lg">
                  <span className="text-gray-900 dark:text-gray-100 truncate max-w-md">{r.description}</span>
                  <button
                    onClick={() => confirmDelete('risk', r.id)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && canManageUsers && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <select
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="APPROVE">Approve</option>
              <option value="REJECT">Reject</option>
            </select>
            <select
              value={auditUserFilter === 'all' ? 'all' : auditUserFilter}
              onChange={(e) => setAuditUserFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400 self-center">{filteredLogs.length} records</span>
          </div>

          {/* Audit Logs */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-dark-700">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Timestamp</th>
                    <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">User</th>
                    <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Action</th>
                    <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Entity</th>
                    <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="border-t border-gray-100 dark:border-dark-700">
                      <td className="p-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{log.userName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{log.userEmail}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-gray-900 dark:text-gray-100">{log.entityType}</p>
                          {log.entityName && <p className="text-xs text-gray-500 dark:text-gray-400">{log.entityName}</p>}
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No audit records found</div>
            )}
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.new}
              onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleChangePassword} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Change Password
            </button>
          </div>
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={showUserModal} onClose={() => { setShowUserModal(false); resetUserForm(); }} title="Create New User" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
              <input
                type="text"
                value={userForm.firstName}
                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
              <input
                type="text"
                value={userForm.lastName}
                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              placeholder="Min 6 characters"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Administrator">Administrator</option>
                <option value="Project_Manager">Project Manager</option>
                <option value="Site_Supervisor">Site Supervisor</option>
                <option value="Team_Member">Team Member</option>
                <option value="Stakeholder">Stakeholder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={userForm.isActive ? 'active' : 'inactive'}
                onChange={(e) => setUserForm({ ...userForm, isActive: e.target.value === 'active' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button onClick={() => { setShowUserModal(false); resetUserForm(); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleCreateUser} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Create User
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={showEditUserModal} onClose={() => { setShowEditUserModal(false); resetUserForm(); }} title="Edit User" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
              <input
                type="text"
                value={userForm.firstName}
                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
              <input
                type="text"
                value={userForm.lastName}
                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Administrator">Administrator</option>
                <option value="Project_Manager">Project Manager</option>
                <option value="Site_Supervisor">Site Supervisor</option>
                <option value="Team_Member">Team Member</option>
                <option value="Stakeholder">Stakeholder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={userForm.isActive ? 'active' : 'inactive'}
                onChange={(e) => setUserForm({ ...userForm, isActive: e.target.value === 'active' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button onClick={() => { setShowEditUserModal(false); resetUserForm(); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleUpdateUser} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirm Deletion" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            <p className="text-red-800 dark:text-red-200">
              Are you sure you want to delete this {deleteType}? This action cannot be undone and will be logged in the audit trail.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleDeleteData} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
