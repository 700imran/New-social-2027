import React from 'react'
import { X, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

// Genuinely frontend-only: everything shown here is derived from data the
// app already has on `post`/`author` (topic, tags, location, whether you
// follow them) — nothing new to fetch or store. The value isn't the
// sophistication of the explanation, it's that tapping "why am I seeing
// this" always shows *something* concrete instead of nothing, which is
// the actual trust-building mechanism.
export default function WhySeeingModal({ post, author, following, onClose, onHide }) {
  const { selectedTopics } = useApp()

  const reasons = []
  if (post.tab && selectedTopics?.includes(post.tab)) {
    reasons.push(`You follow ${post.tab}`)
  }
  if (following) {
    reasons.push(`You follow ${author.name}`)
  }
  if (author.location) {
    reasons.push(`Popular with people near ${author.location}`)
  }
  if (!reasons.length) {
    reasons.push("It's active in the BharatSpace community right now")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50" onClick={onClose}>
      <div className="app-shell w-full rounded-t-2xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-navy-900">
            <Sparkles className="h-4 w-4 text-saffron-500" /> Why am I seeing this?
          </h2>
          <button onClick={onClose} className="focus-ring rounded-full p-1 text-ink-500" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="mt-4 flex flex-col gap-2.5">
          {reasons.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-ink-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-500" />
              {r}
            </li>
          ))}
        </ul>

        <button
          onClick={() => {
            onHide()
            onClose()
          }}
          className="mt-5 w-full rounded-full border border-ink-200 py-3 text-sm font-semibold text-ink-800"
        >
          Show less like this
        </button>
      </div>
    </div>
  )
}
