import React, { useMemo, useState } from 'react'
import { ArrowLeft, Search as SearchIcon, TrendingUp, Clock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { TRENDING_TOPICS } from '../data/mockData.js'
import Avatar from './Avatar.jsx'

// Recent searches — real, client-only (no backend needed: this is
// exactly the kind of "immediate, daily-use" micro-feature that doesn't
// require a schema change). Falls back to an in-memory-only list if
// localStorage is unavailable (private browsing, storage quota, etc.)
// rather than throwing.
const RECENT_KEY = 'bs_recent_searches'
const MAX_RECENT = 8
function loadRecentSearches() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((r) => typeof r === 'string') : []
  } catch {
    return []
  }
}
function saveRecentSearches(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
  } catch {
    /* storage unavailable — recent search history just won't persist across sessions */
  }
}

export default function SearchOverlay({ onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery)
  const [recent, setRecent] = useState(loadRecentSearches)
  const { posts, toggleFollow, followedUserIds, directory } = useApp()
  const navigate = useNavigate()

  const q = query.trim().toLowerCase()

  const commitRecent = (term) => {
    const clean = term.trim()
    if (!clean) return
    setRecent((prev) => {
      const next = [clean, ...prev.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT)
      saveRecentSearches(next)
      return next
    })
  }
  const removeRecent = (term) => {
    setRecent((prev) => {
      const next = prev.filter((r) => r !== term)
      saveRecentSearches(next)
      return next
    })
  }

  // `directory` is the static mock roster in mock mode, or everyone
  // encountered in the feed/comments/notifications/follows so far in live
  // mode (see AppContext.jsx) — there's no full-text user search endpoint
  // in the Level 1 API.
  const matchedUsers = useMemo(() => {
    if (!q) return []
    return directory.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.handle?.toLowerCase().includes(q)
    )
  }, [q, directory])

  const matchedPosts = useMemo(() => {
    if (!q) return []
    return posts.filter(
      (p) =>
        p.text.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [q, posts])

  const matchedTopics = useMemo(() => {
    if (!q) return []
    return TRENDING_TOPICS.filter((t) => t.tag.toLowerCase().includes(q))
  }, [q])

  const hasResults = matchedUsers.length || matchedPosts.length || matchedTopics.length

  return (
    <div className="app-shell fixed inset-0 z-[60] mx-auto flex max-w-[480px] flex-col bg-white animate-fadeUp">
      <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-3">
        <button onClick={onClose} className="focus-ring rounded-full p-1.5 text-ink-700" aria-label="Close search">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-ink-100 px-3 py-2">
          <SearchIcon className="h-4 w-4 text-ink-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRecent(query) }}
            placeholder="Search people, posts, topics"
            className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-500"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <X className="h-4 w-4 text-ink-500" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {!q && recent.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Recent</p>
              <button
                onClick={() => { setRecent([]); saveRecentSearches([]) }}
                className="text-xs font-semibold text-saffron-600"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {recent.map((term) => (
                <div key={term} className="flex items-center justify-between rounded-lg py-1.5 hover:bg-ink-50">
                  <button
                    onClick={() => setQuery(term)}
                    className="flex flex-1 items-center gap-2 px-2 py-1 text-left text-sm font-medium text-ink-900"
                  >
                    <Clock className="h-4 w-4 shrink-0 text-ink-400" /> {term}
                  </button>
                  <button
                    onClick={() => removeRecent(term)}
                    className="focus-ring shrink-0 rounded-full p-1.5 text-ink-400"
                    aria-label={`Remove "${term}" from recent searches`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!q && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Trending searches</p>
            <div className="flex flex-col gap-1">
              {TRENDING_TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setQuery(t.tag.replace('#', ''))}
                  className="focus-ring flex items-center justify-between rounded-lg px-2 py-2.5 text-left hover:bg-ink-50"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-ink-900">
                    <TrendingUp className="h-4 w-4 text-saffron-600" />
                    {t.tag}
                  </span>
                  <span className="text-xs text-ink-500">{t.posts}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {q && !hasResults && (
          <p className="mt-10 text-center text-sm text-ink-500">
            No results for "{query}" — try a different name, topic or hashtag.
          </p>
        )}

        {matchedUsers.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">People</p>
            {matchedUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Avatar user={u} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{u.name}</p>
                    <p className="text-xs text-ink-500">{u.handle}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(u.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    followedUserIds.has(u.id)
                      ? 'border-ink-300 text-ink-700'
                      : 'border-saffron-500 bg-saffron-500 text-white'
                  }`}
                >
                  {followedUserIds.has(u.id) ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        )}

        {matchedTopics.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Topics</p>
            {matchedTopics.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-ink-900">{t.tag}</span>
                <span className="text-xs text-ink-500">{t.posts}</span>
              </div>
            ))}
          </div>
        )}

        {matchedPosts.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Posts</p>
            {matchedPosts.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  commitRecent(query)
                  onClose()
                  navigate(`/post/${p.id}`)
                }}
                className="focus-ring block w-full rounded-lg py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
              >
                {p.text.length > 90 ? p.text.slice(0, 90) + '…' : p.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
