import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'Administrator' | 'Project_Manager' | 'Site_Supervisor' | 'Team_Member' | 'Stakeholder';

export interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  permissions: {
    canCreateProjects: boolean;
    canEditProjects: boolean;
    canDeleteProjects: boolean;
    canManageUsers: boolean;
    canViewBudget: boolean;
    canApproveBudget: boolean;
    canManageRisks: boolean;
    canViewReports: boolean;
    canDeleteRecords: boolean;
  };
}

interface UserStore {
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  
  login: (email: string, password: string, guestUser?: any) => boolean;
  logout: () => void;
  
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: number, data: Partial<User>) => void;
  deleteUser: (id: number) => void;
  
  changePassword: (userId: number, newPassword: string) => void;
}

const defaultPermissions = {
  Administrator: {
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canManageUsers: true,
    canViewBudget: true,
    canApproveBudget: true,
    canManageRisks: true,
    canViewReports: true,
    canDeleteRecords: true,
  },
  Project_Manager: {
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: false,
    canManageUsers: false,
    canViewBudget: true,
    canApproveBudget: true,
    canManageRisks: true,
    canViewReports: true,
    canDeleteRecords: false,
  },
  Site_Supervisor: {
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canManageUsers: false,
    canViewBudget: false,
    canApproveBudget: false,
    canManageRisks: true,
    canViewReports: false,
    canDeleteRecords: false,
  },
  Team_Member: {
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canManageUsers: false,
    canViewBudget: false,
    canApproveBudget: false,
    canManageRisks: false,
    canViewReports: false,
    canDeleteRecords: false,
  },
  Stakeholder: {
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canManageUsers: false,
    canViewBudget: true,
    canApproveBudget: false,
    canManageRisks: false,
    canViewReports: true,
    canDeleteRecords: false,
  },
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: [
        {
          id: 1,
          email: 'admin@buildpro.ug',
          password: 'admin123',
          firstName: 'John',
          lastName: 'Okello',
          role: 'Administrator',
          isActive: true,
          createdAt: '2025-01-01',
          permissions: defaultPermissions.Administrator,
        },
        {
          id: 2,
          email: 'sarah@buildpro.ug',
          password: 'sarah123',
          firstName: 'Sarah',
          lastName: 'Nambi',
          role: 'Project_Manager',
          isActive: true,
          createdAt: '2025-01-05',
          permissions: defaultPermissions.Project_Manager,
        },
        {
          id: 3,
          email: 'peter@buildpro.ug',
          password: 'peter123',
          firstName: 'Peter',
          lastName: 'Wasswa',
          role: 'Site_Supervisor',
          isActive: true,
          createdAt: '2025-01-10',
          permissions: defaultPermissions.Site_Supervisor,
        },
      ],
      currentUser: null,
      isAuthenticated: false,

      login: (email, password, guestUser) => {
        // OPEN ACCESS MODE: Accept any email/password combination
        let user = get().users.find(u => u.email === email && u.isActive);
        
        // If user doesn't exist and guestUser provided, add them
        if (!user && guestUser) {
          const newUser = {
            ...guestUser,
            password: password,
            permissions: defaultPermissions.Administrator,
            lastLogin: new Date().toISOString(),
          };
          set((state) => ({
            users: [...state.users, newUser]
          }));
          user = newUser;
        }
        
        // If user exists, accept any password (open access mode)
        if (user) {
          set({ 
            currentUser: { ...user, lastLogin: new Date().toISOString() }, 
            isAuthenticated: true 
          });
          // Update last login
          set((state) => ({
            users: state.users.map(u => u.id === user!.id ? { ...u, lastLogin: new Date().toISOString() } : u)
          }));
          return true;
        }
        
        return false;
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },

      addUser: (userData) => set((state) => ({
        users: [...state.users, {
          ...userData,
          id: Math.max(...state.users.map(u => u.id), 0) + 1,
          createdAt: new Date().toISOString().split('T')[0],
          permissions: defaultPermissions[userData.role],
        }]
      })),

      updateUser: (id, data) => set((state) => ({
        users: state.users.map(u => u.id === id ? { 
          ...u, 
          ...data,
          permissions: data.role ? defaultPermissions[data.role] : u.permissions,
        } : u),
        currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...data } : state.currentUser,
      })),

      deleteUser: (id) => set((state) => ({
        users: state.users.filter(u => u.id !== id)
      })),

      changePassword: (userId, newPassword) => set((state) => ({
        users: state.users.map(u => u.id === userId ? { ...u, password: newPassword } : u)
      })),
    }),
    {
      name: 'buildpro-users',
    }
  )
);

export { defaultPermissions };
