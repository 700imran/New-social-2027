import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth, optionalAuth } from '../lib/authMiddleware.js'
import { notify } from '../lib/notify.js'
import { checkRateLimit } from '../lib/security.js'

const follows = new Hono()

// POST /v1/follows  { followeeId }
follows.post('/follows', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const { followeeId } = await c.req.json().catch(() => ({}))
  if (!followeeId) return c.json({ error: 'followeeId is required' }, 400)
  if (followeeId === c.get('userId')) return c.json({ error: "You can't follow yourself" }, 400)

  const supabase = userClient(c.env, c.get('jwt'))

  // Block enforcement: neither direction of a block should let a new
  // follow through, so this is symmetric even though `blocks` doesn't
  // distinguish who blocked whom for this check.
  const { data: blockRows } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(
      `and(blocker_id.eq.${c.get('userId')},blocked_id.eq.${followeeId}),and(blocker_id.eq.${followeeId},blocked_id.eq.${c.get('userId')})`
    )
  if (blockRows && blockRows.length > 0) {
    return c.json({ error: 'Unable to follow this account' }, 403)
  }

  const { error } = await supabase.from('follows').insert({ follower_id: c.get('userId'), followee_id: followeeId })
  if (error) return dbError(c, error)
  await notify(c.env, { recipientId: followeeId, actorId: c.get('userId'), type: 'follow', text: 'followed you' })
  return c.json({ ok: true }, 201)
})

// DELETE /v1/follows/:followeeId
follows.delete('/follows/:followeeId', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', c.get('userId'))
    .eq('followee_id', c.req.param('followeeId'))
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

// GET /v1/users/:id/followers
follows.get('/users/:id/followers', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase.from('follows').select('follower_id, created_at').eq('followee_id', c.req.param('id'))
  if (error) return dbError(c, error)
  return c.json(data)
})

// GET /v1/users/:id/following
follows.get('/users/:id/following', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase.from('follows').select('followee_id, created_at').eq('follower_id', c.req.param('id'))
  if (error) return dbError(c, error)
  return c.json(data)
})

// POST /v1/blocks  { blockedId }
follows.post('/blocks', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const { blockedId } = await c.req.json().catch(() => ({}))
  if (!blockedId) return c.json({ error: 'blockedId is required' }, 400)
  if (blockedId === c.get('userId')) return c.json({ error: "You can't block yourself" }, 400)

  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase.from('blocks').insert({ blocker_id: c.get('userId'), blocked_id: blockedId })
  if (error) return dbError(c, error)

  // Blocking also unwinds any existing follow relationship in either
  // direction — otherwise a blocked user's posts/comments could still
  // show a "Following" state that no longer reflects reality.
  await supabase
    .from('follows')
    .delete()
    .or(
      `and(follower_id.eq.${c.get('userId')},followee_id.eq.${blockedId}),and(follower_id.eq.${blockedId},followee_id.eq.${c.get('userId')})`
    )

  await supabase.from('audit_log').insert({
    actor_id: c.get('userId'),
    action: 'block',
    entity_type: 'user',
    entity_id: blockedId,
  })
  return c.json({ ok: true }, 201)
})

// DELETE /v1/blocks/:blockedId
follows.delete('/blocks/:blockedId', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', c.get('userId'))
    .eq('blocked_id', c.req.param('blockedId'))
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

// GET /v1/blocks — just the id list, same shape as GET /hidden-posts and
// GET /mutes below. This was a real gap: toggleBlock's actual effect
// (hiding someone's posts) only ever lived in the client-side
// `blockedUserIds` Set in AppContext.jsx — with nothing rehydrating it
// from the `blocks` table on load, a page refresh silently un-hid a
// blocked user's posts even though the block itself was still there
// server-side the whole time. See migrations/010 for the matching RLS
// fix this route depends on.
follows.get('/blocks', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', c.get('userId'))
  if (error) return dbError(c, error)
  return c.json(data.map((row) => row.blocked_id))
})

// POST /v1/mutes  { mutedUserId } — mute a creator (see
// migrations/008_muted_creators.sql). Distinct from block: you keep
// following them if you did, they're never notified, and their posts
// just stop appearing in *your* feed — enforced client-side via
// AppContext's visiblePosts filter, the same pattern blockedUserIds/
// hiddenPostIds already use (see GET /hidden-posts in routes/posts.js
// for the identical shape).
follows.post('/mutes', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const { mutedUserId } = await c.req.json().catch(() => ({}))
  if (!mutedUserId) return c.json({ error: 'mutedUserId is required' }, 400)
  if (mutedUserId === c.get('userId')) return c.json({ error: "You can't mute yourself" }, 400)

  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('muted_creators')
    .upsert({ user_id: c.get('userId'), muted_user_id: mutedUserId }, { onConflict: 'user_id,muted_user_id' })
  if (error) return dbError(c, error)
  return c.json({ ok: true }, 201)
})

// DELETE /v1/mutes/:mutedUserId — unmute
follows.delete('/mutes/:mutedUserId', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('muted_creators')
    .delete()
    .eq('user_id', c.get('userId'))
    .eq('muted_user_id', c.req.param('mutedUserId'))
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

// GET /v1/mutes — just the id list, same shape as GET /blocks above.
follows.get('/mutes', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase.from('muted_creators').select('muted_user_id').eq('user_id', c.get('userId'))
  if (error) return dbError(c, error)
  return c.json(data.map((row) => row.muted_user_id))
})

export default follows
