import { create } from 'zustand';
import { tasksAPI } from '../lib/api';

interface Task {
    id: string;
    organization_id: string;
    project_id: string;
    name: string;
    description?: string;
    status: string;
    priority: string;
    assignee_id?: string;
    assignee_name?: string;
    reporter_id?: string;
    reporter_name?: string;
    start_date?: string;
    due_date: string;
    estimated_hours?: number;
    actual_hours?: number;
    progress: number;
    dependencies: string[];
    created_at: string;
    updated_at: string;
}

interface TaskStore {
    tasks: Task[];
    currentTask: Task | null;
    isLoading: boolean;
    error: string | null;
    pagination: {
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
    };

    // Actions
    fetchTasks: (projectId: string, params?: {
        page?: number;
        page_size?: number;
        status?: string;
        priority?: string;
        assignee_id?: string;
        search?: string;
    }) => Promise<void>;
    fetchTask: (projectId: string, id: string) => Promise<void>;
    createTask: (projectId: string, data: any) => Promise<Task>;
    updateTask: (projectId: string, id: string, data: any) => Promise<Task>;
    updateTaskStatus: (projectId: string, id: string, status: string) => Promise<Task>;
    updateTaskProgress: (projectId: string, id: string, progress: number) => Promise<Task>;
    deleteTask: (projectId: string, id: string) => Promise<void>;
    clearError: () => void;
    setCurrentTask: (task: Task | null) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
    tasks: [],
    currentTask: null,
    isLoading: false,
    error: null,
    pagination: {
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
    },

    fetchTasks: async (projectId: string, params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const response = await tasksAPI.list(projectId, params);
            set({
                tasks: response.items,
                pagination: {
                    total: response.total,
                    page: response.page,
                    page_size: response.page_size,
                    total_pages: response.total_pages,
                },
                isLoading: false,
            });
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to fetch tasks';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    fetchTask: async (projectId: string, id: string) => {
        set({ isLoading: true, error: null });
        try {
            const task = await tasksAPI.get(projectId, id);
            set({ currentTask: task, isLoading: false });
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to fetch task';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    createTask: async (projectId: string, data: any) => {
        set({ isLoading: true, error: null });
        try {
            const task = await tasksAPI.create(projectId, data);

            // Add to tasks list
            set((state) => ({
                tasks: [task, ...state.tasks],
                isLoading: false,
            }));

            return task;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to create task';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    updateTask: async (projectId: string, id: string, data: any) => {
        set({ isLoading: true, error: null });
        try {
            const task = await tasksAPI.update(projectId, id, data);

            // Update in tasks list
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? task : t)),
                currentTask: state.currentTask?.id === id ? task : state.currentTask,
                isLoading: false,
            }));

            return task;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to update task';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    updateTaskStatus: async (projectId: string, id: string, status: string) => {
        set({ isLoading: true, error: null });
        try {
            const task = await tasksAPI.updateStatus(projectId, id, status);

            // Update in tasks list
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? task : t)),
                currentTask: state.currentTask?.id === id ? task : state.currentTask,
                isLoading: false,
            }));

            return task;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to update task status';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    updateTaskProgress: async (projectId: string, id: string, progress: number) => {
        set({ isLoading: true, error: null });
        try {
            const task = await tasksAPI.updateProgress(projectId, id, progress);

            // Update in tasks list
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? task : t)),
                currentTask: state.currentTask?.id === id ? task : state.currentTask,
                isLoading: false,
            }));

            return task;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to update task progress';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    deleteTask: async (projectId: string, id: string) => {
        set({ isLoading: true, error: null });
        try {
            await tasksAPI.delete(projectId, id);

            // Remove from tasks list
            set((state) => ({
                tasks: state.tasks.filter((t) => t.id !== id),
                currentTask: state.currentTask?.id === id ? null : state.currentTask,
                isLoading: false,
            }));
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to delete task';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
    setCurrentTask: (task) => set({ currentTask: task }),
}));
