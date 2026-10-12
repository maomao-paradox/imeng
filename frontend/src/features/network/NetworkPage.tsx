import { useEffect, useState } from 'react'
import { getAllDreamsNetwork } from '../../api/dreams'
import { DreamNetwork } from '../../components/DreamNetwork'
import type { DreamNetwork as DreamNetworkData } from '../../types/dream'

export function NetworkPage() {
  const [network, setNetwork] = useState<DreamNetworkData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getAllDreamsNetwork()
      .then((result) => {
        if (active) setNetwork(result)
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : '读取梦境词网络失败')
        }
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="mx-auto max-w-5xl py-10 sm:py-14">
      <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-dream-violet">YOUR DREAMS</p>
      <h1 className="font-dream-serif text-3xl font-medium sm:text-4xl">梦境词网络</h1>
      <p className="mb-6 mt-3 text-sm leading-7 text-dream-muted dark:text-dream-muted-dark">
        汇集所有梦境中的关键词。同一个梦里的词会相连，出现越频繁的词节点越大；点击关键词查看包含它的梦境。
      </p>
      {error && <p className="mb-4 text-sm text-red-500" role="alert">{error}</p>}
      {!network ? (
        error
          ? null
          : <p className="py-12 text-center text-sm text-dream-muted dark:text-dream-muted-dark">正在读取梦境词网络…</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-dream-muted dark:text-dream-muted-dark">
            {network.nodes.length} 个关键词 · {network.dream_count} 条梦境
          </p>
          <DreamNetwork
            emptyMessage="还没有关键词。添加梦境关键词后，它们会显示在这里。"
            network={network}
            sizeByOccurrences
          />
        </>
      )}
    </section>
  )
}
