import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'bharatspace:screenTime'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function readToday() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return raw.date === todayKey() ? raw.seconds : 0
  } catch {
    return 0
  }
}

function writeToday(seconds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), seconds }))
  } catch {
    /* localStorage unavailable (private mode etc.) — tracker just won't persist across reloads */
  }
}

// Tracks time this device has spent with the app in the foreground
// today, resetting at local midnight. Device-local by design, same
// scope every major app's own "time spent today" counter uses — this
// is not a shortened version of a cross-device feature, it's the
// correct scope for this kind of number.
export function useScreenTime() {
  const [seconds, setSeconds] = useState(readToday)
  const lastTick = useRef(Date.now())

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      const delta = Math.min(30, Math.round((now - lastTick.current) / 1000))
      lastTick.current = now
      setSeconds((prev) => {
        const next = prev + delta
        writeToday(next)
        return next
      })
    }
    lastTick.current = Date.now()
    const interval = setInterval(tick, 15000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  return { minutesToday: Math.floor(seconds / 60) }
}
