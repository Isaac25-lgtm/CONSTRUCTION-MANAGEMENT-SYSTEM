import { create } from 'zustand';
import {
  projectsAPI, tasksAPI, expensesAPI, risksAPI,
  milestonesAPI, messagesAPI, documentsAPI, analyticsAPI
} from '../lib/api';

const DEMO_MODE_ENABLED = String(import.meta.env.VITE_DEMO_MODE || 'false').toLowerCase() === 'true';
const DEMO_DISABLED_ERROR = 'Live API is unavailable and demo fallback is disabled. Set VITE_DEMO_MODE=true to enable mock data.';

export interface Project {
  id: number;
  _uuid?: string; // Backend UUID
  name: string;
  status: string;
  progress: number;
  budget: number;
  spent: number;
  manager: string;
  startDate: string;
  endDate: string;
  priority: string;
  description?: string;
  location?: string;
  clientName?: string;
  contractType?: string;
}

export const CONTRACT_TYPES = [
  'Lumpsum Contract',
  'Cost Plus Contract',
  'Time and Materials Contract',
  'Ad Measure Contract',
  'Design Build Contract',
  'Turnkey Contract',
  'Labour Contract',
  'Percentage Rate Contract',
] as const;

export interface Task {
  id: number;
  _uuid?: string;
  name: string;
  project: string;
  projectId: number;
  _projectUuid?: string;
  assignee: string;
  status: string;
  priority: string;
  dueDate: string;
  progress: number;
  description?: string;
  startDate?: string;
}

export interface Risk {
  id: number;
  _uuid?: string;
  description: string;
  probability: string;
  impact: string;
  status: string;
  mitigation: string;
  owner: string;
  projectId: number;
  _projectUuid?: string;
  category?: string;
}

export interface Document {
  id: number;
  _uuid?: string;
  name: string;
  type: string;
  project: string;
  projectId: number;
  _projectUuid?: string;
  uploadedBy: string;
  date: string;
  size: string;
  fileData?: string;
  mimeType?: string;
}

export interface Expense {
  id: number;
  _uuid?: string;
  description: string;
  category: string;
  amount: number;
  projectId: number;
  _projectUuid?: string;
  project: string;
  vendor: string;
  date: string;
  status: string;
  loggedBy: string;
  receiptData?: string;
  receiptName?: string;
  receiptMimeType?: string;
}

export interface Message {
  id: number;
  _uuid?: string;
  sender: string;
  message: string;
  time: string;
  avatar: string;
  projectId?: number;
}

export interface Milestone {
  id: number;
  _uuid?: string;
  name: string;
  date: string;
  status: string;
  projectId: number;
  _projectUuid?: string;
}

interface DataStore {
  projects: Project[];
  tasks: Task[];
  risks: Risk[];
  documents: Document[];
  expenses: Expense[];
  messages: Message[];
  milestones: Milestone[];
  isLoading: boolean;
  isApiConnected: boolean;
  error: string | null;

  // Sync with backend
  syncFromAPI: () => Promise<void>;

  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: number, data: Partial<Project>) => void;
  deleteProject: (id: number) => void;

  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: number, data: Partial<Task>) => void;
  deleteTask: (id: number) => void;

  addRisk: (risk: Omit<Risk, 'id'>) => void;
  updateRisk: (id: number, data: Partial<Risk>) => void;
  deleteRisk: (id: number) => void;

  addDocument: (doc: Omit<Document, 'id'>) => void;
  deleteDocument: (id: number) => void;

  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: number, data: Partial<Expense>) => void;
  deleteExpense: (id: number) => void;

  addMessage: (message: Omit<Message, 'id'>) => void;

  addMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  updateMilestone: (id: number, data: Partial<Milestone>) => void;
  deleteMilestone: (id: number) => void;
}

