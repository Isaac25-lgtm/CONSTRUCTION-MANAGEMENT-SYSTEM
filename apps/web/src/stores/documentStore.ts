import { create } from 'zustand';
import { documentsAPI } from '../lib/api';

interface Document {
    id: string;
    name: string;
    file_size: number;
    mime_type: string;
    document_type: string;
    description: string | null;
    storage_key: string;
    file_url: string;
    uploaded_by_id: string | null;
    uploaded_by_name: string | null;
    project_id: string;
    created_at: string;
    updated_at: string;
}

interface DocumentStore {
    documents: Document[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    isLoading: boolean;
    error: string | null;
    fetchDocuments: (projectId: string, params?: any) => Promise<void>;
    uploadDocument: (projectId: string, file: File, documentType?: string, description?: string) => Promise<Document>;
    downloadDocument: (projectId: string, id: string, filename: string) => Promise<void>;
    updateDocument: (projectId: string, id: string, data: any) => Promise<void>;
    deleteDocument: (projectId: string, id: string) => Promise<void>;
    clearError: () => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
    documents: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    isLoading: false,
    error: null,

    fetchDocuments: async (projectId, params) => {
        set({ isLoading: true, error: null });
        try {
            const data = await documentsAPI.list(projectId, params);
            set({
                documents: data.items,
                total: data.total,
                page: data.page,
                pageSize: data.page_size,
                totalPages: data.total_pages,
                isLoading: false,
            });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to fetch documents', isLoading: false });
        }
    },

    uploadDocument: async (projectId, file, documentType, description) => {
        set({ isLoading: true, error: null });
        try {
            const doc = await documentsAPI.upload(projectId, file, documentType, description);
            set((state) => ({
                documents: [doc, ...state.documents],
                total: state.total + 1,
                isLoading: false,
            }));
            return doc;
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to upload document', isLoading: false });
            throw err;
        }
    },

    downloadDocument: async (projectId, id, filename) => {
        try {
            const blob = await documentsAPI.download(projectId, id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to download document' });
        }
    },

    updateDocument: async (projectId, id, data) => {
        set({ isLoading: true, error: null });
        try {
            const updated = await documentsAPI.update(projectId, id, data);
            set((state) => ({
                documents: state.documents.map((d) => (d.id === id ? { ...d, ...updated } : d)),
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to update document', isLoading: false });
        }
    },

    deleteDocument: async (projectId, id) => {
        set({ isLoading: true, error: null });
        try {
            await documentsAPI.delete(projectId, id);
            set((state) => ({
                documents: state.documents.filter((d) => d.id !== id),
                total: state.total - 1,
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to delete document', isLoading: false });
        }
    },

    clearError: () => set({ error: null }),
}));
