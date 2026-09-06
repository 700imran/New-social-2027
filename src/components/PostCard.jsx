import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Repeat2, Share2, Bookmark, Radio, MoreHorizontal, Flag, Ban, EyeOff, Sparkles, VolumeX, Volume2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { usePrefetchOnIntent } from '../utils/usePrefetchOnIntent.js'
import Avatar from './Avatar.jsx'
import MediaImage from './MediaImage.jsx'
import ArchIllustration from './ArchIllustration.jsx'
import ReportModal from './ReportModal.jsx'
import WhySeeingModal from './WhySeeingModal.jsx'
import { formatCount } from '../utils/format.js'

export default function PostCard({ post, onOpen }) {
  const {
    getUser,
    currentUser,
    likedPostIds,
    savedPostIds,
    followedUserIds,
    mutedUserIds,
    toggleLike,
    toggleSave,
    repost,
    toggleFollow,
    toggleBlock,
    toggleMute,
    hidePost,
    loadComments,
    pushToast,
  } = useApp()
  const navigate = useNavigate()
  const [justReposted, setJustReposted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [whySeeingOpen, setWhySeeingOpen] = useState(false)
  const [showBigHeart, setShowBigHeart] = useState(false)
  const lastTapRef = React.useRef(0)

  const author = getUser(post.authorId)
  if (!author) return null
  const isMe = author.id === currentUser.id
  const liked = likedPostIds.has(post.id)
  const saved = savedPostIds.has(post.id)
  const following = followedUserIds.has(author.id)
  const muted = mutedUserIds.has(author.id)

  const handleRepost = (e) => {
    e.stopPropagation()
    repost(post.id)
    setJustReposted(true)
    setTimeout(() => setJustReposted(false), 700)
  }

  const handleShare = async (e) => {
    e.stopPropagation()
    const shareData = { title: 'BharatSpace', text: post.text, url: `${window.location.origin}/post/${post.id}` }
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

  const openPost = () => {
    if (onOpen) onOpen(post.id)
    else navigate(`/post/${post.id}`)
  }

  const prefetchComments = usePrefetchOnIntent(() => loadComments(post.id))
  const singleTapTimer = React.useRef(null)
  React.useEffect(() => () => clearTimeout(singleTapTimer.current), [])

  // Double-tap-to-like needs the same click event to mean two different
  // things depending on timing, so a genuine single tap can't navigate
  // immediately — it has to wait out the double-tap window first, same
  // trade-off every app with this gesture makes (Instagram included).
  const handleMediaTap = () => {
    const now = Date.now()
    const sinceLastTap = now - lastTapRef.current
    if (sinceLastTap > 0 && sinceLastTap < 300) {
      clearTimeout(singleTapTimer.current)
      lastTapRef.current = 0
      if (!liked) toggleLike(post.id)
      setShowBigHeart(true)
      setTimeout(() => setShowBigHeart(false), 650)
    } else {
      lastTapRef.current = now
      singleTapTimer.current = setTimeout(openPost, 280)
    }
  }

  return (
    <article className="animate-fadeUp border-b border-ink-100 bg-white px-4 py-4">
      <div className="flex items-start justify-between">
        <button className="flex items-start gap-3 text-left focus-ring rounded-lg" onClick={openPost}>
          <Avatar user={author} size="md" />
          <div>
            <p className="flex items-center gap-1 text-sm font-semibold text-ink-900">{author.name}</p>
            <p className="text-xs text-ink-500">
              {post.time} {author.handle && `· ${author.location ?? ''}`}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {!isMe && (
            <button
              onClick={() => toggleFollow(author.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                following ? 'border-ink-300 text-ink-700' : 'border-saffron-500 bg-white text-saffron-600'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
              className="focus-ring rounded-full p-1 text-ink-400"
              aria-label="More options"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
                <div className="absolute right-0 top-7 z-20 w-52 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-lg">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); hidePost(post.id) }}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 hover:bg-ink-50"
                  >
                    <EyeOff className="h-4 w-4" /> Not interested
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setWhySeeingOpen(true) }}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 hover:bg-ink-50"
                  >
                    <Sparkles className="h-4 w-4" /> Why am I seeing this?
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setReportOpen(true) }}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 hover:bg-ink-50"
                  >
                    <Flag className="h-4 w-4" /> Report post
                  </button>
                  {!isMe && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); toggleMute(author.id) }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 hover:bg-ink-50"
                    >
                      {muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      {muted ? `Unmute ${author.name}` : `Mute ${author.name}`}
                    </button>
                  )}
                  {!isMe && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); toggleBlock(author.id) }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-bharat-red hover:bg-ink-50"
                    >
                      <Ban className="h-4 w-4" /> Block {author.name}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {reportOpen && <ReportModal targetType="post" targetId={post.id} onClose={() => setReportOpen(false)} />}
      {whySeeingOpen && (
        <WhySeeingModal
          post={post}
          author={author}
          following={following}
          onClose={() => setWhySeeingOpen(false)}
          onHide={() => hidePost(post.id)}
        />
      )}

      <button onClick={openPost} className="mt-3 block text-left focus-ring rounded-lg">
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-900">{post.text}</p>
      </button>

      {post.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-medium text-saffron-700">
              {tag}
            </span>
          ))}
        </div>
      )}

      {post.hasImage && (
        <button onClick={handleMediaTap} {...prefetchComments} className="focus-ring relative mt-3 block w-full overflow-hidden rounded-xl">
          {post.imagePreview ? (
            post.kind === 'reel' ? (
              <video src={post.imagePreview} className="h-44 w-full object-cover" muted playsInline preload="metadata" />
            ) : (
              <MediaImage src={post.imagePreview} alt="" className="h-44 w-full" />
            )
          ) : (
            <ArchIllustration className="h-44 w-full object-cover" />
          )}
          {showBigHeart && (
            <Heart
              className="animate-popIn pointer-events-none absolute inset-0 m-auto h-16 w-16 fill-white text-white drop-shadow-lg"
            />
          )}
          {post.kind === 'reel' && (
            <span className="absolute right-2 top-2 rounded-full bg-navy-950/70 px-2 py-0.5 text-[10px] font-bold text-white">
              Reel
            </span>
          )}
          {post.live && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-bharat-red px-2 py-0.5 text-[10px] font-bold text-white">
              <Radio className="h-3 w-3" /> Live Updates
            </span>
          )}
        </button>
      )}

      {!post.hasImage && post.live && (
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-bharat-red/10 px-2 py-1 text-[11px] font-bold text-bharat-red">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bharat-red" /> LIVE
        </span>
      )}

      <div className="mt-3 flex items-center justify-between text-ink-500">
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(post.id) }}
          className="focus-ring flex items-center gap-1.5 rounded-lg py-1 pr-2 text-xs font-medium"
        >
          <Heart
            className={`h-[18px] w-[18px] transition-colors ${liked ? 'fill-bharat-red text-bharat-red animate-heartBeat' : ''}`}
          />
          <span className={liked ? 'text-bharat-red' : ''}>{formatCount(post.likes)}</span>
        </button>

        <button onClick={openPost} {...prefetchComments} className="focus-ring flex items-center gap-1.5 rounded-lg py-1 pr-2 text-xs font-medium">
          <MessageCircle className="h-[18px] w-[18px]" />
          {formatCount(post.comments)}
        </button>

        <button onClick={handleRepost} className="focus-ring flex items-center gap-1.5 rounded-lg py-1 pr-2 text-xs font-medium">
          <Repeat2 className={`h-[19px] w-[19px] transition-transform ${justReposted ? 'text-bharat-green rotate-[360deg]' : ''}`} style={{ transitionDuration: '600ms' }} />
          <span className={justReposted ? 'text-bharat-green' : ''}>{formatCount(post.reposts)}</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); toggleSave(post.id) }} className="focus-ring rounded-lg py-1 pr-2">
          <Bookmark className={`h-[18px] w-[18px] ${saved ? 'fill-navy-900 text-navy-900' : ''}`} />
        </button>

        <button onClick={handleShare} className="focus-ring rounded-lg py-1">
          <Share2 className="h-[18px] w-[18px]" />
        </button>
      </div>
    </article>
  )
}
