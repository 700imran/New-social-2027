import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { TOPICS } from '../data/mockData.js'
import { useApp } from '../context/AppContext.jsx'

const TONES = [
  'from-saffron-400 to-saffron-600',
  'from-navy-700 to-navy-950',
  'from-emerald-400 to-bharat-green',
  'from-blue-400 to-blue-700',
  'from-purple-400 to-fuchsia-700',
  'from-teal-400 to-cyan-700',
  'from-amber-400 to-orange-600',
  'from-lime-400 to-green-700',
  'from-rose-400 to-red-700',
]

export default function InterestSelection() {
  const navigate = useNavigate()
  const { completeOnboarding } = useApp()
  const [selected, setSelected] = useState([])

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const handleStart = () => {
    completeOnboarding(selected)
    navigate('/home')
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-white px-5 pb-8 pt-10">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-navy-900">What interests you?</h1>
        <p className="mt-2 text-sm text-ink-500">Get a personalised feed with content that matters to you</p>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-3">
        {TOPICS.map((topic, i) => {
          const isSelected = selected.includes(topic.id)
          return (
            <button
              key={topic.id}
              onClick={() => toggle(topic.id)}
              className={`focus-ring relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br text-white transition-transform active:scale-95 ${TONES[i % TONES.length]} ${
                isSelected ? 'ring-[3px] ring-saffron-500 ring-offset-2' : ''
              }`}
            >
              <span
                className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/80 ${
                  isSelected ? 'bg-white' : 'bg-white/10'
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-saffron-600" strokeWidth={3} />}
              </span>
              <span className="text-2xl">{topic.emoji}</span>
              <span className="px-1 text-center text-[11px] font-semibold leading-tight">{topic.label}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-auto pt-8">
        <p className="mb-3 text-center text-xs text-ink-500">
          {selected.length > 0 ? `${selected.length} topic${selected.length > 1 ? 's' : ''} selected` : 'Pick a few to personalise your feed'}
        </p>
        <button
          onClick={handleStart}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-saffron-gradient px-6 py-3.5 font-display text-[15px] font-bold text-navy-950 shadow-pop transition-transform active:scale-[0.98]"
        >
          Get Started
        </button>
        <button onClick={handleStart} className="mt-3 w-full text-center text-xs font-medium text-ink-500">
          Skip for now
        </button>
      </div>
    </div>
  )
}
