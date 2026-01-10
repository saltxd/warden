import { Bell, User, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'

export function Header() {
  const { unreadNotificationCount, clearNotifications } = useStore()
  const unreadCount = unreadNotificationCount()

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-black/90 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-4 z-50 safe-top">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Zap className="w-6 h-6 text-neon-cyan" />
        <h1 className="text-xl font-bold neon-text-cyan tracking-wider">CITADEL</h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          onClick={clearNotifications}
          className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <button
          className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
          aria-label="User menu"
        >
          <User className="w-4 h-4 text-gray-300" />
        </button>
      </div>
    </header>
  )
}
