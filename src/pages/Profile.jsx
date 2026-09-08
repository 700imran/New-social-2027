import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Menu,
  MapPin,
  Calendar,
  Pencil,
  Grid3x3,
  Clapperboard,
  Bookmark,
  Tags,
  ArrowLeft,
  MoreHorizontal,
  Ban,
  Flag,
  MessageCircle,
  Send,
} from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import PostCard from '../components/PostCard.jsx'
import ReportModal from '../components/ReportModal.jsx'
import { useApp } from '../context/AppContext.jsx'
import { formatCount } from '../utils/format.js'

const OWN_CONTENT_TABS = [
  { key: 'posts', label: 'Posts', icon: Grid3x3 },
  { key: 'reels', label: 'Reels', icon: Clapperboard },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'tagged', label: 'Tagged', icon: Tags },
]
// Saved is private to the owner — never shown on someone else's profile.
const OTHER_CONTENT_TABS = OWN_CONTENT_TABS.filter((t) => t.key !== 'saved')

export default function Profile() {
  const {
    currentUser,
    posts,
    savedPostIds,
    getTaggedPosts,
    followedUserIds,
    toggleFollow,
    blockedUserIds,
    toggleBlock,
    loadUserProfile,
    loadUserPosts,
    pushToast,
  } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { userId: routeUserId } = useParams()

  // No :userId in the route (the bottom-nav "Profile" tab) or it's your
  // own id (e.g. tapping your own name in a comment) — either way this is
  // the same "my profile, fully editable" view the route always rendered.
  const isOwnProfile = !routeUserId || routeUserId === currentUser.id
  const targetId = routeUserId || currentUser.id

  const [menuOpen, setMenuOpen] = useState(false) // other-users' ••• menu only now — see header below
  const [activeTopic, setActiveTopic] = useState(null)
  const [activeContentTab, setActiveContentTab] = useState(() =>
    ['posts', 'reels', 'saved', 'tagged'].includes(location.state?.tab) ? location.state.tab : 'posts'
  )
  const [taggedPosts, setTaggedPosts] = useState([])
  const [taggedLoading, setTaggedLoading] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  // "Viewing someone else" state — fetched on demand, since only your own
  // posts/profile already sit in the app's always-loaded state. Keyed on
  // routeUserId (not isOwnProfile) so this also re-fetches correctly when
  // navigating from one other-user's profile straight to another one —
  // React Router reuses this component instance rather than remounting it
  // when only the :userId param changes.
  const [viewedUser, setViewedUser] = useState(null)
  const [viewedPosts, setViewedPosts] = useState([])
  const [profileLoading, setProfileLoading] = useState(Boolean(routeUserId))
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
    setActiveTopic(null)

    if (!routeUserId || routeUserId === currentUser.id) {
      setProfileLoading(false)
      return
    }

    let cancelled = false
    setActiveContentTab('posts') // "Saved" isn't a tab on someone else's profile
    setProfileLoading(true)
    setNotFound(false)
    setViewedUser(null)
    setViewedPosts([])

    Promise.all([loadUserProfile(routeUserId), loadUserPosts(routeUserId)]).then(([user, userPosts]) => {
      if (cancelled) return
      setProfileLoading(false)
      if (!user) {
        setNotFound(true)
        return
      }
      setViewedUser(user)
      setViewedPosts(userPosts)
    })
    return () => {
      cancelled = true
    }
  }, [routeUserId, currentUser.id, loadUserProfile, loadUserPosts])

  const profileUser = isOwnProfile ? currentUser : viewedUser

  const myPosts = useMemo(
    () => (isOwnProfile ? posts : viewedPosts).filter((p) => p.authorId === targetId && p.kind !== 'reel'),
    [isOwnProfile, posts, viewedPosts, targetId]
  )
  const myReels = useMemo(
    () => (isOwnProfile ? posts : viewedPosts).filter((p) => p.authorId === targetId && p.kind === 'reel'),
    [isOwnProfile, posts, viewedPosts, targetId]
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
    getTaggedPosts(targetId).then((rows) => {
      if (!cancelled) {
        setTaggedPosts(rows)
        setTaggedLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [activeContentTab, targetId, getTaggedPosts])

  // Previously silent in two of its three branches — if navigator.share
  // was unavailable (common in the Capacitor Android WebView, which
  // doesn't implement the Web Share API on every OS version) and the
  // clipboard write either succeeded or failed, nothing told the user
  // anything happened, so the button looked broken even when the copy
  // actually worked. Now mirrors PostDetail.jsx's already-correct
  // handleNativeShare: every branch ends in visible feedback.
  const handleShare = async () => {
    if (!profileUser) return
    const shareData = {
      title: 'BharatSpace',
      text: `Check out ${profileUser.name} on BharatSpace`,
      url: `${window.location.origin}${isOwnProfile ? '/profile' : `/profile/${targetId}`}`,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // AbortError = the user cancelled the native share sheet
        // themselves — that's a normal outcome, not a failure, so it
        // gets no toast. Anything else (e.g. NotAllowedError on some
        // WebView builds) is a real failure and should say so rather
        // than leaving the button looking like it did nothing.
        if (err?.name !== 'AbortError') {
          pushToast('Could not open the share sheet — try again')
        }
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.url)
        pushToast('Profile link copied to clipboard')
      } catch {
        pushToast('Could not copy link — try again')
      }
    } else {
      pushToast('Sharing is not supported on this device')
    }
  }

  const closeMenu = () => setMenuOpen(false)

  const isFollowing = !isOwnProfile && followedUserIds.has(targetId)
  const isBlocked = !isOwnProfile && blockedUserIds.has(targetId)

  const emptyStateFor = {
    posts: {
      title: 'No posts yet',
      body: isOwnProfile ? 'Posts you share will show up here.' : `${profileUser?.name || 'This account'} hasn't posted yet.`,
    },
    reels: {
      title: 'No reels yet',
      body: isOwnProfile ? 'Reels you post will show up here.' : `${profileUser?.name || 'This account'} hasn't posted a reel yet.`,
    },
    saved: { title: 'Nothing saved yet', body: 'Posts and reels you save will show up here.' },
    tagged: { title: 'No tags yet', body: "Posts and reels tagged here will show up here." },
  }[activeContentTab]

  const activeList = { posts: visiblePosts, reels: myReels, saved: savedPosts, tagged: taggedPosts }[activeContentTab]
  const tabs = isOwnProfile ? OWN_CONTENT_TABS : OTHER_CONTENT_TABS

  if (!isOwnProfile && profileLoading) {
    return (
      <div>
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur">
          <button onClick={() => navigate(-1)} className="focus-ring -ml-1 rounded-full p-1.5 text-ink-700" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-navy-900">Profile</h1>
        </header>
        <div className="px-6 py-20 text-center text-sm text-ink-500">Loading profile…</div>
      </div>
    )
  }

  if (!isOwnProfile && notFound) {
    return (
      <div>
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur">
          <button onClick={() => navigate(-1)} className="focus-ring -ml-1 rounded-full p-1.5 text-ink-700" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-navy-900">Profile</h1>
        </header>
        <div className="px-6 py-20 text-center">
          <p className="font-display text-base font-semibold text-ink-900">Account not found</p>
          <p className="mt-1 text-sm text-ink-500">This profile may have been removed, or never existed.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          {!isOwnProfile && (
            <button onClick={() => navigate(-1)} className="focus-ring -ml-1 shrink-0 rounded-full p-1.5 text-ink-700" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="truncate font-display text-lg font-bold text-navy-900">{isOwnProfile ? 'Profile' : profileUser.name}</h1>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => (isOwnProfile ? navigate('/settings') : setMenuOpen((m) => !m))}
            className="focus-ring rounded-full p-1.5 text-ink-700"
            aria-label={isOwnProfile ? 'Settings' : 'Menu'}
          >
            {isOwnProfile ? <Menu className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          </button>
          {menuOpen && !isOwnProfile && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={closeMenu} aria-label="Close menu" />
              <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lg animate-popIn">
                <button
                  onClick={() => { closeMenu(); handleShare() }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-900 hover:bg-ink-50"
                >
                  <Send className="h-4 w-4" /> Share profile
                </button>
                <button
                  onClick={() => { closeMenu(); toggleBlock(targetId) }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-900 hover:bg-ink-50"
                >
                  <Ban className="h-4 w-4" /> {isBlocked ? 'Unblock' : 'Block'}
                </button>
                <button
                  onClick={() => { closeMenu(); setReportOpen(true) }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-bharat-red hover:bg-ink-50"
                >
                  <Flag className="h-4 w-4" /> Report
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
          <Avatar user={profileUser} size="xl" />
        </div>

        <div className="mt-3">
          <h2 className="font-display text-xl font-bold text-navy-900">{profileUser.name}</h2>
          <p className="text-sm text-ink-500">{profileUser.handle}</p>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-700">{profileUser.bio}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
          {profileUser.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {profileUser.location}
            </span>
          )}
          {profileUser.joined && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Joined {profileUser.joined}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-6">
          <Stat label="Posts" value={myPosts.length || profileUser.posts} />
          <Stat
            label="Followers"
            value={profileUser.followers}
            onClick={() => navigate(isOwnProfile ? '/profile/followers' : `/profile/${targetId}/followers`)}
          />
          <Stat
            label="Following"
            value={profileUser.following}
            onClick={() => navigate(isOwnProfile ? '/profile/following' : `/profile/${targetId}/following`)}
          />
        </div>

        {isOwnProfile ? (
          <div className="mt-4 flex gap-2.5">
            <button
              onClick={() => navigate('/profile/edit')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-200 py-2.5 text-sm font-bold text-ink-900 active:scale-[0.98]"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Profile
            </button>
            <button
              onClick={handleShare}
              className="flex-1 rounded-full bg-saffron-gradient py-2.5 text-sm font-bold text-navy-950 shadow-pop active:scale-[0.98]"
            >
              Share Profile
            </button>
          </div>
        ) : isBlocked ? (
          <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-ink-700">You've blocked {profileUser.name}</p>
            <button onClick={() => toggleBlock(targetId)} className="mt-1.5 text-xs font-semibold text-saffron-600">
              Unblock
            </button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2.5">
            <button
              onClick={() => toggleFollow(targetId)}
              className={`flex-1 rounded-full py-2.5 text-sm font-bold active:scale-[0.98] ${
                isFollowing ? 'border border-ink-200 text-ink-900' : 'bg-saffron-gradient text-navy-950 shadow-pop'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button
              onClick={() => navigate(`/messages/${targetId}`)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-200 py-2.5 text-sm font-bold text-ink-900 active:scale-[0.98]"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Message
            </button>
          </div>
        )}

        {activeContentTab === 'posts' && profileUser.topics?.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold text-navy-900">{isOwnProfile ? 'My Topics' : 'Topics'}</p>
              {activeTopic && (
                <button onClick={() => setActiveTopic(null)} className="text-xs font-semibold text-saffron-600">
                  Clear filter
                </button>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {profileUser.topics.map((t) => (
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
        {tabs.map(({ key, label, icon: Icon }) => (
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

      {reportOpen && <ReportModal targetType="user" targetId={targetId} onClose={() => setReportOpen(false)} />}
    </div>
  )
}

// Posts has no onClick (nothing to open — its count already mirrors the
// grid right below), so this renders a plain <div> for that one and a
// real tappable button for Followers/Following, per the nav requirement
// that both open their full list rather than sitting there as dead text.
function Stat({ label, value, onClick }) {
  const content = (
    <>
      <p className="font-display text-base font-bold text-navy-900">{formatCount(value)}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </>
  )
  if (!onClick) return <div>{content}</div>
  return (
    <button onClick={onClick} className="focus-ring rounded-lg text-left transition-opacity active:opacity-60">
      {content}
    </button>
  )
}
