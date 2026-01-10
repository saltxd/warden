import { motion, AnimatePresence } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { X, Rocket, Server, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useNodes } from '../hooks'
import { useStore } from '../store/useStore'
import { mockTemplates } from '../data/mockData'
import { modalVariants, backdropVariants } from '../styles/animations'
import { API_URL } from '../config'
import type { Task, ModalType } from '../types'

const modalTitles: Record<Exclude<ModalType, null>, string> = {
  deploy: 'DEPLOY AI AGENT',
  automation: 'RUN AUTOMATION',
  analysis: 'ANALYZE LOGS',
}

const modalDescriptions: Record<Exclude<ModalType, null>, string> = {
  deploy: 'Launch a Claude Code agent on the target node',
  automation: 'Execute an automated workflow',
  analysis: 'Run AI-powered analysis on logs',
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{modalTitles[modalType]}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{modalDescriptions[modalType]}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-6 space-y-4">
              {/* Prompt textarea */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  What should the agent do?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the task..."
                  rows={4}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 resize-none"
                />
              </div>

              {/* Template buttons */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Quick Templates
                </label>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {mockTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="flex-shrink-0 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs text-gray-300 transition-colors whitespace-nowrap"
                    >
                      <span className="mr-1">{template.icon}</span>
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Node selector */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Target Node
                </label>
                {nodesLoading && nodes.length === 0 ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-neon-cyan animate-spin" />
                  </div>
                ) : (
                <div className="grid grid-cols-2 gap-2">
                  {[...nodes].sort((a, b) => a.cpu_percent - b.cpu_percent).map((node) => (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNode(node.id)}
                      disabled={node.status === 'offline'}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                        ${selectedNode === node.id
                          ? 'border-neon-cyan bg-neon-cyan/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }
                        ${node.status === 'offline' ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <Server className={`w-4 h-4 ${selectedNode === node.id ? 'text-neon-cyan' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <div className={`text-sm font-medium ${selectedNode === node.id ? 'text-neon-cyan' : 'text-white'}`}>
                          {node.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          CPU: {node.cpu_percent}% | {node.status}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                )}
              </div>

              {/* Target input */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Target Path (optional)
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="/home/user/project"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50"
                />
              </div>

              {/* Launch button */}
              <motion.button
                onClick={handleLaunch}
                disabled={!selectedNode || !prompt.trim() || isLaunching}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2
                  transition-all duration-200
                  ${!selectedNode || !prompt.trim() || isLaunching
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-neon-cyan text-black hover:neon-glow-cyan'
                  }
                `}
              >
                {isLaunching ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Rocket className="w-4 h-4" />
                    </motion.div>
                    Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Launch Agent
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
