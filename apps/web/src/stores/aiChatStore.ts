import { create } from 'zustand';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatStore {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  selectedProjectId: number | null;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setLoading: (loading: boolean) => void;
  setSelectedProject: (projectId: number | null) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearMessages: () => void;
}

export const useAIChatStore = create<AIChatStore>((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  selectedProjectId: null,

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setLoading: (loading) => set({ isLoading: loading }),
  setSelectedProject: (projectId) => set({ selectedProjectId: projectId }),

  addMessage: (role, content) => set((state) => ({
    messages: [
      ...state.messages,
      {
        id: Date.now(),
        role,
        content,
        timestamp: new Date()
      }
    ]
  })),

  clearMessages: () => set({ messages: [] })
}));
