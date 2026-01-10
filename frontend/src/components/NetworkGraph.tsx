import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { useNodes } from '../hooks'
import { useStore } from '../store/useStore'
import type { Node } from '../types'

// Get color based on node status and CPU
function getNodeColor(node: Node): string {
  if (node.status === 'error') return '#ef4444'
  if (node.status === 'offline') return '#6b7280'
  if (node.cpu_percent > 80) return '#f59e0b'
  if (node.cpu_percent > 60) return '#eab308'
  return '#22c55e'
}

// Hexagon points generator
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

interface HexagonNodeProps {
  node: Node
  isCenter: boolean
}

function HexagonNode({ node, isCenter }: HexagonNodeProps) {
  const color = getNodeColor(node)
  const r = isCenter ? 12 : 9
  const cx = node.position.x
  const cy = node.position.y

  return (
    <g>
      {/* Glow filter */}
      <defs>
        <filter id={`glow-${node.id}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`gradient-${node.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {/* Outer ping ring - pulses */}
      {node.status !== 'offline' && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 6}
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.5"
          className="animate-ping-slow"
        />
      )}

      {/* Outer glow ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r + 4}
        fill="none"
        stroke={color}
        strokeWidth="0.5"
        opacity="0.4"
      />

      {/* Rotating dashes when busy */}
      {node.status === 'busy' && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 2}
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3 6"
          opacity="0.8"
          className="animate-spin-slow"
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      )}

      {/* Hexagon background fill */}
      <polygon
        points={getHexagonPoints(cx, cy, r)}
        fill={`url(#gradient-${node.id})`}
        stroke={color}
        strokeWidth="1.5"
        filter={`url(#glow-${node.id})`}
      />

      {/* Inner hexagon */}
      <polygon
        points={getHexagonPoints(cx, cy, r * 0.65)}
        fill={`${color}20`}
        stroke={color}
        strokeWidth="0.5"
        opacity="0.6"
      />

      {/* CPU percentage */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={isCenter ? '5' : '4'}
        fontWeight="bold"
        style={{ textShadow: `0 0 8px ${color}` }}
      >
        {node.cpu_percent.toFixed(0)}%
      </text>

      {/* Node name below */}
      <text
        x={cx}
        y={cy + r + 5}
        textAnchor="middle"
        fill={color}
        fontSize="3.5"
        fontWeight="500"
        className="font-mono"
        style={{ textShadow: `0 0 5px ${color}` }}
      >
        {node.name.toUpperCase()}
      </text>

      {/* Pod count badge */}
      {node.active_pods > 0 && (
        <g>
          <circle
            cx={cx + r - 2}
            cy={cy - r + 2}
            r="3"
            fill="#3b82f6"
            stroke="#1e3a5f"
            strokeWidth="0.5"
          />
          <text
            x={cx + r - 2}
            y={cy - r + 2.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="2.5"
            fontWeight="bold"
          >
            {node.active_pods}
          </text>
        </g>
      )}

      {/* Status indicator dot */}
      <circle
        cx={cx - r + 2}
        cy={cy - r + 2}
        r="1.5"
        fill={node.status === 'idle' ? '#22c55e' : node.status === 'busy' ? '#eab308' : '#ef4444'}
        className={node.status !== 'offline' ? 'animate-pulse' : ''}
      />
    </g>
  )
}

interface ConnectionLineProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  isActive: boolean
  index: number
}

