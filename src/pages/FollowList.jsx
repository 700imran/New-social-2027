import React, { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'

// Followers and Following are the same shape — a list of people plus a
// follow/unfollow toggle — so this is one data-driven screen instead of
// two near-identical files, same reasoning as ManagedAccounts.jsx uses
// for Blocked/Muted. Reached from Profile.jsx's Followers/Following
// counts, which is the "required behavior" this page exists to satisfy:
// those counts must open the full list, not just sit there as text.
export default function FollowList({ type }) {
  const { currentUser, followedUserIds, toggleFollow, getFollowList } = useApp()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const isFollowers = type === 'followers'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getFollowList(currentUser.id, type).then((rows) => {
      if (!cancelled) {
        setPeople(rows)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [type, currentUser.id, getFollowList])

  return (
    <div>
      <PageHeader title={isFollowers ? 'Followers' : 'Following'} showBack />

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-ink-500">
          Loading {isFollowers ? 'followers' : 'following'}…
        </div>
      ) : people.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-ink-900">
            {isFollowers ? 'No followers yet' : "You're not following anyone yet"}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {isFollowers
              ? 'People who follow you will show up here.'
              : 'Accounts you follow will show up here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink-100 bg-white px-4">
          {people.map((person) => {
            const isFollowing = followedUserIds.has(person.id)
            return (
              <div key={person.id} className="flex items-center gap-3 py-3.5">
                <Avatar user={person} size="md" showVerified={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{person.name}</p>
                  {person.handle && <p className="truncate text-xs text-ink-500">{person.handle}</p>}
                </div>
                <button
                  onClick={() => toggleFollow(person.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    isFollowing
                      ? 'border border-ink-300 text-ink-700'
                      : 'bg-saffron-gradient text-navy-950 shadow-pop'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
