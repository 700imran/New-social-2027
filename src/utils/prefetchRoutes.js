// Warms a lazy route's JS chunk during idle time so the *next* screen a
// person is likely to open is already fetched/parsed by the time they
// navigate there — same "warm it before the tap, not after" idea as
// usePrefetchOnIntent.js, applied to route code instead of per-navigation
// data. Falls back to setTimeout where requestIdleCallback isn't
// available (Safari, and some Android WebViews).
export function prefetchOnIdle(importFns) {
  if (typeof window === 'undefined') return
  const run = () => importFns.forEach((fn) => fn().catch(() => {}))
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2000 })
  } else {
    setTimeout(run, 300)
  }
}
