import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Heart, Repeat2, Share2, Send } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import ArchIllustration from '../components/ArchIllustration.jsx'
import { useApp } from '../context/AppContext.jsx'
import { formatCount } from '../utils/format.js'

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { posts, getUser, currentUser, likedPostIds, toggleLike, repost, addComment } = useApp()
  const [comment, setComment] = useState('')

  const post = posts.find((p) => p.id === id)

  if (!post) {
    return (
      <div>
        <PageHeader title="Post" showBack />
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-ink-500">This post is no longer available.</p>
          <button onClick={() => navigate('/home')} className="mt-3 text-sm font-semibold text-saffron-600">
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const author = getUser(post.authorId)
  const liked = likedPostIds.has(post.id)

  const handleSend = (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    addComment(post.id, comment)
    setComment('')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="Post" showBack />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="border-b border-ink-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar user={author} size="md" />
            <div>
              <p className="text-sm font-semibold text-ink-900">{author?.name}</p>
              <p className="text-xs text-ink-500">{author?.handle} · {post.time}</p>
            </div>
          </div>

          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-900">{post.text}</p>

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
            <div className="mt-3 overflow-hidden rounded-xl">
              <ArchIllustration className="h-48 w-full" />
            </div>
          )}

          <div className="mt-4 flex items-center gap-6 border-t border-ink-100 pt-3 text-ink-500">
            <button onClick={() => toggleLike(post.id)} className="focus-ring flex items-center gap-1.5 text-xs font-medium">
              <Heart className={`h-[18px] w-[18px] ${liked ? 'fill-bharat-red text-bharat-red animate-heartBeat' : ''}`} />
              <span className={liked ? 'text-bharat-red' : ''}>{formatCount(post.likes)}</span>
            </button>
            <button onClick={() => repost(post.id)} className="focus-ring flex items-center gap-1.5 text-xs font-medium">
              <Repeat2 className="h-[19px] w-[19px]" />
              {formatCount(post.reposts)}
            </button>
            <button className="focus-ring flex items-center gap-1.5 text-xs font-medium">
              <Share2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {post.comments} comment{post.comments === 1 ? '' : 's'}
          </p>
          <div className="mt-3 flex flex-col gap-4">
            {post.comments_list.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">No comments yet — be the first to share your thoughts.</p>
            ) : (
              post.comments_list.map((c) => {
                const commenter = getUser(c.authorId)
                return (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Avatar user={commenter} size="xs" />
                    <div>
                      <p className="text-sm text-ink-900">
                        <span className="font-semibold">{commenter?.name}</span> {c.text}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-500">{c.time}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="app-shell fixed bottom-0 left-1/2 z-40 flex w-full max-w-[480px] -translate-x-1/2 items-center gap-2 border-t border-ink-100 bg-white px-3 py-2.5"
      >
        <Avatar user={currentUser} size="xs" />
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 rounded-full bg-ink-100 px-4 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-500"
        />
        <button
          type="submit"
          disabled={!comment.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-gradient text-white shadow-pop disabled:opacity-40"
          aria-label="Send comment"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
