import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, XCircle, FolderOpen } from 'lucide-react'
import type { Job, Agent } from '../types'
import { agentColors } from '../styles/design-system'
import { FileBrowser } from './FileBrowser'
import { PreviewPanel } from './PreviewPanel'
import { FixIssuesPanel } from './FixIssuesPanel'
import { useJobStream } from '../hooks/useJobs'

interface JobDetailViewProps {
  job: Job
  agents: Agent[]
  onBack: () => void
  onCancel: () => void
}

export function JobDetailView({ job: initialJob, agents, onBack, onCancel }: JobDetailViewProps) {
  const logEndRef = useRef<HTMLDivElement>(null)
  const [showFiles, setShowFiles] = useState(false)
  const [localJob, setLocalJob] = useState<Job>(initialJob)

  // Use WebSocket for real-time updates
  const handleJobUpdate = useCallback((updatedJob: Job) => {
    setLocalJob(updatedJob)
  }, [])

  const { job: streamedJob } = useJobStream(initialJob.id, handleJobUpdate)

  // Use streamed job if available, otherwise use initial/local job
  const job = streamedJob || localJob

  // Update local job when initial job changes (e.g., from refetch)
  useEffect(() => {
    setLocalJob(initialJob)
  }, [initialJob])

  const getAgent = (agentId: string) => agents.find((a) => a.id === agentId)

  // Auto-scroll to bottom of activity log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [job.activity_log])

  const isCompleted = job.status === 'completed'
  const isRunning = job.status === 'running'

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">{job.name}</h1>
            <p className="text-sm text-gray-400">{job.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCompleted && (
            <button
              onClick={() => setShowFiles(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition"
            >
              <FolderOpen size={16} />
              View Files
            </button>
          )}

          {isRunning && (
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                       text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Progress and Team */}
        <div className="w-80 border-r border-white/10 overflow-y-auto p-6 space-y-6">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Progress</span>
              <span className="text-sm font-medium text-white">{job.progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${
                  job.status === 'failed'
                    ? 'bg-red-500'
                    : job.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                }`}
                animate={{ width: `${job.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500 capitalize">{job.status}</div>
          </div>

          {/* Team Status */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Team</h3>
            <div className="space-y-2">
              {job.agents.map((ja) => {
                const agent = getAgent(ja.agent_id)
                if (!agent) return null
                const colors = agentColors[agent.id]

                const statusColors: Record<string, string> = {
                  waiting: 'text-gray-400',
                  working: 'text-amber-400',
                  done: 'text-green-400',
                  error: 'text-red-400',
                }

                const statusBg: Record<string, string> = {
                  waiting: 'bg-gray-500/20',
                  working: 'bg-amber-500/20',
                  done: 'bg-green-500/20',
                  error: 'bg-red-500/20',
                }

                return (
                  <div key={ja.agent_id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                        style={{
                          background: colors
                            ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
                            : 'linear-gradient(135deg, #666, #444)',
                        }}
                      >
                        {agent.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm">{agent.name}</div>
                        <div
                          className={`text-xs px-2 py-0.5 rounded-full inline-block ${statusColors[ja.status]} ${statusBg[ja.status]}`}
                        >
                          {ja.status}
                        </div>
                      </div>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white/30"
                        animate={{ width: `${ja.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    {ja.current_task && (
                      <div className="mt-1 text-xs text-gray-500 truncate">{ja.current_task}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Preview Panel - only show when completed */}
          {isCompleted && <PreviewPanel jobId={job.id} />}

          {/* Fix Issues Panel - show when completed and Sentinel was run */}
          {isCompleted && job.agents.some((a) => a.agent_id === 'sentinel') && (
            <FixIssuesPanel
              jobId={job.id}
              onRerun={() => {
                // The WebSocket stream will automatically update the job state
              }}
            />
          )}
        </div>

        {/* Right column - Activity Log */}
        <div className="flex-1 flex flex-col min-h-0 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Activity Log</h3>
          <div className="flex-1 overflow-y-auto space-y-1 font-mono text-sm bg-black/30 rounded-lg p-4 border border-white/5">
            {job.activity_log.length === 0 ? (
              <div className="text-gray-500 text-center py-4">Waiting for activity...</div>
            ) : (
              job.activity_log.map((entry, i) => {
                const agent = entry.agent_id !== 'system' ? getAgent(entry.agent_id) : null
                const colors = agent ? agentColors[agent.id] : null

                return (
                  <div key={i} className="flex gap-3 items-start py-0.5 hover:bg-white/5 px-2 -mx-2 rounded">
                    <span className="text-gray-600 text-xs whitespace-nowrap flex-shrink-0 w-20">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className="font-medium flex-shrink-0 w-16 truncate"
                      style={{ color: colors?.from || '#6b7280' }}
                    >
                      {agent?.name || 'System'}
                    </span>
                    <span className="text-gray-300 break-words flex-1">{entry.message}</span>
                  </div>
                )
              })
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* File Browser Modal */}
      {showFiles && <FileBrowser jobId={job.id} onClose={() => setShowFiles(false)} />}
    </div>
  )
}
