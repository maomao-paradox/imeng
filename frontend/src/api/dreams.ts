import { apiJson } from './client'
import type {
  Dream,
  DreamNetwork,
  DreamPage,
  DreamPayload,
  Keyword,
  KeywordPayload,
} from '../types/dream'

export interface DreamFilters {
  q?: string
  mood?: string
  keyword?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

function queryString(filters: DreamFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const listDreams = (filters: DreamFilters = {}): Promise<DreamPage> =>
  apiJson(`/api/dreams${queryString(filters)}`)

export const getDream = (id: number): Promise<Dream> => apiJson(`/api/dreams/${id}`)

export const createDream = (payload: DreamPayload): Promise<Dream> =>
  apiJson('/api/dreams', { method: 'POST', body: JSON.stringify(payload) })

export const updateDream = (id: number, payload: Partial<DreamPayload>): Promise<Dream> =>
  apiJson(`/api/dreams/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })

export const deleteDream = (id: number): Promise<{ deleted: boolean }> =>
  apiJson(`/api/dreams/${id}`, { method: 'DELETE' })

export const replaceKeywords = (id: number, keywords: KeywordPayload[]): Promise<Keyword[]> =>
  apiJson(`/api/dreams/${id}/keywords`, {
    method: 'PUT',
    body: JSON.stringify({ keywords }),
  })

export const getDreamNetwork = (id: number): Promise<DreamNetwork> =>
  apiJson(`/api/dreams/${id}/network`)

export const getAllDreamsNetwork = (): Promise<DreamNetwork> =>
  apiJson('/api/dreams/network')
