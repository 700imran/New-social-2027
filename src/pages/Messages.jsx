import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SquarePen, X } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useKeyboardInset } from '../utils/useKeyboardInset.js'

export default function Messages() {
  const { getUser, conversations, conversationsLoaded, fetchConversationsLive, currentUser } = useApp()
  const [query, setQuery] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const navigate = useNavigate()

  // Lazily loaded here — not part of the auth bootstrap (see
  // AppContext.jsx's `conversations` state comment) — so opening this
  // page is what pays for the fetch, not every app launch.
  useEffect(() => {
    fetchConversationsLive()
  }, [fetchConversationsLive])

  const rows = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => new Date(b._updatedAt || 0) - new Date(a._updatedAt || 0))
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((c) => getUser(c.authorId)?.name.toLowerCase().includes(q))
  }, [conversations, query, getUser])

  return (
    <div>
      <PageHeader
        title="Messages"
        right={
          <button
            onClick={() => setComposeOpen(true)}
            className="focus-ring rounded-full p-1.5 text-ink-700"
            aria-label="New message"
          >
            <SquarePen className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-ink-100 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages…"
            className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-500"
          />
        </div>
      </div>

      {!conversationsLoaded ? (
        <div className="flex flex-col divide-y divide-ink-100 bg-white">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="skeleton h-11 w-11 rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-3.5 w-32 rounded-full" />
                <div className="skeleton mt-2 h-3 w-44 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-ink-900">
            {conversations.length === 0 ? 'No messages yet' : 'No conversations found'}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {conversations.length === 0 ? 'Start a conversation with the pencil icon above.' : 'Try a different name.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink-100 bg-white">
          {rows.map((c) => {
            const user = getUser(c.authorId)
            if (!user) return null
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/messages/${c.authorId}`)}
                className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-50"
              >
                <Avatar user={user} size="md" showVerified={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {c.lastMessage
                      ? c.lastMessage.sharedPost
                        ? `${c.lastMessage.text ? c.lastMessage.text + ' · ' : ''}Shared a post`
                        : c.lastMessage.text
                      : 'Say hello 👋'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] text-ink-500">{c.lastMessage?.time || ''}</span>
                  {c.unreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-bharat-red px-1 text-[9px] font-bold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {composeOpen && (
        <NewMessageSheet currentUserId={currentUser.id} onClose={() => setComposeOpen(false)} onPick={(userId) => navigate(`/messages/${userId}`)} />
      )}
    </div>
  )
}

// Minimal "who do you want to message" picker — draws candidates from
// people the current user follows (already in context, no new endpoint)
// plus a live text search (api.searchUsers, same one Discover's search
// box uses) so this isn't limited to only people already followed.
function NewMessageSheet({ currentUserId, onClose, onPick }) {
  const { followedUserIds, getUser, searchUsers, directory } = useApp()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const keyboardInset = useKeyboardInset()

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    let cancelled = false
    searchUsers(q).then((results) => {
      if (!cancelled) setSearchResults(results || [])
    })
    return () => {
      cancelled = true
    }
  }, [query, searchUsers])

  // searchUsers only hits a real backend (it's a no-op in mock mode, see
  // AppContext.jsx) — merging in a client-side filter over `directory`
  // (the mock USERS in demo mode, or whichever real users this session
  // has already seen and cached) means the picker still works before any
  // backend is wired up, and in live mode it also catches an
  // already-cached match searchUsers's network round-trip hasn't
  // returned yet.
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) {
      return [...followedUserIds].filter((id) => id !== currentUserId).map(getUser).filter(Boolean)
    }
    const fromDirectory = directory.filter((u) => u.id !== currentUserId && u.name.toLowerCase().includes(q))
    const merged = [...fromDirectory, ...searchResults.filter((u) => u.id !== currentUserId)]
    const seen = new Set()
    return merged.filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)))
  }, [query, followedUserIds, currentUserId, getUser, directory, searchResults])

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        // Same fix as ShareSheet.jsx: the search field here autoFocuses
        // (opens Gboard immediately on mount), so this needs the same
        // keyboard-aware lift to keep the people list from ending up
        // partly hidden behind the keyboard.
        className="app-shell fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[80dvh] w-full flex-col rounded-t-2xl bg-white pb-[max(env(safe-area-inset-bottom),12px)] shadow-2xl animate-slideUp transition-transform duration-150"
        style={{ transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : 'none' }}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <p className="font-display text-base font-semibold text-ink-900">New message</p>
          <button onClick={onClose} className="focus-ring rounded-full p-1 text-ink-500" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-full bg-ink-100 px-3.5 py-2">
            <Search className="h-4 w-4 text-ink-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-500">
              {query.trim().length >= 2 ? 'No one found.' : 'Follow people, or search by name, to start a conversation.'}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-ink-100">
              {list.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onPick(user.id)}
                  className="focus-ring flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <Avatar user={user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                    <p className="truncate text-xs text-ink-500">{user.handle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
