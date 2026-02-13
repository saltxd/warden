import { useState, useEffect, useCallback } from 'react'
import type { Node } from '../types'
import { API_URL, getHeaders } from '../config'

interface UseNodesReturn {
  nodes: Node[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useNodes(): UseNodesReturn {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNodes = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/nodes`, { headers: getHeaders() })
      if (!response.ok) {
        throw new Error(`Failed to fetch nodes: ${response.statusText}`)
      }
      const data = await response.json()
      setNodes(data)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNodes()
    const interval = setInterval(fetchNodes, 10000)
    return () => clearInterval(interval)
  }, [fetchNodes])

  return { nodes, loading, error, refetch: fetchNodes }
}
