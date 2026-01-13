import { create } from 'zustand'

interface ThemeStore {
  isDark: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: true, // Dark mode as default
  toggleTheme: () => set((state) => {
    const newIsDark = !state.isDark
    if (newIsDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    return { isDark: newIsDark }
  }),
  setTheme: (isDark) => set(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    return { isDark }
  }),
}))
