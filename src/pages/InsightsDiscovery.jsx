import React, { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApp } from '../context/AppContext.jsx'
import { isLive } from '../api/client.js'
import * as api from '../api/client.js'

// "Recommendations insights" in the spec asks how content is being
// discovered. There's no impression/view tracking in this schema to
// measure reach directly (see backend/src/routes/insights.js's comment),
// so this uses the honest signal that *is* available: how much of your
// engagement comes from people who don't already follow you — real
// discovery beyond your existing audience, not a made-up "reach" number.
export default function InsightsDiscovery() {
  const { currentUser } = useApp()
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!isLive) {
      setData(null)
      return
    }
    api.getInsightsDiscovery().then(setData).catch(() => setData(false))
  }, [currentUser.id])

  const total = data && data !== false ? data.followerEngagement + data.nonFollowerEngagement : 0
  const pct = total ? Math.round((data.nonFollowerEngagement / total) * 100) : 0

  return (
    <div>
      <PageHeader title="Recommendations insights" showBack />
      <div className="p-4">
        {!isLive ? (
          <p className="py-10 text-center text-sm text-ink-500">
            This needs the live backend connected — mock mode doesn't track who engaged with what.
          </p>
        ) : !data ? (
          <div className="skeleton h-32 rounded-xl" />
        ) : data === false ? (
          <p className="py-10 text-center text-sm text-ink-500">Could not load this — please try again.</p>
        ) : total === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">Not enough engagement yet to show this.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="From your followers" value={data.followerEngagement.toLocaleString()} />
              <StatCard label="From new people" value={data.nonFollowerEngagement.toLocaleString()} />
            </div>
            <p className="mt-4 text-sm text-ink-700">
              <span className="font-bold text-saffron-600">{pct}%</span> of the people engaging with your posts don't
              follow you yet — that's your content reaching beyond your existing audience.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
