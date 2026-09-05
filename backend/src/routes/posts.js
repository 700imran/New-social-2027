import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth, optionalAuth } from '../lib/authMiddleware.js'
import { notify, truncate } from '../lib/notify.js'
import { checkRateLimit, requireText, LIMITS } from '../lib/security.js'

const posts = new Hono()

// Turns a bare storage_key into the public R2 URL the frontend can render
// directly in an <img>/<video> tag — same convention as routes/media.js's
// GET /media/:id, just applied to a batch instead of one asset.
function publicMediaUrl(env, storageKey) {
  return storageKey ? `${env.R2_PUBLIC_BASE_URL}/${storageKey}` : null
}

/**
 * The `posts` table (see docs/bharatspace_level1_schema.sql) only stores
 * author_id/body/media_asset_id/topic — no author name, no like/comment
 * counts, no resolved media URL. Every screen that renders a post needs
 * all of that, so we resolve it here, server-side, in a handful of batched
 * queries (never one query per post) rather than pushing N+1 fan-out onto
 * the frontend or leaving the UI unable to render a feed at all.
 */
async function enrichPosts(supabase, env, rows, myId) {
  if (!rows.length) return []

  const postIds = rows.map((p) => p.id)
  const authorIds = [...new Set(rows.map((p) => p.author_id))]
  const mediaAssetIds = rows.filter((p) => p.media_asset_id).map((p) => p.media_asset_id)

  const [profilesRes, reactionsRes, commentsRes, mediaRes, savedRes, tagsRes] = await Promise.all([
    supabase.from('profiles').select('user_id, display_name, avatar_asset_id').in('user_id', authorIds),
    supabase.from('reactions').select('post_id, user_id, type').in('post_id', postIds),
    supabase.from('comments').select('post_id').in('post_id', postIds),
    mediaAssetIds.length
      ? supabase.from('media_assets').select('id, storage_key').in('id', mediaAssetIds)
      : Promise.resolve({ data: [] }),
    // RLS on saved_posts (migrations/003_saved_posts.sql) already scopes
    // this to "your own rows only" regardless of what we ask for — myId
    // here is just to skip the query entirely for anonymous callers.
    myId ? supabase.from('saved_posts').select('post_id').eq('user_id', myId).in('post_id', postIds) : Promise.resolve({ data: [] }),
    // post_tags (migrations/005_reels_and_tags.sql) — publicly readable,
    // so this runs regardless of whether anyone's signed in.
    supabase.from('post_tags').select('post_id, tagged_user_id').in('post_id', postIds),
  ])

  const taggedUserIds = [...new Set((tagsRes.data || []).map((t) => t.tagged_user_id))]
  const tagProfilesRes = taggedUserIds.length
    ? await supabase.from('profiles').select('user_id, display_name, avatar_asset_id').in('user_id', taggedUserIds)
    : { data: [] }

  const avatarAssetIds = [...(profilesRes.data || []), ...(tagProfilesRes.data || [])]
    .filter((p) => p.avatar_asset_id)
    .map((p) => p.avatar_asset_id)
  const avatarRes = avatarAssetIds.length
    ? await supabase.from('media_assets').select('id, storage_key').in('id', avatarAssetIds)
    : { data: [] }

  const mediaById = Object.fromEntries([...(mediaRes.data || []), ...(avatarRes.data || [])].map((m) => [m.id, m]))
  const profileById = Object.fromEntries((profilesRes.data || []).map((p) => [p.user_id, p]))
  const tagProfileById = Object.fromEntries((tagProfilesRes.data || []).map((p) => [p.user_id, p]))

  const savedPostIds = new Set((savedRes.data || []).map((s) => s.post_id))

  const toAuthorFragment = (userId, profile) =>
    profile
      ? {
          id: userId,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_asset_id ? publicMediaUrl(env, mediaById[profile.avatar_asset_id]?.storage_key) : null,
        }
      : { id: userId, displayName: 'BharatSpace user', avatarUrl: null }

  return rows.map((post) => {
    const postReactions = (reactionsRes.data || []).filter((r) => r.post_id === post.id)
    const commentCount = (commentsRes.data || []).filter((cm) => cm.post_id === post.id).length
    const media = post.media_asset_id ? mediaById[post.media_asset_id] : null
    const taggedIds = (tagsRes.data || []).filter((t) => t.post_id === post.id).map((t) => t.tagged_user_id)

    return {
      ...post,
      author: toAuthorFragment(post.author_id, profileById[post.author_id]),
      mediaUrl: publicMediaUrl(env, media?.storage_key),
      likeCount: postReactions.filter((r) => r.type === 'like').length,
      likedByMe: myId ? postReactions.some((r) => r.user_id === myId && r.type === 'like') : false,
      commentCount,
      savedByMe: savedPostIds.has(post.id),
      taggedUsers: taggedIds.map((id) => toAuthorFragment(id, tagProfileById[id])),
    }
  })
}

