import { useEffect, useRef, useState } from 'react'
import type cytoscape from 'cytoscape'
import { Link } from 'react-router-dom'
import { useUiStore } from '../stores/ui-store'
import type { DreamNetwork as DreamNetworkData } from '../types/dream'

interface DreamNetworkProps {
  network: DreamNetworkData
  sizeByOccurrences?: boolean
  emptyMessage?: string
}

export function DreamNetwork({
  network,
  sizeByOccurrences = false,
  emptyMessage = '还没有关键词。你可以在下方手动添加，词网络会立即更新。',
}: DreamNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<cytoscape.Core | null>(null)
  const theme = useUiStore((state) => state.theme)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const selectedNode = network.nodes.find((node) => node.id === selectedId)
  const maxOccurrences = network.nodes.reduce(
    (maximum, node) => Math.max(maximum, node.occurrences),
    1,
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || network.nodes.length === 0) return
    let active = true
    let graph: cytoscape.Core | null = null
    const dark = theme === 'dark'

    setRenderError(null)
    void import('cytoscape').then(({ default: createCytoscape }) => {
      if (!active || !container.isConnected) return

      const nodes = network.nodes.map((node) => ({
        group: 'nodes' as const,
        data: {
          id: String(node.id),
          word: node.word,
          occurrences: node.occurrences,
          size: Math.max(
            sizeByOccurrences
              ? 30 + 40 * Math.sqrt(node.occurrences / maxOccurrences)
              : 28 + node.weight * 28,
            Math.min(128, 24 + Array.from(node.word).length * 12),
          ),
          textWidth: Math.min(116, Math.max(32, 12 + Array.from(node.word).length * 12)),
        },
      }))
      const edges = network.edges.map((edge) => ({
        group: 'edges' as const,
        data: {
          id: `${edge.source}-${edge.target}`,
          source: String(edge.source),
          target: String(edge.target),
          strength: edge.strength,
        },
      }))
      graph = createCytoscape({
        container,
        elements: [...nodes, ...edges],
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(word)',
              width: 'data(size)',
              height: 'data(size)',
              'background-color': dark ? '#8278aa' : '#a49acb',
              'border-color': dark ? '#3c374d' : '#e9e6f0',
              'border-width': 2,
              color: '#ffffff',
              'font-size': 11,
              'font-weight': 600,
              'text-max-width': 'data(textWidth)',
              'text-wrap': 'wrap',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-margin-y': 0,
              'min-zoomed-font-size': 8,
            },
          },
          {
            selector: 'edge',
            style: {
              width: 'mapData(strength, 0, 1, 1, 5)',
              'line-color': dark ? '#5e5675' : '#bdb5d5',
              'line-opacity': 0.65,
              'curve-style': 'bezier',
              'target-arrow-shape': 'none',
            },
          },
          {
            selector: '.active',
            style: {
              'background-color': dark ? '#a49acb' : '#7166a8',
              'border-color': dark ? '#e9e6f0' : '#504675',
              'border-width': 3,
              'line-color': dark ? '#b3a9e0' : '#8d80c4',
              'line-opacity': 1,
              'z-index': 2,
            },
          },
          {
            selector: '.dimmed',
            style: {
              opacity: 0.2,
              'text-opacity': 0.35,
            },
          },
        ],
        layout: {
          name: 'cose',
          animate: false,
          fit: true,
          padding: 48,
          nodeRepulsion: 5000,
          idealEdgeLength: 120,
          edgeElasticity: 100,
          gravity: 0.25,
          numIter: 300,
        },
        minZoom: 0.4,
        maxZoom: 3,
        boxSelectionEnabled: false,
        autoungrabify: false,
      })
      graphRef.current = graph
      graph.on('tap', 'node', (event) => {
        const id = Number(event.target.id())
        setSelectedId((current) => current === id ? null : id)
      })
      graph.on('tap', (event) => {
        if (event.target === graph) setSelectedId(null)
      })
    }).catch((error: unknown) => {
      if (active) {
        setRenderError(error instanceof Error ? error.message : '词网络渲染失败')
      }
    })

    return () => {
      active = false
      graph?.destroy()
      if (graphRef.current === graph) graphRef.current = null
    }
  }, [maxOccurrences, network, sizeByOccurrences, theme])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.elements().removeClass('active dimmed')
    if (selectedId === null) return

    graph.elements().addClass('dimmed')
    const neighborhood = graph.getElementById(String(selectedId)).closedNeighborhood()
    neighborhood.removeClass('dimmed')
    neighborhood.addClass('active')
  }, [selectedId])

  function zoomIn(): void {
    const graph = graphRef.current
    if (graph) graph.zoom(Math.min(graph.maxZoom(), graph.zoom() * 1.2))
  }

  function zoomOut(): void {
    const graph = graphRef.current
    if (graph) graph.zoom(Math.max(graph.minZoom(), graph.zoom() / 1.2))
  }

  function fitGraph(): void {
    graphRef.current?.fit(undefined, 48)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-dream-line bg-white dark:border-dream-line-dark dark:bg-dream-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dream-line px-4 py-3 dark:border-dream-line-dark">
        <p className="text-xs text-dream-muted dark:text-dream-muted-dark">
          拖拽节点 · 拖动画布 · 滚轮缩放 · 点击关键词查看关联梦境
        </p>
        <div className="flex gap-2">
          <button aria-label="放大" className="rounded-lg border border-dream-line px-2 py-1 dark:border-dream-line-dark" type="button" onClick={zoomIn}>+</button>
          <button aria-label="缩小" className="rounded-lg border border-dream-line px-2 py-1 dark:border-dream-line-dark" type="button" onClick={zoomOut}>−</button>
          <button aria-label="适应画布" className="rounded-lg border border-dream-line px-2 py-1 text-xs dark:border-dream-line-dark" type="button" onClick={fitGraph}>适应</button>
        </div>
      </div>
      {network.nodes.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-dream-muted dark:text-dream-muted-dark">
          {emptyMessage}
        </p>
      ) : (
        <>
          {renderError && <p className="px-4 pt-3 text-sm text-red-500" role="alert">{renderError}</p>}
          <div
            aria-label="梦境关键词关系图；可拖动节点、缩放和平移"
            className="h-72 w-full touch-none sm:h-96"
            ref={containerRef}
            role="application"
          />
          <details className="border-t border-dream-line px-4 py-3 dark:border-dream-line-dark">
            <summary className="cursor-pointer text-xs text-dream-muted dark:text-dream-muted-dark">
              关键词列表（键盘可用）
            </summary>
            <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
              {network.nodes.map((node) => (
                <button
                  aria-label={`查看关键词：${node.word}（${node.occurrences} 条梦境）`}
                  aria-pressed={selectedId === node.id}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    selectedId === node.id
                      ? 'border-dream-violet bg-dream-violet text-white dark:text-dream-night'
                      : 'border-dream-line text-dream-muted hover:border-dream-violet dark:border-dream-line-dark dark:text-dream-muted-dark'
                  }`}
                  key={node.id}
                  onClick={() => setSelectedId((current) => current === node.id ? null : node.id)}
                  type="button"
                >
                  {node.word} · {node.occurrences}
                </button>
              ))}
            </div>
          </details>
        </>
      )}
      {selectedNode && (
        <aside className="border-t border-dream-line px-4 py-4 dark:border-dream-line-dark">
          <h3 className="text-sm font-semibold">{selectedNode.word}</h3>
          <p className="mt-1 text-xs text-dream-muted dark:text-dream-muted-dark">
            {sizeByOccurrences
              ? `出现在你的 ${selectedNode.occurrences} 条梦境中`
              : `权重 ${selectedNode.weight.toFixed(2)} · 在你的 ${selectedNode.occurrences} 条梦境中出现`}
          </p>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {selectedNode.related_dreams.map((dream) => (
              <li key={dream.id}>
                <Link className="text-xs text-dream-violet no-underline hover:underline" to={`/dream/${dream.id}`}>
                  {dream.date} · {dream.summary}
                </Link>
              </li>
            ))}
          </ul>
          {selectedNode.related_dreams_total > selectedNode.related_dreams.length && (
            <p className="mt-2 text-xs text-dream-muted dark:text-dream-muted-dark">
              显示最近 {selectedNode.related_dreams.length} 条，共 {selectedNode.related_dreams_total} 条相关梦境。
            </p>
          )}
        </aside>
      )}
    </div>
  )
}
