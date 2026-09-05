import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth } from '../lib/authMiddleware.js'

const consent = new Hono()

// GET /v1/consent
consent.get('/consent', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase.from('consent_preferences').select('*').eq('user_id', c.get('userId')).single()
  if (error) return dbError(c, error, 'Not found', 404)
  return c.json(data)
})

// PATCH /v1/consent  { dataProcessing?, marketing? }
consent.patch('/consent', requireAuth, async (c) => {
  const { dataProcessing, marketing } = await c.req.json()
  const supabase = userClient(c.env, c.get('jwt'))
  const updates = { updated_at: new Date().toISOString() }
  if (dataProcessing !== undefined) updates.data_processing = dataProcessing
  if (marketing !== undefined) updates.marketing = marketing

  const { data, error } = await supabase
    .from('consent_preferences')
    .update(updates)
    .eq('user_id', c.get('userId'))
    .select()
    .single()
  if (error) return dbError(c, error)

  await supabase.from('audit_log').insert({
    actor_id: c.get('userId'),
    action: 'consent_update',
    entity_type: 'consent_preferences',
    entity_id: c.get('userId'),
    metadata: updates,
  })

  return c.json(data)
})

export default consent
