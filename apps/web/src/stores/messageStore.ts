import { create } from 'zustand';
import { messagesAPI } from '../lib/api';

interface Message {
    id: string;
    organization_id: string;
    project_id: string | null;
    task_id: string | null;
    sender_id: string | null;
    sender_name: string | null;
    content: string;
    message_type: string;
    is_read: boolean;
    attachments: any[];
    created_at: string;
    updated_at: string;
}

interface MessageStore {
    messages: Message[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    isLoading: boolean;
    error: string | null;
    unreadCount: number;
    fetchMessages: (params?: any) => Promise<void>;
    sendMessage: (data: any) => Promise<Message>;
    markAsRead: (id: string) => Promise<void>;
    deleteMessage: (id: string) => Promise<void>;
    clearError: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
    messages: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    isLoading: false,
    error: null,
    unreadCount: 0,

    fetchMessages: async (params) => {
        set({ isLoading: true, error: null });
        try {
            const data = await messagesAPI.list(params);
            const unreadCount = data.items.filter((m: Message) => !m.is_read).length;
            set({
                messages: data.items,
                total: data.total,
                page: data.page,
                pageSize: data.page_size,
                totalPages: data.total_pages,
                unreadCount,
                isLoading: false,
            });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to fetch messages', isLoading: false });
        }
    },

    sendMessage: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const message = await messagesAPI.create(data);
            set((state) => ({
                messages: [message, ...state.messages],
                total: state.total + 1,
                isLoading: false,
            }));
            return message;
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to send message', isLoading: false });
            throw err;
        }
    },

    markAsRead: async (id) => {
        try {
            await messagesAPI.markAsRead(id);
            set((state) => ({
                messages: state.messages.map((m) =>
                    m.id === id ? { ...m, is_read: true } : m
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to mark as read' });
        }
    },

    deleteMessage: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await messagesAPI.delete(id);
            set((state) => ({
                messages: state.messages.filter((m) => m.id !== id),
                total: state.total - 1,
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to delete message', isLoading: false });
        }
    },

    clearError: () => set({ error: null }),
}));
