import { useState, useEffect, useCallback } from 'react'
import { API_URL, getHeaders } from '../config'

interface Metrics {
  total_cpu_percent: number
  total_ram_used_gb: number
  total_ram_total_gb: number
  total_disk_used_tb: number
  total_disk_total_tb: number
  nodes_online: number
  nodes_total: number
  running_tasks: number
}

interface UseMetricsReturn {
  metrics: Metrics | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMetrics(): UseMetricsReturn {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/nodes/metrics`, { headers: getHeaders() })
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
      }
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  return { metrics, loading, error, refetch: fetchMetrics }
}
