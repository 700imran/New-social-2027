import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'

// Blocked and Muted accounts are the exact same shape — a Set of user
// ids plus a toggle action that reverses it — so this is one data-driven
// screen instead of two near-identical page files (see ComingSoon.jsx
// for the same "shape once, describe via props" pattern).
//
// Known, honest limitation: names/avatars come from `getUser()`, which
// only knows about people this session has already encountered (feed
// authors, commenters, people you follow — see AppContext.jsx's
// usersCache). Someone you blocked/muted a while ago, whom nothing in
// today's session has surfaced again, shows the same generic
// "BharatSpace user" placeholder every other not-yet-cached reference
// in this app already falls back to (tagged users, notification
// senders) — a full user-lookup-by-id endpoint doesn't exist in the
// Level 1 API yet.
export default function ManagedAccounts({ type }) {
  const { blockedUserIds, mutedUserIds, toggleBlock, toggleMute, getUser } = useApp()
  const isMuted = type === 'muted'
  const ids = [...(isMuted ? mutedUserIds : blockedUserIds)]
  const onToggle = isMuted ? toggleMute : toggleBlock

  return (
    <div>
      <PageHeader title={isMuted ? 'Muted accounts' : 'Blocked accounts'} showBack />
      {ids.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-ink-900">
            {isMuted ? 'No muted accounts' : 'No blocked accounts'}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {isMuted
              ? "Accounts you mute stay out of your feed without unfollowing them — you'll see them listed here."
              : "Accounts you block can't reach you, and you won't see their posts — you'll see them listed here."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink-100 bg-white px-4">
          {ids.map((id) => {
            const user = getUser(id)
            if (!user) return null
            return (
              <div key={id} className="flex items-center gap-3 py-3.5">
                <Avatar user={user} size="md" showVerified={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                  {user.handle && <p className="truncate text-xs text-ink-500">{user.handle}</p>}
                </div>
                <button
                  onClick={() => onToggle(id)}
                  className="shrink-0 rounded-full border border-ink-300 px-3.5 py-1.5 text-xs font-semibold text-ink-700"
                >
                  {isMuted ? 'Unmute' : 'Unblock'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
