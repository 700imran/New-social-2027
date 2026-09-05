import React, { useMemo, useState } from 'react'
import { Search, SquarePen } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'
import { CONVERSATIONS } from '../data/mockData.js'

export default function Messages() {
  const { getUser, pushToast } = useApp()
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CONVERSATIONS
    return CONVERSATIONS.filter((c) => getUser(c.authorId)?.name.toLowerCase().includes(q))
  }, [query, getUser])

  return (
    <div>
      <PageHeader title="Messages" right={
        <button
          onClick={() => pushToast('Direct messages are coming in a future release')}
          className="focus-ring rounded-full p-1.5 text-ink-700"
          aria-label="New message"
        >
          <SquarePen className="h-5 w-5" />
        </button>
      } />

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-ink-100 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages…"
            className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-500"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-ink-900">No conversations found</p>
          <p className="mt-1 text-sm text-ink-500">Try a different name.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink-100 bg-white">
          {visible.map((c) => {
            const user = getUser(c.authorId)
            if (!user) return null
            return (
              <button
                key={c.id}
                onClick={() => pushToast('Direct messages are coming in a future release')}
                className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-50"
              >
                <Avatar user={user} size="md" showVerified={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                  <p className="truncate text-xs text-ink-500">{c.preview}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] text-ink-500">{c.time}</span>
                  {c.unread > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-bharat-red px-1 text-[9px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
