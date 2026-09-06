import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Heart, Repeat2, Share2, Send, Pin, MoreHorizontal, Trash2, PinOff, Languages, Undo2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import ArchIllustration from '../components/ArchIllustration.jsx'
import { useApp } from '../context/AppContext.jsx'
import { formatCount } from '../utils/format.js'
import { translateText } from '../api/client.js'

// Same short allow-list the backend enforces (see
// backend/src/routes/translate.js) — kept here too so the picker only
// ever offers a target the endpoint will actually accept.
const TRANSLATE_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ur', label: 'Urdu' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'ar', label: 'Arabic' },
]

// Best-effort guess at "the language this viewer most likely wants
// comments translated into" — the device/browser's own language setting,
// falling back to English when that's unavailable or unsupported. Just a
// sensible default for the picker below; the viewer can always pick a
// different target language before translating.
function defaultTargetLang() {
  const code = (typeof navigator !== 'undefined' && navigator.language ? navigator.language.split('-')[0] : 'en').toLowerCase()
  return TRANSLATE_LANGS.some((l) => l.code === code) ? code : 'en'
}

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
    pushToast,
  } = useApp()
  const [comment, setComment] = useState('')

  useEffect(() => {
    loadComments(id)
  }, [id, loadComments])

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
  const isPostAuthor = post.authorId === currentUser.id

  const handleSend = (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    addComment(post.id, comment)
    setComment('')
  }

  // Same real-share pattern as PostCard.jsx's handleShare — this button
  // previously had no onClick at all.
  const handleShare = async () => {
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
            <button onClick={handleShare} className="focus-ring flex items-center gap-1.5 text-xs font-medium">
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
    </div>
  )
}

