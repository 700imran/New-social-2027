import React, { useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const TRIGGER_DISTANCE = 64 // px of pull before releasing triggers a refresh
const MAX_PULL = 96 // visual cap so the indicator can't be dragged off-screen

// Wrap any scrollable feed with this to get native-feeling pull-to-refresh.
// Deliberately only intercepts the gesture when the page is already
// scrolled to the very top and the finger is moving downward — everything
// else (normal scroll, scrolling back up from mid-feed) is left completely
// alone, so this can never be mistaken for broken/sluggish scrolling.
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const pulling = useRef(false)

  const handleTouchStart = (e) => {
    if (window.scrollY > 0 || refreshing) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }

  const handleTouchMove = (e) => {
    if (!pulling.current || startY.current === null) return
    const delta = e.touches[0].clientY - startY.current
    if (delta <= 0) {
      setPullDistance(0)
      return
    }
    // Diminishing returns past the trigger point so it feels like pulling
    // against resistance rather than a 1:1 drag that just gets pinned at MAX_PULL.
    const eased = delta < TRIGGER_DISTANCE ? delta : TRIGGER_DISTANCE + (delta - TRIGGER_DISTANCE) * 0.3
    setPullDistance(Math.min(eased, MAX_PULL))
  }

  const handleTouchEnd = async () => {
    if (!pulling.current) return
    pulling.current = false
    startY.current = null
    if (pullDistance >= TRIGGER_DISTANCE) {
      setRefreshing(true)
      setPullDistance(TRIGGER_DISTANCE)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }

  const indicatorHeight = refreshing ? TRIGGER_DISTANCE : pullDistance

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden text-ink-400 transition-[height] duration-150"
        style={{ height: indicatorHeight }}
        aria-hidden={indicatorHeight === 0}
      >
        <RefreshCw
          className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
          style={!refreshing ? { transform: `rotate(${(pullDistance / TRIGGER_DISTANCE) * 360}deg)` } : undefined}
        />
      </div>
      <div style={pullDistance && !refreshing ? { transform: `translateY(${pullDistance * 0.4}px)` } : undefined}>
        {children}
      </div>
    </div>
  )
}
