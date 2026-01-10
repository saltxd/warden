import { motion, AnimatePresence } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { X, Rocket, Server, Loader2, Target, Terminal, Cpu, AlertTriangle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useNodes } from '../hooks'
import { useStore } from '../store/useStore'
import { mockTemplates } from '../data/mockData'
import { modalVariants, backdropVariants } from '../styles/animations'
import { API_URL } from '../config'
import type { Task, ModalType, Node } from '../types'

const modalConfig: Record<Exclude<ModalType, null>, { title: string; subtitle: string; color: string; glow: string }> = {
  deploy: {
    title: 'DEPLOY AI AGENT',
    subtitle: 'MISSION BRIEF // AI-001',
    color: 'cyan',
    glow: 'rgba(0, 255, 255, 0.5)',
  },
  automation: {
    title: 'RUN AUTOMATION',
    subtitle: 'MISSION BRIEF // WF-002',
    color: 'purple',
    glow: 'rgba(168, 85, 247, 0.5)',
  },
  analysis: {
    title: 'ANALYZE LOGS',
    subtitle: 'MISSION BRIEF // AN-003',
    color: 'amber',
    glow: 'rgba(245, 158, 11, 0.5)',
  },
}

interface NodeCardProps {
  node: Node
  isSelected: boolean
  onClick: () => void
}