// Helper: Map backend project to frontend format
const mapProject = (p: any, idx: number): Project => ({
  id: idx + 1,
  _uuid: p.id,
  name: p.project_name || p.name,
  status: p.status?.replace('_', ' ') || 'Planning',
  progress: p.progress || 0,
  budget: Number(p.total_budget) || 0,
  spent: Number(p.spent_budget) || 0,
  manager: p.manager_name || 'Unassigned',
  startDate: p.start_date || '',
  endDate: p.end_date || '',
  priority: p.priority || 'Medium',
  description: p.description || '',
  location: p.location || '',
  clientName: p.client_name || '',
  contractType: p.contract_type || '',
});

const mapTask = (t: any, idx: number, projects: Project[]): Task => {
  const project = projects.find(p => p._uuid === t.project_id);
  return {
    id: idx + 1,
    _uuid: t.id,
    name: t.title || t.name,
    project: project?.name || '',
    projectId: project?.id || 0,
    _projectUuid: t.project_id,
    assignee: t.assignee_name || 'Unassigned',
    status: t.status?.replace('_', ' ') || 'Pending',
    priority: t.priority || 'Medium',
    dueDate: t.due_date || '',
    progress: t.progress || 0,
    description: t.description || '',
    startDate: t.start_date || '',
  };
};

const mapExpense = (e: any, idx: number, projects: Project[]): Expense => {
  const project = projects.find(p => p._uuid === e.project_id);
  return {
    id: idx + 1,
    _uuid: e.id,
    description: e.description || '',
    category: e.category || 'Materials',
    amount: Number(e.amount) || 0,
    projectId: project?.id || 0,
    _projectUuid: e.project_id,
    project: project?.name || '',
    vendor: e.vendor || '',
    date: e.expense_date || e.date || e.created_at?.split('T')[0] || '',
    status: e.status || 'Pending',
    loggedBy: e.logged_by_name || e.submitted_by_name || '',
  };
};

const mapRisk = (r: any, idx: number, projects: Project[]): Risk => {
  const project = projects.find(p => p._uuid === r.project_id);
  return {
    id: idx + 1,
    _uuid: r.id,
    description: r.title || r.description || '',
    probability: r.probability || 'Medium',
    impact: r.impact || 'Medium',
    status: r.status || 'Open',
    mitigation: r.mitigation_plan || '',
    owner: r.owner_name || 'Unassigned',
    projectId: project?.id || 0,
    _projectUuid: r.project_id,
    category: r.category || '',
  };
};

const mapDocument = (d: any, idx: number, projects: Project[]): Document => {
  const project = projects.find(p => p._uuid === d.project_id);
  return {
    id: idx + 1,
    _uuid: d.id,
    name: d.name || d.filename || '',
    type: d.document_type || d.category || 'Document',
    project: project?.name || '',
    projectId: project?.id || 0,
    _projectUuid: d.project_id,
    uploadedBy: d.uploaded_by_name || d.uploader_name || 'Unknown',
    date: d.created_at?.split('T')[0] || '',
    size: d.file_size ? `${(d.file_size / 1024 / 1024).toFixed(1)} MB` : '0 MB',
    mimeType: d.mime_type || '',
  };
};

const mapMilestone = (m: any, idx: number, projects: Project[]): Milestone => {
  const project = projects.find(p => p._uuid === m.project_id);
  return {
    id: idx + 1,
    _uuid: m.id,
    name: m.name || '',
    date: m.target_date || m.due_date || '',
    status: m.status?.replace('_', ' ') || 'Pending',
    projectId: project?.id || 0,
    _projectUuid: m.project_id,
  };
};

const mapMessage = (msg: any, idx: number, projects: Project[]): Message => {
  const project = projects.find((p) => p._uuid === msg.project_id);
  return {
    id: idx + 1,
    _uuid: msg.id,
    sender: msg.sender_name || 'System',
    message: msg.content || '',
    time: msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
    avatar: (msg.sender_name || 'SY').split(' ').map((n: string) => n[0]).join('').slice(0, 2),
    projectId: project?.id,
  };
};

