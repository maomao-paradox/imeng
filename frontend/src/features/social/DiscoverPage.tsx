import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { addResonance, listPublicDreams, removeResonance } from '../../api/social'
import type { PublicDream } from '../../types/dream'
import { MOODS } from '../../types/dream'

const PAGE_SIZE = 20

export function DiscoverPage() {
  const [keywordDraft, setKeywordDraft] = useState('')
  const [moodDraft, setMoodDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [mood, setMood] = useState('')
  const [dreams, setDreams] = useState<PublicDream[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reactionPending, setReactionPending] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    listPublicDreams({ q: keyword, mood, limit: PAGE_SIZE, offset })
      .then((result) => {
        if (!active) return
        setDreams(result.items)
        setTotal(result.total)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : '读取梦境广场失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [keyword, mood, offset])

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setLoading(true)
    setOffset(0)
    setKeyword(keywordDraft.trim())
    setMood(moodDraft)
  }

  async function toggleResonance(dream: PublicDream): Promise<void> {
    setReactionPending(dream.id)
    setError(null)
    try {
      const state = dream.reacted_by_me
        ? await removeResonance(dream.id)
        : await addResonance(dream.id)
      setDreams((items) => items.map((item) => item.id === dream.id
        ? { ...item, ...state }
        : item))
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : '共鸣操作失败')
    } finally {
      setReactionPending(null)
    }
  }

  return (
    <section className="mx-auto max-w-4xl py-10 sm:py-14">
      <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-dream-violet">DREAM COMMONS</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-dream-serif text-3xl font-medium sm:text-4xl">梦境广场</h1>
          <p className="mt-3 text-sm text-dream-muted dark:text-dream-muted-dark">
            这里只展示作者主动公开的梦境。私密记录永远不会出现在这里。
          </p>
        </div>
        <Link className="text-sm text-dream-violet no-underline" to="/matches">今日梦境匹配 →</Link>
      </div>
      <form
        className="mt-7 grid gap-3 rounded-2xl border border-dream-line bg-white p-4 dark:border-dream-line-dark dark:bg-dream-card sm:grid-cols-[1fr_12rem_auto]"
        onSubmit={applyFilters}
      >
        <label className="sr-only" htmlFor="commons-keyword">按关键词筛选</label>
        <input
          className="min-w-0 rounded-xl border border-dream-line bg-transparent px-3 py-2 text-sm outline-none focus:border-dream-violet dark:border-dream-line-dark"
          id="commons-keyword"
          maxLength={80}
          placeholder="输入关键词"
          value={keywordDraft}
          onChange={(event) => setKeywordDraft(event.target.value)}
        />
        <label className="sr-only" htmlFor="commons-mood">按情绪筛选</label>
        <select
          className="rounded-xl border border-dream-line bg-transparent px-3 py-2 text-sm dark:border-dream-line-dark dark:bg-dream-card"
          id="commons-mood"
          value={moodDraft}
          onChange={(event) => setMoodDraft(event.target.value)}
        >
          <option value="">所有情绪</option>
          {MOODS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="rounded-xl bg-dream-violet px-4 py-2 text-sm text-white dark:text-dream-night" type="submit">
          筛选
        </button>
      </form>
      {error && <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>}
      <p className="mb-3 mt-5 text-xs text-dream-muted dark:text-dream-muted-dark">公开梦境 {total} 条</p>
      {loading ? (
        <p className="py-12 text-center text-sm text-dream-muted">正在读取公开梦境…</p>
      ) : dreams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dream-line px-5 py-12 text-center dark:border-dream-line-dark">
          <p className="text-sm text-dream-muted dark:text-dream-muted-dark">还没有符合条件的公开梦境。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dreams.map((dream) => (
            <article
              className="rounded-2xl border border-dream-line bg-white p-5 dark:border-dream-line-dark dark:bg-dream-card"
              key={dream.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-dream-muted dark:text-dream-muted-dark">
                  <time dateTime={dream.date}>{dream.date}</time>
                  <span aria-hidden="true">·</span>
                  <span>{dream.author_label}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dream.mood.map((item) => (
                    <span className="rounded-full bg-dream-violet-soft px-2 py-0.5 text-[11px] text-dream-violet dark:bg-dream-violet-deep" key={item}>{item}</span>
                  ))}
                </div>
              </div>
              <p className="my-4 whitespace-pre-wrap text-sm leading-7">{dream.summary}</p>
              {dream.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {dream.keywords.map((word) => (
                    <span className="rounded-full border border-dream-line px-2 py-1 text-[11px] text-dream-muted dark:border-dream-line-dark dark:text-dream-muted-dark" key={word}>
                      {word}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  aria-pressed={dream.reacted_by_me}
                  className={`rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50 ${dream.reacted_by_me ? 'border-dream-violet bg-dream-violet-soft text-dream-violet dark:bg-dream-violet-deep' : 'border-dream-line text-dream-muted dark:border-dream-line-dark dark:text-dream-muted-dark'}`}
                  disabled={dream.is_mine || reactionPending === dream.id}
                  type="button"
                  onClick={() => void toggleResonance(dream)}
                >
                  {dream.is_mine
                    ? `自己的梦境 · ${dream.reaction_count}`
                    : reactionPending === dream.id
                      ? '正在更新…'
                      : `共鸣 · ${dream.reaction_count}`}
                </button>
              </div>
            </article>
          ))}
          {total > PAGE_SIZE && (
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
