import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Share2, Pin, MoreHorizontal, Trash2, PinOff, Languages, Undo2 } from 'lucide-react'
import Avatar from './Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'
import { formatCount } from '../utils/format.js'
import { translateText } from '../api/client.js'

// Extracted out of PostDetail.jsx so CommentSheet.jsx (the slide-up
// comment bar opened from PostCard.jsx/Reels.jsx) can render the exact
// same row — like/pin/translate/share/delete all in one place — instead
// of a second, drifting copy of this logic.

// Same short allow-list the backend enforces (see
// backend/src/routes/translate.js) — kept here too so the picker only
// ever offers a target the endpoint will actually accept.
export const TRANSLATE_LANGS = [
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

// One comment row with its mini-controls (see
// migrations/009_comment_mini_controls.sql): like, and — for the
// comment's own author or the post's author — pin/unpin and delete.
// Kept as its own component so each row's "•••" menu can open/close
// independently without re-rendering every other comment.
export default function CommentRow({ comment, postId, pinned = false, isPostAuthor, liked, onToggleLike, onDelete, onSetPinned, onNavigate }) {
  const { getUser, currentUser, pushToast, userSettings } = useApp()
  const navigate = useNavigate()
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

  // Some callers (CommentSheet, opened over a reel/feed card) want the
  // sheet closed before navigating to a profile so it doesn't linger
  // open behind the new screen; PostDetail just navigates directly.
  const goToProfile = (userId) => {
    if (!userId) return
    onNavigate?.()
    navigate(userId === currentUser.id ? '/profile' : `/profile/${userId}`)
  }

  // Same real-share pattern as the post's own Share button: native share
  // sheet where available, clipboard fallback, honest toast if neither is
  // supported — never a silent no-op.
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
      <button onClick={() => goToProfile(commenter?.id)} className="shrink-0">
        <Avatar user={commenter} size="xs" />
      </button>
      <div className="min-w-0 flex-1">
        {pinned && (
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-ink-500">
            <Pin className="h-3 w-3" /> Pinned by {isPostAuthor ? 'you' : 'the author'}
          </p>
        )}
        <p className="text-sm text-ink-900">
          <button onClick={() => goToProfile(commenter?.id)} className="font-semibold">
            {commenter?.name}
          </button>{' '}
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
