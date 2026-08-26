import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'
import Logo from './Logo.jsx'
import Avatar from './Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'
import SearchOverlay from './SearchOverlay.jsx'

export default function HomeTopNav() {
  const navigate = useNavigate()
  const { currentUser, unreadCount } = useApp()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate('/home')} className="focus-ring rounded-md" aria-label="BharatSpace home">
          <Logo size={26} withWordmark wordmarkClass="text-navy-900 text-[17px]" />
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="focus-ring rounded-full p-1 text-ink-700 transition-transform active:scale-90"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
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
          <button onClick={() => navigate('/profile')} className="focus-ring rounded-full" aria-label="Your profile">
            <Avatar user={currentUser} size="sm" showVerified={false} />
          </button>
        </div>
      </header>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  )
}
