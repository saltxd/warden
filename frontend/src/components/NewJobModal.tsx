import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'

interface NewJobModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; description: string; agentIds: string[] }) => void
}

const AGENT_PIPELINE = [
  {
    id: 'atlas',
    name: 'Atlas',
    role: 'Backend',
    description: 'Creates FastAPI backend with models, routes, and database',
    color: 'from-purple-500 to-purple-600',
    icon: '🏛️',
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'Frontend',
    description: 'Builds React UI with TypeScript and Tailwind CSS',
    color: 'from-cyan-500 to-cyan-600',
    icon: '✨',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    role: 'Reviewer',
    description: 'Reviews code for bugs, security issues, and best practices',
    color: 'from-green-500 to-green-600',
    icon: '🛡️',
  },
  {
    id: 'forge',
    name: 'Forge',
    role: 'DevOps',
    description: 'Creates Dockerfiles and docker-compose for deployment',
    color: 'from-orange-500 to-orange-600',
    icon: '🔥',
  },
]

const TEMPLATES = [
  {
    id: 'todo',
    name: 'Todo App',
    description: 'Simple todo list with add, delete, and complete functionality',
    icon: '✅',
    agents: ['atlas', 'nova'],
  },
  {
    id: 'counter',
    name: 'Counter',
    description: 'Counter with increment, decrement, and reset',
    icon: '🔢',
    agents: ['atlas', 'nova'],
  },
  {
    id: 'blog',
    name: 'Blog API',
    description: 'REST API for blog posts with CRUD operations',
    icon: '📝',
    agents: ['atlas'],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Admin dashboard with stats and data tables',
    icon: '📊',
    agents: ['atlas', 'nova'],
  },
  {
    id: 'notes',
    name: 'Notes App',
    description: 'Note-taking app with create, edit, and delete',
    icon: '📒',
    agents: ['atlas', 'nova'],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Start from scratch with your own idea',
    icon: '🎨',
    agents: [],
  },
]

export function NewJobModal({ isOpen, onClose, onSubmit }: NewJobModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['atlas', 'nova'])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    )
  }

  const selectTemplate = (template: (typeof TEMPLATES)[0]) => {
    setSelectedTemplate(template.id)
    if (template.id !== 'custom') {
      setName(template.name)
      setDescription(template.description)
      setSelectedAgents(template.agents)
    }
  }

  const handleSubmit = () => {
    if (!name || !description || selectedAgents.length === 0) return
    onSubmit({ name, description, agentIds: selectedAgents })
    // Reset form
    setName('')
    setDescription('')
    setSelectedAgents(['atlas', 'nova'])
    setSelectedTemplate(null)
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setSelectedAgents(['atlas', 'nova'])
    setSelectedTemplate(null)
    onClose()
  }

  const isValid = name.trim() && description.trim() && selectedAgents.length > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-[3vh] md:-translate-x-1/2
                       md:w-full md:max-w-2xl md:max-h-[94vh] bg-[#141414] rounded-xl border border-white/10
                       shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <h2 className="text-lg font-semibold text-white">New Job</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Start from template
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => selectTemplate(template)}
                      className={`p-3 rounded-lg border text-left transition ${
                        selectedTemplate === template.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="text-xl mb-1">{template.icon}</div>
                      <div className="text-sm font-medium text-white">{template.name}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Job Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Todo App"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg
                           text-white placeholder:text-gray-500
                           focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you want to build..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg
                           text-white placeholder:text-gray-500 resize-none
                           focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              {/* Agent Pipeline */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Build Pipeline</label>
                <p className="text-xs text-gray-500 mb-3">
                  Agents run in order. Each can see what previous agents created.
                </p>

                <div className="relative">
                  {/* Pipeline connector line */}
                  <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-white/10" />

                  {AGENT_PIPELINE.map((agent, idx) => (
                    <div
                      key={agent.id}
                      className={`relative flex items-start gap-4 p-3 rounded-lg cursor-pointer transition mb-2 ${
                        selectedAgents.includes(agent.id)
                          ? 'bg-white/10 border border-white/20'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                      onClick={() => toggleAgent(agent.id)}
                    >
                      {/* Step number */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 ${
                          selectedAgents.includes(agent.id)
                            ? `bg-gradient-to-br ${agent.color} text-white`
                            : 'bg-white/10 text-gray-500'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      {/* Agent info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{agent.icon}</span>
                          <span className="font-medium text-white">{agent.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                            {agent.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{agent.description}</p>
                      </div>

                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedAgents.includes(agent.id)
                            ? 'border-cyan-500 bg-cyan-500'
                            : 'border-gray-600'
                        }`}
                      >
                        {selectedAgents.includes(agent.id) && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick select buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedAgents(['atlas', 'nova'])}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition"
                  >
                    Full Stack
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgents(['atlas', 'nova', 'sentinel', 'forge'])}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition"
                  >
                    Complete Pipeline
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgents(['atlas'])}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition"
                  >
                    Backend Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgents(['nova'])}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition"
                  >
                    Frontend Only
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center flex-shrink-0">
              <div className="text-sm text-gray-500">
                {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white
                           hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isValid}
                  className="px-4 py-2 rounded-lg bg-white text-black font-medium
                           hover:bg-gray-200 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Job
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