// One comment row with its mini-controls (see
// migrations/009_comment_mini_controls.sql): like, and — for the
// comment's own author or the post's author — pin/unpin and delete.
// Kept as its own component so each row's "•••" menu can open/close
// independently without re-rendering every other comment.
function CommentRow({ comment, postId, pinned = false, isPostAuthor, liked, onToggleLike, onDelete, onSetPinned }) {
  const { getUser, currentUser, pushToast, userSettings } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [langPickerOpen, setLangPickerOpen] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translation, setTranslation] = useState(null) // { text, langLabel } | null
  const [showOriginal, setShowOriginal] = useState(false)
  const commenter = getUser(comment.authorId)
  const isCommentAuthor = comment.authorId === currentUser.id
  const canManage = isCommentAuthor || isPostAuthor
  // Settings → Language & appearance (userSettings.appearance.language)
  // wins when set, since that's an explicit choice; browser language is
  // just the fallback for anyone who hasn't visited that screen yet.
  const preferredLang = TRANSLATE_LANGS.some((l) => l.code === userSettings.appearance.language)
    ? userSettings.appearance.language
    : defaultTargetLang()

  // Settings → Words & comments (MutedWords.jsx) writing to
  // userSettings.muted_words only matters if something actually reads it
  // — this is that. A pinned comment was a deliberate choice by the post
  // author, so it's exempt, same as it's exempt from other auto-hiding.
  const [revealed, setRevealed] = useState(false)
  const isMuted = !pinned && userSettings.muted_words.some((w) => comment.text.toLowerCase().includes(w))

  // Same real-share pattern as the post's own Share button above: native
  // share sheet where available, clipboard fallback, honest toast if
  // neither is supported — never a silent no-op.
  const handleShareComment = async () => {
    setMenuOpen(false)
    const shareData = {
      title: 'BharatSpace comment',
      text: `${commenter?.name || 'Someone'}: ${comment.text}`,
      url: `${window.location.origin}/post/${postId}`,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        /* user cancelled — no-op */
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
        pushToast('Comment copied to clipboard')
      } catch {
        pushToast('Could not copy — try again')
      }
    } else {
      pushToast('Sharing is not supported on this device')
    }
  }

  const runTranslate = async (langCode) => {
    setLangPickerOpen(false)
    setMenuOpen(false)
    setTranslating(true)
    try {
      const { translatedText } = await translateText(comment.text, langCode)
      const langLabel = TRANSLATE_LANGS.find((l) => l.code === langCode)?.label || langCode
      setTranslation({ text: translatedText, langLabel })
      setShowOriginal(false)
    } catch (err) {
      console.error('[CommentRow] translate failed', err)
      pushToast('Could not translate this comment — please try again')
    } finally {
      setTranslating(false)
    }
  }

  if (isMuted && !revealed) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-ink-50 px-3 py-2.5">
        <p className="flex-1 text-xs text-ink-500">Comment hidden — it contains a word you've muted.</p>
        <button onClick={() => setRevealed(true)} className="shrink-0 text-xs font-semibold text-saffron-600">
          Show
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <Avatar user={commenter} size="xs" />
      <div className="min-w-0 flex-1">
        {pinned && (
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-ink-500">
            <Pin className="h-3 w-3" /> Pinned by {isPostAuthor ? 'you' : 'the author'}
          </p>
        )}
        <p className="text-sm text-ink-900">
          <span className="font-semibold">{commenter?.name}</span>{' '}
          {translation && !showOriginal ? translation.text : comment.text}
        </p>

        {translation && (
          <button
            onClick={() => setShowOriginal((v) => !v)}
            className="mt-0.5 text-[11px] font-semibold text-saffron-600"
          >
            {showOriginal ? `Show translation (${translation.langLabel})` : 'Show original'}
          </button>
        )}

        <div className="mt-1 flex items-center gap-3">
          <p className="text-[11px] text-ink-500">{comment.time}</p>
          <button
            onClick={() => onToggleLike(postId, comment.id)}
            className="focus-ring flex items-center gap-1 text-[11px] font-medium text-ink-500"
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-bharat-red text-bharat-red' : ''}`} />
            {comment.likes > 0 && <span className={liked ? 'text-bharat-red' : ''}>{formatCount(comment.likes)}</span>}
          </button>
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="focus-ring rounded-full p-1 text-ink-400"
          aria-label="Comment options"
          disabled={translating}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setLangPickerOpen(false) }} />
            <div className="absolute right-0 top-6 z-20 w-52 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-lg">
              {!langPickerOpen ? (
                <>
                  {isPostAuthor && (
                    <button
                      onClick={() => { setMenuOpen(false); onSetPinned(postId, pinned ? null : comment.id) }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 hover:bg-ink-50"
                    >
                      {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      {pinned ? 'Unpin comment' : 'Pin comment'}
                    </button>
                  )}
                  {!translation ? (
                    <button
                      onClick={() => runTranslate(preferredLang)}
                      disabled={translating}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 hover:bg-ink-50 disabled:opacity-50"
                    >
                      <Languages className="h-4 w-4" /> {translating ? 'Translating…' : 'Translate comment'}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setTranslation(null); setShowOriginal(false); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 hover:bg-ink-50"
                    >
                      <Undo2 className="h-4 w-4" /> Remove translation
                    </button>
                  )}
                  <button
                    onClick={() => setLangPickerOpen(true)}
                    disabled={translating}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-600 hover:bg-ink-50 disabled:opacity-50"
                  >
                    <Languages className="h-4 w-4 opacity-0" /> Translate to…
                  </button>
                  <button
                    onClick={handleShareComment}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 hover:bg-ink-50"
                  >
                    <Share2 className="h-4 w-4" /> Share comment
                  </button>
                  {canManage && (
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(postId, comment.id) }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-bharat-red hover:bg-ink-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete comment
                    </button>
                  )}
                </>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <p className="px-3.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Translate to
                  </p>
                  {TRANSLATE_LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => runTranslate(l.code)}
                      className="flex w-full items-center px-3.5 py-2 text-left text-sm text-ink-800 hover:bg-ink-50"
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
