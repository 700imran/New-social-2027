import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { COMMUNITIES, INITIAL_NOTIFICATIONS, INITIAL_POSTS, USERS } from '../data/mockData.js'
import * as api from '../api/client.js'
import {
  avatarToneFor,
  handleFor,
  initialsFor,
  isEmail,
  mapApiComment,
  mapApiNotification,
  mapApiPost,
  mapProfileToUser,
} from '../utils/live.js'

const AppContext = createContext(null)
const { isLive } = api

const TOKEN_KEY = 'bs_access_token' // kept only for backward-compat cleanup on upgrade — see bootstrap effect below

let idCounter = 1000
const nextId = (prefix) => `${prefix}-${idCounter++}`

const EMPTY_USER = {
  id: '',
  name: '',
  handle: '',
  verified: false,
  avatarColor: avatarToneFor('bharatspace'),
  initials: 'U',
  bio: '',
  location: '',
  joined: '',
  followers: 0,
  following: 0,
  posts: 0,
  topics: [],
  avatarUrl: null,
}

export function AppProvider({ children }) {
  // --- auth ---
  // Mock mode: a formality, nothing is verified (see README's "Quick start").
  // Live mode: real Supabase-backed accounts via the Worker in ../../backend.
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasOnboarded, setHasOnboarded] = useState(false)
  // True only while live mode is restoring a saved session on first load —
  // lets App.jsx avoid flashing the sign-in screen before redirecting home.
  const [authLoading, setAuthLoading] = useState(isLive)

  const [currentUser, setCurrentUser] = useState(isLive ? EMPTY_USER : { ...USERS.pooja })

  // --- content state ---
  const [posts, setPosts] = useState(isLive ? [] : INITIAL_POSTS)
  const [notifications, setNotifications] = useState(isLive ? [] : INITIAL_NOTIFICATIONS)
  const [likedPostIds, setLikedPostIds] = useState(new Set())
  // Live-mode only: whether GET /posts has more pages older than what's
  // currently loaded — see fetchMorePosts below. Starts true so the first
  // scroll-to-bottom always attempts a fetch; flips false once a page
  // comes back shorter than the requested limit.
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  // Persists to Supabase in live mode (docs/migrations/003_saved_posts.sql)
  // — seeded from each post's `savedByMe` flag in fetchPostsLive below,
  // same pattern as likedPostIds above. Stays purely local in mock mode.
  const [savedPostIds, setSavedPostIds] = useState(new Set())
  const [followedUserIds, setFollowedUserIds] = useState(new Set())
  const [blockedUserIds, setBlockedUserIds] = useState(new Set())
  // Distinct from blockedUserIds: muting only affects your own feed (see
  // migrations/008_muted_creators.sql) — you keep following them if you
  // did, and nothing changes on their end.
  const [mutedUserIds, setMutedUserIds] = useState(new Set())
  const [hiddenPostIds, setHiddenPostIds] = useState(new Set())
  // Comment likes (see migrations/009_comment_mini_controls.sql) — a
  // comment id is unique across the whole app, same reasoning as
  // likedPostIds above, just for comments instead of posts.
  const [likedCommentIds, setLikedCommentIds] = useState(new Set())
  const [selectedTopics, setSelectedTopics] = useState([])
  // Communities (see pages/Communities.jsx): no `communities`/`memberships`
  // table exists yet in the Level 1 schema, so this one — unlike
  // savedPostIds above — really is local-only in both modes.
  const [joinedCommunityIds, setJoinedCommunityIds] = useState(
    () => new Set(COMMUNITIES.filter((c) => c.joined).map((c) => c.id))
  )

  // Live-mode only: a cache of { [userId]: userLikeObject } built up from
  // whoever appears in the feed/comments/notifications/follows — this is
  // what SearchOverlay's people search and every Avatar/PostCard read from
  // via getUser()/directory below, in place of mockData's static USERS.
  const [usersCache, setUsersCache] = useState({})

  // --- ephemeral UI state ---
  const [toasts, setToasts] = useState([])

  const pushToast = useCallback((message, action) => {
    // Every toast also goes to the console — free, and it's the
    // difference between "nothing happened" and an actual diagnosable
    // message when testing on a real device via chrome://inspect (see
    // docs/GO_LIVE_CHECKLIST.md's debugging section).
    console.log('[toast]', message)
    const id = nextId('toast')
    // `action` is optional: { label, onAction } — renders a tappable
    // "Undo"-style button in ToastStack instead of a plain message. Every
    // existing pushToast(message) call site is unaffected since action
    // just comes back undefined.
    setToasts((t) => [...t, { id, message, action }])
    // Longer messages (error text tends to run longer than "Post
    // published") get more time on screen rather than a fixed 2.6s for
    // everything — a real error is easy to miss otherwise, especially the
    // first time something goes wrong during testing. Actionable toasts
    // (Undo) also get the longer window so there's actually time to tap it.
    const duration = message.length > 40 || action ? 5000 : 2600
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, duration)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id))
  }, [])

  // ---------------------------------------------------------------------
  // Live-mode data loading helpers
  // ---------------------------------------------------------------------

  const cacheUsers = useCallback((userLikeList) => {
    const entries = (userLikeList || []).filter(Boolean)
    if (!entries.length) return
    setUsersCache((prev) => {
      const next = { ...prev }
      for (const u of entries) {
        if (u?.id) next[u.id] = { ...next[u.id], ...u }
      }
      return next
    })
  }, [])

  const getUser = useCallback(
    (userId) => {
      if (!userId) return null
      if (userId === currentUser.id) return currentUser
      if (!isLive) return USERS[userId]
      return (
        usersCache[userId] || {
          id: userId,
          name: 'BharatSpace user',
          handle: '',
          verified: false,
          avatarColor: avatarToneFor(userId),
          initials: 'U',
          avatarUrl: null,
        }
      )
    },
    [currentUser, usersCache]
  )

  const FEED_PAGE_SIZE = 30

  // Full refresh — initial load and pull-to-refresh both call this. Always
  // replaces the feed from the top and resets pagination, so a
  // pull-to-refresh after scrolling deep into older posts correctly goes
  // back to "one page, more available" rather than assuming everything
  // already-loaded is still the full picture.
  const fetchPostsLive = useCallback(async () => {
    if (!isLive) return
    try {
      const rows = await api.getPosts()
      const mapped = rows.map(mapApiPost)
      setPosts(mapped)
      setLikedPostIds(new Set(mapped.filter((p) => p._likedByMe).map((p) => p.id)))
      setHasMorePosts(mapped.length >= FEED_PAGE_SIZE)
      cacheUsers(mapped.map((p) => p._author))
    } catch {
      pushToast('Could not load the feed — check your connection')
    }
  }, [cacheUsers, pushToast])

  // Infinite scroll — appends the next page strictly older than the last
  // post currently in state (see backend/src/routes/posts.js's `before`
  // cursor). No-ops in mock mode, while already loading, or once a
  // shorter-than-a-full-page response has said there's nothing older left.
  const fetchMorePosts = useCallback(async () => {
    if (!isLive || loadingMorePosts || !hasMorePosts) return
    const cursor = posts[posts.length - 1]?._createdAt
    if (!cursor) return
    setLoadingMorePosts(true)
    try {
      const rows = await api.getPosts(undefined, undefined, cursor)
      const mapped = rows.map(mapApiPost)
      setHasMorePosts(mapped.length >= FEED_PAGE_SIZE)
      if (mapped.length) {
        setPosts((prev) => [...prev, ...mapped])
        setLikedPostIds((prev) => new Set([...prev, ...mapped.filter((p) => p._likedByMe).map((p) => p.id)]))
        cacheUsers(mapped.map((p) => p._author))
      }
    } catch (err) {
      console.error('[fetchMorePosts] failed to load next page', err)
      // Silent otherwise — a failed "load more" on scroll shouldn't
      // interrupt someone mid-scroll with a toast; the sentinel just
      // stays in view and the next scroll tick retries.
    } finally {
      setLoadingMorePosts(false)
    }
  }, [posts, hasMorePosts, loadingMorePosts, cacheUsers])

  const fetchNotificationsLive = useCallback(async () => {
    if (!isLive) return
    try {
      const rows = await api.getNotifications()
      setNotifications(rows.map(mapApiNotification))
    } catch {
      /* not fatal — Activity tab just shows its empty state */
    }
  }, [])

  // GET /posts only returns the recent feed window — a post saved a while
  // ago may have scrolled out of it entirely, so seeding savedPostIds from
  // that alone would incorrectly show older saves as "not saved." This
  // fetches the complete list instead (backend/src/routes/posts.js's
  // GET /saved-posts) and merges it in, rather than replacing whatever
  // fetchPostsLive already derived from the visible feed.
  const fetchSavedPostsLive = useCallback(async () => {
    if (!isLive) return
    try {
      const rows = await api.getSavedPosts()
      const mapped = rows.map(mapApiPost)
      setSavedPostIds((prev) => new Set([...prev, ...mapped.map((p) => p.id)]))
      cacheUsers(mapped.map((p) => p._author))
    } catch {
      /* not fatal — bookmark state for currently-visible posts still works */
    }
  }, [cacheUsers])

  const loadComments = useCallback(
    async (postId) => {
      if (!isLive) return // mock posts already ship comments_list fully populated
      try {
        const rows = await api.getComments(postId)
        const mapped = rows.map(mapApiComment)
        cacheUsers(mapped.map((c) => c._author))
        setLikedCommentIds((prev) => new Set([...prev, ...mapped.filter((c) => c._likedByMe).map((c) => c.id)]))
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments_list: mapped } : p)))
      } catch {
        /* leave comments_list as-is (e.g. an optimistic addComment already there) */
      }
    },
    [cacheUsers]
  )

  // Same shape of problem as fetchSavedPostsLive above, simpler answer:
  // GET /hidden-posts only ever needs to feed the `visiblePosts` filter,
  // so it returns bare ids rather than full enriched post objects.
  const fetchHiddenPostsLive = useCallback(async () => {
    if (!isLive) return
    try {
      const ids = await api.getHiddenPosts()
      setHiddenPostIds(new Set(ids))
    } catch {
      /* not fatal — hidden posts just won't be filtered out until next successful fetch */
    }
  }, [])

  // Rehydrates blockedUserIds from the `blocks` table on load — without
  // this, a page refresh silently un-hid a blocked user's posts, since
  // toggleBlock's local Set was the only place that state ever lived
  // (see migrations/010_blocks_users_auditlog_rls.sql's postmortem).
  const fetchBlocksLive = useCallback(async () => {
    if (!isLive) return
    try {
      const ids = await api.getBlocks()
      setBlockedUserIds(new Set(ids))
    } catch {
      /* not fatal — blocking still works this session, just won't survive a refresh until next successful fetch */
    }
  }, [])

  const fetchMutesLive = useCallback(async () => {
    if (!isLive) return
    try {
      const ids = await api.getMutes()
      setMutedUserIds(new Set(ids))
    } catch {
      /* not fatal — same reasoning as fetchBlocksLive above */
    }
  }, [])

  const hydrateSession = useCallback(
    async (userId) => {
      const profile = await api.getProfile(userId)
      const user = mapProfileToUser(userId, profile)
      setCurrentUser(user)
      cacheUsers([user])
      setIsAuthenticated(true)
      setHasOnboarded((profile.interests || []).length > 0)
      setSelectedTopics(profile.interests || [])

      const following = await api.getFollowing(userId).catch(() => [])
      setFollowedUserIds(new Set(following.map((r) => r.followee_id)))

      await Promise.allSettled([
        fetchPostsLive(),
        fetchNotificationsLive(),
        fetchSavedPostsLive(),
        fetchHiddenPostsLive(),
        fetchBlocksLive(),
        fetchMutesLive(),
      ])
    },
    [
      cacheUsers,
      fetchPostsLive,
      fetchNotificationsLive,
      fetchSavedPostsLive,
      fetchHiddenPostsLive,
      fetchBlocksLive,
      fetchMutesLive,
    ]
  )

  const signInInternal = useCallback(
    async (credentials) => {
      const session = await api.signIn(credentials)
      api.setAccessToken(session.accessToken)
      try {
        await hydrateSession(session.userId)
      } catch (hydrateErr) {
        // The login call itself already succeeded by this point (we have a
        // valid access token) — whatever failed next was loading the
        // account's profile, not the credentials. Letting this fall
        // through to signIn()'s generic catch would wrongly tell someone
        // with a correct password to "check your email/phone and
        // password," which is exactly backwards and makes this failure
        // mode much harder to recognize for what it is.
        console.error('Login succeeded but loading the account afterward failed', hydrateErr)
        throw new Error(
          "Signed in, but couldn't load your account — it may not have finished setting up. Please try again in a moment."
        )
      }
    },
    [hydrateSession]
  )

  // Restore a saved session on first load (live mode only). The refresh
  // token itself was never available to this code to check — it lives in
  // an httpOnly cookie set by the backend (routes/auth.js) — so this just
  // attempts the refresh unconditionally and lets the server say yes/no.
  useEffect(() => {
    if (!isLive) {
      setAuthLoading(false)
      return
    }
    // One-time cleanup: earlier versions of this app stored both tokens in
    // localStorage. If either key is still there on a returning user's
    // device, remove it — it's now dead weight, and anything sitting in
    // localStorage is readable by any XSS bug, which is exactly what
    // moving the refresh token into an httpOnly cookie was meant to fix.
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('bs_refresh_token')

    let cancelled = false
    ;(async () => {
      try {
        const session = await api.refreshSession()
        api.setAccessToken(session.accessToken)
        if (!cancelled) await hydrateSession(session.userId)
      } catch {
        // No valid session cookie (never logged in, or it expired/was
        // revoked) — this is the normal signed-out state, not an error.
        api.setAccessToken(null)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // Runs once on mount — hydrateSession's own deps keep it fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------
  // Auth actions
  // ---------------------------------------------------------------------

  const signUp = useCallback(
    async ({ name, email, password, turnstileToken, website }) => {
      if (!isLive) {
        setCurrentUser((u) => ({ ...u, name, handle: handleFor(name), initials: initialsFor(name) }))
        setIsAuthenticated(true)
        return { ok: true }
      }
      try {
        const identity = isEmail(email) ? { email } : { phone: email }
        const signupResult = await api.signUp({ ...identity, password, displayName: name, turnstileToken, website })

        // The backend already knows — from Supabase's own
        // `email_confirmed_at` on the just-created user — whether this
        // account needs confirming before it can sign in (routes/auth.js).
        // Trust that directly instead of attempting a login we already
        // know will fail and then trying to distinguish "needs
        // confirming" from "something's actually broken" by pattern-
        // matching the login error's message — which never worked, since
        // that message is deliberately generic (GENERIC_AUTH_ERROR) and
        // never contains the literal text "email not confirmed".
        if (signupResult.needsConfirmation) {
          pushToast('Account created — check your email to confirm it, then sign in.')
          return { ok: true, needsConfirmation: true }
        }

        try {
          await signInInternal({ ...identity, password })
          return { ok: true }
        } catch (loginErr) {
          console.error('Signup succeeded but the automatic sign-in after it failed', loginErr)
          pushToast(loginErr.message || 'Account created, but sign-in failed — try signing in manually.')
          return { ok: false, error: loginErr.message }
        }
      } catch (err) {
        console.error('Signup failed', err)
        pushToast(err.message || 'Could not create your account')
        return { ok: false, error: err.message }
      }
    },
    [pushToast, signInInternal]
  )

  const signIn = useCallback(
    async ({ email, password } = {}) => {
      if (!isLive) {
        setIsAuthenticated(true)
        return { ok: true }
      }
      try {
        const identity = isEmail(email) ? { email } : { phone: email }
        await signInInternal({ ...identity, password })
        return { ok: true }
      } catch (err) {
        pushToast(err.message || 'Sign in failed — check your email/phone and password')
        return { ok: false, error: err.message }
      }
    },
    [pushToast, signInInternal]
  )

  const signOut = useCallback(() => {
    if (isLive) {
      api.signOut().catch(() => {})
      api.setAccessToken(null)
    }
    setIsAuthenticated(false)
    setHasOnboarded(false)
  }, [])

  // Required by Google Play's account/data deletion policy for any app
  // that supports account creation — see
  // ../../docs/PLAY_STORE_CHECKLIST.md. Irreversible by design; there's
  // no "reactivate" path, on purpose (see backend/src/routes/account.js).
  const deleteAccount = useCallback(async () => {
    if (!isLive) {
      pushToast('Mock mode has no real account to delete — this is a no-op here.')
      setIsAuthenticated(false)
      setHasOnboarded(false)
      return { ok: true }
    }
    try {
      await api.deleteAccount()
      api.setAccessToken(null)
      setIsAuthenticated(false)
      setHasOnboarded(false)
      return { ok: true }
    } catch (err) {
      pushToast(err.message || 'Could not delete your account — please try again.')
      return { ok: false, error: err.message }
    }
  }, [pushToast])

  // Required by Google Play's User Generated Content policy — a way to
  // flag objectionable content/users. See docs/PLAY_STORE_CHECKLIST.md
  // and backend/docs/migrations/002_reports.sql.
  const submitReport = useCallback(
    async ({ targetType, targetId, reason, details }) => {
      if (!isLive) {
        pushToast("Report received — we'll take a look.")
        return { ok: true }
      }
      try {
        await api.createReport({ targetType, targetId, reason, details })
        pushToast("Report received — we'll take a look.")
        return { ok: true }
      } catch (err) {
        pushToast(err.message || 'Could not submit your report — please try again.')
        return { ok: false, error: err.message }
      }
    },
    [pushToast]
  )

  const completeOnboarding = useCallback(
    (topics) => {
      setSelectedTopics(topics)
      setHasOnboarded(true)
      if (isLive && currentUser.id) {
        api.updateProfile(currentUser.id, { interests: topics }).catch(() => {
          pushToast('Could not save your interests — you can update them later from your profile')
        })
      }
    },
    [currentUser.id, pushToast]
  )

  // ---------------------------------------------------------------------
  // Feed / social actions — each keeps the exact original optimistic-update
  // shape for mock mode, and additionally fires the real API call (with
  // rollback on failure) when isLive.
  // ---------------------------------------------------------------------

  const toggleLike = useCallback(
    (postId) => {
      setLikedPostIds((prev) => {
        const next = new Set(prev)
        const wasLiked = next.has(postId)
        if (wasLiked) next.delete(postId)
        else next.add(postId)

        setPosts((prevPosts) =>
          prevPosts.map((p) => (p.id === postId ? { ...p, likes: p.likes + (wasLiked ? -1 : 1) } : p))
        )

        if (isLive) {
          const action = wasLiked ? api.unreact(postId) : api.react(postId, 'like')
          action.catch((err) => {
            console.error('[toggleLike] reaction write failed, rolling back', err)
            setLikedPostIds((p2) => {
              const n2 = new Set(p2)
              if (wasLiked) n2.add(postId)
              else n2.delete(postId)
              return n2
            })
            setPosts((prevPosts) =>
              prevPosts.map((p) => (p.id === postId ? { ...p, likes: p.likes + (wasLiked ? 1 : -1) } : p))
            )
            pushToast('Could not update like — try again')
          })
        }

        return next
      })
    },
    [pushToast]
  )

  const toggleSave = useCallback(
    (postId) => {
      setSavedPostIds((prev) => {
        const next = new Set(prev)
        const saved = next.has(postId)
        if (saved) next.delete(postId)
        else next.add(postId)
        pushToast(saved ? 'Removed from saved' : 'Saved to your bookmarks')

        if (isLive) {
          const action = saved ? api.unsavePost(postId) : api.savePost(postId)
          action.catch((err) => {
            console.error('[toggleSave] save write failed, rolling back', err)
            setSavedPostIds((p2) => {
              const n2 = new Set(p2)
              if (saved) n2.add(postId)
              else n2.delete(postId)
              return n2
            })
            pushToast('Could not update — please try again')
          })
        }

        return next
      })
    },
    [pushToast]
  )

  const toggleJoinCommunity = useCallback(
    (communityId) => {
      setJoinedCommunityIds((prev) => {
        const next = new Set(prev)
        const joined = next.has(communityId)
        if (joined) next.delete(communityId)
        else next.add(communityId)
        const community = COMMUNITIES.find((c) => c.id === communityId)
        pushToast(joined ? `Left ${community?.name ?? 'community'}` : `Joined ${community?.name ?? 'community'}`)
        return next
      })
    },
    [pushToast]
  )

  const repost = useCallback(
    (postId) => {
      // Local-only in both modes — see the `savedPostIds` comment above;
      // the Level 1 `reactions` table's (post_id, user_id) primary key
      // can't hold a separate "repost" alongside a "like" for the same
      // person without a schema change.
      setPosts((prevPosts) => prevPosts.map((p) => (p.id === postId ? { ...p, reposts: p.reposts + 1 } : p)))
      pushToast('Reposted to your profile')
    },
    [pushToast]
  )

  const addComment = useCallback(
    (postId, text) => {
      if (!text.trim()) return
      const comment = { id: nextId('c'), authorId: currentUser.id, text: text.trim(), time: 'now' }
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId ? { ...p, comments: p.comments + 1, comments_list: [...p.comments_list, comment] } : p
        )
      )

      if (isLive) {
        api
          .addComment(postId, text.trim())
          .then((row) => {
            setPosts((prevPosts) =>
              prevPosts.map((p) =>
                p.id === postId
                  ? {
                      ...p,
                      comments_list: p.comments_list.map((c) =>
                        c.id === comment.id
                          ? { id: row.id, authorId: row.author_id, text: row.body, time: 'now', likes: 0 }
                          : c
                      ),
                    }
                  : p
              )
            )
          })
          .catch((err) => {
            console.error('[addComment] comment write failed, rolling back', err)
            pushToast('Could not post your comment — try again')
            setPosts((prevPosts) =>
              prevPosts.map((p) =>
                p.id === postId
                  ? {
                      ...p,
                      comments: Math.max(0, p.comments - 1),
                      comments_list: p.comments_list.filter((c) => c.id !== comment.id),
                    }
                  : p
              )
            )
          })
      }
    },
    [currentUser.id, pushToast]
  )

  // Comment mini-controls (see migrations/009_comment_mini_controls.sql)
  // — same optimistic-with-rollback shape as toggleLike above, just
  // scoped to one comment inside one post's comments_list instead of the
  // post itself.
  const toggleCommentLike = useCallback(
    (postId, commentId) => {
      setLikedCommentIds((prev) => {
        const next = new Set(prev)
        const wasLiked = next.has(commentId)
        if (wasLiked) next.delete(commentId)
        else next.add(commentId)

        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments_list: p.comments_list.map((c) =>
                    c.id === commentId ? { ...c, likes: (c.likes || 0) + (wasLiked ? -1 : 1) } : c
                  ),
                }
              : p
          )
        )

        if (isLive) {
          const action = wasLiked ? api.unreactToComment(postId, commentId) : api.reactToComment(postId, commentId)
          action.catch((err) => {
            console.error('[toggleCommentLike] write failed, rolling back', err)
            setLikedCommentIds((p2) => {
              const n2 = new Set(p2)
              if (wasLiked) n2.add(commentId)
              else n2.delete(commentId)
              return n2
            })
            setPosts((prevPosts) =>
              prevPosts.map((p) =>
                p.id === postId
                  ? {
                      ...p,
                      comments_list: p.comments_list.map((c) =>
                        c.id === commentId ? { ...c, likes: (c.likes || 0) + (wasLiked ? 1 : -1) } : c
                      ),
                    }
                  : p
              )
            )
            pushToast('Could not update — please try again')
          })
        }

        return next
      })
    },
    [pushToast]
  )

  // Comment author OR post author can delete (see migrations/009's two
  // RLS policies) — this function doesn't need to know which case
  // applies; the backend/RLS decide that.
  const deleteComment = useCallback(
    (postId, commentId) => {
      let removed = null
      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id !== postId) return p
          removed = p.comments_list.find((c) => c.id === commentId) || null
          return {
            ...p,
            comments: Math.max(0, p.comments - 1),
            comments_list: p.comments_list.filter((c) => c.id !== commentId),
            pinnedCommentId: p.pinnedCommentId === commentId ? null : p.pinnedCommentId,
          }
        })
      )
      pushToast('Comment deleted')

      if (isLive) {
        api.deleteComment(postId, commentId).catch((err) => {
          console.error('[deleteComment] write failed, rolling back', err)
          setPosts((prevPosts) =>
            prevPosts.map((p) =>
              p.id === postId && removed
                ? { ...p, comments: p.comments + 1, comments_list: [...p.comments_list, removed] }
                : p
            )
          )
          pushToast('Could not delete — please try again')
        })
      }
    },
    [pushToast]
  )

  // Pin (commentId) or unpin (null) — post author only, enforced by the
  // backend/RLS; this just optimistically reflects whichever the caller
  // is already allowed to do (PostDetail.jsx only shows the control to
  // the post's own author in the first place).
  const setPinnedComment = useCallback(
    (postId, commentId) => {
      let previous = null
      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id !== postId) return p
          previous = p.pinnedCommentId ?? null
          return { ...p, pinnedCommentId: commentId }
        })
      )
      pushToast(commentId ? 'Comment pinned' : 'Comment unpinned')

      if (isLive) {
        api.setPinnedComment(postId, commentId).catch((err) => {
          console.error('[setPinnedComment] write failed, rolling back', err)
          setPosts((prevPosts) => prevPosts.map((p) => (p.id === postId ? { ...p, pinnedCommentId: previous } : p)))
          pushToast('Could not update — please try again')
        })
      }
    },
    [pushToast]
  )

  const toggleFollow = useCallback(
    (userId) => {
      setFollowedUserIds((prev) => {
        const next = new Set(prev)
        const wasFollowing = next.has(userId)
        if (wasFollowing) next.delete(userId)
        else next.add(userId)

        const name = getUser(userId)?.name ?? 'user'
        pushToast(wasFollowing ? `Unfollowed ${name}` : `Following ${name}`)

        if (isLive) {
          const action = wasFollowing ? api.unfollow(userId) : api.follow(userId)
          action.catch(() => {
            setFollowedUserIds((p2) => {
              const n2 = new Set(p2)
              if (wasFollowing) n2.add(userId)
              else n2.delete(userId)
              return n2
            })
            pushToast('Could not update follow — try again')
          })
        }

        return next
      })
    },
    [getUser, pushToast]
  )

  // Blocking (unlike following) hides someone's content from you — see
  // the `visiblePosts` filter below — and, per the Level 1 schema, is a
  // one-way trust action: blocking someone also unwinds any follow
  // relationship server-side (backend/src/routes/follows.js), but doesn't
  // require them to have followed you first. Required alongside
  // `submitReport` above by Google Play's User Generated Content policy
  // ("a mechanism to block abusive users") — see
  // docs/PLAY_STORE_CHECKLIST.md.
  // Distinct from toggleBlock: hiding one post is a light, low-stakes
  // action (Instagram's own "Not interested" pattern), so — unlike
  // block/unblock above — this gets an Undo action on the toast instead
  // of requiring a trip back through the ••• menu to reverse it. Calling
  // hidePost again with the same id is exactly what Undo does: state has
  // already flipped by the time the toast renders, so this naturally
  // toggles back.
  const hidePost = useCallback(
    (postId, { silent = false } = {}) => {
      setHiddenPostIds((prev) => {
        const next = new Set(prev)
        const wasHidden = next.has(postId)
        if (wasHidden) next.delete(postId)
        else next.add(postId)

        if (!silent) {
          pushToast(
            wasHidden ? 'Post restored to your feed' : 'Post hidden',
            wasHidden ? undefined : { label: 'Undo', onAction: () => hidePost(postId, { silent: true }) }
          )
        }

        if (isLive) {
          const action = wasHidden ? api.unhidePost(postId) : api.hidePost(postId)
          action.catch((err) => {
            console.error('[hidePost] write failed, rolling back', err)
            setHiddenPostIds((p2) => {
              const n2 = new Set(p2)
              if (wasHidden) n2.add(postId)
              else n2.delete(postId)
              return n2
            })
            pushToast('Could not update — please try again')
          })
        }

        return next
      })
    },
    [pushToast]
  )

  const toggleBlock = useCallback(
    (userId) => {
      setBlockedUserIds((prev) => {
        const next = new Set(prev)
        const wasBlocked = next.has(userId)
        if (wasBlocked) next.delete(userId)
        else next.add(userId)

        const name = getUser(userId)?.name ?? 'this user'
        pushToast(wasBlocked ? `Unblocked ${name}` : `Blocked ${name} — you won't see their posts anymore`)

        if (isLive) {
          const action = wasBlocked ? api.unblock(userId) : api.block(userId)
          action.catch(() => {
            setBlockedUserIds((p2) => {
              const n2 = new Set(p2)
              if (wasBlocked) n2.add(userId)
              else n2.delete(userId)
              return n2
            })
            pushToast('Could not update — please try again')
          })
        }

        return next
      })
    },
    [getUser, pushToast]
  )

  // Distinct from toggleBlock above: muting only ever affects your own
  // feed (see migrations/008_muted_creators.sql) — you keep following
  // them if you did, they're never notified, and nothing changes on
  // their end. No unwind-the-follow-relationship step, unlike block.
  const toggleMute = useCallback(
    (userId) => {
      setMutedUserIds((prev) => {
        const next = new Set(prev)
        const wasMuted = next.has(userId)
        if (wasMuted) next.delete(userId)
        else next.add(userId)

        const name = getUser(userId)?.name ?? 'this user'
        pushToast(wasMuted ? `Unmuted ${name}` : `Muted ${name} — their posts won't show in your feed`)

        if (isLive) {
          const action = wasMuted ? api.unmute(userId) : api.mute(userId)
          action.catch(() => {
            setMutedUserIds((p2) => {
              const n2 = new Set(p2)
              if (wasMuted) n2.add(userId)
              else n2.delete(userId)
              return n2
            })
            pushToast('Could not update — please try again')
          })
        }

        return next
      })
    },
    [getUser, pushToast]
  )

  const createPost = useCallback(
    (text, options = {}) => {
      // 'post' (default) or 'reel' — see migrations/005_reels_and_tags.sql.
      // CreatePost.jsx sets this to 'reel' when the attached file is a video.
      const kind = options.kind === 'reel' ? 'reel' : 'post'
      // Resolve tagged user ids into full user objects up front (for local/
      // optimistic rendering) — directory covers mock USERS and everyone
      // live mode has already encountered (see `directory` below).
      const taggedUsers = (options.taggedUserIds || [])
        .map((id) => (isLive ? usersCache[id] : USERS[id]))
        .filter(Boolean)

      if (!isLive) {
        const post = {
          id: nextId('p'),
          authorId: currentUser.id,
          time: 'now',
          tab: 'For You',
          tags: options.tags ?? [],
          text: text.trim(),
          hasImage: !!options.hasImage,
          imagePreview: options.imagePreview ?? null,
          kind,
          taggedUsers,
          likes: 0,
          comments: 0,
          reposts: 0,
          comments_list: [],
        }
        setPosts((prev) => [post, ...prev])
        pushToast(kind === 'reel' ? 'Reel published' : 'Post published')
        return post
      }

      const tempId = nextId('p')
      const optimistic = {
        id: tempId,
        authorId: currentUser.id,
        time: 'now',
        tab: options.tags?.[0] || 'For You',
        tags: options.tags ?? [],
        text: text.trim(),
        hasImage: !!options.hasImage,
        imagePreview: options.imagePreview ?? null,
        kind,
        taggedUsers,
        live: false,
        likes: 0,
        comments: 0,
        reposts: 0,
        comments_list: [],
      }
      setPosts((prev) => [optimistic, ...prev])
      pushToast(kind === 'reel' ? 'Publishing your reel…' : 'Publishing…')
      ;(async () => {
        try {
          let mediaAssetId = null
          if (options.imageFile) {
            mediaAssetId = await api.uploadMedia(options.imageFile)
          }
          const row = await api.createPost({
            body: text.trim(),
            mediaAssetId,
            topic: options.tags?.[0] || null,
            kind,
            taggedUserIds: options.taggedUserIds || [],
          })
          const real = mapApiPost(row)
          // Keep the instant local preview the user already saw instead of
          // waiting on the just-uploaded R2 URL to resolve a second time.
          if (!real.imagePreview && optimistic.imagePreview) real.imagePreview = optimistic.imagePreview
          setPosts((prev) => prev.map((p) => (p.id === tempId ? real : p)))
          pushToast(kind === 'reel' ? 'Reel published' : 'Post published')
        } catch (err) {
          setPosts((prev) => prev.filter((p) => p.id !== tempId))
          pushToast(err.message || `Could not publish your ${kind} — try again`)
        }
      })()

      return optimistic
    },
    [currentUser.id, pushToast, usersCache]
  )

  // Posts/reels `userId` (defaults to the signed-in user) is tagged in —
  // powers Profile.jsx's Tagged tab. Live mode hits the real endpoint;
  // mock mode derives it from the same in-memory `posts` createPost above
  // already annotated with `taggedUsers`.
  const getTaggedPosts = useCallback(
    async (userId) => {
      const targetId = userId || currentUser.id
      if (!isLive) {
        return posts.filter((p) => p.taggedUsers?.some((u) => u.id === targetId))
      }
      try {
        const rows = await api.getTaggedPosts(targetId)
        const mapped = rows.map(mapApiPost)
        cacheUsers(mapped.map((p) => p._author))
        return mapped
      } catch {
        pushToast('Could not load tagged posts')
        return []
      }
    },
    [currentUser.id, posts, cacheUsers, pushToast]
  )

  const markNotificationsRead = useCallback(() => {
    if (!isLive) {
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
      return
    }
    ;(async () => {
      await fetchNotificationsLive()
      setNotifications((prev) => {
        const unread = prev.filter((n) => n.unread)
        unread.forEach((n) => api.markNotificationRead(n.id).catch(() => {}))
        return prev.map((n) => ({ ...n, unread: false }))
      })
    })()
  }, [fetchNotificationsLive])

  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications])

  // updates.avatarFile (a raw File, from Edit Profile's "change photo"
  // control) uploads through the same media pipeline a post photo does
  // (backend/src/routes/media.js) and then sets profiles.avatar_asset_id —
  // both already existed end-to-end; only this "change photo" trigger was
  // the known gap (see docs/CONNECT_EXISTING_INFRA.md §8).
  const updateProfile = useCallback(
    (updates) => {
      if (!isLive) {
        const next = { ...updates }
        if (updates.avatarFile) {
          // No backend in mock mode — just preview the chosen file locally,
          // the same way CreatePost's image picker already does.
          next.avatarUrl = updates.avatarPreview || currentUser.avatarUrl
        }
        delete next.avatarFile
        delete next.avatarPreview
        setCurrentUser((u) => ({ ...u, ...next }))
        pushToast('Profile updated')
        return
      }
      ;(async () => {
        try {
          const backendUpdates = {}
          if (updates.name !== undefined) backendUpdates.display_name = updates.name
          if (updates.bio !== undefined) backendUpdates.bio = updates.bio
          if (updates.location !== undefined) backendUpdates.location = updates.location
          if (updates.avatarFile) {
            backendUpdates.avatar_asset_id = await api.uploadMedia(updates.avatarFile)
          }

          const profile = await api.updateProfile(currentUser.id, backendUpdates)
          const name = profile.display_name ?? currentUser.name
          const merged = {
            ...currentUser,
            name,
            handle: handleFor(name, currentUser.id),
            initials: initialsFor(name),
            bio: profile.bio ?? currentUser.bio,
            location: profile.location ?? currentUser.location,
            topics: profile.interests ?? currentUser.topics,
            avatarUrl: profile.avatarUrl ?? currentUser.avatarUrl,
          }
          setCurrentUser(merged)
          cacheUsers([merged])
          pushToast('Profile updated')
        } catch (err) {
          pushToast(err.message || 'Could not save your profile — try again')
        }
      })()
    },
    [currentUser, pushToast, cacheUsers]
  )

  // People directory for SearchOverlay: the static mock roster in mock
  // mode, or everyone encountered so far (feed authors, commenters,
  // notification senders, people you follow) in live mode. There's no
  // full-text user search endpoint in the Level 1 API — see
  // docs/CONNECT_EXISTING_INFRA.md's "Known gaps" section.
  // Every screen reads `posts` from this context, never the raw setState
  // above directly — filtering here means Home/Discover/PostDetail never
  // needed to know blocking exists at all to respect it.
  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (p) => !blockedUserIds.has(p.authorId) && !mutedUserIds.has(p.authorId) && !hiddenPostIds.has(p.id)
      ),
    [posts, blockedUserIds, mutedUserIds, hiddenPostIds]
  )

  const directory = useMemo(() => (isLive ? Object.values(usersCache) : Object.values(USERS)), [usersCache])

  const value = {
    isAuthenticated,
    hasOnboarded,
    authLoading,
    currentUser,
    posts: visiblePosts,
    notifications,
    likedPostIds,
    savedPostIds,
    hiddenPostIds,
    hidePost,
    blockedUserIds,
    toggleBlock,
    mutedUserIds,
    toggleMute,
    likedCommentIds,
    toggleCommentLike,
    deleteComment,
    setPinnedComment,
    followedUserIds,
    selectedTopics,
    joinedCommunityIds,
    toggleJoinCommunity,
    toasts,
    directory,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    submitReport,
    completeOnboarding,
    toggleLike,
    toggleSave,
    repost,
    addComment,
    loadComments,
    fetchPostsLive,
    fetchMorePosts,
    hasMorePosts,
    loadingMorePosts,
    toggleFollow,
    createPost,
    getTaggedPosts,
    markNotificationsRead,
    unreadCount,
    updateProfile,
    getUser,
    pushToast,
    dismissToast,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
