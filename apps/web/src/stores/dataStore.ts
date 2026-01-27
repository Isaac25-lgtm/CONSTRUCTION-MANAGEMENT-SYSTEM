import { create } from 'zustand';

export interface Project {
  id: number;
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
  name: string;
  project: string;
  projectId: number;
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
  description: string;
  probability: string;
  impact: string;
  status: string;
  mitigation: string;
  owner: string;
  projectId: number;
  category?: string;
}

export interface Document {
  id: number;
  name: string;
  type: string;
  project: string;
  projectId: number;
  uploadedBy: string;
  date: string;
  size: string;
  fileData?: string; // Base64 encoded file data for downloads
  mimeType?: string; // MIME type of the file
}

export interface Expense {
  id: number;
  description: string;
  category: string;
  amount: number;
  projectId: number;
  project: string;
  vendor: string;
  date: string;
  status: string;
  loggedBy: string;
  receiptData?: string;    // Base64 encoded receipt file
  receiptName?: string;    // Original receipt filename
  receiptMimeType?: string; // MIME type of receipt (image/pdf)
}

export interface Message {
  id: number;
  sender: string;
  message: string;
  time: string;
  avatar: string;
  projectId?: number;
}

export interface Milestone {
  id: number;
  name: string;
  date: string;
  status: string;
  projectId: number;
}

interface DataStore {
  projects: Project[];
  tasks: Task[];
  risks: Risk[];
  documents: Document[];
  expenses: Expense[];
  messages: Message[];
  milestones: Milestone[];

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

  addMessage: (message: Omit<Message, 'id'>) => void;
}

