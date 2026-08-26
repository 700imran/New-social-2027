import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, MapPin, Calendar, LogOut, Pencil } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import PostCard from '../components/PostCard.jsx'
import { useApp } from '../context/AppContext.jsx'
import { formatCount } from '../utils/format.js'

export default function Profile() {
  const { currentUser, posts, signOut } = useApp()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTopic, setActiveTopic] = useState(null)

  const myPosts = useMemo(() => posts.filter((p) => p.authorId === currentUser.id), [posts, currentUser.id])
  const visiblePosts = activeTopic ? myPosts.filter((p) => p.tags.includes(activeTopic)) : myPosts

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

        {currentUser.topics?.length > 0 && (
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

      <div className="mt-6 border-t border-ink-100">
        {visiblePosts.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-base font-semibold text-ink-900">No posts yet</p>
            <p className="mt-1 text-sm text-ink-500">Posts you share will show up here.</p>
          </div>
        ) : (
          visiblePosts.map((post) => <PostCard key={post.id} post={post} />)
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
