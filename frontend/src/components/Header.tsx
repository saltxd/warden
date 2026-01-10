import { motion } from 'framer-motion'
import { Bell, User, Zap, Shield } from 'lucide-react'
import { useStore } from '../store/useStore'

export function Header() {
  const { unreadNotificationCount, clearNotifications } = useStore()
  const unreadCount = unreadNotificationCount()

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="h-16 bg-black/95 backdrop-blur-xl flex items-center justify-between px-4 safe-top">
        {/* Logo section */}
        <div className="flex items-center gap-3">
          {/* Animated logo container */}
          <div className="relative">
            {/* Outer ring */}
            <div className="w-10 h-10 rounded-full border border-cyan-500/50 flex items-center justify-center">
              {/* Inner glow */}
              <div className="absolute inset-1 rounded-full bg-cyan-500/10" />

              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full border border-cyan-400/50"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Lightning bolt icon */}
              <Zap
                className="w-5 h-5 text-cyan-400 relative z-10"
                style={{ filter: 'drop-shadow(0 0 6px rgba(0, 255, 255, 0.8))' }}
              />
            </div>

            {/* Status dot */}
            <div className="absolute -bottom-0.5 -right-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-black" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            </div>
          </div>

          {/* Title section */}
          <div className="flex flex-col">
            <h1
              className="text-xl font-bold tracking-[0.2em] text-cyan-400 leading-tight"
              style={{ textShadow: '0 0 20px rgba(0, 255, 255, 0.7), 0 0 40px rgba(0, 255, 255, 0.4)' }}
            >
              CITADEL
            </h1>
            <span className="text-[9px] font-mono text-gray-500 tracking-[0.3em] uppercase">
              Command Center v2.0
            </span>
          </div>
        </div>

        {/* Center status indicator (hidden on very small screens) */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded border border-cyan-500/20 bg-cyan-500/5">
          <Shield className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-mono text-cyan-400/80 tracking-wider">SECURE</span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            onClick={clearNotifications}
            className="relative p-2 rounded-lg border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-200 group"
            aria-label="Notifications"
          >
            <Bell
              className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors"
              style={{ filter: unreadCount > 0 ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))' : 'none' }}
            />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>

          {/* User avatar */}
          <button
            className="relative w-9 h-9 rounded-full border border-cyan-500/30 bg-gray-900 flex items-center justify-center hover:border-cyan-400/60 hover:bg-cyan-500/10 transition-all duration-200 group overflow-hidden"
            aria-label="User menu"
          >
            {/* Hexagon pattern background */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 0l8.66 5v10L10 20l-8.66-5V5z' fill='none' stroke='%2300ffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
                backgroundSize: '10px 10px',
              }}
            />
            <User className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors relative z-10" />
          </button>
        </div>
      </div>

      {/* Bottom border with glow effect */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
      <div
        className="h-[2px] -mt-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent)',
          filter: 'blur(1px)',
        }}
      />
    </header>
  )
}
