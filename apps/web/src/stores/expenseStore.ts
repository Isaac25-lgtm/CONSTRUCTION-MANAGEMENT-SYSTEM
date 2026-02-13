import { create } from 'zustand';
import { expensesAPI } from '../lib/api';

interface Expense {
    id: string;
    organization_id: string;
    project_id: string;
    description: string;
    category: string;
    amount: number;
    vendor?: string;
    expense_date: string;
    status: string;
    logged_by_id?: string;
    logged_by_name?: string;
    approved_by_id?: string;
    approved_by_name?: string;
    receipt_document_id?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

interface ExpenseStore {
    expenses: Expense[];
    currentExpense: Expense | null;
    isLoading: boolean;
    error: string | null;
    pagination: {
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
    };

    // Actions
    fetchExpenses: (projectId: string, params?: {
        page?: number;
        page_size?: number;
        status?: string;
        category?: string;
        from_date?: string;
        to_date?: string;
    }) => Promise<void>;
    fetchExpense: (projectId: string, id: string) => Promise<void>;
    createExpense: (projectId: string, data: any) => Promise<Expense>;
    updateExpense: (projectId: string, id: string, data: any) => Promise<Expense>;
    approveExpense: (projectId: string, id: string, notes?: string) => Promise<Expense>;
    rejectExpense: (projectId: string, id: string, notes: string) => Promise<Expense>;
    deleteExpense: (projectId: string, id: string) => Promise<void>;
    clearError: () => void;
    setCurrentExpense: (expense: Expense | null) => void;
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
    expenses: [],
    currentExpense: null,
    isLoading: false,
    error: null,
    pagination: {
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
    },

    fetchExpenses: async (projectId: string, params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const response = await expensesAPI.list(projectId, params);
            set({
                expenses: response.items,
                pagination: {
                    total: response.total,
                    page: response.page,
                    page_size: response.page_size,
                    total_pages: response.total_pages,
                },
                isLoading: false,
            });
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to fetch expenses';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    fetchExpense: async (projectId: string, id: string) => {
        set({ isLoading: true, error: null });
        try {
            const expense = await expensesAPI.get(projectId, id);
            set({ currentExpense: expense, isLoading: false });
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to fetch expense';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    createExpense: async (projectId: string, data: any) => {
        set({ isLoading: true, error: null });
        try {
            const expense = await expensesAPI.create(projectId, data);

            // Add to expenses list
            set((state) => ({
                expenses: [expense, ...state.expenses],
                isLoading: false,
            }));

            return expense;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to create expense';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    updateExpense: async (projectId: string, id: string, data: any) => {
        set({ isLoading: true, error: null });
        try {
            const expense = await expensesAPI.update(projectId, id, data);

            // Update in expenses list
            set((state) => ({
                expenses: state.expenses.map((e) => (e.id === id ? expense : e)),
                currentExpense: state.currentExpense?.id === id ? expense : state.currentExpense,
                isLoading: false,
            }));

            return expense;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to update expense';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    approveExpense: async (projectId: string, id: string, notes?: string) => {
        set({ isLoading: true, error: null });
        try {
            const expense = await expensesAPI.approve(projectId, id, notes);

            // Update in expenses list
            set((state) => ({
                expenses: state.expenses.map((e) => (e.id === id ? expense : e)),
                currentExpense: state.currentExpense?.id === id ? expense : state.currentExpense,
                isLoading: false,
            }));

            return expense;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to approve expense';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    rejectExpense: async (projectId: string, id: string, notes: string) => {
        set({ isLoading: true, error: null });
        try {
            const expense = await expensesAPI.reject(projectId, id, notes);

            // Update in expenses list
            set((state) => ({
                expenses: state.expenses.map((e) => (e.id === id ? expense : e)),
                currentExpense: state.currentExpense?.id === id ? expense : state.currentExpense,
                isLoading: false,
            }));

            return expense;
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to reject expense';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    deleteExpense: async (projectId: string, id: string) => {
        set({ isLoading: true, error: null });
        try {
            await expensesAPI.delete(projectId, id);

            // Remove from expenses list
            set((state) => ({
                expenses: state.expenses.filter((e) => e.id !== id),
                currentExpense: state.currentExpense?.id === id ? null : state.currentExpense,
                isLoading: false,
            }));
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Failed to delete expense';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
    setCurrentExpense: (expense) => set({ currentExpense: expense }),
}));
