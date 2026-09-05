// api/client.js — the seam between this frontend and the reference backend
// in ../../backend (see ../../docs/Application_Level_1_Execution_Guideline.md
// and ../../docs/SECURITY.md).
//
// AppContext.jsx imports this file and calls into it for every action
// whenever `isLive` is true (VITE_API_BASE_URL is set); with no env var
// set, `isLive` is false and AppContext falls back to local setState only,
// so the app still runs as a self-contained demo with no backend. The
// "seam" is which of those two paths each AppContext callback takes, not
// whether this file is wired up at all — same principle the backend
// guideline uses for MediaService.getPlaybackUrl() and
// MatchingService.suggestCreators().
//
// To go live: set VITE_API_BASE_URL in a .env.local file (see backend/README.md).

const BASE_URL = import.meta.env.VITE_API_BASE_URL || null
export const isLive = Boolean(BASE_URL)

// Access token only — kept in memory (a module-level variable), never in
// localStorage/sessionStorage. The refresh token never touches JS at all;
// it lives in an httpOnly cookie the backend sets (see routes/auth.js),
// so an XSS bug reading this variable can't mint itself a new session
// once this tab closes or the access token naturally expires (~1hr). See
// ../../docs/SECURITY.md's "session security" section.
let accessToken = null
export function setAccessToken(token) {
  accessToken = token
}

async function doFetch(path, { method, body, auth }) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    // Required so the browser sends/receives the httpOnly refresh cookie
    // on auth endpoints. Harmless no-op for every other endpoint, which
    // don't set or read cookies at all.
    credentials: 'include',
  })
}

// Concurrent 401s (e.g. several cards' like/react calls firing at once
// right as the token expires) share a single refresh instead of each
// firing their own — the second caller just awaits the first's result.
let refreshInFlight = null

async function request(path, { method = 'GET', body, auth = true } = {}) {
  if (!BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — the app is running in mock mode. See backend/README.md.')
  }

  let res
  try {
    res = await doFetch(path, { method, body, auth })
  } catch (networkErr) {
    // fetch() itself throwing (as opposed to resolving with a non-2xx
    // response) means the request never reached the server at all, or the
    // browser/WebView blocked it outright — almost always either a CORS
    // misconfiguration (ALLOWED_ORIGINS on the Worker doesn't include this
    // app's origin — see docs/GO_LIVE_CHECKLIST.md §4) or no network
    // connectivity. Logged distinctly from a real HTTP error response
    // below, since they need different fixes and look identical to a user
    // as "nothing happened" otherwise.
    console.error(`[api] Network/CORS failure calling ${method} ${BASE_URL}${path}`, networkErr)
    throw new Error(`Could not reach the server. If this persists, the backend's ALLOWED_ORIGINS may not include this app's origin.`)
  }

  // The access token is only ever refreshed once, on page load (see
  // AppContext's mount effect) — it naturally expires after ~1hr with no
  // proactive renewal. Rather than every action failing for the rest of
  // the session once that happens, refresh it here off the httpOnly
  // cookie and retry this exact call once. Never recurse on /auth/refresh
  // itself, or a truly expired/revoked session would loop.
  if (res.status === 401 && auth && path !== '/auth/refresh') {
    try {
      refreshInFlight =
        refreshInFlight ||
        request('/auth/refresh', { method: 'POST', auth: false }).then((session) => {
          setAccessToken(session.accessToken)
          return session
        })
      await refreshInFlight
    } catch {
      setAccessToken(null)
      throw new Error('Your session has expired — please sign in again.')
    } finally {
      refreshInFlight = null
    }

    try {
      res = await doFetch(path, { method, body, auth })
    } catch (networkErr) {
      console.error(`[api] Network/CORS failure calling ${method} ${BASE_URL}${path}`, networkErr)
      throw new Error(`Could not reach the server. If this persists, the backend's ALLOWED_ORIGINS may not include this app's origin.`)
    }
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    console.error(`[api] ${method} ${BASE_URL}${path} -> HTTP ${res.status}`, data)
    throw new Error(data?.error || `Request failed: ${res.status}`)
  }
  return data
}

// --- Model 1: User & Trust -------------------------------------------------
export const signUp = (payload) => request('/auth/signup', { method: 'POST', body: payload, auth: false })
export const signIn = (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false })
export const signOut = () => request('/auth/logout', { method: 'POST' })
// No argument: the refresh token comes from the httpOnly cookie the
// backend already has, never from anything this frontend holds.
export const refreshSession = () => request('/auth/refresh', { method: 'POST', auth: false })
export const forgotPassword = (email, turnstileToken) =>
  request('/auth/forgot-password', { method: 'POST', body: { email, turnstileToken }, auth: false })
export const updatePassword = (password) => request('/auth/password', { method: 'PATCH', body: { password } })

