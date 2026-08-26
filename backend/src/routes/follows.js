import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { requireAuth, optionalAuth } from '../lib/authMiddleware.js'

const follows = new Hono()

// POST /v1/follows  { followeeId }
follows.post('/follows', requireAuth, async (c) => {
  const { followeeId } = await c.req.json()
  if (!followeeId) return c.json({ error: 'followeeId is required' }, 400)
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase.from('follows').insert({ follower_id: c.get('userId'), followee_id: followeeId })
  if (error) return c.json({ error: error.message }, 400)
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
  if (error) return c.json({ error: error.message }, 400)
  return c.json({ ok: true })
})

// GET /v1/users/:id/followers
follows.get('/users/:id/followers', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase.from('follows').select('follower_id, created_at').eq('followee_id', c.req.param('id'))
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// GET /v1/users/:id/following
follows.get('/users/:id/following', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase.from('follows').select('followee_id, created_at').eq('follower_id', c.req.param('id'))
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// POST /v1/blocks  { blockedId }
follows.post('/blocks', requireAuth, async (c) => {
  const { blockedId } = await c.req.json()
  if (!blockedId) return c.json({ error: 'blockedId is required' }, 400)
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase.from('blocks').insert({ blocker_id: c.get('userId'), blocked_id: blockedId })
  if (error) return c.json({ error: error.message }, 400)
  await supabase.from('audit_log').insert({
    actor_id: c.get('userId'),
    action: 'block',
    entity_type: 'user',
    entity_id: blockedId,
  })
  return c.json({ ok: true }, 201)
})

export default follows
