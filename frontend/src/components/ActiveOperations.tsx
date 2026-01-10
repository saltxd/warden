import { motion, AnimatePresence } from 'framer-motion'
import { Play, CheckCircle, XCircle, Clock, Inbox, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { cardVariants, containerVariants, progressVariants } from '../styles/animations'
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

function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case 'running':
      return 'border-l-neon-cyan'
    case 'complete':
      return 'border-l-green-500'
    case 'failed':
      return 'border-l-red-500'
    case 'queued':
      return 'border-l-gray-500'
    default:
      return 'border-l-gray-500'
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

interface TaskCardProps {
  task: Task
}

function TaskCard({ task }: TaskCardProps) {
  const { setActiveTask } = useStore()

  return (
    <motion.button
      variants={cardVariants}
      whileHover="hover"
      whileTap="tap"
      onClick={() => setActiveTask(task)}
      className={`
        w-full glass-card-solid p-3 text-left
        border-l-4 ${getStatusColor(task.status)}
        hover:bg-white/5 transition-colors
      `}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5">{getStatusIcon(task.status)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm text-white truncate">
              {task.target}
            </h4>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {task.status === 'complete' && task.completed_at
                ? formatTimeAgo(task.completed_at)
                : formatTimeAgo(task.started_at)}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {task.description}
          </p>

          {/* Progress bar for running tasks */}
          {task.status === 'running' && (
            <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-neon-cyan to-blue-500"
                variants={progressVariants}
                initial="initial"
                animate="animate"
                custom={task.progress}
              />
            </div>
          )}

          {/* Node badge */}
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-gray-300 font-mono">
              {task.proxmox_node}
            </span>
            {task.k3s_node && (
              <span className="px-2 py-0.5 bg-blue-500/20 rounded text-[10px] text-blue-300 font-mono">
                {task.k3s_node}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      <Inbox className="w-12 h-12 text-gray-600 mb-3" />
      <h3 className="text-gray-400 font-medium">No active operations</h3>
      <p className="text-gray-500 text-sm mt-1">Launch an agent to get started</p>
    </motion.div>
  )
}

export function ActiveOperations() {
  const { tasks, runningTaskCount, clearCompletedTasks } = useStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const runningCount = runningTaskCount()
  const hasCompletedTasks = tasks.some((t) => t.status === 'complete' || t.status === 'failed')

  return (
    <section className="mb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 group"
        >
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Active Operations
          </h2>
          {runningCount > 0 && (
            <span className="px-2 py-0.5 bg-neon-cyan/20 text-neon-cyan text-xs font-bold rounded-full">
              {runningCount} running
            </span>
          )}
          <div className="text-gray-500 group-hover:text-gray-300 transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {/* Clear Completed button */}
        {hasCompletedTasks && (
          <button
            onClick={clearCompletedTasks}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Task list */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {tasks.length === 0 ? (
              <EmptyState />
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
