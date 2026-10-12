import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCalendar } from '../../api/calendar'
import { listDreams } from '../../api/dreams'
import type { CalendarOverview, Dream } from '../../types/dream'

interface CalendarCursor {
  year: number
  month: number
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function shiftMonth(cursor: CalendarCursor, amount: number): CalendarCursor {
  const date = new Date(cursor.year, cursor.month - 1 + amount, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

function selectedDateFor(cursor: CalendarCursor): string {
  const now = new Date()
  if (cursor.year === now.getFullYear() && cursor.month === now.getMonth() + 1) {
    return isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
  }
  return isoDate(cursor.year, cursor.month, 1)
}

export function CalendarPage() {
  const now = new Date()
  const [cursor, setCursor] = useState<CalendarCursor>({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [overview, setOverview] = useState<CalendarOverview | null>(null)
  const [dreams, setDreams] = useState<Dream[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const firstWeekday = new Date(cursor.year, cursor.month - 1, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate()
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7
  const dayRecords = useMemo(() => new Map(overview?.days.map((day) => [day.date, day]) ?? []), [overview])

  useEffect(() => {
    let active = true
    const start = isoDate(cursor.year, cursor.month, 1)
    const end = isoDate(cursor.year, cursor.month, daysInMonth)
    Promise.all([
      getCalendar(cursor.year, cursor.month),
      listDreams({ date_from: start, date_to: end, limit: 100 }),
    ]).then(([monthOverview, monthDreams]) => {
      if (!active) return
      setOverview(monthOverview)
      setDreams(monthDreams.items)
      setError(null)
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : '读取日历失败')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [cursor, daysInMonth])

  const selectedDreams = dreams.filter((dream) => dream.date === selectedDate)

  function moveMonth(amount: number): void {
    const next = shiftMonth(cursor, amount)
    setCursor(next)
    setSelectedDate(selectedDateFor(next))
    setLoading(true)
  }

  return (
    <section className="mx-auto max-w-5xl py-10 sm:py-14">
      <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-dream-violet">YOUR JOURNAL</p>
      <h1 className="font-dream-serif text-3xl font-medium sm:text-4xl">梦境日历</h1>
      {error && <p className="mt-5 text-sm text-red-500" role="alert">{error}</p>}
      <div className="mt-7 grid gap-5 sm:grid-cols-3">
        <StatCard label="本月记录天数" value={overview?.recorded_days ?? 0} />
        <StatCard label="本月梦境数" value={overview?.dream_count ?? 0} />
        <div className="rounded-2xl border border-dream-line bg-white p-4 dark:border-dream-line-dark dark:bg-dream-card">
          <p className="text-xs text-dream-muted dark:text-dream-muted-dark">高频关键词</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(overview?.top_keywords ?? []).length === 0
              ? <span className="text-sm">—</span>
              : overview?.top_keywords.map((word) => <span className="rounded-full bg-dream-violet-soft px-2 py-1 text-xs text-dream-violet dark:bg-dream-violet-deep" key={word}>{word}</span>)}
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div className="rounded-2xl border border-dream-line bg-white p-4 dark:border-dream-line-dark dark:bg-dream-card sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <button
              aria-label="上个月"
              className="rounded-full border border-dream-line px-3 py-2 text-sm dark:border-dream-line-dark"
              type="button"
              onClick={() => moveMonth(-1)}
            >
              ←
            </button>
            <div className="text-center">
              <h2 className="font-dream-serif text-xl">{cursor.year} 年 {cursor.month} 月</h2>
              <button
                className="mt-1 text-xs text-dream-violet"
                type="button"
                onClick={() => {
                  const today = new Date()
                  setCursor({ year: today.getFullYear(), month: today.getMonth() + 1 })
                  setSelectedDate(isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate()))
                  setLoading(true)
                }}
              >
                回到今天
              </button>
            </div>
            <button
              aria-label="下个月"
              className="rounded-full border border-dream-line px-3 py-2 text-sm dark:border-dream-line-dark"
              type="button"
              onClick={() => moveMonth(1)}
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-dream-muted dark:text-dream-muted-dark">
            {['日', '一', '二', '三', '四', '五', '六'].map((weekday) => <div className="pb-2" key={weekday}>{weekday}</div>)}
            {Array.from({ length: cellCount }, (_, cell) => {
              const day = cell - firstWeekday + 1
              if (day < 1 || day > daysInMonth) return <div aria-hidden="true" className="min-h-14" key={`empty-${cell}`} />
              const date = isoDate(cursor.year, cursor.month, day)
              const record = dayRecords.get(date)
              const selected = selectedDate === date
              return (
                <button
                  aria-label={`${date}${record ? `，${record.dream_count} 条记录` : ''}`}
                  aria-pressed={selected}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-sm transition ${selected ? 'bg-dream-violet text-white dark:text-dream-night' : 'hover:bg-dream-violet-soft dark:hover:bg-dream-violet-deep'}`}
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{day}</span>
                  {record && (
                    <span className={`mt-1 flex items-center gap-1 text-[9px] ${selected ? 'text-white/90 dark:text-dream-night' : 'text-dream-violet'}`}>
                      <span className="size-1.5 rounded-full bg-current" />{record.dream_count > 1 ? record.dream_count : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {loading && <p className="mt-3 text-center text-xs text-dream-muted">正在读取日历…</p>}
        </div>

        <aside className="rounded-2xl border border-dream-line bg-white p-5 dark:border-dream-line-dark dark:bg-dream-card">
          <h2 className="font-dream-serif text-xl">{selectedDate}</h2>
          {selectedDreams.length === 0 ? (
            <div className="mt-5">
              <p className="text-sm text-dream-muted dark:text-dream-muted-dark">这天没有记录梦境。</p>
              <Link className="mt-3 inline-block text-sm text-dream-violet no-underline" to={`/record?date=${selectedDate}`}>记录这一天的梦 →</Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {selectedDreams.map((dream) => (
                <Link className="block rounded-xl border border-dream-line p-3 text-inherit no-underline dark:border-dream-line-dark" key={dream.id} to={`/dream/${dream.id}`}>
                  <p className="text-sm leading-6">{dream.content.slice(0, 80)}{dream.content.length > 80 ? '…' : ''}</p>
                  <p className="mt-2 text-xs text-dream-muted dark:text-dream-muted-dark">{dream.mood.join(' · ') || '未标记情绪'}</p>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-dream-line bg-white p-4 dark:border-dream-line-dark dark:bg-dream-card">
      <p className="text-xs text-dream-muted dark:text-dream-muted-dark">{label}</p>
      <p className="mt-2 font-dream-serif text-2xl">{value}</p>
    </div>
  )
}