// GET /v1/posts?topic=Tech&kind=reel&limit=20&before=2026-09-01T00:00:00Z
// — public feed read (RLS: publicly readable).
// `kind` defaults to no filter (returns posts and reels together) so the
// main Home feed doesn't need to change; Reels.jsx passes kind=reel.
// `before` is a cursor, not an offset: pass the `created_at` of the last
// post you already have to get the next page strictly older than it.
// Cursor-based rather than offset-based so a new post landing between two
// page loads can't shift results and cause a duplicate/skipped row the
// way `?offset=30` would.
posts.get('/posts', optionalAuth, async (c) => {
  const topic = c.req.query('topic')
  const kind = c.req.query('kind')
  const before = c.req.query('before')
  const limit = Number(c.req.query('limit') || 30)
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  let query = supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(limit)
  if (topic) query = query.eq('topic', topic)
  if (kind) query = query.eq('kind', kind)
  if (before) query = query.lt('created_at', before)
  const { data, error } = await query
  if (error) return dbError(c, error)

  const enriched = await enrichPosts(supabase, c.env, data, c.get('userId'))
  return c.json(enriched)
})

// GET /v1/posts/:id — single post, same enrichment as the feed. Used when a
// deep link (e.g. a share URL or a notification tap) opens a post the
// frontend doesn't already have in its in-memory feed.
posts.get('/posts/:id', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase.from('posts').select('*').eq('id', c.req.param('id')).single()
  if (error) return dbError(c, error, 'Not found', 404)
  const [enriched] = await enrichPosts(supabase, c.env, [data], c.get('userId'))
  return c.json(enriched)
})

// POST /v1/posts  { body, mediaAssetId?, topic?, kind?, taggedUserIds? }
// kind: 'post' (default) | 'reel' — see migrations/005_reels_and_tags.sql.
// taggedUserIds: up to 10 user ids to tag; each gets a real notification
// and shows up in their Profile's Tagged tab.
const MAX_TAGGED_USERS = 10
posts.post('/posts', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'You are posting too quickly — please slow down.' }, 429)

  const { body, mediaAssetId, topic, kind, taggedUserIds } = await c.req.json().catch(() => ({}))
  const text = requireText(body, { field: 'body', max: LIMITS.postBody, required: !mediaAssetId })
  if (text.error) return c.json({ error: text.error }, 400)
  if (topic) {
    const topicCheck = requireText(topic, { field: 'topic', max: LIMITS.topic, required: false })
    if (topicCheck.error) return c.json({ error: topicCheck.error }, 400)
  }
  if (kind && kind !== 'post' && kind !== 'reel') {
    return c.json({ error: "kind must be 'post' or 'reel'" }, 400)
  }
  const tagIds = Array.isArray(taggedUserIds) ? [...new Set(taggedUserIds)].slice(0, MAX_TAGGED_USERS) : []

  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: c.get('userId'), body: text.value, media_asset_id: mediaAssetId, topic, kind: kind || 'post' })
    .select()
    .single()
  if (error) return dbError(c, error)

  if (tagIds.length) {
    const { error: tagError } = await supabase
      .from('post_tags')
      .insert(tagIds.map((tagged_user_id) => ({ post_id: data.id, tagged_user_id })))
    // A bad id in the list (e.g. references a user that doesn't exist)
    // shouldn't take down the post that was already created successfully —
    // logged, not surfaced as a failed request, same reasoning as
    // lib/r2.js's deleteR2Object being best-effort.
    if (tagError) console.warn('[posts] failed to insert post_tags', tagError)
    else {
      await Promise.all(
        tagIds.map((recipientId) =>
          notify(c.env, {
            recipientId,
            actorId: c.get('userId'),
            type: 'tag',
            text: `tagged you in a ${kind === 'reel' ? 'reel' : 'post'}${text.value ? `: "${truncate(text.value)}"` : ''}`,
          })
        )
      )
    }
  }

  const [enriched] = await enrichPosts(supabase, c.env, [data], c.get('userId'))
  return c.json(enriched, 201)
})

