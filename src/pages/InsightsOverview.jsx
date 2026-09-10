import React, { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApp } from '../context/AppContext.jsx'
import { isLive } from '../api/client.js'
import * as api from '../api/client.js'

// Settings -> Your Insights -> Overview. Every number here is a real
// aggregate (backend/src/routes/insights.js) over this account's own
// posts/reactions/comments/follows — nothing is a placeholder. In mock
// mode (no backend configured) it computes the same shape from the
// locally-loaded `posts` array instead of a fetch, so the screen is
// never silently empty just because there's no live backend to call.
export default function InsightsOverview() {
  const { currentUser, posts } = useApp()
  const [data, setData] = useState(null)
  const communityWords = currentUser.accountType === 'community'

  useEffect(() => {
    if (isLive) {
      api.getInsightsOverview().then(setData).catch(() => setData(false))
      return
    }
    const mine = posts.filter((p) => p.authorId === currentUser.id)
    setData({
      postCount: mine.length,
      followerCount: currentUser.followers,
      followingCount: currentUser.following,
      totalLikes: mine.reduce((sum, p) => sum + (p.likes || 0), 0),
      totalComments: mine.reduce((sum, p) => sum + (p.comments || 0), 0),
      newFollowersThisWeek: 0,
    })
  }, [currentUser.id, posts])

  return (
    <div>
      <PageHeader title="Overview" showBack />
      <div className="p-4">
        {!data ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : data === false ? (
          <p className="py-10 text-center text-sm text-ink-500">Could not load your insights — please try again.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={communityWords ? 'Members' : 'Followers'} value={data.followerCount.toLocaleString()} />
            <StatCard label="New this week" value={data.newFollowersThisWeek.toLocaleString()} />
            <StatCard label="Posts" value={data.postCount.toLocaleString()} />
            <StatCard label="Total likes" value={data.totalLikes.toLocaleString()} />
            <StatCard label="Total comments" value={data.totalComments.toLocaleString()} />
            <StatCard label="Following" value={data.followingCount.toLocaleString()} />
          </div>
        )}
      </div>
    </div>
  )
}
