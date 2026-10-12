import { apiJson } from './client'
import type { CalendarOverview } from '../types/dream'

export const getCalendar = (year: number, month: number): Promise<CalendarOverview> =>
  apiJson(`/api/calendar?year=${year}&month=${month}`)
