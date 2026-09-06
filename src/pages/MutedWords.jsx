import React, { useState } from 'react'
import { X } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'

const MAX_WORDS = 50
const MAX_LEN = 40

// Matching backend/src/routes/settings.js's limits (LIMITS.mutedWord /
// LIMITS.mutedWordsMax) — enforced there too, so this is just giving the
// same feedback before a round-trip rather than the only place it's
// checked.
export default function MutedWords() {
  const { userSettings, updateUserSettings, pushToast } = useApp()
  const [draft, setDraft] = useState('')
  const words = userSettings.muted_words

  const addWord = () => {
    const word = draft.trim().toLowerCase()
    if (!word) return
    if (word.length > MAX_LEN) return pushToast(`Muted words must be ${MAX_LEN} characters or fewer`)
    if (words.includes(word)) return setDraft('')
    if (words.length >= MAX_WORDS) return pushToast(`You can mute at most ${MAX_WORDS} words`)
    updateUserSettings({ muted_words: [...words, word] })
    setDraft('')
  }

  const removeWord = (word) => {
    updateUserSettings({ muted_words: words.filter((w) => w !== word) })
  }

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Words & comments" showBack />
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-900">Muted words</p>
          <p className="mt-0.5 text-xs text-ink-500">
            Comments containing these words are collapsed behind a "hidden comment" notice — never deleted, just out
            of the way.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWord()}
              placeholder="Add a word or phrase"
              maxLength={MAX_LEN}
              className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900"
            />
            <button
              onClick={addWord}
              disabled={!draft.trim()}
              className="shrink-0 rounded-xl bg-saffron-gradient px-4 py-2.5 text-sm font-bold text-navy-950 shadow-pop disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {words.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {words.map((w) => (
                <span
                  key={w}
                  className="flex items-center gap-1.5 rounded-full bg-ink-100 py-1.5 pl-3 pr-2 text-xs font-semibold text-ink-700"
                >
                  {w}
                  <button onClick={() => removeWord(w)} aria-label={`Remove muted word ${w}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-400">No muted words yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
