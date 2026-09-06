import React, { useState } from 'react'
import { X, Flag } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate_speech', label: 'Hate speech' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'violence', label: 'Violence' },
  { id: 'illegal', label: 'Illegal content' },
  { id: 'other', label: 'Something else' },
]

// targetType/targetId match backend/src/routes/reports.js exactly —
// 'post' | 'comment' | 'user'.
export default function ReportModal({ targetType, targetId, onClose }) {
  const { submitReport } = useApp()
  const [reason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!reason || submitting) return
    setSubmitting(true)
    const result = await submitReport({ targetType, targetId, reason, details: details.trim() || undefined })
    setSubmitting(false)
    if (result.ok) setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50" onClick={onClose}>
      <div
        className="app-shell w-full rounded-t-2xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-navy-900">
            {submitted ? 'Thanks for letting us know' : `Report this ${targetType}`}
          </h2>
          <button onClick={onClose} className="focus-ring rounded-full p-1 text-ink-500" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-4 text-center">
            <Flag className="h-8 w-8 text-bharat-green" />
            <p className="text-sm text-ink-600">
              Our team will review it. Reporting doesn't notify the person you're reporting.
            </p>
            <button onClick={onClose} className="mt-2 text-sm font-semibold text-saffron-600">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-ink-500">This won't tell them you reported it.</p>
            <div className="mt-4 flex flex-col gap-1">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`focus-ring flex items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${
                    reason === r.id ? 'border-saffron-500 bg-saffron-50 font-semibold text-saffron-700' : 'border-ink-100 text-ink-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {reason && (
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add details (optional)"
                rows={3}
                maxLength={500}
                className="mt-3 w-full resize-none rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm text-ink-900 outline-none focus:border-saffron-500 placeholder:text-ink-400"
              />
            )}

            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-bharat-red px-6 py-3.5 font-display text-[15px] font-bold text-white shadow-pop transition-transform enabled:active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
