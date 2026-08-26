import React, { useRef, useState } from 'react'
import { Search, Rocket, Trophy, TrendingUp, ArrowRight, Radio } from 'lucide-react'
import ArchIllustration from '../components/ArchIllustration.jsx'
import SearchOverlay from '../components/SearchOverlay.jsx'
import { TRENDING_TOPICS, LIVE_NOW } from '../data/mockData.js'
import { useApp } from '../context/AppContext.jsx'

const LIVE_ICONS = { rocket: Rocket, trophy: Trophy }

export default function Discover() {
  const { pushToast } = useApp()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchSeed, setSearchSeed] = useState('')
  const [showAllTrending, setShowAllTrending] = useState(false)
  const trendingRef = useRef(null)

  const openSearch = (seed = '') => {
    setSearchSeed(seed)
    setSearchOpen(true)
  }

  const visibleTrending = showAllTrending ? TRENDING_TOPICS : TRENDING_TOPICS.slice(0, 4)

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur">
        <h1 className="font-display text-xl font-bold text-navy-900">Discover</h1>
        <button onClick={() => openSearch('')} className="focus-ring rounded-full p-1 text-ink-700" aria-label="Search">
          <Search className="h-5 w-5" />
        </button>
      </header>

      <div className="p-4">
        <div className="relative overflow-hidden rounded-2xl">
          <ArchIllustration className="h-44 w-full" showCrowd={false} />
          <div className="absolute inset-0 flex flex-col justify-center bg-navy-950/25 px-5">
            <p className="font-display text-xl font-extrabold leading-tight text-white">
              What's Happening<br />Now ⚡
            </p>
            <p className="mt-1.5 max-w-[220px] text-xs text-white/85">Real-time updates from across India</p>
            <button
              onClick={() => trendingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-saffron-gradient px-4 py-2 text-xs font-bold text-navy-950 shadow-pop"
            >
              Explore Now <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div ref={trendingRef} className="mt-6 scroll-mt-16">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-navy-900">Trending Topics</h2>
            <button
              onClick={() => setShowAllTrending((s) => !s)}
              className="text-xs font-semibold text-saffron-600"
            >
              {showAllTrending ? 'Show less' : 'View All'}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {visibleTrending.map((t) => (
              <button
                key={t.id}
                onClick={() => openSearch(t.tag.replace('#', ''))}
                className="focus-ring rounded-xl border border-ink-100 bg-white p-3 text-left transition-colors hover:border-saffron-300"
              >
                <TrendingUp className="h-3.5 w-3.5 text-saffron-600" />
                <p className="mt-1.5 truncate text-[13px] font-semibold text-ink-900">{t.tag}</p>
                <p className="text-[11px] text-ink-500">{t.posts}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-navy-900">Live Now</h2>
            <button
              onClick={() => pushToast('More live broadcasts coming soon')}
              className="text-xs font-semibold text-saffron-600"
            >
              View All
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {LIVE_NOW.map((l) => {
              const Icon = LIVE_ICONS[l.icon] ?? Radio
              return (
                <button
                  key={l.id}
                  onClick={() => pushToast(`Joining ${l.title} live…`)}
                  className="focus-ring flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-2.5 text-left transition-colors hover:border-saffron-300"
                >
                  <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${l.tone} text-white`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-bharat-red px-1.5 py-0.5 text-[9px] font-bold text-white">
                      <Radio className="h-2.5 w-2.5" /> Live
                    </span>
                    <p className="truncate text-sm font-semibold text-ink-900">{l.title}</p>
                    <p className="truncate text-xs text-ink-500">{l.subtitle}</p>
                    <p className="text-[11px] font-medium text-bharat-red">{l.watching}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} initialQuery={searchSeed} />}
    </div>
  )
}
