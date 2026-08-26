import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { requireAuth, optionalAuth } from '../lib/authMiddleware.js'

const users = new Hono()

// GET /v1/users/:id
users.get('/users/:id', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase.from('users').select('id, created_at').eq('id', c.req.param('id')).single()
  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

// GET /v1/profiles/:id — public read, RLS policy "profiles are publicly readable"
users.get('/profiles/:id', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', c.req.param('id')).single()
  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

// PATCH /v1/profiles/:id — RLS policy restricts this to auth.uid() = user_id,
// so this also 403s at the database level if userId !== :id.
users.patch('/profiles/:id', requireAuth, async (c) => {
  if (c.get('userId') !== c.req.param('id')) {
    return c.json({ error: 'Cannot edit another user\'s profile' }, 403)
  }
  const updates = await c.req.json()
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', c.req.param('id'))
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

export default users
