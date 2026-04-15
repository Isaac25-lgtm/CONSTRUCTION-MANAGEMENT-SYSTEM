/**
 * UI state store using Zustand.
 *
 * sidebarOpen controls the mobile drawer only.
 * Desktop sidebar visibility is handled purely by CSS (lg:translate-x-0).
 */
import { create } from 'zustand'
import {
  getStoredTheme,
  persistTheme,
  type ThemeMode,
} from '../lib/theme'

interface Toast {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void

  toast: Toast | null
  showToast: (message: string, type?: Toast['type']) => void
  clearToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
  // Default closed -- mobile drawer starts hidden. Desktop uses CSS lg:translate-x-0.
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  theme: getStoredTheme(),
  setTheme: (theme) => {
    persistTheme(theme)
    set({ theme })
  },
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark'
    persistTheme(nextTheme)
    return { theme: nextTheme }
  }),

  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}))
