import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Rocket, Trophy, TrendingUp, ArrowRight, Radio, Users, Sparkles, Briefcase, CalendarDays, Store } from 'lucide-react'
import ArchIllustration from '../components/ArchIllustration.jsx'
import SearchOverlay from '../components/SearchOverlay.jsx'
import Avatar from '../components/Avatar.jsx'
import { TRENDING_TOPICS, LIVE_NOW, DISCOVER_TABS, GEO_REGIONS, SUGGESTED_ACCOUNTS } from '../data/mockData.js'
import { useApp } from '../context/AppContext.jsx'

const LIVE_ICONS = { rocket: Rocket, trophy: Trophy }

const DISCOVERY_DOORS = [
  {
    title: 'Creators',
    Icon: Sparkles,
    description: 'A dedicated space to find creators by category, location and audience size.',
    bullets: ['Browse by category and city', 'Filter by follower range', 'See portfolio and past collaborations'],
  },
  {
    title: 'Brands',
    Icon: Briefcase,
    description: 'Discover businesses running campaigns and looking for creator partners.',
    bullets: ['Browse open campaigns', 'See what brands are hiring creators', 'Follow brands you care about'],
  },
  {
    title: 'Events',
    Icon: CalendarDays,
    description: "See what's happening — meetups, launches and community events near you.",
    bullets: ['RSVP and see who else is going', 'Get reminders before it starts', 'Community-hosted and BharatSpace-hosted events'],
  },
  {
    title: 'Marketplace',
    Icon: Store,
    description: 'Where creators and brands connect directly for paid collaborations.',
    bullets: ['Send and receive collaboration proposals', 'Track active and completed deals', 'Built on the same account system you already have'],
  },
]

export default function Discover() {
  const { pushToast, followedUserIds, toggleFollow } = useApp()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchSeed, setSearchSeed] = useState('')
  const [showAllTrending, setShowAllTrending] = useState(false)
  const [activeTab, setActiveTab] = useState('Top')
  const [activeRegion, setActiveRegion] = useState('world')
  const trendingRef = useRef(null)

  const openSearch = (seed = '') => {
    setSearchSeed(seed)
    setSearchOpen(true)
  }

  const visibleTrending = showAllTrending ? TRENDING_TOPICS : TRENDING_TOPICS.slice(0, 4)

  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-display text-xl font-bold text-navy-900">Discover</h1>
          <button onClick={() => openSearch('')} className="focus-ring rounded-full p-1 text-ink-700" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-5 overflow-x-auto no-scrollbar px-4 pb-2.5">
          {DISCOVER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`focus-ring shrink-0 whitespace-nowrap rounded-md pb-1 text-sm font-semibold transition-colors ${
                activeTab === tab ? 'border-b-2 border-saffron-500 text-saffron-600' : 'text-ink-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {/* Geographic discovery is a separate, optional lens on top of the
            subject-first tabs above — not the app's primary axis. Lets
            someone outside India explore without the whole surface reading
            as "an Indian app," while an Indian user still finds India one
            tap away. */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {GEO_REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRegion(r.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeRegion === r.id ? 'border-saffron-500 bg-saffron-500 text-white' : 'border-ink-200 text-ink-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative mt-4 overflow-hidden rounded-2xl">
          <ArchIllustration className="h-44 w-full" showCrowd={false} />
          <div className="absolute inset-0 flex flex-col justify-center bg-navy-950/25 px-5">
            <p className="font-display text-xl font-extrabold leading-tight text-white">
              Ideas for a<br />Better Tomorrow
            </p>
            <p className="mt-1.5 max-w-[220px] text-xs text-white/85">People. Innovation. Impact — from India and everywhere else.</p>
            <button
              onClick={() => trendingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-saffron-gradient px-4 py-2 text-xs font-bold text-navy-950 shadow-pop"
            >
              Explore <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div ref={trendingRef} className="mt-6 scroll-mt-16">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-navy-900">Trending Now</h2>
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
            <h2 className="font-display text-base font-bold text-navy-900">Suggested for You</h2>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white">
            {SUGGESTED_ACCOUNTS.map((a) => {
              const following = followedUserIds.has(a.id)
              return (
                <div key={a.id} className="flex items-center gap-3 p-3">
                  <Avatar user={a} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{a.name}</p>
                    <p className="truncate text-xs text-ink-500">{a.category}</p>
                  </div>
                  <button
                    onClick={() => toggleFollow(a.id)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      following ? 'border-ink-300 text-ink-700' : 'border-saffron-500 bg-saffron-500 text-white'
                    }`}
                  >
                    {following ? 'Following' : 'Follow'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <button
          onClick={() => navigate('/communities')}
          className="focus-ring mt-7 flex w-full items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5 text-left transition-colors hover:border-saffron-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-saffron-50 text-saffron-600">
            <Users className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">Browse Communities</p>
            <p className="text-xs text-ink-500">Find your people around a shared interest</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {DISCOVERY_DOORS.map((door) => (
            <button
              key={door.title}
              onClick={() => navigate('/coming-soon', { state: door })}
              className="focus-ring flex flex-col items-start gap-2 rounded-xl border border-ink-100 bg-white p-3 text-left transition-colors hover:border-saffron-300"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-50 text-saffron-600">
                <door.Icon className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-ink-900">{door.title}</p>
            </button>
          ))}
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
