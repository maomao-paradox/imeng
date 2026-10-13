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
  is_public: boolean
  is_anonymous: boolean
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
  related_dreams_total: number
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
  truncated: boolean
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
  is_public?: boolean
  is_anonymous?: boolean
}

export interface PublicDream {
  id: number
  date: string
  summary: string
  mood: Mood[]
  keywords: string[]
  author_label: string
  is_anonymous: boolean
  reaction_count: number
  reacted_by_me: boolean
  is_mine: boolean
}

export interface PublicDreamPage {
  items: PublicDream[]
  total: number
  limit: number
  offset: number
}

export interface DreamReaction {
  reaction_count: number
  reacted_by_me: boolean
}

export interface DreamMatch extends PublicDream {
  common_keywords: string[]
  similarity: number
}

export interface DreamMatchPage {
  date: string
  total: number
  items: DreamMatch[]
}

export interface KeywordPayload {
  word: string
  weight: number
}
