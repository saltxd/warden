import { motion } from 'framer-motion'
import type { Agent } from '../types'
import { agentColors } from '../styles/design-system'

interface AgentCardProps {
  agent: Agent
  selected?: boolean
  onSelect?: () => void
  size?: 'sm' | 'md' | 'lg'
}

const StatusDot = ({ status }: { status: string }) => {
  const statusColors: Record<string, string> = {
    available: 'bg-green-500',
    working: 'bg-amber-500 animate-pulse',
    offline: 'bg-gray-500',
  }

  return (
    <span className={`w-2 h-2 rounded-full ${statusColors[status] || statusColors.offline}`} />
  )
}

export function AgentCard({ agent, selected, onSelect, size = 'md' }: AgentCardProps) {
  const colors = agentColors[agent.id]

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }

  const avatarSizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  }

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        w-full rounded-lg border text-left transition-all duration-200
        ${sizeClasses[size]}
        ${selected
          ? 'border-white/30 bg-white/10'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`${avatarSizes[size]} rounded-full flex items-center justify-center font-semibold text-white`}
          style={{
            background: colors
              ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
              : 'linear-gradient(135deg, #666, #444)',
          }}
        >
          {agent.name[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{agent.name}</span>
            <StatusDot status={agent.status} />
          </div>
          <div className="text-sm text-gray-400 truncate">
            {agent.spec} • {agent.skills.slice(0, 2).join(', ')}
          </div>
        </div>

        {/* Selection indicator */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}
