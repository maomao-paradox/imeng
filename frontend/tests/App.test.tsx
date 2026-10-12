import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('app shell', () => {
  it('renders the today page and changes theme', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '早安，记得昨夜的梦吗？' })).toBeInTheDocument()

    const themeButton = screen.getByRole('button', { name: '浅色' })
    fireEvent.click(themeButton)
    expect(screen.getByRole('button', { name: '深色' })).toHaveAttribute('aria-pressed', 'false')
  })
})
