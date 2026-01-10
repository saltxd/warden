import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useNodes } from '../hooks'
import { useStore } from '../store/useStore'
import type { Node, NodeStatus } from '../types'

// Get glow color based on node status
function getStatusColor(status: NodeStatus): string {
  switch (status) {
    case 'idle':
      return '#22c55e' // green-500
    case 'busy':
      return '#fbbf24' // amber-400
    case 'error':
      return '#ef4444' // red-500
    case 'offline':
      return '#6b7280' // gray-500
    default:
      return '#6b7280'
  }
}

// Get pulse animation based on status
function getPulseAnimation(status: NodeStatus) {
  switch (status) {
    case 'idle':
      return { scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }
    case 'busy':
      return { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }
    case 'error':
      return { scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }
    default:
      return { scale: 1, opacity: 0.5 }
  }
}

function getPulseDuration(status: NodeStatus): number {
  switch (status) {
    case 'idle':
      return 2
    case 'busy':
      return 1
    case 'error':
      return 0.5
    default:
      return 0
  }
}

// Hexagon points for SVG
function getHexagonPoints(cx: number, cy: number, r: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}

interface NodeComponentProps {
  node: Node
  isCenter: boolean
}

function NodeComponent({ node, isCenter }: NodeComponentProps) {
  const color = getStatusColor(node.status)
  const pulseAnimation = getPulseAnimation(node.status)
  const pulseDuration = getPulseDuration(node.status)
  const r = isCenter ? 8 : 6 // Hexagon radius

  return (
    <g>
      {/* Glow filter definition */}
      <defs>
        <filter id={`glow-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Animated glow ring */}
      {node.status !== 'offline' && (
        <motion.circle
          cx={node.position.x}
          cy={node.position.y}
          r={r + 3}
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity="0.5"
          animate={pulseAnimation}
          transition={{
            duration: pulseDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Hexagon node */}
      <motion.polygon
        points={getHexagonPoints(node.position.x, node.position.y, r)}
        fill={`${color}20`}
        stroke={color}
        strokeWidth="1.5"
        filter={`url(#glow-${node.id})`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: isCenter ? 0 : 0.1 }}
        style={{ transformOrigin: `${node.position.x}px ${node.position.y}px` }}
      />

      {/* CPU percentage inside hexagon */}
      <text
        x={node.position.x}
        y={node.position.y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white text-[4px] font-bold"
      >
        {node.cpu_percent}%
      </text>

      {/* Node name below */}
      <text
        x={node.position.x}
        y={node.position.y + r + 5}
        textAnchor="middle"
        className="fill-gray-300 text-[3.5px] font-mono"
      >
        {node.name}
      </text>

      {/* Pod count badge */}
      {node.active_pods > 0 && (
        <g>
          <circle
            cx={node.position.x + r - 1}
            cy={node.position.y - r + 2}
            r="2.5"
            fill="#3b82f6"
          />
          <text
            x={node.position.x + r - 1}
            y={node.position.y - r + 2.5}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white text-[2px] font-bold"
          >
            {node.active_pods}
          </text>
        </g>
      )}
    </g>
  )
}

// Animated particle along a path
interface ParticleProps {
  x1: number
  y1: number
  x2: number
  y2: number
  delay: number
  color: string
}

function Particle({ x1, y1, x2, y2, delay, color }: ParticleProps) {
  return (
    <motion.circle
      r="1"
      fill={color}
      initial={{ cx: x1, cy: y1, opacity: 0 }}
      animate={{
        cx: [x1, x2],
        cy: [y1, y2],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        delay,
        ease: 'linear',
      }}
    />
  )
}

export function NetworkGraph() {
  const { nodes, loading, error } = useNodes()
  const { runningTaskCount } = useStore()
  const hasRunningTasks = runningTaskCount() > 0

  // Find center node (proxmox-0)
  const centerNode = nodes.find((n) => n.id === 'proxmox-0')
  const otherNodes = nodes.filter((n) => n.id !== 'proxmox-0')

  // Loading state
  if (loading && nodes.length === 0) {
    return (
      <div className="w-full h-[250px] glass-card p-4 mb-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    )
  }

  // Error state
  if (error && nodes.length === 0) {
    return (
      <div className="w-full h-[250px] glass-card p-4 mb-4 flex flex-col items-center justify-center">
        <p className="text-red-400 text-sm">Failed to load nodes</p>
        <p className="text-gray-500 text-xs mt-1">{error}</p>
      </div>
    )
  }

  if (!centerNode) return null

  return (
    <div className="w-full h-[250px] glass-card p-4 mb-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Network Topology
      </h2>
      <svg
        viewBox="0 0 100 75"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Connection lines from center to other nodes */}
        {otherNodes.map((node) => (
          <g key={`line-${node.id}`}>
            <line
              x1={centerNode.position.x}
              y1={centerNode.position.y}
              x2={node.position.x}
              y2={node.position.y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />

            {/* Animated particles when tasks are running */}
            {hasRunningTasks && (
              <>
                <Particle
                  x1={centerNode.position.x}
                  y1={centerNode.position.y}
                  x2={node.position.x}
                  y2={node.position.y}
                  delay={0}
                  color="#00ffff"
                />
                <Particle
                  x1={centerNode.position.x}
                  y1={centerNode.position.y}
                  x2={node.position.x}
                  y2={node.position.y}
                  delay={0.7}
                  color="#00ffff"
                />
                <Particle
                  x1={node.position.x}
                  y1={node.position.y}
                  x2={centerNode.position.x}
                  y2={centerNode.position.y}
                  delay={1.4}
                  color="#a855f7"
                />
              </>
            )}
          </g>
        ))}

        {/* Render center node first (so it's on top) */}
        <NodeComponent node={centerNode} isCenter={true} />

        {/* Render other nodes */}
        {otherNodes.map((node) => (
          <NodeComponent key={node.id} node={node} isCenter={false} />
        ))}
      </svg>
    </div>
  )
}
