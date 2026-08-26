import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { requireAuth, optionalAuth } from '../lib/authMiddleware.js'

const posts = new Hono()

// GET /v1/posts?topic=Tech&limit=20 — public feed read (RLS: publicly readable)
posts.get('/posts', optionalAuth, async (c) => {
  const topic = c.req.query('topic')
  const limit = Number(c.req.query('limit') || 30)
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  let query = supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(limit)
  if (topic) query = query.eq('topic', topic)
  const { data, error } = await query
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// POST /v1/posts  { body, mediaAssetId?, topic? }
posts.post('/posts', requireAuth, async (c) => {
  const { body, mediaAssetId, topic } = await c.req.json()
  if (!body?.trim() && !mediaAssetId) return c.json({ error: 'body or mediaAssetId is required' }, 400)
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: c.get('userId'), body, media_asset_id: mediaAssetId, topic })
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

// POST /v1/posts/:id/comments  { body }
posts.post('/posts/:id/comments', requireAuth, async (c) => {
  const { body } = await c.req.json()
  if (!body?.trim()) return c.json({ error: 'body is required' }, 400)
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: c.req.param('id'), author_id: c.get('userId'), body })
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

// GET /v1/posts/:id/comments
posts.get('/posts/:id/comments', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', c.req.param('id'))
    .order('created_at', { ascending: true })
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// POST /v1/posts/:id/react  { type: 'like' } — upsert, one reaction per user per post
posts.post('/posts/:id/react', requireAuth, async (c) => {
  const { type = 'like' } = await c.req.json().catch(() => ({}))
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('reactions')
    .upsert({ post_id: c.req.param('id'), user_id: c.get('userId'), type }, { onConflict: 'post_id,user_id' })
  if (error) return c.json({ error: error.message }, 400)
  return c.json({ ok: true })
})

// DELETE /v1/posts/:id/react — un-like
posts.delete('/posts/:id/react', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase.from('reactions').delete().eq('post_id', c.req.param('id')).eq('user_id', c.get('userId'))
  if (error) return c.json({ error: error.message }, 400)
  return c.json({ ok: true })
})

export default posts
