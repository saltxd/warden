import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Inbox,
  ChevronDown,
  ChevronUp,
  Trash2,
  Terminal,
  Radio,
} from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { Task } from '../types'

const statusConfig = {
  running: {
    icon: Play,
    color: 'cyan',
    label: 'ACTIVE',
    borderColor: 'border-l-cyan-400',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    glow: 'rgba(0, 255, 255, 0.5)',
  },
  complete: {
    icon: CheckCircle,
    color: 'green',
    label: 'COMPLETE',
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    glow: 'rgba(34, 197, 94, 0.5)',
  },
  failed: {
    icon: XCircle,
    color: 'red',
    label: 'FAILED',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    glow: 'rgba(239, 68, 68, 0.5)',
  },
  queued: {
    icon: Clock,
    color: 'gray',
    label: 'QUEUED',
    borderColor: 'border-l-gray-500',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-400',
    glow: 'rgba(156, 163, 175, 0.3)',
  },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return 'NOW'
  if (diffMins < 60) return `${diffMins}M`
  if (diffHours < 24) return `${diffHours}H`
  return date.toLocaleDateString()
}

interface MissionCardProps {
  task: Task
  index: number
}

function MissionCard({ task, index }: MissionCardProps) {
  const { setActiveTask } = useStore()
  const config = statusConfig[task.status]
  const Icon = config.icon

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => setActiveTask(task)}
      className={`
        w-full text-left p-3 rounded-lg
        bg-black/40 backdrop-blur-sm
        border border-white/5 ${config.borderColor} border-l-2
        hover:border-white/10 hover:bg-white/5
        transition-all duration-200 group relative overflow-hidden
      `}
    >
      {/* Scan line effect for running tasks */}
      {task.status === 'running' && (
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.glow}, transparent)`,
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <div className="relative z-10">
        {/* Top row: Status + Time */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Status icon with glow */}
            <div
              className={`w-6 h-6 rounded flex items-center justify-center ${config.bgColor}`}
              style={{ boxShadow: `0 0 10px ${config.glow}` }}
            >
              <Icon
                className={`w-3.5 h-3.5 ${config.textColor} ${task.status === 'running' ? 'fill-current' : ''}`}
              />
            </div>

            {/* Status label */}
            <span
              className={`text-[9px] font-mono font-bold tracking-wider ${config.textColor}`}
              style={{ textShadow: `0 0 8px ${config.glow}` }}
            >
              {config.label}
            </span>

            {/* Pulse indicator for running */}
            {task.status === 'running' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
            )}
          </div>

          {/* Timestamp */}
          <span className="text-[10px] font-mono text-gray-500">
            T-{formatTimeAgo(task.status === 'complete' && task.completed_at ? task.completed_at : task.started_at)}
          </span>
        </div>

        {/* Mission title */}
        <h4
          className="font-bold text-sm text-white mb-1 truncate group-hover:text-cyan-300 transition-colors"
          style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.2)' }}
        >
          {task.target}
        </h4>

        {/* Description */}
        <p className="text-[11px] text-gray-500 font-mono truncate mb-2">
          {task.description}
        </p>

        {/* Progress bar for running tasks */}
        {task.status === 'running' && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-gray-500">PROGRESS</span>
              <span className="text-[9px] font-mono text-cyan-400">{task.progress}%</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #00ffff, #3b82f6)',
                  boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${task.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Bottom: Node badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10">
            <Terminal className="w-2.5 h-2.5 text-gray-500" />
            <span className="text-[9px] font-mono text-gray-400">{task.proxmox_node}</span>
          </div>
          {task.k3s_node && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
              <Radio className="w-2.5 h-2.5 text-blue-400" />
              <span className="text-[9px] font-mono text-blue-300">{task.k3s_node}</span>
            </div>
          )}
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
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      {/* Empty state icon */}
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full border border-gray-700 flex items-center justify-center">
          <Inbox className="w-8 h-8 text-gray-600" />
        </div>
        <div className="absolute inset-0 rounded-full border border-gray-600 animate-ping opacity-20" />
      </div>

      <h3 className="text-gray-400 font-mono text-sm tracking-wider mb-1">
        NO ACTIVE MISSIONS
      </h3>
      <p className="text-[11px] text-gray-600 font-mono">
        Deploy an agent to begin operations
      </p>

      {/* Decorative lines */}
      <div className="flex items-center gap-2 mt-4">
        <div className="w-8 h-px bg-gradient-to-r from-transparent to-gray-700" />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
        <div className="w-8 h-px bg-gradient-to-l from-transparent to-gray-700" />
      </div>
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
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/50 to-transparent" />
        <h2 className="text-[10px] font-mono text-cyan-400/80 tracking-[0.3em] uppercase">
          Mission Log
        </h2>
        <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/50 to-transparent" />
      </div>

      {/* Header controls */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 group"
        >
          {/* Running count badge */}
          {runningCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/30"
              style={{ boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-400">
                {runningCount} ACTIVE
              </span>
            </motion.div>
          )}

          {tasks.length > 0 && (
            <span className="text-[10px] font-mono text-gray-500">
              {tasks.length} total
            </span>
          )}

          <div className="text-gray-500 group-hover:text-cyan-400 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Clear Completed button */}
        {hasCompletedTasks && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={clearCompletedTasks}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/30 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            CLEAR
          </motion.button>
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
              <div className="space-y-2">
                <AnimatePresence>
                  {tasks.map((task, index) => (
                    <MissionCard key={task.id} task={task} index={index} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
