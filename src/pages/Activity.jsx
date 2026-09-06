import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, AtSign, UserPlus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'

// 'Follows' was missing here even though the icon/follow-button logic
// below already fully supports it (TYPE_ICON.Follows, n.type === 'Follows')
// — meaning follow notifications existed and rendered correctly under
// "All" but could never actually be filtered to on their own. Real gap,
// not a design choice: every other type mapped in utils/live.js's
// NOTIF_TYPE_TO_TAB had a tab; this one didn't.
const TABS = ['All', 'Mentions', 'Reactions', 'Comments', 'Follows']

const TYPE_ICON = {
  Mentions: AtSign,
  Reactions: Heart,
  Comments: MessageCircle,
  Follows: UserPlus,
}

export default function Activity() {
  const { notifications, getUser, followedUserIds, toggleFollow, markNotificationsRead } = useApp()
  const [activeTab, setActiveTab] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    markNotificationsRead()
  }, [markNotificationsRead])

  const filtered = useMemo(
    () => (activeTab === 'All' ? notifications : notifications.filter((n) => n.type === activeTab)),
    [notifications, activeTab]
  )

  return (
    <div>
      <PageHeader title="Activity" />

      <div className="flex gap-5 overflow-x-auto no-scrollbar border-b border-ink-100 bg-white px-4 py-2.5">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`focus-ring shrink-0 whitespace-nowrap rounded-md pb-1.5 text-sm font-semibold transition-colors ${
              activeTab === tab ? 'border-b-2 border-saffron-500 text-saffron-600' : 'text-ink-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-ink-900">All quiet here</p>
          <p className="mt-1 text-sm text-ink-500">You'll see {activeTab.toLowerCase()} from the community as they happen.</p>
        </div>
      ) : (
        <div className="divide-y divide-ink-100 bg-white">
          {filtered.map((n) => {
            const user = getUser(n.authorId)
            const Icon = TYPE_ICON[n.type] ?? Heart
            const following = followedUserIds.has(n.authorId)
            return (
              <button
                key={n.id}
                onClick={() => navigate('/home')}
                className="focus-ring flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink-50"
              >
                <div className="relative shrink-0">
                  <Avatar user={user} size="sm" />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-saffron-600 ring-1 ring-ink-100">
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-900">
                    <span className="font-semibold">{user?.name}</span> {n.text}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{n.time}</p>
                </div>
                {n.type === 'Follows' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFollow(n.authorId) }}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                      following ? 'border-ink-300 text-ink-700' : 'border-saffron-500 bg-saffron-500 text-white'
                    }`}
                  >
                    {following ? 'Following' : 'Follow'}
                  </button>
                )}
                {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-saffron-500" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
