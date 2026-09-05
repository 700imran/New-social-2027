import React from 'react'

// Catches render errors anywhere below it in the tree. Without this,
// nothing in the app did — an uncaught error in any component would
// unmount the whole React tree and leave a blank white screen with no
// way back in except a hard refresh. This is the one thing in
// "Errors: never expose raw technical errors to users" that isn't a
// per-endpoint concern (see backend/src/lib/errorHandler.js for that
// side) and needs a single root-level catch instead.
export default class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // TODO: forward to a real error-tracking service once one is wired
    // up (see the perceived-performance audit's P2.9) — for now this is
    // at least visible in devtools instead of vanishing silently.
    console.error('[ErrorBoundary] caught a render error', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.assign('/home')
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink-50 px-6 text-center">
        <p className="font-display text-base font-semibold text-ink-900">Something went wrong</p>
        <p className="text-sm text-ink-500">Give it another try — your session is still saved.</p>
        <button
          onClick={this.handleReload}
          className="mt-2 rounded-full bg-saffron-gradient px-5 py-2 text-sm font-semibold text-white shadow-pop"
        >
          Back to Home
        </button>
      </div>
    )
  }
}
