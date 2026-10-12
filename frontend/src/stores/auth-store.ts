import { create } from 'zustand'
import { ApiError } from '../api/client'
import { getCurrentUser, login, logout, register } from '../api/auth'
import type { User } from '../types/dream'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, nickname: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  initialize: async () => {
    set({ loading: true, error: null })
    try {
      const user = await getCurrentUser()
      set({ user, loading: false })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        set({ user: null, loading: false })
        return
      }
      set({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : '无法验证登录状态',
      })
    }
  },
  signIn: async (email, password) => {
    const user = await login({ email, password })
    set({ user, error: null })
  },
  signUp: async (email, password, nickname) => {
    const user = await register({ email, password, nickname })
    set({ user, error: null })
  },
  signOut: async () => {
    await logout()
    set({ user: null, error: null })
  },
}))
