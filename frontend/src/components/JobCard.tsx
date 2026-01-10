import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import type { Job } from '../types'
import { agentColors } from '../styles/design-system'

interface JobCardProps {
  job: Job
  onClick?: () => void
}

const AgentAvatar = ({ agentId, size = 'sm' }: { agentId: string; size?: 'sm' | 'md' }) => {
  const colors = agentColors[agentId]
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-medium text-white border-2 border-[#0a0a0a]`}
      style={{
        background: colors
          ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
          : 'linear-gradient(135deg, #666, #444)',
      }}
    >
      {agentId[0].toUpperCase()}
    </div>
  )
}

export function JobCard({ job, onClick }: JobCardProps) {
  const statusStyles: Record<string, string> = {
    queued: 'text-gray-400',
    running: 'text-amber-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
    cancelled: 'text-gray-500',
  }

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      className="p-4 rounded-lg border border-white/10 cursor-pointer transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{job.name}</h3>
          <p className="text-sm text-gray-400 line-clamp-1">{job.description}</p>
        </div>
        <span className={`text-xs font-medium ml-3 ${statusStyles[job.status]}`}>
          {job.status === 'running' ? `${job.progress}%` : job.status}
        </span>
      </div>

      {/* Progress bar (only for running) */}
      {job.status === 'running' && (
        <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${job.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Agent avatars */}
        <div className="flex -space-x-2">
          {job.agents.map((ja) => (
            <AgentAvatar key={ja.agent_id} agentId={ja.agent_id} size="sm" />
          ))}
        </div>

        {/* Time */}
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  )
}
