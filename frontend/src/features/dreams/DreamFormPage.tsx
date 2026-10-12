import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createDream, getDream, updateDream } from '../../api/dreams'
import { MOODS } from '../../types/dream'
import type { DreamPayload, Mood } from '../../types/dream'

interface DreamDraft {
  content: string
  date: string
  mood: Mood[]
  clarity: number
}

const DRAFT_KEY = 'imeng-dream-draft'

function localDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readDraft(): Partial<DreamDraft> {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      const draft = parsed as Partial<DreamDraft>
      return {
        content: typeof draft.content === 'string' ? draft.content : '',
        date: typeof draft.date === 'string' ? draft.date : localDate(),
        mood: Array.isArray(draft.mood) ? draft.mood : [],
        clarity: typeof draft.clarity === 'number' ? draft.clarity : 3,
      }
    }
  } catch {
    localStorage.removeItem(DRAFT_KEY)
  }
  return {}
}

export function DreamFormPage() {
  const { id } = useParams()
  const dreamId = id ? Number(id) : null
  const editing = dreamId !== null && Number.isInteger(dreamId) && dreamId > 0
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [draft] = useState(readDraft)
  const [content, setContent] = useState(draft.content ?? '')
  const [date, setDate] = useState(searchParams.get('date') ?? draft.date ?? localDate())
  const [mood, setMood] = useState<Mood[]>(draft.mood ?? [])
  const [clarity, setClarity] = useState(draft.clarity ?? 3)
  const [loading, setLoading] = useState(editing)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing || dreamId === null) return
    void getDream(dreamId).then((dream) => {
      setContent(dream.content)
      setDate(dream.date)
      setMood(dream.mood)
      setClarity(dream.clarity)
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : '读取梦境失败')
    }).finally(() => setLoading(false))
  }, [editing, dreamId])

  useEffect(() => {
    if (!editing && !loading) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, date, mood, clarity }))
    }
  }, [editing, loading, content, date, mood, clarity])

  function toggleMood(selected: Mood): void {
    setMood((current) => current.includes(selected)
      ? current.filter((item) => item !== selected)
      : [...current, selected])
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setPending(true)
    setError(null)
    const payload: DreamPayload = { content, date, mood, clarity }
    try {
      const dream = editing && dreamId !== null
        ? await updateDream(dreamId, payload)
        : await createDream(payload)
      if (!editing) localStorage.removeItem(DRAFT_KEY)
      navigate(`/dream/${dream.id}`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败，请重试')
    } finally {
      setPending(false)
    }
  }

  if (loading) return <p className="py-20 text-center text-dream-muted">正在读取梦境…</p>

  return (
    <section className="mx-auto max-w-3xl py-10 sm:py-14">
      <NavLink className="text-sm text-dream-violet no-underline" to={editing ? `/dream/${id}` : '/dreams'}>
        ← 返回
      </NavLink>
      <p className="mb-3 mt-8 text-[11px] font-bold tracking-[0.2em] text-dream-violet">DREAM JOURNAL</p>
      <h1 className="font-dream-serif text-3xl font-medium sm:text-4xl">
        {editing ? '编辑梦境' : '记下这个梦'}
      </h1>
      <p className="mb-7 mt-3 text-sm text-dream-muted dark:text-dream-muted-dark">
        梦境内容仅你可见。草稿会自动保存在当前浏览器。
      </p>
      <form className="space-y-7" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm font-medium">
          梦境正文 <span className="text-red-500">*</span>
          <textarea
            className="mt-2 min-h-64 w-full resize-y rounded-2xl border border-dream-line bg-white p-4 text-sm leading-7 outline-none focus:border-dream-violet dark:border-dream-line-dark dark:bg-dream-card"
            maxLength={5000}
            minLength={1}
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="尽量记下画面、声音、感受和那些奇怪的细节…"
          />
          <span className="mt-1 block text-right text-xs text-dream-muted dark:text-dream-muted-dark">
            {content.length} / 5000
          </span>
        </label>
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            梦境日期
            <input
              className="mt-2 block w-full rounded-xl border border-dream-line bg-white px-4 py-3 outline-none focus:border-dream-violet dark:border-dream-line-dark dark:bg-dream-card"
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium">清晰度</legend>
            <div className="mt-2 flex items-center gap-2" aria-label="清晰度评分">
              {([1, 2, 3, 4, 5] as const).map((star) => (
                <button
                  key={star}
                  aria-label={`${star} 星`}
                  aria-pressed={clarity === star}
                  className={`text-2xl ${star <= clarity ? 'text-amber-400' : 'text-dream-line dark:text-dream-line-dark'}`}
                  type="button"
                  onClick={() => setClarity(star)}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-xs text-dream-muted">{clarity} / 5</span>
            </div>
          </fieldset>
        </div>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">情绪（可多选）</legend>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((item) => (
              <label
                key={item}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition ${mood.includes(item) ? 'border-dream-violet bg-dream-violet-soft text-dream-violet dark:bg-dream-violet-deep' : 'border-dream-line text-dream-muted dark:border-dream-line-dark dark:text-dream-muted-dark'}`}
              >
                <input
                  className="sr-only"
                  checked={mood.includes(item)}
                  type="checkbox"
                  onChange={() => toggleMood(item)}
                />
                {item}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button
            className="rounded-full bg-dream-violet px-6 py-3 text-sm text-white transition hover:bg-dream-violet-dark disabled:opacity-50 dark:text-dream-night"
            disabled={pending || !content.trim()}
            type="submit"
          >
            {pending ? '正在保存…' : editing ? '保存修改' : '保存梦境'}
          </button>
          {!editing && (
            <button
              className="text-sm text-dream-muted underline dark:text-dream-muted-dark"
              type="button"
              onClick={() => {
                localStorage.removeItem(DRAFT_KEY)
                setContent('')
                setMood([])
                setClarity(3)
                setDate(localDate())
              }}
            >
              清除草稿
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
