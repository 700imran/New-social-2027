import React, { useEffect } from 'react'
import Logo from './Logo.jsx'

// The very first thing anyone sees on cold start, web or APK (same React
// tree either way — see App.jsx). Auto-advances on its own after
// `minDuration`; the caller doesn't need a button here, just onDone.
export default function LaunchSplash({ onDone, minDuration = 1600 }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), minDuration)
    return () => clearTimeout(t)
  }, [onDone, minDuration])

  return (
    <div className="app-shell relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-navy-950">
      <div className="pointer-events-none absolute inset-0 bg-sunset-arch opacity-25" />
      <div className="relative flex flex-col items-center">
        <Logo size={96} variant="brand" className="animate-logoBlink" />
        <h1 className="mt-5 font-display text-2xl font-extrabold text-white">BharatSpace</h1>
        <div
          className="mt-7 h-9 w-9 animate-spin rounded-full border-[3px] border-white/10"
          style={{ borderTopColor: '#FF9933', borderRightColor: '#C4A6FF' }}
          role="status"
          aria-label="Loading"
        />
      </div>
    </div>
  )
}
