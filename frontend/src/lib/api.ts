import { getAccessToken, refreshSession } from './auth-service'

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

if (typeof window !== 'undefined') {
  ;(window as unknown as { __API_URL__?: string }).__API_URL__ = API_BASE
}

interface FetchOptions extends RequestInit {
  token?: string
}

async function doFetch(
  endpoint: string,
  fetchOptions: RequestInit,
  headersBase: Record<string, string>,
  bearerToken: string | undefined
): Promise<Response> {
  const headers: Record<string, string> = { ...headersBase }
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`
  } else {
    console.warn('[api.ts] NO AUTH TOKEN for', endpoint)
  }

  const url = `${API_BASE_WITH_SLASH}${endpoint}`
  const method = (fetchOptions.method as string) || 'GET'
  console.log('[api.ts] REQUEST', method, url, 'hasToken:', !!bearerToken)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
    console.log('[api.ts] RESPONSE', method, url, 'status:', response.status)
    return response
  } catch (err) {
    console.error('[api.ts] FETCH ERROR', method, url, err)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    throw new Error(err instanceof Error ? err.message : 'Network error')
  } finally {
    clearTimeout(timeout)
  }
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
    Object.assign(headers, options.headers as Record<string, string>)
  }

  let authToken = token
  const explicitToken = !!token
  if (!authToken) {
    try {
      authToken = (await getAccessToken()) ?? undefined
    } catch (err) {
      console.warn('[api.ts] getAccessToken() threw:', err)
      authToken = undefined
    }
  }

  let response = await doFetch(endpoint, fetchOptions, headers, authToken)

  // The Supabase client auto-refreshes tokens in the background, but a
  // token can still expire between page load and this request firing.
  // Attempt exactly one explicit refresh + retry before surfacing an
  // error — never for a caller-supplied token, and never more than once.
  if (response.status === 401 && !explicitToken) {
    const refreshed = await refreshSession()
    if (refreshed?.access_token) {
      response = await doFetch(endpoint, fetchOptions, headers, refreshed.access_token)
    }
  }

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
    if (response.status === 401) {
      detail = 'Your session has expired. Please log in again.'
    }
    console.error('[api.ts] ERROR RESPONSE', endpoint, 'status:', response.status, 'detail:', detail)
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

// 06/29/2026 