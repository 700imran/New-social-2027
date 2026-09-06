import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import BottomNav from './BottomNav.jsx'
import ToastStack from './ToastStack.jsx'

export default function AppLayout() {
  const { isAuthenticated, isOffline } = useApp()

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-ink-50">
      {isOffline && (
        <div className="flex items-center justify-center gap-1.5 bg-navy-900 py-1.5 text-[11px] font-semibold text-white">
          <WifiOff className="h-3 w-3" /> You're offline — showing saved content
        </div>
      )}
      <div className="flex-1 pb-20">
        <Outlet />
      </div>
      <BottomNav />
      <ToastStack />
    </div>
  )
}
