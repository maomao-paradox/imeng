const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000')
  .replace(/\/+$/, '')

export class ApiError extends Error {
  public readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.replace(/^\/+/, '')
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  const response = await fetch(`${API_BASE_URL}/${normalizedPath}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new ApiError(response.status, detail || `API request failed (${response.status})`)
  }

  return response
}
