import { motion, useSpring, useTransform } from 'framer-motion'
import { Cpu, MemoryStick, HardDrive, Activity } from 'lucide-react'
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

interface MetricProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  unit?: string
  color?: string
}

function Metric({ icon, label, value, unit, color = 'text-gray-300' }: MetricProps) {
  return (
    <div className="flex items-center gap-1.5 px-2">
      <span className={color}>{icon}</span>
      <span className="text-gray-500 text-[10px] uppercase hidden sm:inline">
        {label}:
      </span>
      <span className="text-white font-medium">
        {value}
        {unit && <span className="text-gray-400 text-[10px] ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}

export function MetricsTicker() {
  const { metrics } = useMetrics()
  const { runningTaskCount } = useStore()
  const runningTasks = runningTaskCount()

  // Use API metrics or fallback to 0
  const avgCpu = metrics?.total_cpu_percent ?? 0
  const totalRamUsed = metrics?.total_ram_used_gb ?? 0
  const totalRamTotal = metrics?.total_ram_total_gb ?? 0
  const totalDiskUsed = metrics?.total_disk_used_tb ?? 0

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-12 bg-black/80 backdrop-blur-lg border-t border-white/10 flex items-center justify-around text-xs z-50 safe-bottom">
      {/* CPU */}
      <Metric
        icon={<Cpu className="w-3.5 h-3.5" />}
        label="CPU"
        value={<AnimatedNumber value={avgCpu} />}
        unit="%"
        color={avgCpu > 80 ? 'text-red-400' : avgCpu > 60 ? 'text-amber-400' : 'text-green-400'}
      />

      {/* Divider */}
      <div className="h-4 w-px bg-white/20" />

      {/* RAM */}
      <Metric
        icon={<MemoryStick className="w-3.5 h-3.5" />}
        label="RAM"
        value={
          <>
            <AnimatedNumber value={totalRamUsed} decimals={1} />
            <span className="text-gray-500">/</span>
            <AnimatedNumber value={totalRamTotal} decimals={0} />
          </>
        }
        unit="GB"
        color="text-blue-400"
      />

      {/* Divider */}
      <div className="h-4 w-px bg-white/20" />

      {/* Disk */}
      <Metric
        icon={<HardDrive className="w-3.5 h-3.5" />}
        label="Disk"
        value={<AnimatedNumber value={totalDiskUsed} decimals={2} />}
        unit="TB"
        color="text-purple-400"
      />

      {/* Divider */}
      <div className="h-4 w-px bg-white/20" />

      {/* Tasks */}
      <Metric
        icon={<Activity className="w-3.5 h-3.5" />}
        label="Tasks"
        value={runningTasks}
        color={runningTasks > 0 ? 'text-neon-cyan' : 'text-gray-400'}
      />
    </footer>
  )
}
