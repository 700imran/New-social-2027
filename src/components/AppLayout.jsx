import React, { useEffect, useRef } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useKeyboardInset } from '../utils/useKeyboardInset.js'
import { useScreenTime } from '../utils/useScreenTime.js'
import BottomNav from './BottomNav.jsx'
import ToastStack from './ToastStack.jsx'

export default function AppLayout() {
  const { isAuthenticated, isOffline, userSettings, pushToast } = useApp()
  // Global, not per-page: any open keyboard (chat, comments, search, a
  // caption field) hides BottomNav entirely rather than leaving it to
  // sit underneath — and drops the pb-20 space reserved for it, so the
  // page below gets that room back instead of an empty gap sitting
  // above the keyboard. See useKeyboardInset.js for why this is a
  // measured value, not a guessed constant.
  const keyboardInset = useKeyboardInset()
  const keyboardOpen = keyboardInset > 0

  // Settings -> Your Time -> Time management's reminder. Fires once per
  // day the instant minutesToday crosses the threshold, from wherever the
  // person happens to be — mounted here (the shell every authenticated
  // screen renders inside) rather than on the Time management screen
  // itself, which most sessions never visit.
  const { minutesToday } = useScreenTime()
  const remindedRef = useRef(false)
  useEffect(() => {
    const threshold = userSettings.focus.dailyReminderMinutes
    if (!threshold || remindedRef.current) return
    if (minutesToday >= threshold) {
      remindedRef.current = true
      pushToast(`You've spent ${minutesToday} minutes on BharatSpace today`)
    }
  }, [minutesToday, userSettings.focus.dailyReminderMinutes, pushToast])

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
      <div className={`flex-1 ${keyboardOpen ? '' : 'pb-20'}`}>
        <Outlet />
      </div>
      {!keyboardOpen && <BottomNav />}
      <ToastStack />
    </div>
  )
}
