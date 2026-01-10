import { motion, useSpring, useTransform } from 'framer-motion'
import { Cpu, MemoryStick, HardDrive, Activity, Wifi } from 'lucide-react'
import { useEffect } from 'react'
import { useMetrics } from '../hooks'
import { useStore } from '../store/useStore'

interface AnimatedNumberProps {
  value: number
  decimals?: number
}

function AnimatedNumber({ value, decimals = 0 }: AnimatedNumberProps) {
  const spring = useSpring(0, { damping: 20, stiffness: 100 })
  const display = useTransform(spring, (v) => v.toFixed(decimals))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return <motion.span>{display}</motion.span>
}

interface MetricItemProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  unit?: string
  color: 'cyan' | 'yellow' | 'red' | 'green' | 'purple'
}

function MetricItem({ icon, label, value, unit, color }: MetricItemProps) {
  const colorClasses = {
    cyan: 'text-cyan-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
  }

  const glowColors = {
    cyan: 'rgba(0, 255, 255, 0.5)',
    yellow: 'rgba(234, 179, 8, 0.5)',
    red: 'rgba(239, 68, 68, 0.5)',
    green: 'rgba(34, 197, 94, 0.5)',
    purple: 'rgba(168, 85, 247, 0.5)',
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`${colorClasses[color]} opacity-70`}>{icon}</span>
      <div className="flex flex-col">
        <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">
          {label}
        </span>
        <span
          className={`text-sm font-bold font-mono ${colorClasses[color]}`}
          style={{ textShadow: `0 0 10px ${glowColors[color]}` }}
        >
          {value}
          {unit && <span className="text-[10px] text-gray-500 ml-0.5">{unit}</span>}
        </span>
      </div>
    </div>
  )
}

export function MetricsTicker() {
  const { metrics } = useMetrics()
  const { runningTaskCount } = useStore()
  const runningTasks = runningTaskCount()

  const avgCpu = metrics?.total_cpu_percent ?? 0
  const totalRamUsed = metrics?.total_ram_used_gb ?? 0
  const totalRamTotal = metrics?.total_ram_total_gb ?? 0
  const totalDiskUsed = metrics?.total_disk_used_tb ?? 0
  const nodesOnline = metrics?.nodes_online ?? 0
  const nodesTotal = metrics?.nodes_total ?? 0

  // Determine CPU color based on usage
  const cpuColor = avgCpu > 80 ? 'red' : avgCpu > 60 ? 'yellow' : 'green'
  const nodeColor = nodesOnline < nodesTotal ? 'yellow' : 'cyan'

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50">
      {/* Top border glow */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      <div className="bg-black/95 backdrop-blur-xl px-4 py-2 safe-bottom">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Left: System status */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
            </div>
            <span className="text-[10px] font-mono text-green-500 tracking-wider hidden sm:inline">
              SYSTEMS NOMINAL
            </span>
          </div>

          {/* Center: Metrics */}
          <div className="flex items-center gap-4 sm:gap-6">
            <MetricItem
              icon={<Cpu className="w-3.5 h-3.5" />}
              label="CPU"
              value={<AnimatedNumber value={avgCpu} />}
              unit="%"
              color={cpuColor}
            />

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <MetricItem
              icon={<MemoryStick className="w-3.5 h-3.5" />}
              label="RAM"
              value={
                <>
                  <AnimatedNumber value={totalRamUsed} decimals={1} />
                  <span className="text-gray-500 mx-0.5">/</span>
                  <AnimatedNumber value={totalRamTotal} decimals={0} />
                </>
              }
              unit="GB"
              color="cyan"
            />

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <MetricItem
              icon={<HardDrive className="w-3.5 h-3.5" />}
              label="DISK"
              value={<AnimatedNumber value={totalDiskUsed} decimals={2} />}
              unit="TB"
              color="purple"
            />

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <MetricItem
              icon={<Wifi className="w-3.5 h-3.5" />}
              label="NODES"
              value={`${nodesOnline}/${nodesTotal}`}
              color={nodeColor}
            />

            {runningTasks > 0 && (
              <>
                <div className="h-6 w-px bg-white/10" />
                <MetricItem
                  icon={<Activity className="w-3.5 h-3.5 animate-pulse" />}
                  label="ACTIVE"
                  value={runningTasks}
                  color="cyan"
                />
              </>
            )}
          </div>

          {/* Right: Timestamp */}
          <div className="text-[10px] font-mono text-gray-600 hidden sm:block">
            {new Date().toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </div>
    </footer>
  )
}
