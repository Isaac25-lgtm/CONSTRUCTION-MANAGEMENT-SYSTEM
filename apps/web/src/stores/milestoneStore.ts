import { create } from 'zustand';
import { milestonesAPI } from '../lib/api';

interface Milestone {
    id: string;
    name: string;
    description: string | null;
    target_date: string;
    actual_date: string | null;
    completion_percentage: number;
    status: string;
    project_id: string;
    created_at: string;
    updated_at: string;
}

interface MilestoneStore {
    milestones: Milestone[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    isLoading: boolean;
    error: string | null;
    fetchMilestones: (projectId: string, params?: any) => Promise<void>;
    createMilestone: (projectId: string, data: any) => Promise<Milestone>;
    updateMilestone: (projectId: string, id: string, data: any) => Promise<void>;
    deleteMilestone: (projectId: string, id: string) => Promise<void>;
    clearError: () => void;
}

export const useMilestoneStore = create<MilestoneStore>((set) => ({
    milestones: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    isLoading: false,
    error: null,

    fetchMilestones: async (projectId, params) => {
        set({ isLoading: true, error: null });
        try {
            const data = await milestonesAPI.list(projectId, params);
            set({
                milestones: data.items,
                total: data.total,
                page: data.page,
                pageSize: data.page_size,
                totalPages: data.total_pages,
                isLoading: false,
            });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to fetch milestones', isLoading: false });
        }
    },

    createMilestone: async (projectId, data) => {
        set({ isLoading: true, error: null });
        try {
            const milestone = await milestonesAPI.create(projectId, data);
            set((state) => ({
                milestones: [milestone, ...state.milestones],
                total: state.total + 1,
                isLoading: false,
            }));
            return milestone;
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to create milestone', isLoading: false });
            throw err;
        }
    },

    updateMilestone: async (projectId, id, data) => {
        set({ isLoading: true, error: null });
        try {
            const updated = await milestonesAPI.update(projectId, id, data);
            set((state) => ({
                milestones: state.milestones.map((m) => (m.id === id ? { ...m, ...updated } : m)),
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to update milestone', isLoading: false });
        }
    },

    deleteMilestone: async (projectId, id) => {
        set({ isLoading: true, error: null });
        try {
            await milestonesAPI.delete(projectId, id);
            set((state) => ({
                milestones: state.milestones.filter((m) => m.id !== id),
                total: state.total - 1,
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to delete milestone', isLoading: false });
        }
    },

    clearError: () => set({ error: null }),
}));
