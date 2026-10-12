export const MOODS = ['平静', '喜悦', '恐惧', '焦虑', '悲伤', '愤怒', '困惑', '奇妙'] as const

export type Mood = (typeof MOODS)[number]

export interface User {
  id: number
  email: string
  nickname: string
  created_at: string
}

export interface Keyword {
  id: number
  word: string
  weight: number
}

export interface Dream {
  id: number
  content: string
  date: string
  mood: Mood[]
  clarity: number
  created_at: string
  keywords: Keyword[]
  keyword_extraction_status: 'pending' | 'complete' | 'failed' | 'unconfigured'
}

export interface DreamPage {
  items: Dream[]
  total: number
  limit: number
  offset: number
}

export interface NetworkNode {
  id: number
  word: string
  weight: number
  occurrences: number
  related_dreams: Array<{
    id: number
    date: string
    summary: string
  }>
}

export interface NetworkEdge {
  source: number
  target: number
  strength: number
}

export interface DreamNetwork {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  dream_count: number
}

export interface CalendarDay {
  date: string
  dream_count: number
  dominant_mood: Mood | null
}

export interface CalendarOverview {
  year: number
  month: number
  days: CalendarDay[]
  recorded_days: number
  dream_count: number
  top_keywords: string[]
}

export interface DreamPayload {
  content: string
  date: string
  mood: Mood[]
  clarity: number
}

export interface KeywordPayload {
  word: string
  weight: number
}
