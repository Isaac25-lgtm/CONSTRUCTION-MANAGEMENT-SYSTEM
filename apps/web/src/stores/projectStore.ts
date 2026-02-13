import { create } from 'zustand';
import { projectsAPI } from '../lib/api';

interface Project {
    id: string;
    organization_id: string;
    project_name: string;
    description?: string;
    status: string;
    priority: string;
    manager_id: string;
    manager_name?: string;
    start_date: string;
    end_date: string;
    total_budget: number;
    location?: string;
    client_name?: string;
    contract_type?: string;
    created_at: string;
    updated_at: string;
}

interface ProjectStore {
    projects: Project[];
    currentProject: Project | null;
    isLoading: boolean;
    error: string | null;
    pagination: {
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
    };

    // Actions
    fetchProjects: (params?: {
        page?: number;
        page_size?: number;
        status?: string;
        priority?: string;
        search?: string;
    }) => Promise<void>;
    fetchProject: (id: string) => Promise<void>;
    createProject: (data: any) => Promise<Project>;
    updateProject: (id: string, data: any) => Promise<Project>;
    deleteProject: (id: string) => Promise<void>;
    clearError: () => void;
    setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,
    pagination: {
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
    },

    fetchProjects: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const response = await projectsAPI.list(params);
            set({
                projects: response.items,
                pagination: {
                    total: response.total,
                    page: response.page,
                    page_size: response.page_size,
                    total_pages: response.total_pages,
                },
                isLoading: false,
            });
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to fetch projects';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    fetchProject: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const project = await projectsAPI.get(id);
            set({ currentProject: project, isLoading: false });
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to fetch project';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    createProject: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
            const project = await projectsAPI.create(data);

            // Add to projects list
            set((state) => ({
                projects: [project, ...state.projects],
                isLoading: false,
            }));

            return project;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to create project';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    updateProject: async (id: string, data: any) => {
        set({ isLoading: true, error: null });
        try {
            const project = await projectsAPI.update(id, data);

            // Update in projects list
            set((state) => ({
                projects: state.projects.map((p) => (p.id === id ? project : p)),
                currentProject: state.currentProject?.id === id ? project : state.currentProject,
                isLoading: false,
            }));

            return project;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to update project';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    deleteProject: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            await projectsAPI.delete(id);

            // Remove from projects list
            set((state) => ({
                projects: state.projects.filter((p) => p.id !== id),
                currentProject: state.currentProject?.id === id ? null : state.currentProject,
                isLoading: false,
            }));
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to delete project';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
    setCurrentProject: (project) => set({ currentProject: project }),
}));
