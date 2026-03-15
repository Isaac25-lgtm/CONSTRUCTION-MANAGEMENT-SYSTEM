/**
 * UI state store using Zustand.
 *
 * sidebarOpen controls the mobile drawer only.
 * Desktop sidebar visibility is handled purely by CSS (lg:translate-x-0).
 */
import { create } from 'zustand'

interface Toast {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  toast: Toast | null
  showToast: (message: string, type?: Toast['type']) => void
  clearToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
  // Default closed -- mobile drawer starts hidden. Desktop uses CSS lg:translate-x-0.
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}))
