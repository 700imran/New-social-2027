import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { TOPICS } from '../data/mockData.js'
import { useApp } from '../context/AppContext.jsx'
import PageHeader from '../components/PageHeader.jsx'

// Settings -> Your Experience -> Topics & interests. Same TOPICS list and
// grid pattern as onboarding's InterestSelection.jsx, but callable any
// time via updateInterests (AppContext.jsx) instead of only once at
// signup via completeOnboarding.
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

export default function TopicsSettings() {
  const navigate = useNavigate()
  const { currentUser, updateInterests, pushToast } = useApp()
  const [selected, setSelected] = useState(() => TOPICS.filter((t) => currentUser.topics?.includes(t.id)).map((t) => t.id))

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const handleSave = () => {
    updateInterests(selected)
    pushToast('Topics updated')
    navigate(-1)
  }

  return (
    <div>
      <PageHeader title="Topics & interests" showBack />
      <div className="p-4">
        <p className="mb-4 text-sm text-ink-500">Add or remove topics any time to fine-tune your feed.</p>
        <div className="grid grid-cols-3 gap-3">
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

        <button
          onClick={handleSave}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-saffron-gradient px-6 py-3.5 font-display text-[15px] font-bold text-navy-950 shadow-pop transition-transform active:scale-[0.98]"
        >
          Save
        </button>
      </div>
    </div>
  )
}
