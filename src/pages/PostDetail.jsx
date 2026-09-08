import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Heart, Repeat2, Share2, Send } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import ArchIllustration from '../components/ArchIllustration.jsx'
import CommentRow from '../components/CommentRow.jsx'
import ShareSheet from '../components/ShareSheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { formatCount } from '../utils/format.js'

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    posts,
    getUser,
    currentUser,
    likedPostIds,
    likedCommentIds,
    toggleLike,
    toggleCommentLike,
    deleteComment,
    setPinnedComment,
    repost,
    addComment,
    loadComments,
    fetchPostById,
    pushToast,
  } = useApp()
  const [comment, setComment] = useState('')
  const [shareSheetOpen, setShareSheetOpen] = useState(false)
  const [resolving, setResolving] = useState(true)

  useEffect(() => {
    loadComments(id)
  }, [id, loadComments])

  // `posts` already has it most of the time (arrived here from the feed
  // or a reel) — fetchPostById only actually hits the network for the
  // remaining case, a real deep link to a post this session never
  // fetched as part of its feed.
  useEffect(() => {
    let cancelled = false
    setResolving(true)
    fetchPostById(id).finally(() => {
      if (!cancelled) setResolving(false)
    })
    return () => {
      cancelled = true
    }
  }, [id, fetchPostById])

  const post = posts.find((p) => p.id === id)

  if (!post) {
    if (resolving) {
      return (
        <div>
          <PageHeader title="Post" showBack />
          <div className="px-4 py-4">
            <div className="skeleton h-40 w-full rounded-2xl" />
          </div>
        </div>
      )
    }
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
  const isPostAuthor = post.authorId === currentUser.id

  const handleSend = (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    addComment(post.id, comment)
    setComment('')
  }

  // Native OS share sheet / clipboard fallback — offered as one row
  // inside ShareSheet (below) alongside "send directly to a person".
  const handleNativeShare = async () => {
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

  const pinnedComment = post.pinnedCommentId
    ? post.comments_list.find((c) => c.id === post.pinnedCommentId)
    : null
  const unpinnedComments = pinnedComment
    ? post.comments_list.filter((c) => c.id !== pinnedComment.id)
    : post.comments_list

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="Post" showBack />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="border-b border-ink-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => author && navigate(author.id === currentUser.id ? '/profile' : `/profile/${author.id}`)}
              className="flex items-center gap-3 text-left"
            >
              <Avatar user={author} size="md" />
              <div>
                <p className="text-sm font-semibold text-ink-900">{author?.name}</p>
                <p className="text-xs text-ink-500">{author?.handle} · {post.time}</p>
              </div>
            </button>
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
              {post.imagePreview ? (
                <img src={post.imagePreview} alt="" className="h-48 w-full object-cover" />
              ) : (
                <ArchIllustration className="h-48 w-full" />
              )}
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
            <button onClick={() => setShareSheetOpen(true)} className="focus-ring flex items-center gap-1.5 text-xs font-medium">
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
              <>
                {pinnedComment && (
                  <CommentRow
                    comment={pinnedComment}
                    pinned
                    postId={post.id}
                    isPostAuthor={isPostAuthor}
                    liked={likedCommentIds.has(pinnedComment.id)}
                    onToggleLike={toggleCommentLike}
                    onDelete={deleteComment}
                    onSetPinned={setPinnedComment}
                  />
                )}
                {unpinnedComments.map((c) => (
                  <CommentRow
                    key={c.id}
                    comment={c}
                    postId={post.id}
                    isPostAuthor={isPostAuthor}
                    liked={likedCommentIds.has(c.id)}
                    onToggleLike={toggleCommentLike}
                    onDelete={deleteComment}
                    onSetPinned={setPinnedComment}
                  />
                ))}
              </>
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

      <ShareSheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        postId={post.id}
        onNativeShare={handleNativeShare}
      />
    </div>
  )
}
