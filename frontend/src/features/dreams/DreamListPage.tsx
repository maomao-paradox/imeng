import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { listDreams } from '../../api/dreams'
import type { Dream, Mood } from '../../types/dream'
import { MOODS } from '../../types/dream'

interface DreamListPageProps {
  compact?: boolean
  todayOnly?: boolean
}

interface Filters {
  q: string
  mood: string
  keyword: string
}

const PAGE_SIZE = 50
const initialFilters: Filters = { q: '', mood: '', keyword: '' }

export function DreamListPage({ compact = false, todayOnly = false }: DreamListPageProps) {
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [dreams, setDreams] = useState<Dream[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toLocaleDateString('sv-SE')

  useEffect(() => {
    let active = true
    listDreams({
        ...filters,
        ...(todayOnly ? { date_from: today, date_to: today } : {}),
        limit: compact ? 5 : PAGE_SIZE,
        offset: compact ? 0 : offset,
      }).then((result) => {
        if (!active) return
        setDreams(result.items)
        setTotal(result.total)
        setError(null)
      }).catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : '读取梦境失败')
      }).finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters, todayOnly, today, compact, offset])

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setLoading(true)
    setOffset(0)
    setFilters(draftFilters)
  }

  return (
    <section className={compact ? 'mt-14 text-left' : 'mx-auto max-w-4xl py-10 sm:py-14'}>
      {!compact && (
        <>
          <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-dream-violet">YOUR JOURNAL</p>
          <h1 className="font-dream-serif text-3xl font-medium sm:text-4xl">梦境记录</h1>
        </>
      )}
      <form className="mb-6 mt-6 grid gap-3 rounded-2xl border border-dream-line bg-white p-4 dark:border-dream-line-dark dark:bg-dream-card sm:grid-cols-[1fr_auto_auto_auto]" onSubmit={applyFilters}>
        <label className="sr-only" htmlFor={`dream-search-${compact}`}>搜索梦境</label>
        <input
          className="min-w-0 rounded-xl border border-dream-line bg-transparent px-3 py-2 text-sm outline-none focus:border-dream-violet dark:border-dream-line-dark"
          id={`dream-search-${compact}`}
          placeholder="搜索梦境正文…"
          value={draftFilters.q}
          onChange={(event) => setDraftFilters({ ...draftFilters, q: event.target.value })}
        />
        <label className="sr-only" htmlFor={`dream-mood-${compact}`}>按情绪筛选</label>
        <select
          className="rounded-xl border border-dream-line bg-transparent px-3 py-2 text-sm dark:border-dream-line-dark dark:bg-dream-card"
          id={`dream-mood-${compact}`}
          value={draftFilters.mood}
          onChange={(event) => setDraftFilters({ ...draftFilters, mood: event.target.value })}
        >
          <option value="">所有情绪</option>
          {MOODS.map((mood) => <option key={mood} value={mood}>{mood}</option>)}
        </select>
        <label className="sr-only" htmlFor={`dream-keyword-${compact}`}>按关键词筛选</label>
        <input
          className="rounded-xl border border-dream-line bg-transparent px-3 py-2 text-sm outline-none focus:border-dream-violet dark:border-dream-line-dark"
          id={`dream-keyword-${compact}`}
          placeholder="关键词"
          value={draftFilters.keyword}
          onChange={(event) => setDraftFilters({ ...draftFilters, keyword: event.target.value })}
        />
        <button className="rounded-xl bg-dream-violet px-4 py-2 text-sm text-white dark:text-dream-night" type="submit">筛选</button>
      </form>
      {!compact && <p className="mb-4 text-xs text-dream-muted dark:text-dream-muted-dark">共 {total} 条梦境</p>}
      {error && <p className="mb-4 text-sm text-red-500" role="alert">{error}</p>}
      {loading ? (
        <p className="py-8 text-center text-sm text-dream-muted">正在读取梦境…</p>
      ) : dreams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dream-line px-5 py-10 text-center dark:border-dream-line-dark">
          <p className="text-sm text-dream-muted dark:text-dream-muted-dark">
            {todayOnly ? '今天还没有梦境记录。' : filters.q || filters.mood || filters.keyword ? '没有找到符合条件的梦境。' : '还没有梦境记录。'}
          </p>
          <Link className="mt-3 inline-block text-sm text-dream-violet" to="/record">
            记录一个梦
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {dreams.map((dream) => <DreamCard key={dream.id} dream={dream} />)}
          {compact && total > dreams.length && (
            <Link className="block py-2 text-center text-sm text-dream-violet" to="/dreams">
              查看全部 {total} 条梦境 →
            </Link>
          )}
          {!compact && total > PAGE_SIZE && (
            <div className="flex items-center justify-between py-3 text-sm">
              <button
                className="text-dream-violet disabled:text-dream-muted"
                disabled={offset === 0}
                type="button"
                onClick={() => {
                  setLoading(true)
                  setOffset((value) => Math.max(0, value - PAGE_SIZE))
                }}
              >
                ← 上一页
              </button>
              <span className="text-xs text-dream-muted dark:text-dream-muted-dark">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
              </span>
              <button
                className="text-dream-violet disabled:text-dream-muted"
                disabled={offset + PAGE_SIZE >= total}
                type="button"
                onClick={() => {
                  setLoading(true)
                  setOffset((value) => value + PAGE_SIZE)
                }}
              >
                下一页 →
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function DreamCard({ dream }: { dream: Dream }) {
  return (
    <Link
      className="block rounded-2xl border border-dream-line bg-white p-5 text-inherit no-underline transition hover:border-dream-violet/50 dark:border-dream-line-dark dark:bg-dream-card"
      to={`/dream/${dream.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <time className="text-xs text-dream-muted dark:text-dream-muted-dark" dateTime={dream.date}>{dream.date}</time>
          <span className="rounded-full border border-dream-line px-2 py-0.5 text-[10px] text-dream-muted dark:border-dream-line-dark dark:text-dream-muted-dark">
            {dream.is_public ? `公开${dream.is_anonymous ? ' · 匿名' : ''}` : '仅自己可见'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {dream.mood.map((mood: Mood) => (
            <span className="rounded-full bg-dream-violet-soft px-2 py-0.5 text-[11px] text-dream-violet dark:bg-dream-violet-deep" key={mood}>{mood}</span>
          ))}
        </div>
      </div>
      <p className="my-3 whitespace-pre-wrap text-sm leading-6">
        {dream.content.length > 80 ? `${dream.content.slice(0, 80)}…` : dream.content}
      </p>
      {dream.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dream.keywords.map((keyword) => (
            <span className="rounded-full border border-dream-line px-2 py-1 text-[11px] text-dream-muted dark:border-dream-line-dark dark:text-dream-muted-dark" key={keyword.id}>
              {keyword.word}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
