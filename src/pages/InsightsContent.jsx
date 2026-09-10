import React, { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'
import { isLive } from '../api/client.js'
import * as api from '../api/client.js'

export default function InsightsContent() {
  const { currentUser, posts } = useApp()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (isLive) {
      api.getInsightsContent().then((r) => setRows(r.posts)).catch(() => setRows([]))
      return
    }
    const mine = posts
      .filter((p) => p.authorId === currentUser.id)
      .map((p) => ({ id: p.id, body: p.text, createdAt: p.time, likeCount: p.likes || 0, commentCount: p.comments || 0 }))
      .sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))
    setRows(mine)
  }, [currentUser.id, posts])

  return (
    <div>
      <PageHeader title="Content insights" showBack />
      <div className="p-4">
        {!rows ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">Nothing to show yet — post something and check back.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((p) => (
              <div key={p.id} className="rounded-xl border border-ink-100 bg-white p-3.5">
                <p className="line-clamp-2 text-sm text-ink-900">{p.body || '(No caption)'}</p>
                <p className="mt-2 text-xs font-semibold text-ink-500">
                  {p.likeCount.toLocaleString()} likes · {p.commentCount.toLocaleString()} comments
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
