import React, { useEffect, useState } from 'react'
import { X, Send } from 'lucide-react'
import Avatar from './Avatar.jsx'
import CommentRow from './CommentRow.jsx'
import { useApp } from '../context/AppContext.jsx'

// The slide-up comment sheet opened by tapping the comment icon on a
// post (PostCard.jsx) or a reel (Reels.jsx) — previously the only way to
// see or add comments was navigating away entirely to PostDetail.jsx,
// which breaks a reel's video mid-playback. Reuses the exact same
// CommentRow (like/pin/translate/share/delete) PostDetail.jsx uses, just
// inside an overlay instead of a full page — same data, same actions,
// two presentations.
export default function CommentSheet({ open, onClose, postId }) {
  const { posts, getUser, currentUser, likedCommentIds, toggleCommentLike, deleteComment, setPinnedComment, addComment, loadComments } =
    useApp()
  const [text, setText] = useState('')

  useEffect(() => {
    if (open && postId) loadComments(postId)
  }, [open, postId, loadComments])

  if (!open) return null

  const post = posts.find((p) => p.id === postId)
  if (!post) return null

  const isPostAuthor = post.authorId === currentUser.id
  const pinnedComment = post.pinnedCommentId ? post.comments_list.find((c) => c.id === post.pinnedCommentId) : null
  const unpinnedComments = pinnedComment ? post.comments_list.filter((c) => c.id !== pinnedComment.id) : post.comments_list

  const handleSend = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addComment(post.id, text)
    setText('')
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="app-shell fixed inset-x-0 bottom-0 z-[60] mx-auto flex h-[85dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl animate-slideUp">
        <div className="flex shrink-0 items-center justify-between border-b border-ink-100 px-4 py-3">
          <p className="font-display text-base font-semibold text-ink-900">
            {post.comments} comment{post.comments === 1 ? '' : 's'}
          </p>
          <button onClick={onClose} className="focus-ring rounded-full p-1 text-ink-500" aria-label="Close comments">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {post.comments_list.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-500">No comments yet — be the first to share your thoughts.</p>
          ) : (
            <div className="flex flex-col gap-4">
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
                  onNavigate={onClose}
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
                  onNavigate={onClose}
                />
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSend}
          className="flex shrink-0 items-center gap-2 border-t border-ink-100 px-3 py-2.5 pb-[max(env(safe-area-inset-bottom),10px)]"
        >
          <Avatar user={currentUser} size="xs" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-full bg-ink-100 px-4 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-gradient text-white shadow-pop disabled:opacity-40"
            aria-label="Send comment"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  )
}
