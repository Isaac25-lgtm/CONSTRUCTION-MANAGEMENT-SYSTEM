import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download, MapPin, Maximize2, Minimize2, Send, Upload, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

import { documentsAPI, projectsAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Project, useDataStore } from '../stores/dataStore';
import ProgressBar from './ui/ProgressBar';
import StatusBadge from './ui/StatusBadge';

interface ProjectDetailsModalProps {
  project: Project;
  onClose: () => void;
}

type TabType = 'overview' | 'tasks' | 'milestones' | 'risks' | 'expenses' | 'documents' | 'chat' | 'members';

interface ProjectMemberPermission {
  user_id: string;
  user_name: string;
  role_in_project?: string | null;
  can_view_project: boolean;
  can_post_messages: boolean;
  can_upload_documents: boolean;
  can_edit_tasks: boolean;
  can_manage_milestones: boolean;
  can_manage_risks: boolean;
  can_manage_expenses: boolean;
  can_approve_expenses: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount || 0);

export default function ProjectDetailsModal({ project, onClose }: ProjectDetailsModalProps) {
  const {
    tasks,
    milestones,
    risks,
    expenses,
    documents,
    messages,
    updateProject,
    addTask,
    updateTask,
    deleteTask,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addRisk,
    updateRisk,
    deleteRisk,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteDocument,
    addMessage,
    syncFromAPI,
  } = useDataStore();
  const { user: authUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [members, setMembers] = useState<ProjectMemberPermission[]>([]);
  const [metadataEdit, setMetadataEdit] = useState(false);
  const [draft, setDraft] = useState(project);
  const [chatInput, setChatInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [riskInput, setRiskInput] = useState('');
  const [milestoneInput, setMilestoneInput] = useState('');
  const [milestoneDateInput, setMilestoneDateInput] = useState('');
  const [expenseInput, setExpenseInput] = useState('');
  const [expenseAmountInput, setExpenseAmountInput] = useState('');
  const [docTypeInput, setDocTypeInput] = useState('Document');
  const [docDescInput, setDocDescInput] = useState('');

  useEffect(() => {
    setDraft(project);
  }, [project]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  useEffect(() => {
    if (!project._uuid) return;
    projectsAPI
      .getMembers(project._uuid)
      .then((result) => setMembers(Array.isArray(result) ? result : []))
      .catch(() => setMembers([]));
  }, [project._uuid]);

  const projectTasks = useMemo(() => tasks.filter((x) => x.projectId === project.id), [tasks, project.id]);
  const projectMilestones = useMemo(() => milestones.filter((x) => x.projectId === project.id), [milestones, project.id]);
  const projectRisks = useMemo(() => risks.filter((x) => x.projectId === project.id), [risks, project.id]);
  const projectExpenses = useMemo(() => expenses.filter((x) => x.projectId === project.id), [expenses, project.id]);
  const projectDocuments = useMemo(() => documents.filter((x) => x.projectId === project.id), [documents, project.id]);
  const projectMessages = useMemo(() => messages.filter((x) => x.projectId === project.id), [messages, project.id]);

  const canPostMessages =
    members.length === 0 || members.find((member) => member.user_id === authUser?.id)?.can_post_messages !== false;
  const taskCompletion = Math.round(
    projectTasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(projectTasks.length, 1)
  );
  const totalExpenses = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const saveMetadata = () => {
    updateProject(project.id, {
      name: draft.name,
      description: draft.description,
      status: draft.status,
      priority: draft.priority,
      manager: draft.manager,
      startDate: draft.startDate,
      endDate: draft.endDate,
      budget: draft.budget,
      location: draft.location,
      clientName: draft.clientName,
      contractType: draft.contractType,
    });
    setMetadataEdit(false);
    toast.success('Project updated');
  };

  const exportPdf = () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.setFontSize(18);
      pdf.text(`BuildPro Project: ${project.name}`, 12, 14);
      pdf.setFontSize(10);
      pdf.text(`Dates: ${project.startDate} - ${project.endDate}`, 12, 22);
      pdf.text(`Progress: ${taskCompletion}% | Tasks: ${projectTasks.length} | Milestones: ${projectMilestones.length}`, 12, 28);
      pdf.text(`Budget: ${formatCurrency(project.budget)} | Spent: ${formatCurrency(totalExpenses)}`, 12, 34);
      let y = 44;
      projectTasks.slice(0, 20).forEach((task) => {
        pdf.text(`- ${task.name} | ${task.status} | ${task.progress}% | ${task.assignee}`, 12, y);
        y += 5;
      });
      pdf.save(`${project.name.replace(/\s+/g, '_')}_overview.pdf`);
      toast.success('PDF exported');
    } catch {
      toast.error('PDF export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const renderMetadata = () => (
    <div className="bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Project Metadata</h3>
        {metadataEdit ? (
          <div className="flex gap-2">
            <button onClick={() => { setDraft(project); setMetadataEdit(false); }} className="px-3 py-1 text-sm rounded border">Cancel</button>
            <button onClick={saveMetadata} className="px-3 py-1 text-sm rounded bg-primary-600 text-white">Save</button>
          </div>
        ) : (
          <button onClick={() => setMetadataEdit(true)} className="px-3 py-1 text-sm rounded border">Edit</button>
        )}
      </div>
      {metadataEdit ? (
        <div className="grid md:grid-cols-2 gap-2">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="px-3 py-2 rounded border bg-white dark:bg-dark-800" placeholder="Name" />
          <input value={draft.manager} onChange={(e) => setDraft({ ...draft, manager: e.target.value })} className="px-3 py-2 rounded border bg-white dark:bg-dark-800" placeholder="Manager" />
          <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className="px-3 py-2 rounded border bg-white dark:bg-dark-800" />
          <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className="px-3 py-2 rounded border bg-white dark:bg-dark-800" />
          <input type="number" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: Number(e.target.value || 0) })} className="px-3 py-2 rounded border bg-white dark:bg-dark-800" placeholder="Budget" />
          <input value={draft.clientName || ''} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} className="px-3 py-2 rounded border bg-white dark:bg-dark-800" placeholder="Client" />
          <textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="md:col-span-2 px-3 py-2 rounded border bg-white dark:bg-dark-800" rows={3} placeholder="Description" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Status</span><StatusBadge status={project.status} /></div>
          <div className="flex justify-between"><span className="text-gray-500">Priority</span><StatusBadge status={project.priority} /></div>
          <div className="flex justify-between"><span className="text-gray-500">Manager</span><span>{project.manager}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Client</span><span>{project.clientName || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Budget</span><span>{formatCurrency(project.budget)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Spent</span><span>{formatCurrency(totalExpenses)}</span></div>
        </div>
      )}
      <div>
        <div className="flex justify-between text-xs mb-1"><span>Weighted Task Progress</span><span>{taskCompletion}%</span></div>
        <ProgressBar progress={taskCompletion} />
      </div>
    </div>
  );

  const renderTasks = () => (
    <Section title={`Tasks (${projectTasks.length})`} input={taskInput} setInput={setTaskInput} onAdd={() => { if (!taskInput.trim()) return; addTask({ name: taskInput.trim(), projectId: project.id, project: project.name, assignee: project.manager || 'Unassigned', status: 'Pending', priority: 'Medium', dueDate: project.endDate || new Date().toISOString().slice(0, 10), startDate: project.startDate || new Date().toISOString().slice(0, 10), progress: 0 }); setTaskInput(''); }}>
      {projectTasks.map((task) => (
        <div key={task.id} className="grid md:grid-cols-12 gap-2 items-center p-2 border rounded bg-white dark:bg-dark-800">
          <input className="md:col-span-4 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={task.name} onChange={(e) => updateTask(task.id, { name: e.target.value })} />
          <input className="md:col-span-2 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={task.assignee} onChange={(e) => updateTask(task.id, { assignee: e.target.value })} />
          <input type="date" className="md:col-span-2 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={task.dueDate} onChange={(e) => updateTask(task.id, { dueDate: e.target.value })} />
          <input type="number" min={0} max={100} className="md:col-span-1 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={task.progress} onChange={(e) => updateTask(task.id, { progress: Number(e.target.value || 0) })} />
          <select className="md:col-span-2 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value })}><option>Pending</option><option>In Progress</option><option>Completed</option><option>Blocked</option></select>
          <button className="md:col-span-1 px-2 py-1 text-xs rounded border border-red-300 text-red-600" onClick={() => deleteTask(task.id)}>Delete</button>
        </div>
      ))}
    </Section>
  );

  const renderMilestones = () => (
    <Section title={`Milestones (${projectMilestones.length})`} input={milestoneInput} setInput={setMilestoneInput} extraInput={<input type="date" value={milestoneDateInput} onChange={(e) => setMilestoneDateInput(e.target.value)} className="px-2 py-1 rounded border bg-white dark:bg-dark-800 text-sm" />} onAdd={() => { if (!milestoneInput.trim() || !milestoneDateInput) return; addMilestone({ name: milestoneInput.trim(), date: milestoneDateInput, status: 'Pending', projectId: project.id }); setMilestoneInput(''); setMilestoneDateInput(''); }}>
      {projectMilestones.map((milestone) => (
        <div key={milestone.id} className="grid md:grid-cols-12 gap-2 items-center p-2 border rounded bg-white dark:bg-dark-800">
          <input className="md:col-span-5 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={milestone.name} onChange={(e) => updateMilestone(milestone.id, { name: e.target.value })} />
          <input type="date" className="md:col-span-3 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={milestone.date} onChange={(e) => updateMilestone(milestone.id, { date: e.target.value })} />
          <select className="md:col-span-3 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={milestone.status} onChange={(e) => updateMilestone(milestone.id, { status: e.target.value })}><option>Pending</option><option>On Track</option><option>At Risk</option><option>Delayed</option><option>Completed</option></select>
          <button className="md:col-span-1 px-2 py-1 text-xs rounded border border-red-300 text-red-600" onClick={() => deleteMilestone(milestone.id)}>Delete</button>
        </div>
      ))}
    </Section>
  );

  const renderRisks = () => (
    <Section title={`Risks (${projectRisks.length})`} input={riskInput} setInput={setRiskInput} onAdd={() => { if (!riskInput.trim()) return; addRisk({ description: riskInput.trim(), probability: 'Medium', impact: 'Medium', status: 'Open', mitigation: 'TBD', owner: project.manager || 'Unassigned', projectId: project.id, category: 'General' }); setRiskInput(''); }}>
      {projectRisks.map((risk) => (
        <div key={risk.id} className="grid md:grid-cols-12 gap-2 items-center p-2 border rounded bg-white dark:bg-dark-800">
          <input className="md:col-span-5 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={risk.description} onChange={(e) => updateRisk(risk.id, { description: e.target.value })} />
          <select className="md:col-span-2 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={risk.probability} onChange={(e) => updateRisk(risk.id, { probability: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select>
          <select className="md:col-span-2 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={risk.impact} onChange={(e) => updateRisk(risk.id, { impact: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select>
          <select className="md:col-span-2 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={risk.status} onChange={(e) => updateRisk(risk.id, { status: e.target.value })}><option>Open</option><option>Monitoring</option><option>Mitigated</option><option>Closed</option><option>Active</option></select>
          <button className="md:col-span-1 px-2 py-1 text-xs rounded border border-red-300 text-red-600" onClick={() => deleteRisk(risk.id)}>Delete</button>
        </div>
      ))}
    </Section>
  );

  const renderExpenses = () => (
    <Section title={`Expenses (${projectExpenses.length})`} input={expenseInput} setInput={setExpenseInput} extraInput={<input type="number" value={expenseAmountInput} onChange={(e) => setExpenseAmountInput(e.target.value)} className="px-2 py-1 rounded border bg-white dark:bg-dark-800 text-sm" placeholder="Amount" />} onAdd={() => { const amount = Number(expenseAmountInput); if (!expenseInput.trim() || !amount) return; addExpense({ description: expenseInput.trim(), category: 'Materials', amount, projectId: project.id, project: project.name, vendor: '', date: new Date().toISOString().slice(0, 10), status: 'Pending', loggedBy: project.manager || 'Project Team' }); setExpenseInput(''); setExpenseAmountInput(''); }}>
      {projectExpenses.map((expense) => (
        <div key={expense.id} className="grid md:grid-cols-12 gap-2 items-center p-2 border rounded bg-white dark:bg-dark-800">
          <input className="md:col-span-4 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={expense.description} onChange={(e) => updateExpense(expense.id, { description: e.target.value })} />
          <input type="number" className="md:col-span-2 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={expense.amount} onChange={(e) => updateExpense(expense.id, { amount: Number(e.target.value || 0) })} />
          <select className="md:col-span-3 px-2 py-1 rounded border bg-white dark:bg-dark-900" value={expense.status} onChange={(e) => updateExpense(expense.id, { status: e.target.value })}><option>Pending</option><option>Approved</option><option>Rejected</option></select>
          <div className="md:col-span-2 text-sm font-medium">{formatCurrency(expense.amount)}</div>
          <button className="md:col-span-1 px-2 py-1 text-xs rounded border border-red-300 text-red-600" onClick={() => deleteExpense(expense.id)}>Delete</button>
        </div>
      ))}
    </Section>
  );

  const renderDocuments = () => (
    <div className="bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Documents ({projectDocuments.length})</h3>
        <div className="flex items-center gap-2">
          <input value={docTypeInput} onChange={(e) => setDocTypeInput(e.target.value)} className="px-2 py-1 rounded border bg-white dark:bg-dark-800 text-sm" placeholder="Type" />
          <input value={docDescInput} onChange={(e) => setDocDescInput(e.target.value)} className="px-2 py-1 rounded border bg-white dark:bg-dark-800 text-sm" placeholder="Description" />
          <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded border cursor-pointer text-sm">
            <Upload size={14} /> Upload
            <input type="file" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; e.currentTarget.value = ''; if (!file || !project._uuid) return; try { await documentsAPI.upload(project._uuid, file, docTypeInput, docDescInput || undefined); await syncFromAPI(); toast.success('Document uploaded'); } catch (error: any) { toast.error(error?.response?.data?.detail || error?.message || 'Upload failed'); } }} />
          </label>
        </div>
      </div>
      {projectDocuments.map((doc) => (
        <div key={doc.id} className="flex items-center gap-2 p-2 border rounded bg-white dark:bg-dark-800">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{doc.name}</p>
            <p className="text-xs text-gray-500">{doc.type} | {doc.size}</p>
          </div>
          <button className="px-2 py-1 text-xs rounded border border-red-300 text-red-600" onClick={() => deleteDocument(doc.id)}>Delete</button>
        </div>
      ))}
    </div>
  );

  const renderChat = () => (
    <div className="bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Project Chat ({projectMessages.length})</h3>
        {!canPostMessages && <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Posting disabled</span>}
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {projectMessages.map((message) => (
          <div key={message.id} className="p-2 border rounded bg-white dark:bg-dark-800">
            <p className="text-sm font-medium">{message.sender} <span className="text-xs text-gray-500">({message.time})</span></p>
            <p className="text-sm">{message.message}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (!chatInput.trim()) return; if (!canPostMessages) { toast.error('No permission to post'); return; } addMessage({ sender: 'You', message: chatInput.trim(), time: 'Just now', avatar: 'YO', projectId: project.id }); setChatInput(''); } }} className="flex-1 px-3 py-2 rounded border bg-white dark:bg-dark-800" placeholder="Message..." disabled={!canPostMessages} />
        <button onClick={() => { if (!chatInput.trim()) return; if (!canPostMessages) { toast.error('No permission to post'); return; } addMessage({ sender: 'You', message: chatInput.trim(), time: 'Just now', avatar: 'YO', projectId: project.id }); setChatInput(''); }} className="px-3 py-2 rounded bg-primary-600 text-white disabled:opacity-60" disabled={!canPostMessages}><Send size={14} /></button>
      </div>
    </div>
  );

  const renderMembers = () => (
    <div className="bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 p-4 space-y-2">
      <h3 className="font-semibold">Project Members & Permissions</h3>
      {members.length === 0 && <p className="text-sm text-gray-500">No explicit project members available.</p>}
      {members.map((member) => (
        <div key={member.user_id} className="p-2 border rounded bg-white dark:bg-dark-800 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{member.user_name}</p>
              <p className="text-xs text-gray-500">{member.role_in_project || 'Member'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {(
              [
                ['can_view_project', 'View'],
                ['can_post_messages', 'Post'],
                ['can_upload_documents', 'Docs'],
                ['can_edit_tasks', 'Tasks'],
                ['can_manage_milestones', 'Milestones'],
                ['can_manage_risks', 'Risks'],
                ['can_manage_expenses', 'Expenses'],
                ['can_approve_expenses', 'Approve'],
              ] as Array<[keyof ProjectMemberPermission, string]>
            ).map(([field, label]) => (
              <label key={field} className="inline-flex items-center gap-1">
                <input type="checkbox" checked={Boolean(member[field])} onChange={async (e) => { if (!project._uuid) return; try { await projectsAPI.updateMember(project._uuid, member.user_id, { [field]: e.target.checked }); setMembers((prev) => prev.map((x) => (x.user_id === member.user_id ? { ...x, [field]: e.target.checked } : x))); } catch (error: any) { toast.error(error?.response?.data?.detail || error?.message || 'Permission update failed'); } }} />
                {label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const sectionMap: Record<TabType, JSX.Element> = {
    overview: (
      <div className="space-y-3">
        <div className="grid md:grid-cols-4 gap-2">
          <StatCard label="Tasks" value={`${projectTasks.length}`} />
          <StatCard label="Milestones" value={`${projectMilestones.length}`} />
          <StatCard label="Risks" value={`${projectRisks.length}`} />
          <StatCard label="Expenses" value={formatCurrency(totalExpenses)} />
        </div>
        {renderMetadata()}
        <div className="bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 p-4">
          <h3 className="font-semibold mb-2">Gantt Snapshot</h3>
          <div className="space-y-1">
            {projectTasks.map((task) => (
              <div key={task.id} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-5 truncate text-sm">{task.name}</div>
                <div className="col-span-6"><ProgressBar progress={task.progress} /></div>
                <div className="col-span-1 text-xs text-right">{task.progress}%</div>
              </div>
            ))}
          </div>
        </div>
        {renderTasks()}
        {renderMilestones()}
        {renderRisks()}
        {renderExpenses()}
        {renderDocuments()}
        {renderChat()}
        {renderMembers()}
      </div>
    ),
    tasks: renderTasks(),
    milestones: renderMilestones(),
    risks: renderRisks(),
    expenses: renderExpenses(),
    documents: renderDocuments(),
    chat: renderChat(),
    members: renderMembers(),
  };

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'risks', label: 'Risks' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'documents', label: 'Documents' },
    { id: 'chat', label: 'Chat' },
    { id: 'members', label: 'Members' },
  ];

  return (
    <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`w-full bg-white dark:bg-dark-800 shadow-2xl flex flex-col ${isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-7xl max-h-[92vh] rounded-2xl'}`}>
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div>
            <h2 className="text-xl font-semibold">{project.name}</h2>
            <p className="text-sm text-primary-100 flex items-center gap-2"><MapPin size={14} /> {project.location || 'No location'}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded hover:bg-white/20" onClick={() => setIsFullscreen((v) => !v)}>{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
            <button className="px-3 py-2 rounded bg-white/20 hover:bg-white/30 text-sm disabled:opacity-60" onClick={exportPdf} disabled={isExporting}><Download size={14} className="inline mr-1" /> {isExporting ? 'Exporting' : 'Download Report'}</button>
            <button className="p-2 rounded hover:bg-white/20" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="px-3 py-2 border-b bg-gray-50 dark:bg-dark-900 overflow-x-auto">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${activeTab === tab.id ? 'bg-primary-600 text-white' : 'border hover:bg-gray-100 dark:hover:bg-dark-700'}`}>{tab.label}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{sectionMap[activeTab]}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Section({
  title,
  input,
  setInput,
  onAdd,
  extraInput,
  children,
}: {
  title: string;
  input: string;
  setInput: (value: string) => void;
  onAdd: () => void;
  extraInput?: JSX.Element;
  children: ReactNode;
}) {
  return (
    <div className="bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} className="px-2 py-1 rounded border bg-white dark:bg-dark-800 text-sm" placeholder="Add item" />
          {extraInput}
          <button onClick={onAdd} className="px-3 py-1.5 text-sm rounded bg-primary-600 text-white">Add</button>
        </div>
      </div>
      {children}
    </div>
  );
}
