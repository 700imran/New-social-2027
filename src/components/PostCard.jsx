import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Repeat2, Share2, Bookmark, Radio } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Avatar from './Avatar.jsx'
import ArchIllustration from './ArchIllustration.jsx'
import { formatCount } from '../utils/format.js'

export default function PostCard({ post, onOpen }) {
  const { getUser, currentUser, likedPostIds, savedPostIds, followedUserIds, toggleLike, toggleSave, repost, toggleFollow, pushToast } = useApp()
  const navigate = useNavigate()
  const [justReposted, setJustReposted] = useState(false)

  const author = getUser(post.authorId)
  if (!author) return null
  const isMe = author.id === currentUser.id
  const liked = likedPostIds.has(post.id)
  const saved = savedPostIds.has(post.id)
  const following = followedUserIds.has(author.id)

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
    } else {
      pushToast('Link copied to clipboard')
    }
  }

  const openPost = () => {
    if (onOpen) onOpen(post.id)
    else navigate(`/post/${post.id}`)
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
        {!isMe && (
          <button
            onClick={() => toggleFollow(author.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              following ? 'border-ink-300 text-ink-700' : 'border-saffron-500 bg-white text-saffron-600'
            }`}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

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
        <button onClick={openPost} className="focus-ring relative mt-3 block w-full overflow-hidden rounded-xl">
          <ArchIllustration className="h-44 w-full object-cover" />
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

        <button onClick={openPost} className="focus-ring flex items-center gap-1.5 rounded-lg py-1 pr-2 text-xs font-medium">
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
