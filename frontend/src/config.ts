// In production (Docker), use relative URLs through nginx proxy
// In development, use localhost:8000 directly
const isDev = import.meta.env.DEV

export const API_URL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:8000' : '')
export const WS_URL = import.meta.env.VITE_WS_URL || (isDev ? 'ws://localhost:8000' : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`)
export const API_KEY = import.meta.env.VITE_API_KEY || ''

/**
 * Get standard headers for API requests, including auth if configured.
 */
export function getHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  }
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY
  }
  return headers
}

/**
 * Get WebSocket URL with auth query param if needed.
 */
export function getAuthWsUrl(path: string): string {
  const base = `${WS_URL}${path}`
  if (API_KEY) {
    const separator = base.includes('?') ? '&' : '?'
    return `${base}${separator}api_key=${encodeURIComponent(API_KEY)}`
  }
  return base
}
