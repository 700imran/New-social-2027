// api/client.js — the seam between this frontend and the reference backend
// in ../../backend (see ../../docs/Application_Level_1_Execution_Guideline.md).
//
// Today, AppContext.jsx holds everything in React state and never imports
// this file — that's deliberate: this app is a self-contained, working
// frontend demo with no live sign-up or database, exactly as scoped. This
// file exists so wiring up the real backend later is a matter of pointing
// AppContext's actions at these functions instead of local setState, not a
// rewrite — the same "seam" principle the backend guideline uses for
// MediaService.getPlaybackUrl() and MatchingService.suggestCreators().
//
// To go live: set VITE_API_BASE_URL in a .env.local file (see backend/README.md),
// then swap the relevant AppContext callback bodies to call these instead.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || null
export const isLive = Boolean(BASE_URL)

let accessToken = null
export function setAccessToken(token) {
  accessToken = token
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  if (!BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — the app is running in mock mode. See backend/README.md.')
  }
  const headers = { 'Content-Type': 'application/json' }
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`)
  return data
}

// --- Model 1: User & Trust -------------------------------------------------
export const signUp = (payload) => request('/auth/signup', { method: 'POST', body: payload, auth: false })
export const signIn = (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false })
export const signOut = () => request('/auth/logout', { method: 'POST' })
export const getProfile = (userId) => request(`/profiles/${userId}`, { auth: false })
export const updateProfile = (userId, updates) => request(`/profiles/${userId}`, { method: 'PATCH', body: updates })
export const follow = (followeeId) => request('/follows', { method: 'POST', body: { followeeId } })
export const unfollow = (followeeId) => request(`/follows/${followeeId}`, { method: 'DELETE' })
export const getFollowers = (userId) => request(`/users/${userId}/followers`, { auth: false })
export const getFollowing = (userId) => request(`/users/${userId}/following`, { auth: false })
export const block = (blockedId) => request('/blocks', { method: 'POST', body: { blockedId } })
export const getConsent = () => request('/consent')
export const updateConsent = (updates) => request('/consent', { method: 'PATCH', body: updates })

// --- Social surface (posts / comments / reactions / notifications) --------
export const getPosts = (topic) => request(`/posts${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`, { auth: false })
export const createPost = (payload) => request('/posts', { method: 'POST', body: payload })
export const getComments = (postId) => request(`/posts/${postId}/comments`, { auth: false })
export const addComment = (postId, body) => request(`/posts/${postId}/comments`, { method: 'POST', body: { body } })
export const react = (postId, type = 'like') => request(`/posts/${postId}/react`, { method: 'POST', body: { type } })
export const unreact = (postId) => request(`/posts/${postId}/react`, { method: 'DELETE' })
export const getNotifications = () => request('/notifications')
export const markNotificationRead = (id) => request(`/notifications/${id}/read`, { method: 'PATCH' })

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
