import { create } from 'zustand';
import { notificationsAPI } from '../lib/api';

export interface NotificationItem {
    id: string;
    notification_type: string;
    title: string;
    body: string;
    project_id?: string | null;
    data?: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

interface NotificationStore {
    items: NotificationItem[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearError: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
    items: [],
    unreadCount: 0,
    isLoading: false,
    error: null,

    fetchNotifications: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await notificationsAPI.list({
                page_size: 20,
            });

            const items: NotificationItem[] = data.items || [];
            const unreadCount = data.unread_count ?? items.filter((item) => !item.is_read).length;

            set({
                items,
                unreadCount,
                isLoading: false,
            });
        } catch (err: any) {
            set({
                error: err.response?.data?.detail || err.message || 'Failed to load notifications',
                isLoading: false,
            });
        }
    },

    markAsRead: async (id: string) => {
        try {
            await notificationsAPI.markRead(id);
            set((state) => ({
                items: state.items.map((item) =>
                    item.id === id ? { ...item, is_read: true } : item
                ),
                unreadCount: Math.max(
                    0,
                    state.items.filter((item) => !item.is_read && item.id !== id).length
                ),
            }));
        } catch (err: any) {
            set({
                error: err.response?.data?.detail || err.message || 'Failed to update notification',
            });
        }
    },

    markAllAsRead: async () => {
        try {
            await notificationsAPI.readAll();
            set((state) => ({
                items: state.items.map((item) => ({ ...item, is_read: true })),
                unreadCount: 0,
            }));
        } catch (err: any) {
            set({
                error: err.response?.data?.detail || err.message || 'Failed to mark all notifications as read',
            });
        }
    },

    clearError: () => set({ error: null }),
}));
