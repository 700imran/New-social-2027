import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Loader2 } from 'lucide-react'
import HomeTopNav from '../components/HomeTopNav.jsx'
import PostCard from '../components/PostCard.jsx'
import PullToRefresh from '../components/PullToRefresh.jsx'
import { useApp } from '../context/AppContext.jsx'
import { isLive } from '../api/client.js'
import { FEED_TABS, HIGHLIGHTS } from '../data/mockData.js'

// Frontend-only for now (see docs/PRODUCT_DIRECTION_UPDATE.md — Stories
// needs its own schema: expiring content, per-story view tracking,
// privacy modes). This used to be a dead visual with no onClick at all;
// tapping it now honestly says "coming soon" instead of doing nothing.
const STORIES_PREVIEW = {
  title: 'Stories',
  description: 'Share quick, disappearing moments — text, photos and polls that vanish after 24 hours.',
  bullets: [
    'Text, photo and music stickers',
    'Polls, questions and quizzes',
    'See who viewed your story',
    'Everyone / Followers / Close friends privacy',
  ],
}

export default function Home() {
  const { posts, fetchPostsLive, fetchMorePosts, hasMorePosts, loadingMorePosts } = useApp()
  const [activeTab, setActiveTab] = useState('For You')
  const sentinelRef = useRef(null)
  const navigate = useNavigate()

  // Reels live on their own tab/page (Reels.jsx) and Profile's Reels tab —
  // kept out of the text/photo feed here the same way a "reel" is really
  // just a post with kind='reel' under the hood (migrations/005_reels_and_tags.sql).
  const filteredPosts = useMemo(() => {
    const base = posts.filter((p) => p.kind !== 'reel')
    if (activeTab === 'For You') return base
    return base.filter((p) => p.tab === activeTab || p.tags.includes(activeTab))
  }, [posts, activeTab])

  // Infinite scroll: only meaningful in live mode (mock mode ships one
  // fixed local array with nothing more to page in) — the sentinel below
  // is skipped entirely otherwise, so it never sits there re-triggering a
  // no-op fetch.
  useEffect(() => {
    if (!isLive || !sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMorePosts()
      },
      { rootMargin: '600px' } // start loading well before the sentinel is actually visible
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [fetchMorePosts])

  const feed = (
    <div>
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
          <button
            key={h.id}
            onClick={() => navigate('/coming-soon', { state: STORIES_PREVIEW })}
            className={`relative flex h-28 w-24 shrink-0 flex-col justify-between rounded-xl bg-gradient-to-br ${h.tone} p-2.5 text-left text-white shadow-card`}
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
          </button>
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

      {isLive && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMorePosts && <Loader2 className="h-5 w-5 animate-spin text-ink-300" />}
          {!hasMorePosts && filteredPosts.length > 0 && (
            <p className="text-xs text-ink-400">You're all caught up</p>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <HomeTopNav />
      {isLive ? <PullToRefresh onRefresh={fetchPostsLive}>{feed}</PullToRefresh> : feed}
    </div>
  )
}
