import React, { useMemo, useState } from 'react'
import { Users, Check } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'
import { COMMUNITIES } from '../data/mockData.js'
import { formatCount } from '../utils/format.js'

const TABS = ['For You', 'My Communities']

export default function Communities() {
  const { joinedCommunityIds, toggleJoinCommunity } = useApp()
  const [activeTab, setActiveTab] = useState('For You')

  const visible = useMemo(
    () => (activeTab === 'My Communities' ? COMMUNITIES.filter((c) => joinedCommunityIds.has(c.id)) : COMMUNITIES),
    [activeTab, joinedCommunityIds]
  )

  return (
    <div>
      <PageHeader title="Communities" />

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

      {visible.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-ink-900">No communities yet</p>
          <p className="mt-1 text-sm text-ink-500">Join a few from "For You" to see them here.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink-100 bg-white px-4">
          {visible.map((c) => {
            const joined = joinedCommunityIds.has(c.id)
            return (
              <div key={c.id} className="flex items-center gap-3 py-3.5">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.tone} text-white`}
                >
                  <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{c.name}</p>
                  <p className="text-xs text-ink-500">{formatCount(c.members)} members · {c.category}</p>
                </div>
                <button
                  onClick={() => toggleJoinCommunity(c.id)}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    joined ? 'border border-ink-300 text-ink-700' : 'bg-saffron-gradient text-navy-950 shadow-pop'
                  }`}
                >
                  {joined && <Check className="h-3.5 w-3.5" />}
                  {joined ? 'Joined' : 'Join'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