// Fallback mock data for when API is not available
const MOCK_PROJECTS: Project[] = [
  { id: 1, name: 'Headquarters Renovation', status: 'In Progress', progress: 65, budget: 2500000000, spent: 1625000000, manager: 'John Okello', startDate: '2025-01-15', endDate: '2026-06-30', priority: 'High', description: 'Modern 10-story office building in Kampala CBD with underground parking and rooftop gardens.', location: 'Main Office Campus', clientName: 'Internal Operations', contractType: 'Design Build Contract' },
  { id: 2, name: 'Operations Center Expansion', status: 'In Progress', progress: 42, budget: 4200000000, spent: 1764000000, manager: 'Sarah Nambi', startDate: '2025-03-01', endDate: '2026-12-15', priority: 'Critical', description: 'Major highway bridge construction connecting Entebbe to Kampala with 4 lanes.', location: 'West Logistics Corridor', clientName: 'Infrastructure Program Office', contractType: 'Turnkey Contract' },
  { id: 3, name: 'Warehouse Upgrade Program', status: 'Planning', progress: 15, budget: 8500000000, spent: 1275000000, manager: 'Peter Wasswa', startDate: '2025-06-01', endDate: '2027-08-30', priority: 'Medium', description: 'Large-scale industrial park development with warehouses and manufacturing facilities.', location: 'North Distribution Zone', clientName: 'Strategy and Planning Office', contractType: 'Lumpsum Contract' },
];

const MOCK_TASKS: Task[] = [
  { id: 1, name: 'Foundation Excavation', project: 'Headquarters Renovation', projectId: 1, assignee: 'Site Team A', status: 'Completed', priority: 'High', dueDate: '2025-02-28', progress: 100, startDate: '2025-01-20' },
  { id: 2, name: 'Steel Framework Installation', project: 'Headquarters Renovation', projectId: 1, assignee: 'Steel Contractors', status: 'In Progress', priority: 'High', dueDate: '2025-04-15', progress: 68, startDate: '2025-03-01' },
  { id: 3, name: 'Concrete Pouring - Level 2', project: 'Headquarters Renovation', projectId: 1, assignee: 'Site Team B', status: 'In Progress', priority: 'Medium', dueDate: '2025-03-20', progress: 45, startDate: '2025-03-05' },
  { id: 4, name: 'Electrical Conduit Layout', project: 'Headquarters Renovation', projectId: 1, assignee: 'Electricians', status: 'Pending', priority: 'Medium', dueDate: '2025-05-01', progress: 0, startDate: '2025-04-20' },
  { id: 5, name: 'Bridge Pillar Construction', project: 'Operations Center Expansion', projectId: 2, assignee: 'Heavy Works Team', status: 'In Progress', priority: 'Critical', dueDate: '2025-06-30', progress: 35, startDate: '2025-03-15' },
  { id: 6, name: 'Site Survey & Marking', project: 'Warehouse Upgrade Program', projectId: 3, assignee: 'Survey Team', status: 'Completed', priority: 'High', dueDate: '2025-06-15', progress: 100, startDate: '2025-06-01' },
  { id: 7, name: 'Environmental Assessment', project: 'Warehouse Upgrade Program', projectId: 3, assignee: 'NEMA Consultant', status: 'In Progress', priority: 'High', dueDate: '2025-07-01', progress: 60, startDate: '2025-06-10' },
];

const MOCK_RISKS: Risk[] = [
  { id: 1, description: 'Delayed steel delivery from supplier', probability: 'High', impact: 'High', status: 'Active', mitigation: 'Source alternative suppliers, maintain buffer stock', owner: 'John Okello', projectId: 1, category: 'Supply Chain' },
  { id: 2, description: 'Heavy rainfall during foundation work', probability: 'Medium', impact: 'High', status: 'Monitoring', mitigation: 'Arrange dewatering pumps, adjust schedule', owner: 'Sarah Nambi', projectId: 2, category: 'Environmental' },
  { id: 3, description: 'Labor shortage during peak season', probability: 'Medium', impact: 'Medium', status: 'Active', mitigation: 'Pre-book labor, offer competitive wages', owner: 'Peter Wasswa', projectId: 3, category: 'Resource' },
  { id: 4, description: 'Currency fluctuation affecting material costs', probability: 'High', impact: 'Medium', status: 'Monitoring', mitigation: 'Lock in prices with suppliers, budget contingency', owner: 'Finance Team', projectId: 1, category: 'Financial' },
];

