import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'

// Settings -> Your Connections -> Close friends. Same known limitation
// as ManagedAccounts.jsx: names/avatars only resolve for people this
// session has already cached via getUser() — see that file's comment.
export default function CloseFriends() {
  const { closeFriendIds, toggleCloseFriend, followedUserIds, getUser } = useApp()
  const friends = [...closeFriendIds]
  const candidates = [...followedUserIds].filter((id) => !closeFriendIds.has(id))

  return (
    <div>
      <PageHeader title="Close friends" showBack />
      <div className="px-4 pt-3">
        <p className="text-sm text-ink-500">
          A private list only you can see. Nothing shares to it differently yet — this is where you build the list
          for when a "close friends only" audience option exists.
        </p>
      </div>

      <p className="px-5 pb-1 pt-4 text-xs font-semibold text-ink-500">
        Your close friends {friends.length > 0 && `(${friends.length})`}
      </p>
      {friends.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-500">No one yet — add people you follow below.</p>
      ) : (
        <div className="flex flex-col divide-y divide-ink-100 bg-white px-4">
          {friends.map((id) => {
            const user = getUser(id)
            if (!user) return null
            return (
              <div key={id} className="flex items-center gap-3 py-3">
                <Avatar user={user} size="md" showVerified={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                  {user.handle && <p className="truncate text-xs text-ink-500">{user.handle}</p>}
                </div>
                <button
                  onClick={() => toggleCloseFriend(id)}
                  className="shrink-0 rounded-full border border-ink-300 px-3.5 py-1.5 text-xs font-semibold text-ink-700"
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="px-5 pb-1 pt-5 text-xs font-semibold text-ink-500">People you follow</p>
      {candidates.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-500">Everyone you follow is already on your list.</p>
      ) : (
        <div className="flex flex-col divide-y divide-ink-100 bg-white px-4">
          {candidates.map((id) => {
            const user = getUser(id)
            if (!user) return null
            return (
              <div key={id} className="flex items-center gap-3 py-3">
                <Avatar user={user} size="md" showVerified={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                  {user.handle && <p className="truncate text-xs text-ink-500">{user.handle}</p>}
                </div>
                <button
                  onClick={() => toggleCloseFriend(id)}
                  className="shrink-0 rounded-full bg-saffron-500 px-3.5 py-1.5 text-xs font-semibold text-navy-950"
                >
                  Add
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
