import { getAccessToken } from './auth-service'

const API_BASE = (() => {
  const env = process.env.NEXT_PUBLIC_API_URL
  console.log('[api.ts] NEXT_PUBLIC_API_URL =', JSON.stringify(env))
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

console.log('[api.ts] API_BASE =', API_BASE)
console.log('[api.ts] API_BASE_WITH_SLASH =', API_BASE_WITH_SLASH)

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
    } catch (err) {
      console.warn('[api.ts] getAccessToken() threw:', err)
      authToken = undefined
    }
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  } else {
    console.warn('[api.ts] NO AUTH TOKEN for', endpoint)
  }

  const url = `${API_BASE_WITH_SLASH}${endpoint}`
  const method = (fetchOptions.method as string) || 'GET'
  console.log('[api.ts] REQUEST', method, url, 'hasToken:', !!authToken)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  let response: Response
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    console.error('[api.ts] FETCH ERROR', method, url, err)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    throw new Error(err instanceof Error ? err.message : 'Network error')
  }
  clearTimeout(timeout)

  console.log('[api.ts] RESPONSE', method, url, 'status:', response.status)

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
    console.error('[api.ts] ERROR RESPONSE', method, url, 'status:', response.status, 'detail:', detail)
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