const MOCK_DOCUMENTS: Document[] = [
  { id: 1, name: 'Architectural Plans v2.3.pdf', type: 'Drawing', project: 'Headquarters Renovation', projectId: 1, uploadedBy: 'Arch. Mukasa', date: '2025-01-10', size: '15.2 MB' },
  { id: 2, name: 'Structural Engineering Report.pdf', type: 'Report', project: 'Headquarters Renovation', projectId: 1, uploadedBy: 'Eng. Tumwine', date: '2025-01-08', size: '8.4 MB' },
  { id: 3, name: 'Site Progress Photos - Week 12.zip', type: 'Photos', project: 'Headquarters Renovation', projectId: 1, uploadedBy: 'Site Supervisor', date: '2025-01-12', size: '45.6 MB' },
  { id: 4, name: 'Bridge Foundation Specs.dwg', type: 'Drawing', project: 'Operations Center Expansion', projectId: 2, uploadedBy: 'Eng. Kato', date: '2025-01-05', size: '22.1 MB' },
  { id: 5, name: 'Environmental Impact Assessment.pdf', type: 'Report', project: 'Warehouse Upgrade Program', projectId: 3, uploadedBy: 'NEMA Consultant', date: '2024-12-20', size: '5.8 MB' },
];

const MOCK_EXPENSES: Expense[] = [
  { id: 1, description: 'Steel reinforcement bars', category: 'Materials', amount: 45000000, projectId: 1, project: 'Headquarters Renovation', vendor: 'Prime Materials Ltd', date: '2025-01-08', status: 'Approved', loggedBy: 'John Okello' },
  { id: 2, description: 'Concrete mix delivery', category: 'Materials', amount: 28000000, projectId: 1, project: 'Headquarters Renovation', vendor: 'City Concrete Supply', date: '2025-01-10', status: 'Approved', loggedBy: 'Site Team A' },
  { id: 3, description: 'Crane rental - January', category: 'Equipment', amount: 15000000, projectId: 1, project: 'Headquarters Renovation', vendor: 'Heavy Lift Services', date: '2025-01-05', status: 'Approved', loggedBy: 'John Okello' },
  { id: 4, description: 'Labor wages - Week 2', category: 'Labor', amount: 8500000, projectId: 1, project: 'Headquarters Renovation', vendor: 'N/A', date: '2025-01-12', status: 'Pending', loggedBy: 'Site Supervisor' },
  { id: 5, description: 'Bridge piling materials', category: 'Materials', amount: 120000000, projectId: 2, project: 'Operations Center Expansion', vendor: 'Construction Supplies Ltd', date: '2025-01-15', status: 'Approved', loggedBy: 'Sarah Nambi' },
];

const MOCK_MESSAGES: Message[] = [
  { id: 1, sender: 'John Okello', message: 'Steel delivery confirmed for Monday. Please prepare the site.', time: '10:30 AM', avatar: 'JO', projectId: 1 },
  { id: 2, sender: 'Sarah Nambi', message: 'Bridge pillar inspection passed. We can proceed to next phase.', time: '9:15 AM', avatar: 'SN', projectId: 2 },
  { id: 3, sender: 'Site Supervisor', message: 'Need additional 20 workers for concrete pouring tomorrow.', time: 'Yesterday', avatar: 'SS', projectId: 1 },
  { id: 4, sender: 'Finance Team', message: 'Budget approval for Q2 materials has been processed.', time: 'Yesterday', avatar: 'FT' },
  { id: 5, sender: 'Peter Wasswa', message: 'Environmental assessment report submitted to NEMA.', time: '2 days ago', avatar: 'PW', projectId: 3 },
];

const MOCK_MILESTONES: Milestone[] = [
  { id: 1, name: 'Foundation Complete', date: '2025-03-15', status: 'Completed', projectId: 1 },
  { id: 2, name: 'Structure Complete', date: '2025-06-30', status: 'On Track', projectId: 1 },
  { id: 3, name: 'MEP Complete', date: '2025-09-15', status: 'On Track', projectId: 1 },
  { id: 4, name: 'Handover', date: '2025-12-30', status: 'Pending', projectId: 1 },
  { id: 5, name: 'Bridge Deck Complete', date: '2026-06-30', status: 'On Track', projectId: 2 },
];