// POST /v1/posts/:id/comments  { body }
posts.post('/posts/:id/comments', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'You are commenting too quickly — please slow down.' }, 429)

  const { body } = await c.req.json().catch(() => ({}))
  const text = requireText(body, { field: 'body', max: LIMITS.commentBody })
  if (text.error) return c.json({ error: text.error }, 400)
  const postId = c.req.param('id')
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: c.get('userId'), body: text.value })
    .select()
    .single()
  if (error) return dbError(c, error)

  const { data: post } = await supabase.from('posts').select('author_id, body').eq('id', postId).single()
  if (post) {
    await notify(c.env, {
      recipientId: post.author_id,
      actorId: c.get('userId'),
      type: 'reply',
      text: `commented on your post: "${truncate(text.value)}"`,
    })
  }

  return c.json(data, 201)
})

// GET /v1/posts/:id/comments — includes each commenter's display name,
// plus each comment's like count/likedByMe (see
// migrations/009_comment_mini_controls.sql) — same reasoning as
// enrichPosts() above, just for comments instead of posts.
posts.get('/posts/:id/comments', optionalAuth, async (c) => {
  const postId = c.req.param('id')
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) return dbError(c, error)
  if (!data.length) return c.json([])

  const authorIds = [...new Set(data.map((cm) => cm.author_id))]
  const commentIds = data.map((cm) => cm.id)
  const myId = c.get('userId')
  const [{ data: profiles }, { data: reactions }] = await Promise.all([
    supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds),
    supabase.from('comment_reactions').select('comment_id, user_id').in('comment_id', commentIds),
  ])
  const nameById = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.display_name]))

  return c.json(
    data.map((cm) => {
      const commentLikes = (reactions || []).filter((r) => r.comment_id === cm.id)
      return {
        ...cm,
        author: { id: cm.author_id, displayName: nameById[cm.author_id] || 'BharatSpace user' },
        likeCount: commentLikes.length,
        likedByMe: myId ? commentLikes.some((r) => r.user_id === myId) : false,
      }
    })
  )
})

// POST /v1/posts/:postId/comments/:commentId/react — like a comment. One
// reaction per (comment, user) — see migrations/009.
posts.post('/posts/:postId/comments/:commentId/react', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('comment_reactions')
    .upsert(
      { comment_id: c.req.param('commentId'), user_id: c.get('userId'), type: 'like' },
      { onConflict: 'comment_id,user_id' }
    )
  if (error) return dbError(c, error)
  return c.json({ ok: true }, 201)
})

// DELETE /v1/posts/:postId/comments/:commentId/react — unlike a comment
posts.delete('/posts/:postId/comments/:commentId/react', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('comment_reactions')
    .delete()
    .eq('comment_id', c.req.param('commentId'))
    .eq('user_id', c.get('userId'))
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

// DELETE /v1/posts/:postId/comments/:commentId — the comment's own
// author OR the post's author can delete it (see migrations/009's two
// RLS policies). RLS is what actually enforces which case applies; a
// delete that matches neither policy affects 0 rows, which this reports
// as 404 rather than a silent no-op 200.
posts.delete('/posts/:postId/comments/:commentId', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error, count } = await supabase
    .from('comments')
    .delete({ count: 'exact' })
    .eq('id', c.req.param('commentId'))
    .eq('post_id', c.req.param('postId'))
  if (error) return dbError(c, error)
  if (!count) return c.json({ error: "Comment not found, or you don't have permission to delete it" }, 404)
  return c.json({ ok: true })
})

