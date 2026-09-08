import React, { useMemo, useState } from 'react'
import { X, Link2, Share2, Check, Search } from 'lucide-react'
import Avatar from './Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useKeyboardInset } from '../utils/useKeyboardInset.js'

// The "Send to..." sheet opened from a post/reel's Share button — sliding
// up from the bottom (see the unused `slideUp` keyframe in
// tailwind.config.js this reuses). Two ways to share from here:
// 1) "Copy link" / the device's native share sheet (`onNativeShare`,
//    already implemented per-caller in PostCard.jsx/Reels.jsx/
//    PostDetail.jsx) — unchanged, just moved behind this sheet instead of
//    being the share button's only action.
// 2) Send the post/reel directly as a message to one or more people —
//    the piece that was missing entirely (Reels.jsx's share button used
//    to only do #1).
//
// Candidates to share with are drawn from people already in your
// conversations plus everyone you follow — both already sitting in
// AppContext, so this needs no new backend endpoint just to list "who
// can I send this to."
export default function ShareSheet({ open, onClose, postId, onNativeShare }) {
  const { getUser, currentUser, conversations, followedUserIds, getOrCreateConversation, sendMessage, pushToast } = useApp()
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [sending, setSending] = useState(false)
  const keyboardInset = useKeyboardInset()

  const candidates = useMemo(() => {
    const ids = new Set([...conversations.map((c) => c.authorId), ...followedUserIds])
    ids.delete(currentUser.id)
    return [...ids]
      .map((id) => getUser(id))
      .filter(Boolean)
      .filter((u) => u.name.toLowerCase().includes(query.trim().toLowerCase()))
  }, [conversations, followedUserIds, currentUser.id, getUser, query])

  if (!open) return null

  const toggleSelected = (userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleClose = () => {
    setSelectedIds(new Set())
    setQuery('')
    onClose()
  }

  const handleSend = async () => {
    if (!selectedIds.size || sending) return
    setSending(true)
    try {
      await Promise.all(
        [...selectedIds].map(async (userId) => {
          const conversation = await getOrCreateConversation(userId)
          sendMessage(conversation.id, { sharedPostId: postId })
        })
      )
      pushToast(selectedIds.size === 1 ? 'Sent!' : `Sent to ${selectedIds.size} people`)
      handleClose()
    } catch (err) {
      console.error('[ShareSheet] send failed', err)
      pushToast('Could not send — please try again')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={handleClose} />
      <div
        // This is the fix for "Send is there but invisible": the
        // "Search people…" field above opens Gboard, and on the Android
        // WebView this ships in, `80dvh` doesn't reliably shrink to
        // account for it — so the keyboard could sit directly on top of
        // the Send button that appears once you've picked someone,
        // covering it completely even though it's rendered and enabled.
        // Shifting the whole sheet up by `keyboardInset` the moment the
        // keyboard opens keeps Send above it; it settles back to resting
        // on top of BottomNav (already correct, via z-60 > the nav's
        // z-50) the instant the keyboard closes.
        className="app-shell fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[80dvh] w-full flex-col rounded-t-2xl bg-white pb-[max(env(safe-area-inset-bottom),12px)] shadow-2xl animate-slideUp transition-transform duration-150"
        style={{ transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : 'none' }}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <p className="font-display text-base font-semibold text-ink-900">Share to</p>
          <button onClick={handleClose} className="focus-ring rounded-full p-1 text-ink-500" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-ink-100 px-4 py-3">
          <button
            onClick={async () => {
              handleClose()
              await onNativeShare?.()
            }}
            className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-full bg-ink-100 px-3 py-2.5 text-sm font-semibold text-ink-800 active:scale-95"
          >
            <Link2 className="h-4 w-4" /> Copy link
          </button>
          <button
            onClick={async () => {
              handleClose()
              await onNativeShare?.()
            }}
            className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-full bg-ink-100 px-3 py-2.5 text-sm font-semibold text-ink-800 active:scale-95"
          >
            <Share2 className="h-4 w-4" /> Share via…
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-full bg-ink-100 px-3.5 py-2">
            <Search className="h-4 w-4 text-ink-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-500">
              Follow people or start a conversation to share directly with them.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-ink-100">
              {candidates.map((user) => {
                const selected = selectedIds.has(user.id)
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleSelected(user.id)}
                    className="focus-ring flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <Avatar user={user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                      <p className="truncate text-xs text-ink-500">{user.handle}</p>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? 'border-saffron-500 bg-saffron-500' : 'border-ink-300'
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="border-t border-ink-100 px-4 py-3">
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full rounded-full bg-saffron-gradient px-4 py-3 text-sm font-semibold text-white shadow-pop disabled:opacity-50"
            >
              {sending ? 'Sending…' : `Send${selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}`}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
