import React, { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'
import { isLive } from '../api/client.js'
import * as api from '../api/client.js'
import { timeAgo } from '../utils/live.js'

// Backs both Settings -> Privacy and Safety -> Account protection and
// Settings -> Tools & Support -> App & device — "where you're logged
// in" is the real, shared substance of both. Rows are logged from
// AppContext.jsx's signInInternal, not auth.js (see
// docs/migrations/020_login_events.sql for why).
function describeDevice(userAgent) {
  if (!userAgent) return 'Unknown device'
  if (/android/i.test(userAgent)) return 'Android device'
  if (/iphone|ipad/i.test(userAgent)) return 'iPhone/iPad'
  if (/windows/i.test(userAgent)) return 'Windows'
  if (/macintosh/i.test(userAgent)) return 'Mac'
  return 'Unknown device'
}

export default function LoginActivity() {
  const { currentUser } = useApp()
  const [sessions, setSessions] = useState(null)

  useEffect(() => {
    if (!isLive) {
      setSessions([])
      return
    }
    api.getSessions().then((r) => setSessions(r.sessions)).catch(() => setSessions([]))
  }, [currentUser.id])

  return (
    <div>
      <PageHeader title="Login activity" showBack />
      <div className="p-4">
        <p className="mb-3 text-xs text-ink-500">
          Times and devices you've signed in from. If you see one you don't recognize, change your password right
          away.
        </p>
        {!isLive ? (
          <p className="py-10 text-center text-sm text-ink-500">This needs the live backend connected to show real sign-ins.</p>
        ) : sessions === null ? (
          <div className="skeleton h-14 rounded-xl" />
        ) : sessions.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">No recorded sign-ins yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white p-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{describeDevice(s.user_agent)}</p>
                  <p className="text-xs text-ink-500">{timeAgo(s.created_at)}</p>
                </div>
                {i === 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Most recent</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
