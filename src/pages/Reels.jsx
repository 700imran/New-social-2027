import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Heart, MessageCircle, Send, Bookmark, Music2 } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'
import { REELS } from '../data/mockData.js'
import { formatCount } from '../utils/format.js'

const TABS = ['For You', 'Following', 'Explore']

// A handful of fallback background tones for real reels that don't carry
// one (the mock REELS fixtures below do) — cycles by id so it's at least
// stable across re-renders instead of random each time.
const FALLBACK_TONES = [
  'from-navy-800 to-navy-950',
  'from-saffron-700 to-navy-950',
  'from-purple-800 to-navy-950',
  'from-emerald-800 to-navy-950',
]
function toneFor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_TONES[h % FALLBACK_TONES.length]
}

export default function Reels() {
  const [activeTab, setActiveTab] = useState('For You')
  const { posts, followedUserIds } = useApp()
  const navigate = useNavigate()

  // A "reel" is just a post with kind='reel' (see
  // docs/migrations/005_reels_and_tags.sql) — mapped into the same shape
  // the mock REELS fixtures already use so ReelCard doesn't need two
  // rendering paths. Mock demo reels stay in the mix so the feed isn't
  // empty before anyone's posted a real one; in live mode they're the
  // only thing filling the screen until real reels exist.
  const userReels = useMemo(
    () =>
      posts
        .filter((p) => p.kind === 'reel')
        .map((p) => ({
          id: p.id,
          authorId: p.authorId,
          tone: toneFor(p.id),
          caption: p.text,
          mediaUrl: p.imagePreview,
          likes: p.likes,
          comments: p.comments,
          shares: 0,
          isRealPost: true,
        })),
    [posts]
  )

  const allReels = useMemo(() => [...userReels, ...REELS], [userReels])

  const visibleReels = useMemo(() => {
    if (activeTab === 'Following') return allReels.filter((r) => followedUserIds.has(r.authorId))
    return allReels
  }, [allReels, activeTab, followedUserIds])

  return (
    <div className="flex flex-col bg-navy-950">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3">
        <h1 className="font-display text-xl font-bold text-white">Reels</h1>
        <button onClick={() => navigate('/create')} className="focus-ring rounded-full p-1" aria-label="Create a reel">
          <Camera className="h-5 w-5 text-white" />
        </button>
      </header>

      <div className="flex gap-5 px-4 pb-3 text-sm font-semibold">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`focus-ring shrink-0 whitespace-nowrap pb-1 transition-colors ${
              activeTab === tab ? 'border-b-2 border-saffron-400 text-white' : 'text-white/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {visibleReels.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <p className="font-display text-base font-semibold text-white">No reels here yet</p>
          <p className="mt-1 text-sm text-white/60">
            {activeTab === 'Following' ? 'Reels from people you follow will show up here.' : 'Be the first to post one.'}
          </p>
        </div>
      ) : (
        <div className="no-scrollbar snap-y snap-mandatory overflow-y-auto" style={{ scrollSnapType: 'y mandatory' }}>
          {visibleReels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReelCard({ reel }) {
  const navigate = useNavigate()
  const { getUser, followedUserIds, toggleFollow, likedPostIds, savedPostIds, toggleLike, toggleSave, pushToast } = useApp()
  const author = getUser(reel.authorId)
  const following = author ? followedUserIds.has(author.id) : false
  const liked = likedPostIds.has(reel.id)
  const saved = savedPostIds.has(reel.id)

  const videoRef = React.useRef(null)
  const sectionRef = React.useRef(null)
  const hideControlsTimer = React.useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showPlayIcon, setShowPlayIcon] = useState(false)

  // Only the reel actually on screen should have audio playing — without
  // this, every <video> in this scroll-snap list would autoplay at once
  // (they're all mounted simultaneously) and overlap audio the moment
  // sound isn't hardcoded off anymore. IntersectionObserver is the real
  // "is this the one the user is currently looking at" signal; scroll
  // position math would be a much flakier proxy for the same thing.
  React.useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const playPromise = video.play()
          setIsPlaying(true)
          if (playPromise?.catch) {
            playPromise.catch(() => {
              // Autoplay-with-sound is blocked by the browser until the
              // user has interacted with the page — fall back to muted
              // playback rather than leaving the reel frozen on frame 1,
              // and let the speaker button (always visible) be how they
              // turn sound back on.
              video.muted = true
              setIsMuted(true)
              video.play().catch(() => {})
            })
          }
        } else {
          video.pause()
          setIsPlaying(false)
        }
      },
      { threshold: [0, 0.6, 1] }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => () => clearTimeout(hideControlsTimer.current), [])

  const handleTapVideo = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
    // The pause/resume icon is only ever a brief confirmation of the tap
    // that just happened, not a persistent transport control — mirrors
    // the "only visible when the user touches it" request.
    setShowPlayIcon(true)
    clearTimeout(hideControlsTimer.current)
    hideControlsTimer.current = setTimeout(() => setShowPlayIcon(false), 700)
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  // Real reels' `likes` count already reflects toggleLike's optimistic
  // update (it lives in the same `posts` array PostCard reads from), so
  // it must NOT get the same "+1 for display" the static mock reels need
  // (their fixture number in mockData.js never itself changes).
  const displayLikes = reel.isRealPost ? reel.likes : reel.likes + (liked ? 1 : 0)

  const handleComment = () => {
    if (reel.isRealPost) navigate(`/post/${reel.id}`)
    else pushToast('Comments coming soon for Reels')
  }

  // Was previously a fake "Link copied to clipboard" toast with nothing
  // actually copied — same class of bug the Copy Link fix elsewhere in
  // this app already addressed, just missed here. Mirrors PostCard's
  // handleShare: only a real, real post has a real URL to share.
  const handleShare = async (e) => {
    e.stopPropagation()
    const shareData = {
      title: 'BharatSpace',
      text: reel.caption || 'Check this out on BharatSpace',
      url: reel.isRealPost ? `${window.location.origin}/post/${reel.id}` : window.location.origin,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        /* user cancelled — no-op */
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.url)
        pushToast('Link copied to clipboard')
      } catch {
        pushToast('Could not copy link — try again')
      }
    } else {
      pushToast('Sharing is not supported on this device')
    }
  }

  return (
    <section
      ref={sectionRef}
      className={`relative flex h-[70dvh] w-full shrink-0 snap-start items-end overflow-hidden bg-gradient-to-br ${reel.tone}`}
      style={{ scrollSnapAlign: 'start' }}
    >
      {reel.mediaUrl && (
        <button
          onClick={handleTapVideo}
          className="absolute inset-0 h-full w-full cursor-default"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <video
            ref={videoRef}
            src={reel.mediaUrl}
            className="h-full w-full object-cover"
            autoPlay
            loop
            playsInline
          />
        </button>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/10 to-navy-950/40" />

      {/* Pause/resume glyph — only rendered for the ~700ms after a tap,
          never sitting on screen as a persistent transport control. */}
      {reel.mediaUrl && showPlayIcon && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-full bg-black/40 p-4 animate-popIn">
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-9 w-9 fill-white"><path d="M8 5h3v14H8zm5 0h3v14h-3z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-9 w-9 fill-white"><path d="M8 5v14l11-7z" /></svg>
            )}
          </div>
        </div>
      )}

      {/* Mute toggle stays visible (not tap-gated like play/pause) — it's
          also the recovery control when the browser silently blocked
          autoplay-with-sound and fell back to muted. */}
      {reel.mediaUrl && (
        <button
          onClick={toggleMute}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45c.03-.2.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
          )}
        </button>
      )}

      <div className="relative z-10 flex w-full items-end justify-between gap-3 p-4 pb-6">
        <div className="min-w-0 flex-1 text-white">
          {author && (
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(`/profile/${author.id}`)} className="flex items-center gap-2">
                <Avatar user={author} size="sm" showVerified={false} />
                <span className="text-sm font-semibold">{author.name}</span>
              </button>
              {!following && (
                <button
                  onClick={() => toggleFollow(author.id)}
                  className="rounded-full border border-white/70 px-2.5 py-0.5 text-[11px] font-semibold"
                >
                  Follow
                </button>
              )}
            </div>
          )}
          {reel.caption && <p className="mt-2 text-[13px] leading-snug text-white/95">{reel.caption}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/80">
            <Music2 className="h-3 w-3" /> Original Audio
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-4 text-white">
          <button onClick={() => toggleLike(reel.id)} className="focus-ring flex flex-col items-center gap-1">
            <Heart className={`h-6 w-6 ${liked ? 'fill-bharat-red text-bharat-red animate-heartBeat' : ''}`} />
            <span className="text-[11px] font-semibold">{formatCount(displayLikes)}</span>
          </button>
          <button onClick={handleComment} className="focus-ring flex flex-col items-center gap-1">
            <MessageCircle className="h-6 w-6" />
            <span className="text-[11px] font-semibold">{formatCount(reel.comments)}</span>
          </button>
          {reel.isRealPost && (
            <button onClick={() => toggleSave(reel.id)} className="focus-ring flex flex-col items-center gap-1">
              <Bookmark className={`h-6 w-6 ${saved ? 'fill-white' : ''}`} />
            </button>
          )}
          <button onClick={handleShare} className="focus-ring flex flex-col items-center gap-1">
            <Send className="h-6 w-6" />
            <span className="text-[11px] font-semibold">{formatCount(reel.shares)}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
