import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

// Deliberately generic and data-driven (via router state) rather than one
// bespoke page per big feature — Creator Studio, Brand Studio, Events,
// Marketplace, etc. all need the exact same thing right now: a real entry
// point that exists in the nav so the app's surface area matches what's
// promised, without pretending any backend work is done. When one of
// these is actually built, swap its `navigate('/coming-soon', ...)` call
// for a real route — nothing else here needs to change.
const DEFAULTS = {
  title: 'Coming soon',
  description: "This is on the roadmap — we're building it properly rather than rushing it out.",
}

export default function ComingSoon() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { title, description, bullets } = { ...DEFAULTS, ...state }

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-3">
        <button onClick={() => navigate(-1)} className="focus-ring rounded-full p-1 text-ink-700" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-base font-bold text-navy-900">{title}</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-saffron-gradient text-white shadow-pop">
          <Sparkles className="h-7 w-7" />
        </span>
        <p className="mt-4 font-display text-lg font-bold text-navy-900">{title}</p>
        <p className="mt-2 text-sm text-ink-500">{description}</p>
        {bullets?.length > 0 && (
          <ul className="mt-5 flex flex-col gap-2 self-stretch text-left">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-500" />
                {b}
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => navigate(-1)}
          className="mt-7 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800"
        >
          Back
        </button>
      </div>
    </div>
  )
}
