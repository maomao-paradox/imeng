import { apiJson } from './client'
import type {
  DreamMatchPage,
  DreamReaction,
  PublicDreamPage,
} from '../types/dream'

export interface PublicDreamFilters {
  q?: string
  mood?: string
  limit?: number
  offset?: number
}

function queryString(filters: PublicDreamFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const listPublicDreams = (
  filters: PublicDreamFilters = {},
): Promise<PublicDreamPage> =>
  apiJson(`/api/social/dreams${queryString(filters)}`)

export const getTodayMatches = (): Promise<DreamMatchPage> =>
  apiJson('/api/social/matches/today')

export const addResonance = (dreamId: number): Promise<DreamReaction> =>
  apiJson(`/api/social/dreams/${dreamId}/resonance`, { method: 'PUT' })

export const removeResonance = (dreamId: number): Promise<DreamReaction> =>
  apiJson(`/api/social/dreams/${dreamId}/resonance`, { method: 'DELETE' })
