import { create } from 'zustand'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

interface AuthStore {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  login: (token, user) => set({ accessToken: token, user, isAuthenticated: true }),
  logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
}))
