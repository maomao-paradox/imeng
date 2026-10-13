import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteDream, getDream, getDreamNetwork, replaceKeywords } from '../../api/dreams'
import { DreamNetwork } from '../../components/DreamNetwork'
import type { Dream, DreamNetwork as DreamNetworkData, KeywordPayload } from '../../types/dream'

export function DreamDetailPage() {
  const { id } = useParams()
  const dreamId = Number(id)
  const navigate = useNavigate()
  const [dream, setDream] = useState<Dream | null>(null)
  const [network, setNetwork] = useState<DreamNetworkData | null>(null)
  const [keywords, setKeywords] = useState<KeywordPayload[]>([])
  const [newWord, setNewWord] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingKeywords, setSavingKeywords] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isInteger(dreamId) || dreamId < 1) {
      return
    }
    try {
      const [loadedDream, loadedNetwork] = await Promise.all([
        getDream(dreamId),
        getDreamNetwork(dreamId),
      ])
      setDream(loadedDream)
      setNetwork(loadedNetwork)
      setKeywords(loadedDream.keywords.map(({ word, weight }) => ({ word, weight })))
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取梦境失败')
    } finally {
      setLoading(false)
    }
  }, [dreamId])

  useEffect(() => {
    if (!Number.isInteger(dreamId) || dreamId < 1) {
      return
    }
    let active = true
    Promise.all([getDream(dreamId), getDreamNetwork(dreamId)])
      .then(([loadedDream, loadedNetwork]) => {
        if (!active) return
        setDream(loadedDream)
        setNetwork(loadedNetwork)
        setKeywords(loadedDream.keywords.map(({ word, weight }) => ({ word, weight })))
        setError(null)
        setLoading(false)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : '读取梦境失败')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [dreamId])

  function addKeyword(): void {
    const word = newWord.trim()
    if (!word || keywords.some((item) => item.word.toLocaleLowerCase() === word.toLocaleLowerCase())) return
    setKeywords((items) => [...items, { word, weight: 0.5 }])
    setNewWord('')
  }

  async function saveKeywords(): Promise<void> {
    setSavingKeywords(true)
    setError(null)
    try {
      await replaceKeywords(dreamId, keywords)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存关键词失败')
    } finally {
      setSavingKeywords(false)
    }
  }

  async function removeDream(): Promise<void> {
    if (!window.confirm('确定永久删除这条梦境记录吗？')) return
    try {
      await deleteDream(dreamId)
      navigate('/dreams')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败')
    }
  }

  if (!Number.isInteger(dreamId) || dreamId < 1) {
    return <p className="py-20 text-center text-sm text-red-500">梦境编号无效</p>
  }
  if (loading) return <p className="py-20 text-center text-sm text-dream-muted">正在读取梦境…</p>
  if (error && !dream) return <p className="py-20 text-center text-sm text-red-500" role="alert">{error}</p>
  if (!dream || !network) return null

  return (
    <article className="mx-auto max-w-4xl py-10 sm:py-14">
      <Link className="text-sm text-dream-violet no-underline" to="/dreams">← 梦境列表</Link>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-dream-muted dark:text-dream-muted-dark">{dream.date}</p>
          <h1 className="mt-2 font-dream-serif text-3xl font-medium sm:text-4xl">梦境记录</h1>
        </div>
        <div className="flex gap-4">
          <Link className="text-sm text-dream-violet no-underline" to={`/dream/${dream.id}/edit`}>编辑</Link>
          <button className="text-sm text-red-500" type="button" onClick={() => void removeDream()}>删除</button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs ${dream.is_public ? 'bg-dream-violet-soft text-dream-violet dark:bg-dream-violet-deep' : 'border border-dream-line text-dream-muted dark:border-dream-line-dark dark:text-dream-muted-dark'}`}>
          {dream.is_public ? `公开${dream.is_anonymous ? ' · 匿名' : ' · 昵称展示'}` : '仅自己可见'}
        </span>
        {dream.mood.map((mood) => (
          <span className="rounded-full bg-dream-violet-soft px-3 py-1 text-xs text-dream-violet dark:bg-dream-violet-deep" key={mood}>{mood}</span>
        ))}
        <span className="text-xs text-dream-muted dark:text-dream-muted-dark">清晰度 {dream.clarity} / 5</span>
      </div>
      <p className="my-8 whitespace-pre-wrap rounded-2xl border border-dream-line bg-white p-5 text-sm leading-8 dark:border-dream-line-dark dark:bg-dream-card sm:p-7">
        {dream.content}
      </p>

      <div className="mb-5">
        <h2 className="font-dream-serif text-2xl">梦境词网络</h2>
        <p className="mt-2 text-xs text-dream-muted dark:text-dream-muted-dark">
          {dream.keyword_extraction_status === 'unconfigured'
            ? '关键词提炼服务尚未配置；你可以手动维护关键词。'
            : dream.keyword_extraction_status === 'failed'
              ? '关键词提炼暂时失败；你可以重试或手动维护关键词。'
              : dream.keyword_extraction_status === 'pending'
                ? '正在准备关键词提炼；你也可以先手动维护关键词。'
                : '关键词已提炼完成；你可以手动调整。'}{' '}
          关联线表示同一梦境内的弱关联。
        </p>
      </div>
      <DreamNetwork
        key={network.nodes.map((node) => `${node.id}:${node.word}:${node.weight}`).join('|')}
        network={network}
      />

      <section className="mt-8 rounded-2xl border border-dream-line bg-white p-5 dark:border-dream-line-dark dark:bg-dream-card">
        <h2 className="text-sm font-semibold">编辑关键词</h2>
        <div className="mt-4 space-y-3">
          {keywords.map((keyword, index) => (
            <div className="grid grid-cols-[1fr_6rem_auto] items-center gap-2" key={`${keyword.word}-${index}`}>
              <input
                aria-label="关键词"
                className="min-w-0 rounded-lg border border-dream-line bg-transparent px-3 py-2 text-sm dark:border-dream-line-dark"
                maxLength={80}
                value={keyword.word}
                onChange={(event) => setKeywords((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, word: event.target.value } : item))}
              />
              <input
                aria-label={`${keyword.word}权重`}
                className="rounded-lg border border-dream-line bg-transparent px-3 py-2 text-sm dark:border-dream-line-dark"
                max={1}
                min={0}
                step={0.05}
                type="number"
                value={keyword.weight}
                onChange={(event) => setKeywords((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, weight: Number(event.target.value) } : item))}
              />
              <button aria-label={`删除关键词${keyword.word}`} className="px-2 text-red-500" type="button" onClick={() => setKeywords((items) => items.filter((_, itemIndex) => itemIndex !== index))}>删除</button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            aria-label="新关键词"
            className="min-w-0 flex-1 rounded-lg border border-dream-line bg-transparent px-3 py-2 text-sm dark:border-dream-line-dark"
            maxLength={80}
            placeholder="添加关键词"
            value={newWord}
            onChange={(event) => setNewWord(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addKeyword()
              }
            }}
          />
          <button className="rounded-lg border border-dream-line px-3 py-2 text-sm dark:border-dream-line-dark" type="button" onClick={addKeyword}>添加</button>
        </div>
        {error && <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>}
        <button
          className="mt-4 rounded-full bg-dream-violet px-5 py-2.5 text-sm text-white disabled:opacity-50 dark:text-dream-night"
          disabled={savingKeywords || keywords.some((item) => !item.word.trim() || item.weight < 0 || item.weight > 1)}
          type="button"
          onClick={() => void saveKeywords()}
        >
          {savingKeywords ? '正在保存…' : '保存关键词'}
        </button>
      </section>
    </article>
  )
}