export const useDataStore = create<DataStore>((set, get) => ({
  projects: DEMO_MODE_ENABLED ? MOCK_PROJECTS : [],
  tasks: DEMO_MODE_ENABLED ? MOCK_TASKS : [],
  risks: DEMO_MODE_ENABLED ? MOCK_RISKS : [],
  documents: DEMO_MODE_ENABLED ? MOCK_DOCUMENTS : [],
  expenses: DEMO_MODE_ENABLED ? MOCK_EXPENSES : [],
  messages: DEMO_MODE_ENABLED ? MOCK_MESSAGES : [],
  milestones: DEMO_MODE_ENABLED ? MOCK_MILESTONES : [],
  isLoading: false,
  isApiConnected: DEMO_MODE_ENABLED ? false : false,
  error: DEMO_MODE_ENABLED ? 'VITE_DEMO_MODE is enabled. Showing mock data.' : null,

  syncFromAPI: async () => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      if (!DEMO_MODE_ENABLED) {
        set({
          projects: [],
          tasks: [],
          risks: [],
          documents: [],
          expenses: [],
          messages: [],
          milestones: [],
          isApiConnected: false,
          error: null,
        });
      }
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Fetch projects first (needed to map other entities)
      const projectsData = await projectsAPI.list({ page_size: 100 });
      const projects = (projectsData.items || []).map(mapProject);

      // Fetch all other entities in parallel
      const results = await Promise.allSettled(
        projects.map(async (p) => {
          const uuid = p._uuid!;
          const [tasksRes, expensesRes, risksRes, docsRes, milestonesRes] = await Promise.allSettled([
            tasksAPI.list(uuid, { page_size: 100 }),
            expensesAPI.list(uuid, { page_size: 100 }),
            risksAPI.list(uuid, { page_size: 100 }),
            documentsAPI.list(uuid, { page_size: 100 }),
            milestonesAPI.list(uuid, { page_size: 100 }),
          ]);
          return {
            tasks: tasksRes.status === 'fulfilled' ? tasksRes.value.items || [] : [],
            expenses: expensesRes.status === 'fulfilled' ? expensesRes.value.items || [] : [],
            risks: risksRes.status === 'fulfilled' ? risksRes.value.items || [] : [],
            documents: docsRes.status === 'fulfilled' ? docsRes.value.items || [] : [],
            milestones: milestonesRes.status === 'fulfilled' ? milestonesRes.value.items || [] : [],
          };
        })
      );

      // Flatten all entity arrays
      const allTasks: any[] = [];
      const allExpenses: any[] = [];
      const allRisks: any[] = [];
      const allDocuments: any[] = [];
      const allMilestones: any[] = [];

      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          allTasks.push(...r.value.tasks);
          allExpenses.push(...r.value.expenses);
          allRisks.push(...r.value.risks);
          allDocuments.push(...r.value.documents);
          allMilestones.push(...r.value.milestones);
        }
      });

      // Try to fetch messages
      let allMessages: any[] = [];
      try {
        const msgsData = await messagesAPI.list({ page_size: 100 });
        allMessages = msgsData.items || [];
      } catch { /* messages endpoint may not have data yet */ }

      // Map everything to frontend format
      set({
        projects: projects.length > 0 ? projects : (DEMO_MODE_ENABLED ? MOCK_PROJECTS : []),
        tasks: allTasks.length > 0 ? allTasks.map((t, i) => mapTask(t, i, projects)) : (DEMO_MODE_ENABLED ? MOCK_TASKS : []),
        expenses: allExpenses.length > 0 ? allExpenses.map((e, i) => mapExpense(e, i, projects)) : (DEMO_MODE_ENABLED ? MOCK_EXPENSES : []),
        risks: allRisks.length > 0 ? allRisks.map((r, i) => mapRisk(r, i, projects)) : (DEMO_MODE_ENABLED ? MOCK_RISKS : []),
        documents: allDocuments.length > 0 ? allDocuments.map((d, i) => mapDocument(d, i, projects)) : (DEMO_MODE_ENABLED ? MOCK_DOCUMENTS : []),
        milestones: allMilestones.length > 0 ? allMilestones.map((m, i) => mapMilestone(m, i, projects)) : (DEMO_MODE_ENABLED ? MOCK_MILESTONES : []),
        messages: allMessages.length > 0 ? allMessages.map((m, i) => mapMessage(m, i, projects)) : (DEMO_MODE_ENABLED ? MOCK_MESSAGES : []),
        isLoading: false,
        isApiConnected: true,
        error: null,
      });
    } catch (err: any) {
      console.warn('API sync failed:', err.message);
      set({
        projects: DEMO_MODE_ENABLED ? MOCK_PROJECTS : [],
        tasks: DEMO_MODE_ENABLED ? MOCK_TASKS : [],
        expenses: DEMO_MODE_ENABLED ? MOCK_EXPENSES : [],
        risks: DEMO_MODE_ENABLED ? MOCK_RISKS : [],
        documents: DEMO_MODE_ENABLED ? MOCK_DOCUMENTS : [],
        milestones: DEMO_MODE_ENABLED ? MOCK_MILESTONES : [],
        messages: DEMO_MODE_ENABLED ? MOCK_MESSAGES : [],
        isLoading: false,
        isApiConnected: false,
        error: DEMO_MODE_ENABLED
          ? 'Could not connect to API. Demo fallback is enabled via VITE_DEMO_MODE=true.'
          : DEMO_DISABLED_ERROR,
      });
    }
  },

  addProject: (project) => {
    const state = get();
    const p = state.projects.find(p => p._uuid);
    if (state.isApiConnected && p?._uuid) {
      // API mode: create via API then sync
      projectsAPI.create({
        project_name: project.name,
        description: project.description,
        status: project.status?.replace(' ', '_'),
        priority: project.priority,
        total_budget: project.budget,
        start_date: project.startDate,
        end_date: project.endDate,
        location: project.location,
        client_name: project.clientName,
        contract_type: project.contractType,
      }).then(() => state.syncFromAPI()).catch(console.error);
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      projects: [...s.projects, { ...project, id: Math.max(...s.projects.map(p => p.id), 0) + 1 }]
    }));
  },

  updateProject: (id, data) => {
    const state = get();
    const project = state.projects.find(p => p.id === id);
    if (state.isApiConnected && project?._uuid) {
      const updateData: any = {};
      if (data.name) updateData.project_name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status) updateData.status = data.status.replace(' ', '_');
      if (data.priority) updateData.priority = data.priority;
      if (data.budget !== undefined) updateData.total_budget = data.budget;
      if (data.startDate) updateData.start_date = data.startDate;
      if (data.endDate) updateData.end_date = data.endDate;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.clientName !== undefined) updateData.client_name = data.clientName;
      if (data.contractType !== undefined) updateData.contract_type = data.contractType;
      projectsAPI.update(project._uuid, updateData).then(() => state.syncFromAPI()).catch(console.error);
      // Optimistic update while API request is in flight.
      set((s) => ({
        projects: s.projects.map(p => p.id === id ? { ...p, ...data } : p)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      projects: s.projects.map(p => p.id === id ? { ...p, ...data } : p)
    }));
  },

  deleteProject: (id) => {
    const state = get();
    const project = state.projects.find(p => p.id === id);
    if (state.isApiConnected && project?._uuid) {
      projectsAPI.delete(project._uuid).catch(console.error);
      set((s) => ({
        projects: s.projects.filter(p => p.id !== id)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      projects: s.projects.filter(p => p.id !== id)
    }));
  },

  addTask: (task) => {
    const state = get();
    const project = state.projects.find(p => p.id === task.projectId);
    if (state.isApiConnected && project?._uuid) {
      tasksAPI.create(project._uuid, {
        name: task.name,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.dueDate,
        start_date: task.startDate,
        progress: task.progress,
      }).then(() => state.syncFromAPI()).catch(console.error);
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      tasks: [...s.tasks, { ...task, id: Math.max(...s.tasks.map(t => t.id), 0) + 1 }]
    }));
  },

  updateTask: (id, data) => {
    const state = get();
    const task = state.tasks.find(t => t.id === id);
    const project = task ? state.projects.find(p => p.id === task.projectId) : null;
    if (state.isApiConnected && task?._uuid && project?._uuid) {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status) updateData.status = data.status;
      if (data.priority) updateData.priority = data.priority;
      if (data.dueDate) updateData.due_date = data.dueDate;
      if (data.progress !== undefined) updateData.progress = data.progress;
      tasksAPI.update(project._uuid, task._uuid, updateData).catch(console.error);
      set((s) => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t)
    }));
  },

  deleteTask: (id) => {
    const state = get();
    const task = state.tasks.find(t => t.id === id);
    const project = task ? state.projects.find(p => p.id === task.projectId) : null;
    if (state.isApiConnected && task?._uuid && project?._uuid) {
      tasksAPI.delete(project._uuid, task._uuid).catch(console.error);
      set((s) => ({
        tasks: s.tasks.filter(t => t.id !== id)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      tasks: s.tasks.filter(t => t.id !== id)
    }));
  },

  addRisk: (risk) => {
    const state = get();
    const project = state.projects.find(p => p.id === risk.projectId);
    if (state.isApiConnected && project?._uuid) {
      risksAPI.create(project._uuid, {
        title: risk.description,
        description: risk.description,
        category: risk.category || 'Other',
        probability: risk.probability,
        impact: risk.impact,
        status: risk.status,
        mitigation_plan: risk.mitigation,
      }).then(() => state.syncFromAPI()).catch(console.error);
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      risks: [...s.risks, { ...risk, id: Math.max(...s.risks.map(r => r.id), 0) + 1 }]
    }));
  },

  updateRisk: (id, data) => {
    const state = get();
    const risk = state.risks.find(r => r.id === id);
    const project = risk ? state.projects.find(p => p.id === risk.projectId) : null;
    if (state.isApiConnected && risk?._uuid && project?._uuid) {
      const updateData: any = {};
      if (data.description) updateData.title = data.description;
      if (data.probability) updateData.probability = data.probability;
      if (data.impact) updateData.impact = data.impact;
      if (data.status) updateData.status = data.status;
      if (data.mitigation) updateData.mitigation_plan = data.mitigation;
      if (data.category) updateData.category = data.category;
      risksAPI.update(project._uuid, risk._uuid, updateData).catch(console.error);
      set((s) => ({
        risks: s.risks.map(r => r.id === id ? { ...r, ...data } : r)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      risks: s.risks.map(r => r.id === id ? { ...r, ...data } : r)
    }));
  },

  deleteRisk: (id) => {
    const state = get();
    const risk = state.risks.find(r => r.id === id);
    const project = risk ? state.projects.find(p => p.id === risk.projectId) : null;
    if (state.isApiConnected && risk?._uuid && project?._uuid) {
      risksAPI.delete(project._uuid, risk._uuid).catch(console.error);
      set((s) => ({
        risks: s.risks.filter(r => r.id !== id)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      risks: s.risks.filter(r => r.id !== id)
    }));
  },

  addDocument: (doc) => {
    if (!DEMO_MODE_ENABLED && !get().isApiConnected) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      documents: [...s.documents, { ...doc, id: Math.max(...s.documents.map(d => d.id), 0) + 1 }]
    }));
  },

  deleteDocument: (id) => {
    const state = get();
    const doc = state.documents.find(d => d.id === id);
    const project = doc ? state.projects.find(p => p.id === doc.projectId) : null;
    if (state.isApiConnected && doc?._uuid && project?._uuid) {
      documentsAPI.delete(project._uuid, doc._uuid).catch(console.error);
      set((s) => ({
        documents: s.documents.filter(d => d.id !== id)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      documents: s.documents.filter(d => d.id !== id)
    }));
  },

  addExpense: (expense) => {
    const state = get();
    const project = state.projects.find(p => p.id === expense.projectId);
    if (state.isApiConnected && project?._uuid) {
      expensesAPI.create(project._uuid, {
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        vendor: expense.vendor,
        expense_date: expense.date,
      }).then(() => state.syncFromAPI()).catch(console.error);
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      expenses: [...s.expenses, { ...expense, id: Math.max(...s.expenses.map(e => e.id), 0) + 1 }]
    }));
  },

  updateExpense: (id, data) => {
    const state = get();
    const expense = state.expenses.find(e => e.id === id);
    const project = expense ? state.projects.find(p => p.id === expense.projectId) : null;
    if (state.isApiConnected && expense?._uuid && project?._uuid) {
      if (data.status === 'Approved') {
        expensesAPI.approve(project._uuid, expense._uuid).catch(console.error);
      } else if (data.status === 'Rejected') {
        expensesAPI.reject(project._uuid, expense._uuid, 'Rejected').catch(console.error);
      }
      set((s) => ({
        expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e)
    }));
  },

  deleteExpense: (id) => {
    const state = get();
    const expense = state.expenses.find(e => e.id === id);
    const project = expense ? state.projects.find(p => p.id === expense.projectId) : null;
    if (state.isApiConnected && expense?._uuid && project?._uuid) {
      expensesAPI.delete(project._uuid, expense._uuid).catch(console.error);
      set((s) => ({
        expenses: s.expenses.filter(e => e.id !== id)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      expenses: s.expenses.filter(e => e.id !== id)
    }));
  },

  addMilestone: (milestone) => {
    const state = get();
    const project = state.projects.find(p => p.id === milestone.projectId);
    if (state.isApiConnected && project?._uuid) {
      milestonesAPI.create(project._uuid, {
        name: milestone.name,
        description: '',
        target_date: milestone.date,
        status: milestone.status,
        completion_percentage: milestone.status === 'Completed' ? 100 : 0,
      }).then(() => state.syncFromAPI()).catch(console.error);
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      milestones: [...s.milestones, { ...milestone, id: Math.max(...s.milestones.map(m => m.id), 0) + 1 }]
    }));
  },

  updateMilestone: (id, data) => {
    const state = get();
    const milestone = state.milestones.find(m => m.id === id);
    const project = milestone ? state.projects.find(p => p.id === milestone.projectId) : null;
    if (state.isApiConnected && milestone?._uuid && project?._uuid) {
      const payload: any = {};
      if (data.name) payload.name = data.name;
      if (data.date) payload.target_date = data.date;
      if (data.status) payload.status = data.status;
      milestonesAPI.update(project._uuid, milestone._uuid, payload).then(() => state.syncFromAPI()).catch(console.error);
      set((s) => ({
        milestones: s.milestones.map(m => m.id === id ? { ...m, ...data } : m)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      milestones: s.milestones.map(m => m.id === id ? { ...m, ...data } : m)
    }));
  },

  deleteMilestone: (id) => {
    const state = get();
    const milestone = state.milestones.find(m => m.id === id);
    const project = milestone ? state.projects.find(p => p.id === milestone.projectId) : null;
    if (state.isApiConnected && milestone?._uuid && project?._uuid) {
      milestonesAPI.delete(project._uuid, milestone._uuid).catch(console.error);
      set((s) => ({
        milestones: s.milestones.filter(m => m.id !== id)
      }));
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      milestones: s.milestones.filter(m => m.id !== id)
    }));
  },

  addMessage: (message) => {
    const state = get();
    if (state.isApiConnected) {
      const payload: { content: string; project_id?: string } = {
        content: message.message,
      };

      if (message.projectId) {
        const project = state.projects.find((p) => p.id === message.projectId);
        if (project?._uuid) {
          payload.project_id = project._uuid;
        }
      }

      messagesAPI.create(payload).then(() => state.syncFromAPI()).catch(console.error);
      return;
    }
    if (!DEMO_MODE_ENABLED) {
      set({ error: DEMO_DISABLED_ERROR });
      return;
    }
    set((s) => ({
      messages: [{ ...message, id: Math.max(...s.messages.map(m => m.id), 0) + 1 }, ...s.messages]
    }));
  },
}));

