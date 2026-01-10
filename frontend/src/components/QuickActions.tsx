import { motion } from 'framer-motion'
import { Bot, BarChart3, Search } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cardVariants, containerVariants } from '../styles/animations'
import type { ModalType } from '../types'

interface ActionCard {
  id: ModalType
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}

const actions: ActionCard[] = [
  {
    id: 'deploy',
    icon: <Bot className="w-8 h-8" />,
    title: 'Deploy AI Agent',
    description: 'Launch Claude Code on target node',
    gradient: 'from-cyan-500/20 to-blue-500/20',
  },
  {
    id: 'automation',
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Run Automation',
    description: 'Execute predefined workflows',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    id: 'analysis',
    icon: <Search className="w-8 h-8" />,
    title: 'Analyze Logs',
    description: 'AI-powered log analysis',
    gradient: 'from-orange-500/20 to-amber-500/20',
  },
]

export function QuickActions() {
  const { openModal } = useStore()

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mb-6"
    >
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <motion.button
            key={action.id}
            variants={cardVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => openModal(action.id)}
            className={`
              glass-card p-4 text-left
              bg-gradient-to-br ${action.gradient}
              hover:border-white/30 transition-colors
              min-h-[100px] flex flex-col justify-between
            `}
          >
            <div className="text-neon-cyan mb-2">{action.icon}</div>
            <div>
              <h3 className="font-semibold text-white text-sm">{action.title}</h3>
              <p className="text-gray-400 text-xs mt-1">{action.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.section>
  )
}
