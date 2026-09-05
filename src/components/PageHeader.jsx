import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PageHeader({ title, showBack = false, right = null }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="focus-ring -ml-1 rounded-full p-1.5 text-ink-700 transition-transform active:scale-90"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg font-display font-bold text-navy-900">{title}</h1>
      </div>
      {right}
    </header>
  )
}
