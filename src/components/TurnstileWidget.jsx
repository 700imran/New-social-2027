import React, { useEffect, useRef } from 'react'

// Renders a Cloudflare Turnstile challenge and reports the resulting token
// via onVerify. Opt-in: if VITE_TURNSTILE_SITE_KEY isn't set, this renders
// nothing and onVerify is never called — SignUp/SignIn treat that the same
// as "no token", which the backend already handles as "Turnstile not
// configured, skip the check" (see backend/src/lib/security.js). Script
// tag lives in index.html; see docs/SECURITY.md for setup.
export default function TurnstileWidget({ onVerify, onExpire }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    if (!siteKey) return

    let cancelled = false
    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onVerify?.(token),
        'expired-callback': () => onExpire?.(),
        'error-callback': () => onExpire?.(),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      // index.html loads the Turnstile script with `async defer` — it may
      // not have executed yet on first mount, so poll briefly rather than
      // assuming a load order.
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval)
          render()
        }
      }, 100)
      return () => clearInterval(interval)
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [siteKey, onVerify, onExpire])

  if (!siteKey) return null
  return <div ref={containerRef} className="flex justify-center" />
}
