import { motion } from 'framer-motion'
import { Bot, BarChart3, Search, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ModalType } from '../types'

interface ActionCard {
  id: ModalType
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  color: 'cyan' | 'purple' | 'amber'
}

const colorConfig = {
  cyan: {
    border: 'border-cyan-500/30',
    hoverBorder: 'hover:border-cyan-400/60',
    bg: 'bg-cyan-500/5',
    hoverBg: 'hover:bg-cyan-500/10',
    text: 'text-cyan-400',
    glow: 'rgba(0, 255, 255, 0.6)',
    gradient: 'from-cyan-500/20 via-transparent to-cyan-500/20',
  },
  purple: {
    border: 'border-purple-500/30',
    hoverBorder: 'hover:border-purple-400/60',
    bg: 'bg-purple-500/5',
    hoverBg: 'hover:bg-purple-500/10',
    text: 'text-purple-400',
    glow: 'rgba(168, 85, 247, 0.6)',
    gradient: 'from-purple-500/20 via-transparent to-purple-500/20',
  },
  amber: {
    border: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-400/60',
    bg: 'bg-amber-500/5',
    hoverBg: 'hover:bg-amber-500/10',
    text: 'text-amber-400',
    glow: 'rgba(245, 158, 11, 0.6)',
    gradient: 'from-amber-500/20 via-transparent to-amber-500/20',
  },
}

const actions: ActionCard[] = [
  {
    id: 'deploy',
    icon: <Bot className="w-6 h-6" />,
    title: 'DEPLOY AGENT',
    subtitle: 'AI-001',
    description: 'Launch Claude Code on target node',
    color: 'cyan',
  },
  {
    id: 'automation',
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'RUN AUTOMATION',
    subtitle: 'WF-002',
    description: 'Execute predefined workflows',
    color: 'purple',
  },
  {
    id: 'analysis',
    icon: <Search className="w-6 h-6" />,
    title: 'ANALYZE LOGS',
    subtitle: 'AN-003',
    description: 'AI-powered log analysis',
    color: 'amber',
  },
]

interface HolographicCardProps {
  action: ActionCard
  onClick: () => void
  index: number
}

function HolographicCard({ action, onClick, index }: HolographicCardProps) {
  const colors = colorConfig[action.color]

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative w-full text-left p-4 rounded-lg
        border ${colors.border} ${colors.hoverBorder}
        ${colors.bg} ${colors.hoverBg}
        transition-all duration-300 group overflow-hidden
      `}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div
          className="absolute inset-0 animate-shimmer"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.glow.replace('0.6', '0.1')}, transparent)`,
            backgroundSize: '200% 100%',
          }}
        />
      </div>

      {/* Corner brackets */}
      <div className="absolute top-1 left-1 w-3 h-3 border-l border-t border-current opacity-30" style={{ color: colors.glow }} />
      <div className="absolute top-1 right-1 w-3 h-3 border-r border-t border-current opacity-30" style={{ color: colors.glow }} />
      <div className="absolute bottom-1 left-1 w-3 h-3 border-l border-b border-current opacity-30" style={{ color: colors.glow }} />
      <div className="absolute bottom-1 right-1 w-3 h-3 border-r border-b border-current opacity-30" style={{ color: colors.glow }} />

      {/* Card content */}
      <div className="relative z-10 flex items-start gap-3">
        {/* Icon container */}
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-lg
            border ${colors.border} ${colors.bg}
            flex items-center justify-center
            ${colors.text}
          `}
          style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
        >
          {action.icon}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Title row with code badge */}
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`font-bold text-sm tracking-wider ${colors.text}`}
              style={{ textShadow: `0 0 10px ${colors.glow}` }}
            >
              {action.title}
            </h3>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
              {action.subtitle}
            </span>
          </div>

          {/* Description */}
          <p className="text-[11px] text-gray-500 font-mono leading-relaxed">
            {action.description}
          </p>
        </div>

        {/* Arrow indicator */}
        <ChevronRight
          className={`w-4 h-4 ${colors.text} opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1`}
        />
      </div>

      {/* Bottom scan line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)` }}
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  )
}

export function QuickActions() {
  const { openModal } = useStore()

  return (
    <section className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/50 to-transparent" />
        <h2 className="text-[10px] font-mono text-cyan-400/80 tracking-[0.3em] uppercase">
          Quick Actions
        </h2>
        <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/50 to-transparent" />
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action, index) => (
          <HolographicCard
            key={action.id}
            action={action}
            onClick={() => openModal(action.id)}
            index={index}
          />
        ))}
      </div>
    </section>
  )
}
