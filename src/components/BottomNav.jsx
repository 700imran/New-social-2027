import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, Plus, Bell, User } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const linkBase =
  'flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium transition-colors focus-ring rounded-lg'

export default function BottomNav() {
  const { unreadCount } = useApp()

  return (
    <nav className="app-shell fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-ink-100 bg-white/95 backdrop-blur px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1">
      <div className="flex items-center">
        <NavLink
          to="/home"
          className={({ isActive }) => `${linkBase} ${isActive ? 'text-saffron-600' : 'text-ink-500'}`}
        >
          {({ isActive }) => (
            <>
              <Home className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.15 : 0} />
              Home
            </>
          )}
        </NavLink>

        <NavLink
          to="/discover"
          className={({ isActive }) => `${linkBase} ${isActive ? 'text-saffron-600' : 'text-ink-500'}`}
        >
          <Search className="h-5 w-5" strokeWidth={2} />
          Discover
        </NavLink>

        <NavLink
          to="/create"
          className="flex flex-1 items-center justify-center"
          aria-label="Create post"
        >
          {({ isActive }) => (
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full bg-saffron-gradient text-white shadow-pop transition-transform active:scale-90 ${isActive ? 'scale-105' : ''}`}
            >
              <Plus className="h-6 w-6" strokeWidth={2.6} />
            </span>
          )}
        </NavLink>

        <NavLink
          to="/activity"
          className={({ isActive }) => `${linkBase} relative ${isActive ? 'text-saffron-600' : 'text-ink-500'}`}
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                <Bell className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.15 : 0} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-bharat-red px-0.5 text-[8px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </span>
              Activity
            </>
          )}
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `${linkBase} ${isActive ? 'text-saffron-600' : 'text-ink-500'}`}
        >
          <User className="h-5 w-5" strokeWidth={2} />
          Profile
        </NavLink>
      </div>
    </nav>
  )
}