function NodeCard({ node, isSelected, onClick }: NodeCardProps) {
  const isOffline = node.status === 'offline'
  const cpuColor = node.cpu_percent > 80 ? 'red' : node.cpu_percent > 60 ? 'yellow' : 'green'

  const colorClasses = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  }

  return (
    <button
      onClick={onClick}
      disabled={isOffline}
      className={`
        relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
        ${isSelected
          ? 'border-cyan-500/60 bg-cyan-500/10'
          : 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/5'
        }
        ${isOffline ? 'opacity-40 cursor-not-allowed' : ''}
      `}
      style={isSelected ? { boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)' } : {}}
    >
      {/* Node icon with status ring */}
      <div className="relative">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center border
            ${isSelected ? 'border-cyan-500/50 bg-cyan-500/20' : 'border-white/10 bg-white/5'}
          `}
        >
          <Server className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
        </div>
        {/* Status indicator */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900
            ${isOffline ? 'bg-gray-500' : 'bg-green-500'}
          `}
        />
      </div>

      {/* Node info */}
      <div className="flex-1 text-left min-w-0">
        <div className={`text-sm font-bold font-mono ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
          {node.name.toUpperCase()}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1">
            <Cpu className={`w-3 h-3 ${colorClasses[cpuColor]}`} />
            <span className={`text-[10px] font-mono ${colorClasses[cpuColor]}`}>
              {node.cpu_percent}%
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-500 uppercase">
            {node.status}
          </span>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center"
        >
          <div className="w-2 h-2 rounded-full bg-black" />
        </motion.div>
      )}
    </button>
  )
}

export function TaskModal() {
  const { nodes, loading: nodesLoading } = useNodes()
  const { isModalOpen, modalType, closeModal, addTask, setActiveTask } = useStore()

  const [prompt, setPrompt] = useState('')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [target, setTarget] = useState('')
  const [isLaunching, setIsLaunching] = useState(false)

  // Auto-select node with lowest CPU when modal opens
  useEffect(() => {
    if (isModalOpen && nodes.length > 0) {
      const lowestCpuNode = nodes.reduce((prev, curr) =>
        curr.cpu_percent < prev.cpu_percent ? curr : prev
      )
      setSelectedNode(lowestCpuNode.id)
    }
  }, [isModalOpen, nodes])

  // Reset form when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setPrompt('')
      setTarget('')
      setIsLaunching(false)
    }
  }, [isModalOpen])

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, closeModal])

  // Replace template variables with actual values
  const resolveTemplateVariables = useCallback((text: string, nodeId: string | null, targetPath: string) => {
    return text
      .replace(/\{node\}/g, nodeId || 'selected-node')
      .replace(/\{repo\}/g, targetPath || '/home/user/project')
  }, [])

  // Handle template selection
  const handleTemplateSelect = useCallback((template: typeof mockTemplates[0]) => {
    const resolved = resolveTemplateVariables(template.promptTemplate, selectedNode, target)
    setPrompt(resolved)
  }, [selectedNode, target, resolveTemplateVariables])

  // Handle drag to dismiss
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) {
      closeModal()
    }
  }

  // Handle launch
  const handleLaunch = async () => {
    if (!selectedNode || !prompt.trim()) return

    setIsLaunching(true)

    const taskType = modalType === 'deploy' ? 'claude-code' : modalType === 'analysis' ? 'analysis' : 'automation'
    const selectedNodeData = nodes.find((n) => n.id === selectedNode)

    // Resolve any remaining template variables in the prompt
    const resolvedPrompt = resolveTemplateVariables(prompt, selectedNode, target)
    const taskTarget = target || resolvedPrompt.slice(0, 30) + '...'

    try {
      // Call the backend API to create the task
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: taskType,
          target: taskTarget,
          description: resolvedPrompt,
          proxmox_node: selectedNode,
          k3s_node: selectedNodeData?.k3s_nodes[0] || null,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`)
      }

      const result = await response.json()

      // Create local task with the backend's task ID
      const newTask: Task = {
        id: result.id,
        type: taskType,
        status: 'running',
        target: taskTarget,
        description: resolvedPrompt.slice(0, 100),
        started_at: new Date().toISOString(),
        progress: 0,
        proxmox_node: selectedNode,
        k3s_node: selectedNodeData?.k3s_nodes[0],
        logs: [`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] Task queued - connecting to ${selectedNode}...`],
      }

      addTask(newTask)
      closeModal()
      setActiveTask(newTask)
    } catch (error) {
      console.error('Failed to create task:', error)
      // Still create a local task for now
      const newTask: Task = {
        id: `task_${Date.now()}`,
        type: taskType,
        status: 'failed',
        target: taskTarget,
        description: resolvedPrompt.slice(0, 100),
        started_at: new Date().toISOString(),
        progress: 0,
        proxmox_node: selectedNode,
        k3s_node: selectedNodeData?.k3s_nodes[0],
        logs: [`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] Failed to create task: ${error}`],
      }
      addTask(newTask)
      closeModal()
      setActiveTask(newTask)
    } finally {
      setIsLaunching(false)
    }
  }

  if (!modalType) return null

  const config = modalConfig[modalType]

  return (
    <AnimatePresence>
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeModal}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal container with border glow */}
            <div
              className="bg-gray-950 rounded-t-2xl border-t border-x border-cyan-500/30 relative"
              style={{ boxShadow: `0 -10px 40px ${config.glow}` }}
            >
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-cyan-500/50" />
              <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-cyan-500/50" />

              {/* Drag handle */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1 bg-cyan-500/30 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center">
                      <Target className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <span className="text-[9px] font-mono text-cyan-400/60 tracking-wider">
                      {config.subtitle}
                    </span>
                  </div>
                  <h2
                    className="text-xl font-bold text-cyan-400 tracking-wider"
                    style={{ textShadow: `0 0 20px ${config.glow}` }}
                  >
                    {config.title}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center hover:border-red-500/50 hover:bg-red-500/10 transition-all group"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 pb-8 space-y-5">
                {/* Prompt textarea */}
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mb-2 tracking-wider">
                    <Terminal className="w-3 h-3" />
                    MISSION OBJECTIVE
                  </label>
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe what the agent should accomplish..."
                      rows={4}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 resize-none transition-all"
                      style={{ boxShadow: prompt ? `0 0 20px ${config.glow}` : 'none' }}
                    />
                    {/* Character count */}
                    <span className="absolute bottom-2 right-2 text-[9px] font-mono text-gray-600">
                      {prompt.length}/500
                    </span>
                  </div>
                </div>

                {/* Template buttons */}
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mb-2 tracking-wider">
                    <AlertTriangle className="w-3 h-3" />
                    QUICK TEMPLATES
                  </label>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {mockTemplates.map((template) => (
                      <motion.button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-shrink-0 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 rounded-lg text-[11px] font-mono text-gray-300 transition-all whitespace-nowrap"
                      >
                        <span className="mr-1.5">{template.icon}</span>
                        {template.name}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Node selector */}
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mb-2 tracking-wider">
                    <Server className="w-3 h-3" />
                    TARGET NODE
                  </label>
                  {nodesLoading && nodes.length === 0 ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {[...nodes].sort((a, b) => a.cpu_percent - b.cpu_percent).map((node) => (
                        <NodeCard
                          key={node.id}
                          node={node}
                          isSelected={selectedNode === node.id}
                          onClick={() => setSelectedNode(node.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Target path input */}
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mb-2 tracking-wider">
                    <Target className="w-3 h-3" />
                    TARGET PATH
                    <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="/home/user/project"
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>

                {/* Launch button */}
                <motion.button
                  onClick={handleLaunch}
                  disabled={!selectedNode || !prompt.trim() || isLaunching}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative w-full py-4 rounded-lg font-bold text-sm tracking-wider
                    flex items-center justify-center gap-3
                    transition-all duration-200 overflow-hidden
                    ${!selectedNode || !prompt.trim() || isLaunching
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      : 'bg-cyan-500 text-black border border-cyan-400'
                    }
                  `}
                  style={
                    selectedNode && prompt.trim() && !isLaunching
                      ? { boxShadow: '0 0 30px rgba(0, 255, 255, 0.4)' }
                      : {}
                  }
                >
                  {/* Shimmer effect when enabled */}
                  {selectedNode && prompt.trim() && !isLaunching && (
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        backgroundSize: '200% 100%',
                      }}
                      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  )}

                  {isLaunching ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Rocket className="w-5 h-5" />
                      </motion.div>
                      <span>LAUNCHING...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      <span>INITIATE MISSION</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Bottom corner brackets */}
              <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-cyan-500/30" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-cyan-500/30" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
