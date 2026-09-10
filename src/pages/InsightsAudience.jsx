import React, { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApp } from '../context/AppContext.jsx'
import { isLive } from '../api/client.js'
import * as api from '../api/client.js'

export default function InsightsAudience() {
  const { currentUser } = useApp()
  const [data, setData] = useState(null)
  const communityWords = currentUser.accountType === 'community'

  useEffect(() => {
    if (isLive) {
      api.getInsightsAudience().then(setData).catch(() => setData(false))
      return
    }
    // Mock mode has no per-follow timestamp to build a real trend from —
    // shown as a flat/empty trend rather than invented numbers.
    setData({
      followerCount: currentUser.followers,
      followingCount: currentUser.following,
      weeklyNewFollowers: Array.from({ length: 6 }, () => ({ count: 0 })),
    })
  }, [currentUser.id])

  const maxWeek = data && data !== false ? Math.max(1, ...data.weeklyNewFollowers.map((w) => w.count)) : 1

  return (
    <div>
      <PageHeader title="Audience" showBack />
      <div className="p-4">
        {!data ? (
          <div className="skeleton h-40 rounded-xl" />
        ) : data === false ? (
          <p className="py-10 text-center text-sm text-ink-500">Could not load your audience insights — please try again.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={communityWords ? 'Members' : 'Followers'} value={data.followerCount.toLocaleString()} />
              <StatCard label="Following" value={data.followingCount.toLocaleString()} />
            </div>
            <p className="mb-2 mt-5 text-xs font-semibold text-ink-500">
              New {communityWords ? 'members' : 'followers'} — last 6 weeks
            </p>
            <div className="flex h-28 items-end gap-2">
              {data.weeklyNewFollowers.map((w, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-saffron-400"
                    style={{ height: `${Math.max(4, (w.count / maxWeek) * 100)}%` }}
                  />
                  <span className="text-[10px] text-ink-400">{w.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
