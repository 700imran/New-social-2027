import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Send } from 'lucide-react'
import Logo from './Logo.jsx'
import { useApp } from '../context/AppContext.jsx'

// Top bar for the Home feed: app name/logo on the left, exactly two
// icons on the right — Activity (bell) and Messages (paper-plane, the
// "Telegram-like chat icon" from the UI review) — per the annotated
// screenshot review. Reels moved to the bottom nav (see BottomNav.jsx);
// search lives on the Discover tab, one tap away, instead of duplicating
// it here.
export default function HomeTopNav() {
  const navigate = useNavigate()
  const { unreadCount } = useApp()

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur">
      <button onClick={() => navigate('/home')} className="focus-ring rounded-md" aria-label="BharatSpace home">
        <Logo size={26} withWordmark wordmarkClass="text-navy-900 text-[17px]" />
      </button>
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/activity')}
          className="focus-ring relative rounded-full p-1 text-ink-700 transition-transform active:scale-90"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-bharat-red px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/messages')}
          className="focus-ring rounded-full p-1 text-ink-700 transition-transform active:scale-90"
          aria-label="Messages"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