export const useDataStore = create<DataStore>((set, get) => ({
  projects: [
    { id: 1, name: 'Kampala Office Complex', status: 'In Progress', progress: 65, budget: 2500000000, spent: 1625000000, manager: 'John Okello', startDate: '2025-01-15', endDate: '2026-06-30', priority: 'High', description: 'Modern 10-story office building in Kampala CBD with underground parking and rooftop gardens.', location: 'Kampala CBD, Uganda', clientName: 'Uganda Development Corporation', contractType: 'Design Build Contract' },
    { id: 2, name: 'Entebbe Highway Bridge', status: 'In Progress', progress: 42, budget: 4200000000, spent: 1764000000, manager: 'Sarah Nambi', startDate: '2025-03-01', endDate: '2026-12-15', priority: 'Critical', description: 'Major highway bridge construction connecting Entebbe to Kampala with 4 lanes.', location: 'Entebbe Road, Uganda', clientName: 'Uganda National Roads Authority', contractType: 'Turnkey Contract' },
    { id: 3, name: 'Jinja Industrial Park', status: 'Planning', progress: 15, budget: 8500000000, spent: 1275000000, manager: 'Peter Wasswa', startDate: '2025-06-01', endDate: '2027-08-30', priority: 'Medium', description: 'Large-scale industrial park development with warehouses and manufacturing facilities.', location: 'Jinja, Uganda', clientName: 'Uganda Investment Authority', contractType: 'Lumpsum Contract' },
  ],

  tasks: [
    { id: 1, name: 'Foundation Excavation', project: 'Kampala Office Complex', projectId: 1, assignee: 'Site Team A', status: 'Completed', priority: 'High', dueDate: '2025-02-28', progress: 100, startDate: '2025-01-20' },
    { id: 2, name: 'Steel Framework Installation', project: 'Kampala Office Complex', projectId: 1, assignee: 'Steel Contractors', status: 'In Progress', priority: 'High', dueDate: '2025-04-15', progress: 68, startDate: '2025-03-01' },
    { id: 3, name: 'Concrete Pouring - Level 2', project: 'Kampala Office Complex', projectId: 1, assignee: 'Site Team B', status: 'In Progress', priority: 'Medium', dueDate: '2025-03-20', progress: 45, startDate: '2025-03-05' },
    { id: 4, name: 'Electrical Conduit Layout', project: 'Kampala Office Complex', projectId: 1, assignee: 'Electricians', status: 'Pending', priority: 'Medium', dueDate: '2025-05-01', progress: 0, startDate: '2025-04-20' },
    { id: 5, name: 'Bridge Pillar Construction', project: 'Entebbe Highway Bridge', projectId: 2, assignee: 'Heavy Works Team', status: 'In Progress', priority: 'Critical', dueDate: '2025-06-30', progress: 35, startDate: '2025-03-15' },
    { id: 6, name: 'Site Survey & Marking', project: 'Jinja Industrial Park', projectId: 3, assignee: 'Survey Team', status: 'Completed', priority: 'High', dueDate: '2025-06-15', progress: 100, startDate: '2025-06-01' },
    { id: 7, name: 'Environmental Assessment', project: 'Jinja Industrial Park', projectId: 3, assignee: 'NEMA Consultant', status: 'In Progress', priority: 'High', dueDate: '2025-07-01', progress: 60, startDate: '2025-06-10' },
  ],

  risks: [
    { id: 1, description: 'Delayed steel delivery from supplier', probability: 'High', impact: 'High', status: 'Active', mitigation: 'Source alternative suppliers, maintain buffer stock', owner: 'John Okello', projectId: 1, category: 'Supply Chain' },
    { id: 2, description: 'Heavy rainfall during foundation work', probability: 'Medium', impact: 'High', status: 'Monitoring', mitigation: 'Arrange dewatering pumps, adjust schedule', owner: 'Sarah Nambi', projectId: 2, category: 'Environmental' },
    { id: 3, description: 'Labor shortage during peak season', probability: 'Medium', impact: 'Medium', status: 'Active', mitigation: 'Pre-book labor, offer competitive wages', owner: 'Peter Wasswa', projectId: 3, category: 'Resource' },
    { id: 4, description: 'Currency fluctuation affecting material costs', probability: 'High', impact: 'Medium', status: 'Monitoring', mitigation: 'Lock in prices with suppliers, budget contingency', owner: 'Finance Team', projectId: 1, category: 'Financial' },
  ],

  documents: [
    { id: 1, name: 'Architectural Plans v2.3.pdf', type: 'Drawing', project: 'Kampala Office Complex', projectId: 1, uploadedBy: 'Arch. Mukasa', date: '2025-01-10', size: '15.2 MB' },
    { id: 2, name: 'Structural Engineering Report.pdf', type: 'Report', project: 'Kampala Office Complex', projectId: 1, uploadedBy: 'Eng. Tumwine', date: '2025-01-08', size: '8.4 MB' },
    { id: 3, name: 'Site Progress Photos - Week 12.zip', type: 'Photos', project: 'Kampala Office Complex', projectId: 1, uploadedBy: 'Site Supervisor', date: '2025-01-12', size: '45.6 MB' },
    { id: 4, name: 'Bridge Foundation Specs.dwg', type: 'Drawing', project: 'Entebbe Highway Bridge', projectId: 2, uploadedBy: 'Eng. Kato', date: '2025-01-05', size: '22.1 MB' },
    { id: 5, name: 'Environmental Impact Assessment.pdf', type: 'Report', project: 'Jinja Industrial Park', projectId: 3, uploadedBy: 'NEMA Consultant', date: '2024-12-20', size: '5.8 MB' },
  ],

  expenses: [
    { id: 1, description: 'Steel reinforcement bars', category: 'Materials', amount: 45000000, projectId: 1, project: 'Kampala Office Complex', vendor: 'Uganda Steel Mills', date: '2025-01-08', status: 'Approved', loggedBy: 'John Okello' },
    { id: 2, description: 'Concrete mix delivery', category: 'Materials', amount: 28000000, projectId: 1, project: 'Kampala Office Complex', vendor: 'Tororo Cement', date: '2025-01-10', status: 'Approved', loggedBy: 'Site Team A' },
    { id: 3, description: 'Crane rental - January', category: 'Equipment', amount: 15000000, projectId: 1, project: 'Kampala Office Complex', vendor: 'Heavy Lift Uganda', date: '2025-01-05', status: 'Approved', loggedBy: 'John Okello' },
    { id: 4, description: 'Labor wages - Week 2', category: 'Labor', amount: 8500000, projectId: 1, project: 'Kampala Office Complex', vendor: 'N/A', date: '2025-01-12', status: 'Pending', loggedBy: 'Site Supervisor' },
    { id: 5, description: 'Bridge piling materials', category: 'Materials', amount: 120000000, projectId: 2, project: 'Entebbe Highway Bridge', vendor: 'Construction Supplies Ltd', date: '2025-01-15', status: 'Approved', loggedBy: 'Sarah Nambi' },
  ],

  messages: [
    { id: 1, sender: 'John Okello', message: 'Steel delivery confirmed for Monday. Please prepare the site.', time: '10:30 AM', avatar: 'JO', projectId: 1 },
    { id: 2, sender: 'Sarah Nambi', message: 'Bridge pillar inspection passed. We can proceed to next phase.', time: '9:15 AM', avatar: 'SN', projectId: 2 },
    { id: 3, sender: 'Site Supervisor', message: 'Need additional 20 workers for concrete pouring tomorrow.', time: 'Yesterday', avatar: 'SS', projectId: 1 },
    { id: 4, sender: 'Finance Team', message: 'Budget approval for Q2 materials has been processed.', time: 'Yesterday', avatar: 'FT' },
    { id: 5, sender: 'Peter Wasswa', message: 'Environmental assessment report submitted to NEMA.', time: '2 days ago', avatar: 'PW', projectId: 3 },
  ],

  milestones: [
    { id: 1, name: 'Foundation Complete', date: '2025-03-15', status: 'Completed', projectId: 1 },
    { id: 2, name: 'Structure Complete', date: '2025-06-30', status: 'On Track', projectId: 1 },
    { id: 3, name: 'MEP Complete', date: '2025-09-15', status: 'On Track', projectId: 1 },
    { id: 4, name: 'Handover', date: '2025-12-30', status: 'Pending', projectId: 1 },
    { id: 5, name: 'Bridge Deck Complete', date: '2026-06-30', status: 'On Track', projectId: 2 },
  ],

  addProject: (project) => set((state) => ({
    projects: [...state.projects, { ...project, id: Math.max(...state.projects.map(p => p.id), 0) + 1 }]
  })),

  updateProject: (id, data) => set((state) => ({
    projects: state.projects.map(p => p.id === id ? { ...p, ...data } : p)
  })),

  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter(p => p.id !== id)
  })),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, { ...task, id: Math.max(...state.tasks.map(t => t.id), 0) + 1 }]
  })),

  updateTask: (id, data) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t)
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== id)
  })),

  addRisk: (risk) => set((state) => ({
    risks: [...state.risks, { ...risk, id: Math.max(...state.risks.map(r => r.id), 0) + 1 }]
  })),

  updateRisk: (id, data) => set((state) => ({
    risks: state.risks.map(r => r.id === id ? { ...r, ...data } : r)
  })),

  deleteRisk: (id) => set((state) => ({
    risks: state.risks.filter(r => r.id !== id)
  })),

  addDocument: (doc) => set((state) => ({
    documents: [...state.documents, { ...doc, id: Math.max(...state.documents.map(d => d.id), 0) + 1 }]
  })),

  deleteDocument: (id) => set((state) => ({
    documents: state.documents.filter(d => d.id !== id)
  })),

  addExpense: (expense) => set((state) => ({
    expenses: [...state.expenses, { ...expense, id: Math.max(...state.expenses.map(e => e.id), 0) + 1 }]
  })),

  updateExpense: (id, data) => set((state) => ({
    expenses: state.expenses.map(e => e.id === id ? { ...e, ...data } : e)
  })),

  addMessage: (message) => set((state) => ({
    messages: [{ ...message, id: Math.max(...state.messages.map(m => m.id), 0) + 1 }, ...state.messages]
  })),
}));
