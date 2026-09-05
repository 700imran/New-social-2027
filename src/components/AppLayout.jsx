import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import BottomNav from './BottomNav.jsx'
import ToastStack from './ToastStack.jsx'

export default function AppLayout() {
  const { isAuthenticated } = useApp()

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-ink-50">
      <div className="flex-1 pb-20">
        <Outlet />
      </div>
      <BottomNav />
      <ToastStack />
    </div>
  )
}
