// In production (Docker), use relative URLs through nginx proxy
// In development, use localhost:8000 directly
const isDev = import.meta.env.DEV

export const API_URL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:8000' : '')
export const WS_URL = import.meta.env.VITE_WS_URL || (isDev ? 'ws://localhost:8000' : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`)
