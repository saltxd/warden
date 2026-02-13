import { useState, useEffect, useCallback, useRef } from 'react'
import type { Job, JobCreate } from '../types'
import { API_URL, getHeaders, getAuthWsUrl } from '../config'
import { showToast } from '../components/Toast'

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/jobs`, { headers: getHeaders() })
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
      headers: getHeaders(),
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        agent_ids: data.agentIds,
        repository: data.repository,
      }),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Failed to create job' }))
      const msg = errorData.detail || 'Failed to create job'
      showToast('error', msg)
      throw new Error(msg)
    }
    const job = await res.json()
    setJobs((prev) => [job, ...prev])
    showToast('success', `Job "${job.name}" created`)
    return job
  }

  const cancelJob = async (jobId: string) => {
    const res = await fetch(`${API_URL}/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!res.ok) {
      showToast('error', 'Failed to cancel job')
      throw new Error('Failed to cancel job')
    }
    showToast('info', 'Job cancelled')
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
      const ws = new WebSocket(getAuthWsUrl(`/jobs/${jobId}/ws`))
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'state' || data.type === 'completed' ||
              data.type === 'progress' || data.type === 'started' ||
              data.type === 'agent_started' || data.type === 'cancelled') {
            if (data.job) {
              setStreamedJob(data.job)
              onJobUpdate?.(data.job)
            }
          } else if (data.type === 'activity') {
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
          } else if (data.type === 'error') {
            showToast('error', data.message || 'WebSocket error')
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = () => {
        showToast('error', 'Lost connection to job stream')
      }

      ws.onclose = () => {
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
