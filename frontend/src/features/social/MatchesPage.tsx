import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addResonance, getTodayMatches, removeResonance } from '../../api/social'
import type { DreamMatch, DreamMatchPage } from '../../types/dream'

export function MatchesPage() {
  const [result, setResult] = useState<DreamMatchPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reactionPending, setReactionPending] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    getTodayMatches()
      .then((matches) => {
        if (active) {
          setResult(matches)
          setError(null)
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : '读取梦境匹配失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function toggleResonance(dream: DreamMatch): Promise<void> {
    setReactionPending(dream.id)
    setError(null)
    try {
      const state = dream.reacted_by_me
        ? await removeResonance(dream.id)
        : await addResonance(dream.id)
      setResult((current) => current ? {
        ...current,
        items: current.items.map((item) => item.id === dream.id ? { ...item, ...state } : item),
      } : current)
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : '共鸣操作失败')
    } finally {
      setReactionPending(null)
    }
  }

  return (
    <section className="mx-auto max-w-4xl py-10 sm:py-14">
      <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-dream-violet">TODAY&apos;S CONNECTIONS</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-dream-serif text-3xl font-medium sm:text-4xl">今日梦境匹配</h1>
          <p className="mt-3 text-sm text-dream-muted dark:text-dream-muted-dark">
            根据你今天梦境中的关键词，寻找其他人主动公开的相似梦境。
          </p>
        </div>
        <Link className="text-sm text-dream-violet no-underline" to="/discover">逛逛梦境广场 →</Link>
      </div>
      {result && <p className="mt-5 text-xs text-dream-muted dark:text-dream-muted-dark">{result.date} · 找到 {result.total} 条匹配</p>}
      {error && <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>}
      {loading ? (
        <p className="py-12 text-center text-sm text-dream-muted">正在寻找相似的梦境…</p>
      ) : (result?.items.length ?? 0) === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-dream-line px-5 py-12 text-center dark:border-dream-line-dark">
          <p className="text-sm text-dream-muted dark:text-dream-muted-dark">
            {result?.total === 0
              ? '今天还没有找到匹配。记录梦境并补充关键词，或稍后再来看看。'
              : '暂时没有匹配结果。'}
          </p>
          <Link className="mt-4 inline-block text-sm text-dream-violet" to="/record">记录今天的梦</Link>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {result?.items.map((dream) => (
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
                <span className="rounded-full bg-dream-violet-soft px-3 py-1 text-xs text-dream-violet dark:bg-dream-violet-deep">
                  相似度 {Math.round(dream.similarity * 100)}%
                </span>
              </div>
              <p className="my-4 whitespace-pre-wrap text-sm leading-7">{dream.summary}</p>
              <p className="text-xs text-dream-muted dark:text-dream-muted-dark">
                共同关键词：{dream.common_keywords.join('、')}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {dream.mood.map((item) => (
                  <span className="rounded-full bg-dream-violet-soft px-2 py-0.5 text-[11px] text-dream-violet dark:bg-dream-violet-deep" key={item}>{item}</span>
                ))}
                {dream.keywords.map((word) => (
                  <span className="rounded-full border border-dream-line px-2 py-1 text-[11px] text-dream-muted dark:border-dream-line-dark dark:text-dream-muted-dark" key={word}>{word}</span>
                ))}
              </div>
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
        </div>
      )}
    </section>
  )
}