// Only for the password-reset-from-email flow: the link Supabase emails
// hands the page a short-lived access token directly in the URL, before
// any normal signIn() has happened — so this bypasses the module-level
// `accessToken` above and uses the one-off token explicitly instead.
export async function updatePasswordWithToken(oneOffToken, password) {
  const res = await fetch(`${BASE_URL}/auth/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${oneOffToken}` },
    body: JSON.stringify({ password }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`)
  return data
}

export const getProfile = (userId) => request(`/profiles/${userId}`, { auth: false })
export const updateProfile = (userId, updates) => request(`/profiles/${userId}`, { method: 'PATCH', body: updates })
export const follow = (followeeId) => request('/follows', { method: 'POST', body: { followeeId } })
export const unfollow = (followeeId) => request(`/follows/${followeeId}`, { method: 'DELETE' })
export const getFollowers = (userId) => request(`/users/${userId}/followers`, { auth: false })
export const getFollowing = (userId) => request(`/users/${userId}/following`, { auth: false })
export const block = (blockedId) => request('/blocks', { method: 'POST', body: { blockedId } })
export const unblock = (blockedId) => request(`/blocks/${blockedId}`, { method: 'DELETE' })
export const getBlocks = () => request('/blocks')
export const mute = (mutedUserId) => request('/mutes', { method: 'POST', body: { mutedUserId } })
export const unmute = (mutedUserId) => request(`/mutes/${mutedUserId}`, { method: 'DELETE' })
export const getMutes = () => request('/mutes')
export const getConsent = () => request('/consent')
export const updateConsent = (updates) => request('/consent', { method: 'PATCH', body: updates })

// --- Social surface (posts / comments / reactions / notifications) --------
//
// NOTE on `auth`: these two reads used to hardcode `{ auth: false }` so a
// signed-out visitor could still load the public feed (GET /posts and GET
// /posts/:id/comments both use `optionalAuth` on the backend, which
// accepts an anonymous caller). But `doFetch` only attaches the
// Authorization header `if (auth && accessToken)` — when signed out,
// `accessToken` is null anyway, so the header was never sent regardless.
// Forcing `auth: false` didn't buy anonymous support; it just meant a
// *signed-in* user's own feed request never carried their token either,
// so the backend had no `userId` to enrich with and always returned
// `likedByMe: false` — making a like look like it silently failed to
// save every time the feed was re-fetched, even though the reaction row
// was written correctly. Leaving `auth` at its default (true) sends the
// token when one exists and sends nothing when it doesn't — correct for
// both cases.
export const getPosts = (topic, kind, before) => {
  const params = new URLSearchParams()
  if (topic) params.set('topic', topic)
  if (kind) params.set('kind', kind)
  if (before) params.set('before', before)
  const qs = params.toString()
  return request(`/posts${qs ? `?${qs}` : ''}`)
}
// payload: { body, mediaAssetId?, topic?, kind?, taggedUserIds? } — kind
// is 'post' (default) or 'reel'; taggedUserIds is an array of user ids.
export const createPost = (payload) => request('/posts', { method: 'POST', body: payload })
export const getTaggedPosts = (userId) => request(`/users/${userId}/tagged-posts`, { auth: false })
export const getComments = (postId) => request(`/posts/${postId}/comments`)
export const addComment = (postId, body) => request(`/posts/${postId}/comments`, { method: 'POST', body: { body } })
export const reactToComment = (postId, commentId) =>
  request(`/posts/${postId}/comments/${commentId}/react`, { method: 'POST' })
export const unreactToComment = (postId, commentId) =>
  request(`/posts/${postId}/comments/${commentId}/react`, { method: 'DELETE' })
export const deleteComment = (postId, commentId) =>
  request(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' })
export const setPinnedComment = (postId, commentId) =>
  request(`/posts/${postId}/pinned-comment`, { method: 'PATCH', body: { commentId } })
export const react = (postId, type = 'like') => request(`/posts/${postId}/react`, { method: 'POST', body: { type } })
export const unreact = (postId) => request(`/posts/${postId}/react`, { method: 'DELETE' })
export const savePost = (postId) => request(`/posts/${postId}/save`, { method: 'POST' })
export const unsavePost = (postId) => request(`/posts/${postId}/save`, { method: 'DELETE' })
export const hidePost = (postId) => request(`/posts/${postId}/hide`, { method: 'POST' })
export const unhidePost = (postId) => request(`/posts/${postId}/hide`, { method: 'DELETE' })
export const getHiddenPosts = () => request('/hidden-posts')
export const getSavedPosts = () => request('/saved-posts')
export const getNotifications = () => request('/notifications')
export const markNotificationRead = (id) => request(`/notifications/${id}/read`, { method: 'PATCH' })
export const deleteAccount = () => request('/account', { method: 'DELETE' })
export const createReport = (payload) => request('/reports', { method: 'POST', body: payload })

// --- Model 3: Media ----------------------------------------------------------
// Two-step upload matching the guideline: get a presigned URL, then PUT the
// file straight to R2 (never through this Worker).
export async function uploadMedia(file) {
  const { assetId, uploadUrl } = await request('/media/upload-url', {
    method: 'POST',
    body: { mimeType: file.type, sizeBytes: file.size },
  })
  await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  return assetId
}
export const getMediaUrl = (assetId) => request(`/media/${assetId}`, { auth: false })

// --- Model 2: Commerce (dormant — schema exists, UI does not use these yet) -
export const createCampaign = (payload) => request('/campaigns', { method: 'POST', body: payload })
export const getCampaign = (id) => request(`/campaigns/${id}`)
export const makeOffer = (campaignId, creatorId) => request(`/campaigns/${campaignId}/offers`, { method: 'POST', body: { creatorId } })
export const respondToOffer = (offerId, status) => request(`/offers/${offerId}`, { method: 'PATCH', body: { status } })
