import { useState, useEffect } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

// Simple global toast state
let toastListeners: ((toasts: ToastMessage[]) => void)[] = []
let toasts: ToastMessage[] = []

function notifyListeners() {
  toastListeners.forEach((fn) => fn([...toasts]))
}

export function showToast(type: ToastMessage['type'], message: string, duration = 4000) {
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  toasts = [...toasts, { id, type, message, duration }]
  notifyListeners()

  if (duration > 0) {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id)
      notifyListeners()
    }, duration)
  }
}

function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  notifyListeners()
}

export function useToasts() {
  const [current, setCurrent] = useState<ToastMessage[]>(toasts)

  useEffect(() => {
    toastListeners.push(setCurrent)
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== setCurrent)
    }
  }, [])

  return current
}

const typeStyles: Record<ToastMessage['type'], { border: string; bg: string; text: string }> = {
  success: { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  error: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
  warning: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  info: { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', text: '#06b6d4' },
}

const typeLabels: Record<ToastMessage['type'], string> = {
  success: 'OK',
  error: 'ERR',
  warning: 'WARN',
  info: 'INFO',
}

export function ToastContainer() {
  const currentToasts = useToasts()

  if (currentToasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '400px',
        width: 'calc(100vw - 32px)',
      }}
    >
      {currentToasts.map((toast) => {
        const style = typeStyles[toast.type]
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px 12px',
              border: `1px solid ${style.border}`,
              backgroundColor: style.bg,
              backdropFilter: 'blur(12px)',
              fontFamily: '"SF Mono", "Fira Code", monospace',
              fontSize: '12px',
              color: style.text,
              animation: 'toast-in 0.2s ease-out',
            }}
          >
            <span style={{ fontWeight: 'bold', flexShrink: 0 }}>[{typeLabels[toast.type]}]</span>
            <span style={{ flex: 1, wordBreak: 'break-word' }}>{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: style.text,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12px',
                padding: '0 2px',
                opacity: 0.7,
                flexShrink: 0,
              }}
            >
              x
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
