import React from 'react'

// Same visual switch CreatePost.jsx already uses for "Post in relevant
// topics" (bg-saffron-500/bg-ink-300 track, sliding white thumb) — pulled
// out here since the new live Settings screens need several of these.
export default function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-50 ${
        checked ? 'bg-saffron-500' : 'bg-ink-300'
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
