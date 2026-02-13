import { useState, useEffect, useCallback } from 'react'
import type { Agent } from '../types'
import { API_URL, getHeaders } from '../config'

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`${API_URL}/agents`, {
          method: 'GET',
          headers: getHeaders(),
        })

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }

        const data = await res.json()
        setAgents(data)
        setError(null)
        setLoading(false)
        return
      } catch (err) {
        console.error(`Fetch agents attempt ${i + 1} failed:`, err)
        if (i === retries - 1) {
          setError(err instanceof Error ? err.message : 'Failed to fetch agents')
          setLoading(false)
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }
  }, [])

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(() => fetchAgents(1), 10000)
    return () => clearInterval(interval)
  }, [fetchAgents])

  return { agents, loading, error, refetch: fetchAgents }
}
