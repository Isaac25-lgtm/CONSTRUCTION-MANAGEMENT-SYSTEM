import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../lib/api';

interface Organization {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  org_role: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone_number?: string;
  is_active: boolean;
  organizations: Organization[];
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  selectedOrgId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedOrg: (orgId: string) => void;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      selectedOrgId: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(email, password);
          const { access_token, user } = response;

          // Store access token
          localStorage.setItem('access_token', access_token);

          // Auto-select first organization if available
          const selectedOrgId = user.organizations?.[0]?.organization_id || null;
          if (selectedOrgId) {
            localStorage.setItem('selected_org_id', selectedOrgId);
          }

          set({
            user,
            accessToken: access_token,
            selectedOrgId,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear local storage
          localStorage.removeItem('access_token');
          localStorage.removeItem('selected_org_id');

          set({
            user: null,
            accessToken: null,
            selectedOrgId: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      setSelectedOrg: (orgId: string) => {
        localStorage.setItem('selected_org_id', orgId);
        set({ selectedOrgId: orgId });
      },

      getCurrentUser: async () => {
        set({ isLoading: true, error: null });
        try {
          const user = await authAPI.getMe();

          // Restore selected org from localStorage
          const selectedOrgId = localStorage.getItem('selected_org_id') ||
            user.organizations?.[0]?.organization_id ||
            null;

          set({
            user,
            isAuthenticated: true,
            selectedOrgId,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Failed to get user info';
          set({ error: errorMessage, isLoading: false, isAuthenticated: false });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist these fields
        accessToken: state.accessToken,
        selectedOrgId: state.selectedOrgId,
      }),
    }
  )
);
