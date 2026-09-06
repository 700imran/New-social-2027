import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth } from '../lib/authMiddleware.js'

const notifications = new Hono()

// GET /v1/notifications — RLS restricts this to the caller's own rows
notifications.get('/notifications', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', c.get('userId'))
    .order('created_at', { ascending: false })
  if (error) return dbError(c, error)
  return c.json(data)
})

// PATCH /v1/notifications/:id/read
notifications.patch('/notifications/:id/read', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', c.req.param('id'))
    .eq('recipient_id', c.get('userId'))
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

export default notifications
