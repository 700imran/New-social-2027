import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, MapPin, Calendar, LogOut, Pencil, Grid3x3, Clapperboard, Bookmark, Tags } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import PostCard from '../components/PostCard.jsx'
import { useApp } from '../context/AppContext.jsx'
import { formatCount } from '../utils/format.js'

const CONTENT_TABS = [
  { key: 'posts', label: 'Posts', icon: Grid3x3 },
  { key: 'reels', label: 'Reels', icon: Clapperboard },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'tagged', label: 'Tagged', icon: Tags },
]

export default function Profile() {
  const { currentUser, posts, savedPostIds, getTaggedPosts, signOut } = useApp()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTopic, setActiveTopic] = useState(null)
  const [activeContentTab, setActiveContentTab] = useState('posts')
  const [taggedPosts, setTaggedPosts] = useState([])
  const [taggedLoading, setTaggedLoading] = useState(false)

  const myPosts = useMemo(
    () => posts.filter((p) => p.authorId === currentUser.id && p.kind !== 'reel'),
    [posts, currentUser.id]
  )
  const myReels = useMemo(
    () => posts.filter((p) => p.authorId === currentUser.id && p.kind === 'reel'),
    [posts, currentUser.id]
  )
  const savedPosts = useMemo(() => posts.filter((p) => savedPostIds.has(p.id)), [posts, savedPostIds])

  const visiblePosts = activeTopic ? myPosts.filter((p) => p.tags.includes(activeTopic)) : myPosts

  // Tagged posts aren't part of the always-loaded `posts` list the way
  // saved/reels are (they can belong to anyone, not just people already
  // in the feed) — fetched on demand the first time the tab is opened.
  useEffect(() => {
    if (activeContentTab !== 'tagged') return
    let cancelled = false
    setTaggedLoading(true)
    getTaggedPosts(currentUser.id).then((rows) => {
      if (!cancelled) {
        setTaggedPosts(rows)
        setTaggedLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [activeContentTab, currentUser.id, getTaggedPosts])

  const handleShare = async () => {
    const shareData = { title: 'BharatSpace', text: `Check out ${currentUser.name} on BharatSpace`, url: `${window.location.origin}/profile` }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        /* cancelled */
      }
    }
  }

  const handleSignOut = () => {
    setMenuOpen(false)
    signOut()
    navigate('/')
  }

  const emptyStateFor = {
    posts: { title: 'No posts yet', body: 'Posts you share will show up here.' },
    reels: { title: 'No reels yet', body: 'Reels you post will show up here.' },
    saved: { title: 'Nothing saved yet', body: 'Posts and reels you save will show up here.' },
    tagged: { title: 'No tags yet', body: "Posts and reels you're tagged in will show up here." },
  }[activeContentTab]

  const activeList = { posts: visiblePosts, reels: myReels, saved: savedPosts, tagged: taggedPosts }[activeContentTab]

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur">
        <h1 className="font-display text-lg font-bold text-navy-900">Profile</h1>
        <div className="relative">
          <button onClick={() => setMenuOpen((m) => !m)} className="focus-ring rounded-full p-1.5 text-ink-700" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
              <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lg animate-popIn">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/settings') }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-900 hover:bg-ink-50"
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profile/edit') }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-900 hover:bg-ink-50"
                >
                  <Pencil className="h-4 w-4" /> Edit profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-bharat-red hover:bg-ink-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="relative h-28 w-full overflow-hidden bg-navy-950">
        <div className="absolute inset-0 bg-tricolor-thread opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent" />
      </div>

      <div className="px-4">
        <div className="-mt-10">
          <Avatar user={currentUser} size="xl" />
        </div>

        <div className="mt-3">
          <h2 className="font-display text-xl font-bold text-navy-900">{currentUser.name}</h2>
          <p className="text-sm text-ink-500">{currentUser.handle}</p>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-700">{currentUser.bio}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
          {currentUser.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {currentUser.location}
            </span>
          )}
          {currentUser.joined && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Joined {currentUser.joined}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-6">
          <Stat label="Posts" value={myPosts.length || currentUser.posts} />
          <Stat label="Followers" value={currentUser.followers} />
          <Stat label="Following" value={currentUser.following} />
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={() => navigate('/profile/edit')}
            className="flex-1 rounded-full border border-ink-200 py-2.5 text-sm font-semibold text-ink-900 transition-colors active:bg-ink-50"
          >
            Edit Profile
          </button>
          <button
            onClick={handleShare}
            className="flex-1 rounded-full bg-saffron-gradient py-2.5 text-sm font-bold text-navy-950 shadow-pop active:scale-[0.98]"
          >
            Share Profile
          </button>
        </div>

        {activeContentTab === 'posts' && currentUser.topics?.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold text-navy-900">My Topics</p>
              {activeTopic && (
                <button onClick={() => setActiveTopic(null)} className="text-xs font-semibold text-saffron-600">
                  Clear filter
                </button>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {currentUser.topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTopic((cur) => (cur === t ? null : t))}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    activeTopic === t ? 'border-saffron-500 bg-saffron-500 text-white' : 'border-ink-200 text-ink-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex border-t border-ink-100">
        {CONTENT_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveContentTab(key)}
            className={`flex flex-1 flex-col items-center gap-1 border-b-2 py-2.5 text-[11px] font-semibold transition-colors ${
              activeContentTab === key ? 'border-saffron-500 text-navy-900' : 'border-transparent text-ink-400'
            }`}
          >
            <Icon className="h-4.5 w-4.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-ink-100">
        {activeContentTab === 'tagged' && taggedLoading ? (
          <div className="px-6 py-14 text-center text-sm text-ink-500">Loading tagged posts…</div>
        ) : activeList.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-base font-semibold text-ink-900">{emptyStateFor.title}</p>
            <p className="mt-1 text-sm text-ink-500">{emptyStateFor.body}</p>
          </div>
        ) : (
          activeList.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="font-display text-base font-bold text-navy-900">{formatCount(value)}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  )
}
