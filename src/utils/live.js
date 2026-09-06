// utils/live.js — the mapping layer between backend/src/routes' JSON shapes
// and the mock-data shapes src/pages and src/components already render
// (see ../data/mockData.js). AppContext.jsx is the only file that imports
// this; nothing here talks to the network.

const AVATAR_TONES = [
  'from-saffron-400 to-saffron-600',
  'from-blue-400 to-blue-600',
  'from-pink-400 to-rose-600',
  'from-emerald-400 to-emerald-700',
  'from-indigo-400 to-indigo-700',
  'from-amber-400 to-orange-600',
  'from-teal-400 to-cyan-700',
  'from-purple-400 to-fuchsia-700',
  'from-rose-400 to-red-700',
  'from-lime-400 to-green-700',
]

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function avatarToneFor(seed) {
  if (!seed) return AVATAR_TONES[0]
  return AVATAR_TONES[hashString(String(seed)) % AVATAR_TONES.length]
}

export function initialsFor(name) {
  if (!name) return 'U'
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || 'U'
  )
}

export function handleFor(name, userId) {
  const base = name?.trim() ? name.trim().toLowerCase().replace(/\s+/g, '.') : (userId || 'user').slice(0, 8)
  return '@' + base
}

// 'system' object -> "2h ago" style relative time, matching mockData's
// hand-written strings closely enough that PostCard/Activity need no changes.
export function timeAgo(isoString) {
  if (!isoString) return ''
  const diffMs = Date.now() - new Date(isoString).getTime()
  const sec = Math.max(0, Math.floor(diffMs / 1000))
  if (sec < 60) return 'now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const week = Math.floor(day / 7)
  if (week < 5) return `${week}w ago`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month}mo ago`
  return `${Math.floor(day / 365)}y ago`
}

export function monthYear(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// backend/src/routes/users.js GET /profiles/:id -> the same shape mockData's
// USERS.pooja entry has, so Avatar/Profile/PostCard/etc. render unmodified.
export function mapProfileToUser(userId, profile) {
  const name = profile?.display_name || 'BharatSpace user'
  return {
    id: userId,
    name,
    handle: handleFor(name, userId),
    verified: false, // no verification concept in the Level 1 schema
    avatarColor: avatarToneFor(userId),
    initials: initialsFor(name),
    location: profile?.location || '',
    joined: monthYear(profile?.joinedAt) || '',
    bio: profile?.bio || '',
    followers: profile?.followerCount ?? 0,
    following: profile?.followingCount ?? 0,
    posts: profile?.postCount ?? 0,
    topics: profile?.interests || [],
    avatarUrl: profile?.avatarUrl || null,
  }
}

// Lightweight version used when all we have is an { id, displayName,
// avatarUrl } fragment embedded in a post/comment/notification response
// (see enrichPosts() in backend/src/routes/posts.js) — not a full profile
// fetch, just enough to render an Avatar + name until/unless the full
// profile is loaded.
export function mapAuthorFragment(fragment) {
  if (!fragment) return null
  return {
    id: fragment.id,
    name: fragment.displayName || 'BharatSpace user',
    handle: handleFor(fragment.displayName, fragment.id),
    verified: false,
    avatarColor: avatarToneFor(fragment.id),
    initials: initialsFor(fragment.displayName),
    avatarUrl: fragment.avatarUrl || null,
  }
}

// backend/src/routes/posts.js GET /posts -> mockData.INITIAL_POSTS shape.
// `reposts` stays 0 and repost() stays a local-only action everywhere — the
// Level 1 schema's reactions table has one row per (post_id, user_id), so a
// "repost" reaction type would silently overwrite a user's existing like on
// the same post. That needs a schema change (e.g. a dedicated `reposts`
// table, or widening the PK), not a workaround here.
export function mapApiPost(apiPost) {
  return {
    id: apiPost.id,
    authorId: apiPost.author_id,
    time: timeAgo(apiPost.created_at),
    // Raw ISO timestamp, kept alongside the human-friendly `time` string
    // above — needed as the `before` cursor for GET /posts pagination
    // (see AppContext.jsx's fetchMorePosts).
    _createdAt: apiPost.created_at,
    tab: apiPost.topic || 'For You',
    tags: apiPost.topic ? [apiPost.topic] : [],
    text: apiPost.body || '',
    hasImage: !!apiPost.mediaUrl,
    imagePreview: apiPost.mediaUrl || null,
    // 'post' or 'reel' — see migrations/005_reels_and_tags.sql. Reels.jsx
    // and Profile.jsx's Reels tab filter on this; everything else ignores it.
    kind: apiPost.kind || 'post',
    live: false,
    likes: apiPost.likeCount ?? 0,
    comments: apiPost.commentCount ?? 0,
    reposts: 0,
    comments_list: [],
    // See migrations/009_comment_mini_controls.sql — null until the post
    // author pins one; PostDetail.jsx shows this comment above the rest.
    pinnedCommentId: apiPost.pinned_comment_id || null,
    taggedUsers: (apiPost.taggedUsers || []).map(mapAuthorFragment).filter(Boolean),
    _likedByMe: !!apiPost.likedByMe,
    _savedByMe: !!apiPost.savedByMe,
    _author: mapAuthorFragment(apiPost.author),
  }
}

export function mapApiComment(apiComment) {
  return {
    id: apiComment.id,
    authorId: apiComment.author_id,
    text: apiComment.body,
    time: timeAgo(apiComment.created_at),
    // See migrations/009_comment_mini_controls.sql.
    likes: apiComment.likeCount ?? 0,
    _likedByMe: !!apiComment.likedByMe,
    _author: mapAuthorFragment(apiComment.author),
  }
}

// backend/src/lib/notify.js writes { actorId, text } into notifications.payload;
// this turns that + the row's `type` into mockData.INITIAL_NOTIFICATIONS' shape.
const NOTIF_TYPE_TO_TAB = {
  follow: 'Follows',
  reply: 'Comments',
  reaction: 'Reactions',
  mention: 'Mentions',
  tag: 'Mentions', // being tagged in a post/reel — see migrations/005_reels_and_tags.sql
  trending: 'Reactions',
}

export function mapApiNotification(apiNotif) {
  return {
    id: apiNotif.id,
    type: NOTIF_TYPE_TO_TAB[apiNotif.type] || 'Reactions',
    authorId: apiNotif.payload?.actorId || null,
    text: apiNotif.payload?.text || '',
    time: timeAgo(apiNotif.created_at),
    unread: !apiNotif.read_at,
  }
}

// Reads the payload of a Supabase JWT (base64url, unsigned check — the
// Worker is what actually verifies the signature on every request; this is
// only used client-side to know *whose* session this is and when it
// expires, never to authorize anything).
export function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
