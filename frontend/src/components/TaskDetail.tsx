import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  ChevronDown,
  ChevronUp,
  Pause,
  Square,
} from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { slideInVariants, progressVariants, checkmarkVariants } from '../styles/animations'
import { API_URL } from '../config'
import type { Task, TaskStatus } from '../types'

function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case 'running':
      return <Play className="w-4 h-4 text-neon-cyan fill-neon-cyan" />
    case 'complete':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />
    case 'queued':
      return <Clock className="w-4 h-4 text-gray-400" />
    default:
      return null
  }
}

function getStatusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case 'running':
      return 'bg-neon-cyan/20 text-neon-cyan'
    case 'complete':
      return 'bg-green-500/20 text-green-400'
    case 'failed':
      return 'bg-red-500/20 text-red-400'
    case 'queued':
      return 'bg-gray-500/20 text-gray-400'
    default:
      return 'bg-gray-500/20 text-gray-400'
  }
}

function formatElapsedTime(startedAt: string): string {
  const start = new Date(startedAt).getTime()
  const now = Date.now()
  const diffSeconds = Math.floor((now - start) / 1000)

  if (diffSeconds < 60) return `${diffSeconds}s`
  const minutes = Math.floor(diffSeconds / 60)
  const seconds = diffSeconds % 60
  if (minutes < 60) return `${minutes}m ${seconds}s`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

interface TaskDetailProps {
  task: Task
}

export function TaskDetail({ task }: TaskDetailProps) {
  const { setActiveTask, updateTask, removeTask, addNotification } = useStore()

  const [showLogs, setShowLogs] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(task.started_at))
  const logsEndRef = useRef<HTMLDivElement>(null)

  const logIndexRef = useRef(task.logs.length)

  // Update elapsed time every second
  useEffect(() => {
    if (task.status !== 'running' && task.status !== 'queued') return

    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(task.started_at))
    }, 1000)

    return () => clearInterval(interval)
  }, [task.started_at, task.status])

  // Fetch real logs from backend
  const fetchTaskUpdates = useCallback(async () => {
    try {
      // Fetch full task status
      const taskResponse = await fetch(`${API_URL}/tasks/${task.id}`)
      if (!taskResponse.ok) return

      const taskData = await taskResponse.json()

      // Update task status and progress from backend
      if (taskData.status !== task.status || taskData.progress !== task.progress) {
        updateTask(task.id, {
          status: taskData.status,
          progress: taskData.progress,
          completed_at: taskData.completed_at,
        })

        // Add notification on completion
        if (taskData.status === 'complete' && task.status !== 'complete') {
          addNotification({
            id: `notif_${Date.now()}`,
            type: 'success',
            message: `${task.target} completed successfully`,
            timestamp: new Date().toISOString(),
            read: false,
          })
        } else if (taskData.status === 'failed' && task.status !== 'failed') {
          addNotification({
            id: `notif_${Date.now()}`,
            type: 'error',
            message: `${task.target} failed`,
            timestamp: new Date().toISOString(),
            read: false,
          })
        }
      }

      // Fetch new logs since last check
      const logsResponse = await fetch(`${API_URL}/tasks/${task.id}/logs?since=${logIndexRef.current}`)
      if (!logsResponse.ok) return

      const newLogs: string[] = await logsResponse.json()

      if (newLogs.length > 0) {
        logIndexRef.current += newLogs.length
        updateTask(task.id, {
          logs: [...task.logs, ...newLogs],
        })
      }
    } catch (error) {
      console.error('Failed to fetch task updates:', error)
    }
  }, [task.id, task.status, task.progress, task.target, task.logs, updateTask, addNotification])

  // Poll for updates while task is running or queued
  useEffect(() => {
    if (task.status !== 'running' && task.status !== 'queued') return

    // Initial fetch
    fetchTaskUpdates()

    // Poll every second for responsive updates
    const interval = setInterval(fetchTaskUpdates, 1000)

    return () => clearInterval(interval)
  }, [task.status, fetchTaskUpdates])

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [task.logs])

  // Handle cancel task
  const handleCancel = () => {
    removeTask(task.id)
    setActiveTask(null)
  }

  return (
    <motion.div
      variants={slideInVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="py-4"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setActiveTask(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <h1 className="text-lg font-semibold text-white truncate max-w-[50%]">
          {task.target}
        </h1>

        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(task.status)}`}>
          {task.status}
        </span>
      </div>

      {/* Status visualization */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative">
            <motion.div
              className={`w-16 h-16 rounded-full border-4 flex items-center justify-center
                ${task.status === 'running' ? 'border-neon-cyan' : ''}
                ${task.status === 'complete' ? 'border-green-500' : ''}
                ${task.status === 'failed' ? 'border-red-500' : ''}
                ${task.status === 'queued' ? 'border-gray-500' : ''}
              `}
              animate={task.status === 'running' ? {
                boxShadow: [
                  '0 0 0 0 rgba(0, 255, 255, 0)',
                  '0 0 0 10px rgba(0, 255, 255, 0.1)',
                  '0 0 0 0 rgba(0, 255, 255, 0)',
                ],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <AnimatePresence mode="wait">
                {task.status === 'complete' ? (
                  <motion.svg
                    key="checkmark"
                    className="w-8 h-8 text-green-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M5 13l4 4L19 7"
                      variants={checkmarkVariants}
                      initial="hidden"
                      animate="visible"
                    />
                  </motion.svg>
                ) : (
                  <motion.div
                    key="icon"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    {getStatusIcon(task.status)}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">{task.progress}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                task.status === 'complete'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : task.status === 'failed'
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-neon-cyan to-blue-500'
              }`}
              variants={progressVariants}
              initial="initial"
              animate="animate"
              custom={task.progress}
            />
          </div>
        </div>

        {/* Time */}
        <div className="text-center text-sm text-gray-400">
          {task.status === 'complete' && task.completed_at ? (
            <>Completed in {formatElapsedTime(task.started_at)}</>
          ) : task.status === 'running' ? (
            <>Running for {elapsedTime}</>
          ) : (
            <>Started {elapsedTime} ago</>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="glass-card-solid p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 text-xs uppercase">Node</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Server className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-white font-mono">{task.proxmox_node}</span>
            </div>
          </div>
          {task.k3s_node && (
            <div>
              <span className="text-gray-500 text-xs uppercase">K3s Node</span>
              <div className="text-white font-mono mt-0.5">{task.k3s_node}</div>
            </div>
          )}
          <div>
            <span className="text-gray-500 text-xs uppercase">Type</span>
            <div className="text-white mt-0.5 capitalize">{task.type.replace('-', ' ')}</div>
          </div>
          <div>
            <span className="text-gray-500 text-xs uppercase">Target</span>
            <div className="text-white mt-0.5 truncate">{task.target}</div>
          </div>
        </div>
      </div>

      {/* Logs section */}
      <div className="glass-card-solid overflow-hidden mb-4">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Live Logs
          </span>
          {showLogs ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-950 p-3 max-h-48 overflow-y-auto scrollbar-hide font-mono text-xs">
                {task.logs.map((log, index) => (
                  <div
                    key={index}
                    className={`py-0.5 ${
                      log.includes('error') || log.includes('Error')
                        ? 'text-red-400'
                        : log.includes('success') || log.includes('complete')
                        ? 'text-green-400'
                        : 'text-gray-300'
                    }`}
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      {task.status === 'complete' ? (
        <div className="space-y-2">
          <div className="glass-card p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="text-white font-semibold">Task Completed Successfully</h3>
            <p className="text-gray-400 text-sm mt-1">All operations finished without errors</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled
              className="py-2.5 rounded-lg text-sm font-medium bg-gray-800 text-gray-500 cursor-not-allowed"
            >
              View Changes
            </button>
            <motion.button
              onClick={() => setActiveTask(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="py-2.5 rounded-lg text-sm font-medium bg-neon-cyan text-black hover:neon-glow-cyan transition-all"
            >
              Done
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-gray-800 text-gray-500 cursor-not-allowed"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
          <motion.button
            onClick={handleCancel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Square className="w-4 h-4" />
            Cancel
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
