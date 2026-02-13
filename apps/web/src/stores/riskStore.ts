import { create } from 'zustand';
import { risksAPI } from '../lib/api';

interface Risk {
    id: string;
    title: string;
    description: string | null;
    category: string;
    probability: string;
    impact: string;
    risk_score: number;
    status: string;
    mitigation_plan: string | null;
    owner_id: string | null;
    owner_name: string | null;
    project_id: string;
    created_at: string;
    updated_at: string;
}

interface RiskStore {
    risks: Risk[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    isLoading: boolean;
    error: string | null;
    fetchRisks: (projectId: string, params?: any) => Promise<void>;
    createRisk: (projectId: string, data: any) => Promise<Risk>;
    updateRisk: (projectId: string, id: string, data: any) => Promise<void>;
    deleteRisk: (projectId: string, id: string) => Promise<void>;
    clearError: () => void;
}

export const useRiskStore = create<RiskStore>((set) => ({
    risks: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    isLoading: false,
    error: null,

    fetchRisks: async (projectId, params) => {
        set({ isLoading: true, error: null });
        try {
            const data = await risksAPI.list(projectId, params);
            set({
                risks: data.items,
                total: data.total,
                page: data.page,
                pageSize: data.page_size,
                totalPages: data.total_pages,
                isLoading: false,
            });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to fetch risks', isLoading: false });
        }
    },

    createRisk: async (projectId, data) => {
        set({ isLoading: true, error: null });
        try {
            const risk = await risksAPI.create(projectId, data);
            set((state) => ({
                risks: [risk, ...state.risks],
                total: state.total + 1,
                isLoading: false,
            }));
            return risk;
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to create risk', isLoading: false });
            throw err;
        }
    },

    updateRisk: async (projectId, id, data) => {
        set({ isLoading: true, error: null });
        try {
            const updated = await risksAPI.update(projectId, id, data);
            set((state) => ({
                risks: state.risks.map((r) => (r.id === id ? { ...r, ...updated } : r)),
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to update risk', isLoading: false });
        }
    },

    deleteRisk: async (projectId, id) => {
        set({ isLoading: true, error: null });
        try {
            await risksAPI.delete(projectId, id);
            set((state) => ({
                risks: state.risks.filter((r) => r.id !== id),
                total: state.total - 1,
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to delete risk', isLoading: false });
        }
    },

    clearError: () => set({ error: null }),
}));
