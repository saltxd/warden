import { useState, useEffect, useCallback, useRef } from 'react'
import type { Job, JobCreate } from '../types'
import { API_URL, WS_URL } from '../config'

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/jobs`)
      if (!res.ok) throw new Error('Failed to fetch jobs')
      const data = await res.json()
      setJobs(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const createJob = async (data: Omit<JobCreate, 'agent_ids'> & { agentIds: string[] }) => {
    const res = await fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        agent_ids: data.agentIds,
        repository: data.repository,
      }),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Failed to create job' }))
      throw new Error(errorData.detail || 'Failed to create job')
    }
    const job = await res.json()
    setJobs((prev) => [job, ...prev])
    return job
  }

  const cancelJob = async (jobId: string) => {
    const res = await fetch(`${API_URL}/jobs/${jobId}/cancel`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to cancel job')
    fetchJobs()
  }

  const getJob = (jobId: string) => {
    return jobs.find((j) => j.id === jobId) || null
  }

  const updateJob = useCallback((updatedJob: Job) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
    )
  }, [])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  return { jobs, loading, error, createJob, cancelJob, getJob, refetch: fetchJobs, updateJob }
}

/**
 * Hook for real-time job updates via WebSocket.
 * Use this when viewing a specific job to get streaming activity updates.
 */
export function useJobStream(
  jobId: string | null,
  onJobUpdate?: (job: Job) => void
) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [streamedJob, setStreamedJob] = useState<Job | null>(null)

  useEffect(() => {
    if (!jobId) {
      setStreamedJob(null)
      return
    }

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/jobs/${jobId}/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log(`WebSocket connected for job ${jobId}`)
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle different message types
          if (data.type === 'state' || data.type === 'completed' ||
              data.type === 'progress' || data.type === 'started' ||
              data.type === 'agent_started' || data.type === 'cancelled') {
            if (data.job) {
              setStreamedJob(data.job)
              onJobUpdate?.(data.job)
            }
          } else if (data.type === 'activity') {
            // Activity updates - update the job with new activity
            setStreamedJob((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                activity_log: [
                  ...prev.activity_log,
                  {
                    timestamp: data.timestamp,
                    agent_id: data.agent_id,
                    message: data.message,
                  },
                ],
              }
            })
          } else if (data.type === 'ping') {
            // Ignore ping messages
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = (err) => {
        console.error('WebSocket error:', err)
      }

      ws.onclose = () => {
        console.log(`WebSocket disconnected for job ${jobId}`)
        setConnected(false)
      }
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [jobId, onJobUpdate])

  return { connected, job: streamedJob }
}
