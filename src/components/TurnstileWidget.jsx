import React, { useEffect, useRef } from 'react'

// Renders a Cloudflare Turnstile challenge and reports the resulting token
// via onVerify. Opt-in: if VITE_TURNSTILE_SITE_KEY isn't set, this renders
// nothing and onVerify is never called — SignUp/SignIn treat that the same
// as "no token", which the backend already handles as "Turnstile not
// configured, skip the check" (see backend/src/lib/security.js).
//
// The api.js script is injected by this component itself, on demand,
// rather than sitting in index.html — that used to mean every page load
// (home feed, reels, settings, everything) fetched Cloudflare's script for
// a challenge that only ever renders on SignUp/SignIn. See docs/SECURITY.md
// for setup.
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve()
  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
  if (existing) {
    return new Promise((resolve) => existing.addEventListener('load', resolve, { once: true }))
  }
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', resolve, { once: true })
    document.head.appendChild(script)
  })
}

export default function TurnstileWidget({ onVerify, onExpire }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    if (!siteKey) return

    let cancelled = false
    let pollInterval = null

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
      loadTurnstileScript().then(() => {
        if (cancelled) return
        if (window.turnstile) {
          render()
          return
        }
        // `load` firing doesn't strictly guarantee window.turnstile is
        // already assigned the instant the event handler runs — a short
        // poll as a safety net, same as this component always did before
        // the script tag moved from index.html to here.
        pollInterval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(pollInterval)
            render()
          }
        }, 100)
      })
    }

    return () => {
      cancelled = true
      if (pollInterval) clearInterval(pollInterval)
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [siteKey, onVerify, onExpire])

  if (!siteKey) return null
  return <div ref={containerRef} className="flex justify-center" />
}
