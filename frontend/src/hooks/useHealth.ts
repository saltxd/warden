import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../config'

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error'
  proxmox: {
    status: 'connected' | 'disconnected'
    error?: string | null
  }
  k3s: {
    status: 'connected' | 'disconnected'
    error?: string | null
  }
}

interface UseHealthReturn {
  health: HealthStatus | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useHealth(): UseHealthReturn {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/health`)
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`)
      }
      const data = await response.json()
      setHealth(data)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()

    // Check health every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  return { health, loading, error, refetch: fetchHealth }
}
