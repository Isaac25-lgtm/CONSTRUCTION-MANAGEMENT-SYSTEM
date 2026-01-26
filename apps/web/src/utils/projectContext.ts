import { Project, Task, Risk, Expense, Milestone } from '../stores/dataStore';

export interface ProjectContext {
  currentProject: {
    name: string;
    budget: number;
    spent: number;
    startDate: string;
    endDate: string;
    progress: number;
    status: string;
    priority: string;
    location?: string;
    description?: string;
    tasks: Array<{
      name: string;
      status: string;
      progress: number;
      dueDate: string;
      assignee: string;
      priority: string;
    }>;
    risks: Array<{
      description: string;
      probability: string;
      impact: string;
      status: string;
      mitigation: string;
    }>;
    expenses: Array<{
      description: string;
      amount: number;
      category: string;
      status: string;
    }>;
    milestones: Array<{
      name: string;
      date: string;
      status: string;
    }>;
  } | null;
  allProjects: Array<{
    name: string;
    status: string;
    progress: number;
    budget: number;
    spent: number;
  }>;
  summary: {
    totalProjects: number;
    totalBudget: number;
    totalSpent: number;
    averageProgress: number;
    activeRisks: number;
    pendingTasks: number;
  };
}

export function formatProjectContext(
  projects: Project[],
  tasks: Task[],
  risks: Risk[],
  expenses: Expense[],
  milestones: Milestone[],
  selectedProjectId?: number
): ProjectContext {
  const selectedProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)
    : projects[0];

  const projectTasks = selectedProject
    ? tasks.filter(t => t.projectId === selectedProject.id)
    : [];

  const projectRisks = selectedProject
    ? risks.filter(r => r.projectId === selectedProject.id)
    : [];

  const projectExpenses = selectedProject
    ? expenses.filter(e => e.projectId === selectedProject.id)
    : [];

  const projectMilestones = selectedProject
    ? milestones.filter(m => m.projectId === selectedProject.id)
    : [];

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const averageProgress = projects.length > 0
    ? projects.reduce((sum, p) => sum + p.progress, 0) / projects.length
    : 0;

  return {
    currentProject: selectedProject ? {
      name: selectedProject.name,
      budget: selectedProject.budget,
      spent: selectedProject.spent,
      startDate: selectedProject.startDate,
      endDate: selectedProject.endDate,
      progress: selectedProject.progress,
      status: selectedProject.status,
      priority: selectedProject.priority,
      location: selectedProject.location,
      description: selectedProject.description,
      tasks: projectTasks.map(t => ({
        name: t.name,
        status: t.status,
        progress: t.progress,
        dueDate: t.dueDate,
        assignee: t.assignee,
        priority: t.priority
      })),
      risks: projectRisks.map(r => ({
        description: r.description,
        probability: r.probability,
        impact: r.impact,
        status: r.status,
        mitigation: r.mitigation
      })),
      expenses: projectExpenses.map(e => ({
        description: e.description,
        amount: e.amount,
        category: e.category,
        status: e.status
      })),
      milestones: projectMilestones.map(m => ({
        name: m.name,
        date: m.date,
        status: m.status
      }))
    } : null,
    allProjects: projects.map(p => ({
      name: p.name,
      status: p.status,
      progress: p.progress,
      budget: p.budget,
      spent: p.spent
    })),
    summary: {
      totalProjects: projects.length,
      totalBudget,
      totalSpent,
      averageProgress: Math.round(averageProgress),
      activeRisks: risks.filter(r => r.status === 'Active').length,
      pendingTasks: tasks.filter(t => t.status === 'Pending').length
    }
  };
}
