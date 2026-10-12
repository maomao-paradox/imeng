import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { useAuthStore } from '../src/stores/auth-store'

const cytoscapeMock = vi.hoisted(() => {
  const collection = {
    removeClass: vi.fn(),
    addClass: vi.fn(),
  }
  return {
    graph: {
      on: vi.fn(),
      destroy: vi.fn(),
      elements: vi.fn(() => collection),
      getElementById: vi.fn(() => ({ closedNeighborhood: () => collection })),
      zoom: vi.fn(() => 1),
      minZoom: vi.fn(() => 0.4),
      maxZoom: vi.fn(() => 3),
      fit: vi.fn(),
    },
  }
})

vi.mock('cytoscape', () => ({
  default: vi.fn(() => cytoscapeMock.graph),
}))

describe('app shell', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'test@example.test',
        nickname: '梦旅人',
        created_at: '2026-10-12T00:00:00Z',
      },
      loading: false,
      error: null,
      initialize: async () => {},
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ items: [], total: 0, limit: 5, offset: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ))
  })

  it('renders the today page and changes theme', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '早安，梦旅人。记得昨夜的梦吗？' })).toBeInTheDocument()

    const themeButton = screen.getByRole('button', { name: '浅色' })
    fireEvent.click(themeButton)
    expect(screen.getByRole('button', { name: '深色' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders the dedicated all-dreams keyword network page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ nodes: [], edges: [], dream_count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ))
    window.history.replaceState({}, '', '/network')

    render(
      <MemoryRouter initialEntries={['/network']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '梦境词网络' })).toBeInTheDocument()
    expect(screen.getByText('还没有关键词。添加梦境关键词后，它们会显示在这里。')).toBeInTheDocument()
  })

  it('shows every dream associated with a selected network keyword', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dream_count: 2,
          edges: [],
          nodes: [{
            id: 1,
            word: '海边',
            weight: 0.7,
            occurrences: 2,
            related_dreams: [
              { id: 11, date: '2026-10-12', summary: '海边有一座楼梯' },
              { id: 12, date: '2026-10-11', summary: '我又梦见海边' },
            ],
          }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ))

    render(
      <MemoryRouter initialEntries={['/network']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: '查看关键词：海边（2 条梦境）' }))
    expect(await screen.findByRole('link', { name: '2026-10-12 · 海边有一座楼梯' })).toHaveAttribute('href', '/dream/11')
    expect(screen.getByRole('link', { name: '2026-10-11 · 我又梦见海边' })).toHaveAttribute('href', '/dream/12')
  })
})
