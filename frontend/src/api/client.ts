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
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_BASE_URL}/${normalizedPath}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    const detail = await response.text()
    let message = detail || `API request failed (${response.status})`
    try {
      const body: unknown = JSON.parse(detail)
      if (
        typeof body === 'object'
        && body !== null
        && 'detail' in body
        && typeof body.detail === 'string'
      ) {
        message = body.detail
      }
    } catch {
      // Plain-text errors are retained as-is.
    }
    throw new ApiError(response.status, message)
  }

  return response
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  if (response.status === 204) {
    throw new ApiError(204, 'Expected JSON response but received an empty response')
  }
  return response.json() as Promise<T>
}

export async function apiVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await apiFetch(path, init)
  if (response.status !== 204) {
    throw new ApiError(response.status, 'Expected an empty response')
  }
}