// PATCH /v1/posts/:id/pinned-comment  { commentId }  — pin a comment, or
// pass `commentId: null` to unpin. Author-only: checked explicitly here
// (rather than left entirely to RLS) so a non-author gets a clear 403
// instead of a generic RLS-denied error — the `posts` table's existing
// "authors manage their own posts" policy backs this up at the DB layer
// too, since this is a plain UPDATE on `posts`.
posts.patch('/posts/:id/pinned-comment', requireAuth, async (c) => {
  const postId = c.req.param('id')
  const { commentId } = await c.req.json().catch(() => ({}))
  const supabase = userClient(c.env, c.get('jwt'))

  const { data: post, error: postError } = await supabase.from('posts').select('author_id').eq('id', postId).single()
  if (postError) return dbError(c, postError, 'Not found', 404)
  if (post.author_id !== c.get('userId')) return c.json({ error: 'Only the post author can pin a comment' }, 403)

  if (commentId) {
    const { data: comment } = await supabase.from('comments').select('post_id').eq('id', commentId).single()
    if (!comment || comment.post_id !== postId) return c.json({ error: 'That comment is not on this post' }, 400)
  }

  const { error } = await supabase.from('posts').update({ pinned_comment_id: commentId || null }).eq('id', postId)
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

// POST /v1/posts/:id/react  { type: 'like' } — upsert, one reaction per user per post
const ALLOWED_REACTIONS = new Set(['like'])
posts.post('/posts/:id/react', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const { type = 'like' } = await c.req.json().catch(() => ({}))
  if (!ALLOWED_REACTIONS.has(type)) return c.json({ error: `Unsupported reaction type` }, 400)
  const postId = c.req.param('id')
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('reactions')
    .upsert({ post_id: postId, user_id: c.get('userId'), type }, { onConflict: 'post_id,user_id' })
  if (error) return dbError(c, error)

  if (type === 'like') {
    const { data: post } = await supabase.from('posts').select('author_id, body').eq('id', postId).single()
    if (post) {
      await notify(c.env, {
        recipientId: post.author_id,
        actorId: c.get('userId'),
        type: 'reaction',
        text: `liked your post: "${truncate(post.body)}"`,
      })
    }
  }

  return c.json({ ok: true })
})

// DELETE /v1/posts/:id/react — un-like
posts.delete('/posts/:id/react', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase.from('reactions').delete().eq('post_id', c.req.param('id')).eq('user_id', c.get('userId'))
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

// POST /v1/posts/:id/save
posts.post('/posts/:id/save', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('saved_posts')
    .upsert({ post_id: c.req.param('id'), user_id: c.get('userId') }, { onConflict: 'user_id,post_id' })
  if (error) return dbError(c, error)
  return c.json({ ok: true }, 201)
})

// DELETE /v1/posts/:id/save
posts.delete('/posts/:id/save', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('post_id', c.req.param('id'))
    .eq('user_id', c.get('userId'))
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

// GET /v1/saved-posts — your own saved posts, newest first, same
// enrichment as the main feed so the frontend can render them identically
posts.get('/saved-posts', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data: saved, error } = await supabase
    .from('saved_posts')
    .select('post_id, created_at')
    .eq('user_id', c.get('userId'))
    .order('created_at', { ascending: false })
  if (error) return dbError(c, error)
  if (!saved.length) return c.json([])

  const { data: postRows, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .in('id', saved.map((s) => s.post_id))
  if (postsError) return c.json({ error: postsError.message }, 400)

  // Preserve save order (most-recently-saved first), not post creation order
  const byId = Object.fromEntries(postRows.map((p) => [p.id, p]))
  const ordered = saved.map((s) => byId[s.post_id]).filter(Boolean)
  const enriched = await enrichPosts(supabase, c.env, ordered, c.get('userId'))
  return c.json(enriched)
})

// POST /v1/posts/:id/hide — "Not interested" / hide this post. Distinct
// from block: this hides one post without unfollowing or blocking its
// author (see toggleBlock in AppContext.jsx for the heavier action).
posts.post('/posts/:id/hide', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('hidden_posts')
    .upsert({ post_id: c.req.param('id'), user_id: c.get('userId') }, { onConflict: 'user_id,post_id' })
  if (error) return dbError(c, error)
  return c.json({ ok: true }, 201)
})

// DELETE /v1/posts/:id/hide — undo, e.g. from a toast's Undo action
posts.delete('/posts/:id/hide', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('hidden_posts')
    .delete()
    .eq('post_id', c.req.param('id'))
    .eq('user_id', c.get('userId'))
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

// GET /v1/hidden-posts — just the id list, not full post objects: this
// only ever needs to feed a client-side Set used to filter the feed
// (see AppContext.jsx's visiblePosts), unlike GET /saved-posts which
// renders a whole screen of saved content.
posts.get('/hidden-posts', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase.from('hidden_posts').select('post_id').eq('user_id', c.get('userId'))
  if (error) return dbError(c, error)
  return c.json(data.map((row) => row.post_id))
})

// GET /v1/users/:id/tagged-posts — posts/reels this user is tagged in,
// newest tag first. Public (post_tags is publicly readable, same as
// reactions/follows) — mirrors GET /saved-posts' shape and enrichment,
// but "saved" is private-to-you while "tagged" is a public fact about
// the post, so this takes a userId param instead of always meaning "me."
posts.get('/users/:id/tagged-posts', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data: tags, error } = await supabase
    .from('post_tags')
    .select('post_id, created_at')
    .eq('tagged_user_id', c.req.param('id'))
    .order('created_at', { ascending: false })
  if (error) return dbError(c, error)
  if (!tags.length) return c.json([])

  const { data: postRows, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .in('id', tags.map((t) => t.post_id))
  if (postsError) return c.json({ error: postsError.message }, 400)

  // Preserve tag order (most-recently-tagged first), not post creation order
  const byId = Object.fromEntries(postRows.map((p) => [p.id, p]))
  const ordered = tags.map((t) => byId[t.post_id]).filter(Boolean)
  const enriched = await enrichPosts(supabase, c.env, ordered, c.get('userId'))
  return c.json(enriched)
})

export default posts
