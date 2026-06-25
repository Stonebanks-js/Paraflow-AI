import { getAccessToken } from './auth-service'

const API_BASE = (() => {
  const env = process.env.NEXT_PUBLIC_API_URL
  if (env && env.length > 0) return env.replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api'
    }
  }
  return 'https://paraflow-ai.onrender.com/api'
})()

const API_BASE_WITH_SLASH = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`

interface FetchOptions extends RequestInit {
  token?: string
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options.headers) {
    const h = options.headers as Record<string, string>
    Object.assign(headers, h)
  }

  let authToken = token
  if (!authToken) {
    try {
      authToken = (await getAccessToken()) ?? undefined
    } catch {
      authToken = undefined
    }
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const url = `${API_BASE_WITH_SLASH}${endpoint}`
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const data = await response.json()
      if (data && typeof data === 'object' && 'detail' in data) {
        const d = (data as { detail: unknown }).detail
        if (typeof d === 'string') detail = d
        else detail = JSON.stringify(d)
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    apiFetch<T>(endpoint, { method: 'GET', token }),

  post: <T>(endpoint: string, data: unknown, token?: string) =>
    apiFetch<T>(endpoint, { method: 'POST', body: JSON.stringify(data), token }),

  patch: <T>(endpoint: string, data: unknown, token?: string) =>
    apiFetch<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data), token }),

  delete: <T>(endpoint: string, token?: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE', token }),
}

export { API_BASE_WITH_SLASH as API_BASE }
