import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuditAction = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'VIEW' 
  | 'APPROVE' 
  | 'REJECT'
  | 'EXPORT'
  | 'PASSWORD_CHANGE';

export type EntityType = 
  | 'Project' 
  | 'Task' 
  | 'Document' 
  | 'Expense' 
  | 'Risk' 
  | 'User' 
  | 'Message'
  | 'Milestone'
  | 'System';

export interface AuditLog {
  id: number;
  userId: string | number;
  userName: string;
  userEmail: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: number;
  entityName?: string;
  details?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

interface AuditStore {
  logs: AuditLog[];
  
  addLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  clearOldLogs: (daysToKeep: number) => void;
  getLogsByUser: (userId: string | number) => AuditLog[];
  getLogsByAction: (action: AuditAction) => AuditLog[];
  getLogsByEntity: (entityType: EntityType) => AuditLog[];
}

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      logs: [
        {
          id: 1,
          userId: 1,
          userName: 'John Okello',
          userEmail: 'admin@example.com',
          action: 'LOGIN',
          entityType: 'System',
          details: 'User logged into the system',
          timestamp: '2025-01-13T08:30:00Z',
        },
        {
          id: 2,
          userId: 1,
          userName: 'John Okello',
          userEmail: 'admin@example.com',
          action: 'CREATE',
          entityType: 'Project',
          entityId: 1,
          entityName: 'Kampala Office Complex',
          details: 'Created new project',
          timestamp: '2025-01-13T08:35:00Z',
        },
        {
          id: 3,
          userId: 2,
          userName: 'Sarah Nambi',
          userEmail: 'pm@example.com',
          action: 'UPDATE',
          entityType: 'Task',
          entityId: 2,
          entityName: 'Steel Framework Installation',
          details: 'Updated task progress to 68%',
          oldValues: { progress: 50 },
          newValues: { progress: 68 },
          timestamp: '2025-01-13T09:15:00Z',
        },
        {
          id: 4,
          userId: 1,
          userName: 'John Okello',
          userEmail: 'admin@example.com',
          action: 'APPROVE',
          entityType: 'Expense',
          entityId: 1,
          entityName: 'Steel reinforcement bars',
          details: 'Approved expense of UGX 45,000,000',
          timestamp: '2025-01-13T10:00:00Z',
        },
        {
          id: 5,
          userId: 3,
          userName: 'Peter Wasswa',
          userEmail: 'supervisor@example.com',
          action: 'CREATE',
          entityType: 'Risk',
          entityId: 3,
          entityName: 'Labor shortage during peak season',
          details: 'Logged new risk',
          timestamp: '2025-01-13T11:30:00Z',
        },
      ],

      addLog: (logData) => set((state) => ({
        logs: [{
          ...logData,
          id: Math.max(...state.logs.map(l => l.id), 0) + 1,
          timestamp: new Date().toISOString(),
        }, ...state.logs]
      })),

      clearOldLogs: (daysToKeep) => set((state) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        return {
          logs: state.logs.filter(log => new Date(log.timestamp) > cutoffDate)
        };
      }),

      getLogsByUser: (userId) => get().logs.filter(log => log.userId === userId),
      
      getLogsByAction: (action) => get().logs.filter(log => log.action === action),
      
      getLogsByEntity: (entityType) => get().logs.filter(log => log.entityType === entityType),
    }),
    {
      name: 'buildpro-audit',
    }
  )
);


