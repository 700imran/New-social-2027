import React, { useMemo, useState } from 'react'
import { Radio } from 'lucide-react'
import HomeTopNav from '../components/HomeTopNav.jsx'
import PostCard from '../components/PostCard.jsx'
import { useApp } from '../context/AppContext.jsx'
import { FEED_TABS, HIGHLIGHTS } from '../data/mockData.js'

export default function Home() {
  const { posts } = useApp()
  const [activeTab, setActiveTab] = useState('For You')

  const filteredPosts = useMemo(() => {
    if (activeTab === 'For You') return posts
    return posts.filter((p) => p.tab === activeTab || p.tags.includes(activeTab))
  }, [posts, activeTab])

  return (
    <div>
      <HomeTopNav />

      <div className="flex gap-5 overflow-x-auto no-scrollbar border-b border-ink-100 bg-white px-4 py-2.5">
        {FEED_TABS.map((tab) => (
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

      <div className="flex gap-3 overflow-x-auto no-scrollbar bg-white px-4 py-4">
        {HIGHLIGHTS.map((h) => (
          <div
            key={h.id}
            className={`relative flex h-28 w-24 shrink-0 flex-col justify-between rounded-xl bg-gradient-to-br ${h.tone} p-2.5 text-white shadow-card`}
          >
            {h.live && (
              <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-bharat-red px-1.5 py-0.5 text-[8px] font-bold">
                <Radio className="h-2 w-2" /> Live
              </span>
            )}
            <div className="mt-auto">
              <p className="text-xs font-bold leading-tight">{h.label}</p>
              <p className="mt-0.5 text-[9.5px] leading-tight text-white/80">{h.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        {filteredPosts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-base font-semibold text-ink-900">Nothing here yet</p>
            <p className="mt-1 text-sm text-ink-500">Posts in {activeTab} will show up here as the community shares them.</p>
          </div>
        ) : (
          filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
