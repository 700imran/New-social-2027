import { useEffect, useState } from 'react'

// Tracks how many pixels of the viewport are currently covered by an
// on-screen keyboard (Gboard, etc.), using the VisualViewport API.
// Returns 0 whenever the keyboard is closed.
//
// Why this exists instead of trusting `dvh`/`svh` alone: those units are
// *supposed* to shrink when a soft keyboard opens, but that behavior is
// inconsistent across the Android WebView versions this app ships inside
// via Capacitor — some resize the layout viewport, some don't, and the
// gap between "should work" and "actually works on this device" is
// exactly where a chat/comment input ends up hidden behind the keyboard.
// Listening to `visualViewport` directly is the one mechanism that's
// reliable everywhere the API exists, and callers get 0 (i.e. "keyboard
// closed") on the rare browser that lacks it entirely, which is a safe
// default — they just fall back to their normal resting position.
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined

    const update = () => {
      // Anything no longer visible between the layout viewport and the
      // visual viewport is either the keyboard or (on iOS) address-bar
      // chrome — clamped to 0 so a sub-pixel rounding blip never reports
      // a negative inset that would push the input the wrong way.
      const covered = window.innerHeight - vv.height - vv.offsetTop
      setInset(Math.max(0, Math.round(covered)))
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
