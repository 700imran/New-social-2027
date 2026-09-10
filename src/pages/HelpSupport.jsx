import React, { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'
import { isLive } from '../api/client.js'
import * as api from '../api/client.js'

// Settings -> Tools & Support -> Help & support. Real submission +
// status list (backend/src/routes/support.js, docs/migrations/016).
// No admin UI reviews these yet — same tradeoff as reports.js's content
// reports, reviewed via Supabase's Table Editor for now.
export default function HelpSupport() {
  const { pushToast } = useApp()
  const [tickets, setTickets] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    if (!isLive) {
      setTickets([])
      return
    }
    api.getSupportTickets().then((r) => setTickets(r.tickets)).catch(() => setTickets([]))
  }
  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) {
      pushToast('Fill in both a subject and a message')
      return
    }
    if (!isLive) {
      pushToast('Connect the live backend to submit support requests')
      return
    }
    setSubmitting(true)
    try {
      await api.createSupportTicket(subject.trim(), body.trim())
      setSubject('')
      setBody('')
      pushToast('Request submitted — we\u2019ll get back to you')
      load()
    } catch (err) {
      pushToast(err.message || 'Could not submit your request — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Help & support" showBack />
      <div className="p-4">
        <form onSubmit={handleSubmit} className="rounded-xl border border-ink-100 bg-white p-3.5">
          <p className="text-sm font-semibold text-ink-900">Submit a request</p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            placeholder="Subject"
            className="mt-2.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus-ring"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Describe the issue…"
            className="mt-2 w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm focus-ring"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2.5 w-full rounded-full bg-saffron-gradient py-2.5 text-sm font-bold text-navy-950 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>

        <p className="mb-2 mt-5 text-xs font-semibold text-ink-500">Your requests</p>
        {tickets === null ? (
          <div className="skeleton h-14 rounded-xl" />
        ) : tickets.length === 0 ? (
          <p className="text-sm text-ink-500">No requests yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-ink-100 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-900">{t.subject}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      t.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-saffron-100 text-saffron-700'
                    }`}
                  >
                    {t.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-500">{t.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