function ConnectionLine({ from, to, isActive, index }: ConnectionLineProps) {
  const pathId = `connection-${index}`

  return (
    <g>
      {/* Base line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="rgba(0, 255, 255, 0.15)"
        strokeWidth="0.5"
        strokeDasharray="2 2"
      />

      {/* Glowing line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="rgba(0, 255, 255, 0.3)"
        strokeWidth="1"
        style={{ filter: 'drop-shadow(0 0 2px #00ffff)' }}
      />

      {/* Data flow particles when active */}
      {isActive && (
        <>
          <defs>
            <path id={pathId} d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`} />
          </defs>

          {/* Forward particles (cyan) */}
          {[0, 0.33, 0.66].map((delay, i) => (
            <circle key={`fwd-${i}`} r="1.5" fill="#00ffff">
              <animateMotion dur="2s" repeatCount="indefinite" begin={`${delay * 2}s`}>
                <mpath href={`#${pathId}`} />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                dur="2s"
                repeatCount="indefinite"
                begin={`${delay * 2}s`}
              />
            </circle>
          ))}

          {/* Reverse particles (purple) */}
          {[0.5, 1.0, 1.5].map((delay, i) => (
            <circle key={`rev-${i}`} r="1" fill="#a855f7">
              <animateMotion
                dur="2.5s"
                repeatCount="indefinite"
                begin={`${delay}s`}
                keyPoints="1;0"
                keyTimes="0;1"
              >
                <mpath href={`#${pathId}`} />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0;0.8;0.8;0"
                dur="2.5s"
                repeatCount="indefinite"
                begin={`${delay}s`}
              />
            </circle>
          ))}

          {/* Glow trail */}
          <circle r="3" fill="#00ffff" opacity="0.2" style={{ filter: 'blur(2px)' }}>
            <animateMotion dur="2s" repeatCount="indefinite">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        </>
      )}
    </g>
  )
}

function HUDOverlay() {
  return (
    <>
      {/* Top-left corner */}
      <g stroke="#00ffff" fill="none" strokeWidth="0.5" opacity="0.5">
        <path d="M 2 8 L 2 2 L 8 2" />
        <text x="10" y="5" fill="#00ffff" fontSize="2.5" className="font-mono">
          NETWORK TOPOLOGY
        </text>
      </g>

      {/* Top-right corner */}
      <g stroke="#00ffff" fill="none" strokeWidth="0.5" opacity="0.5">
        <path d="M 98 8 L 98 2 L 92 2" />
      </g>

      {/* Bottom-left corner */}
      <g stroke="#00ffff" fill="none" strokeWidth="0.5" opacity="0.5">
        <path d="M 2 67 L 2 73 L 8 73" />
      </g>

      {/* Bottom-right corner */}
      <g stroke="#00ffff" fill="none" strokeWidth="0.5" opacity="0.5">
        <path d="M 98 67 L 98 73 L 92 73" />
      </g>

      {/* Status bar at bottom */}
      <text x="50" y="72" textAnchor="middle" fill="#00ffff" fontSize="2" opacity="0.6" className="font-mono">
        PROXMOX CLUSTER • SECURE CONNECTION • REAL-TIME
      </text>
    </>
  )
}

export function NetworkGraph() {
  const { nodes, loading, error } = useNodes()
  const { runningTaskCount } = useStore()
  const hasRunningTasks = runningTaskCount() > 0

  // Find center node (proxmox-0)
  const centerNode = nodes.find((n) => n.id === 'proxmox-0')
  const otherNodes = nodes.filter((n) => n.id !== 'proxmox-0')

  // Memoize connections
  const connections = useMemo(() => {
    if (!centerNode) return []
    return otherNodes.map((node, index) => ({
      from: centerNode.position,
      to: node.position,
      index,
    }))
  }, [centerNode, otherNodes])

  // Loading state
  if (loading && nodes.length === 0) {
    return (
      <div className="w-full h-[280px] rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-4 mb-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <span className="text-cyan-500/70 text-sm font-mono">ESTABLISHING CONNECTION...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error && nodes.length === 0) {
    return (
      <div className="w-full h-[280px] rounded-xl border border-red-500/30 bg-black/40 backdrop-blur-sm p-4 mb-4 flex flex-col items-center justify-center">
        <p className="text-red-400 text-sm font-mono">CONNECTION FAILED</p>
        <p className="text-gray-500 text-xs mt-1">{error}</p>
      </div>
    )
  }

  if (!centerNode) return null

  return (
    <div className="w-full h-[280px] rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-4 mb-4 relative overflow-hidden">
      {/* Subtle scan line inside the container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
          animate={{ top: ['-5%', '105%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* HUD overlay */}
        <HUDOverlay />

        {/* Connection lines */}
        {connections.map((conn, i) => (
          <ConnectionLine
            key={i}
            from={conn.from}
            to={conn.to}
            isActive={hasRunningTasks}
            index={conn.index}
          />
        ))}

        {/* Center node (rendered last so it's on top) */}
        <HexagonNode node={centerNode} isCenter={true} />

        {/* Other nodes */}
        {otherNodes.map((node) => (
          <HexagonNode key={node.id} node={node} isCenter={false} />
        ))}
      </svg>
    </div>
  )
}
