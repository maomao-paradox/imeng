import { apiJson } from './client'
import type { User } from '../types/dream'

interface Credentials {
  email: string
  password: string
}

interface Registration extends Credentials {
  nickname: string
}

export const getCurrentUser = (): Promise<User> => apiJson('/api/auth/me')

export const register = (payload: Registration): Promise<User> =>
  apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const login = (payload: Credentials): Promise<User> =>
  apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const logout = (): Promise<{ status: string }> =>
  apiJson('/api/auth/logout', { method: 'POST' })
