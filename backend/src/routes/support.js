import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth } from '../lib/authMiddleware.js'
import { checkRateLimit, requireText } from '../lib/security.js'

const support = new Hono()

// GET /v1/support/tickets — Settings -> Tools & Support -> Help &
// support. RLS (016_support_tickets.sql) already restricts this to the
// caller's own tickets.
support.get('/support/tickets', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, body, status, created_at')
    .order('created_at', { ascending: false })
  if (error) return dbError(c, error, 'Could not load your support tickets', 500)
  return c.json({ tickets: data || [] })
})

// POST /v1/support/tickets  { subject, body }
//
// Same shape as POST /v1/reports: no admin UI reviews these yet —
// Supabase's own Table Editor is how a ticket gets read and resolved
// today (see docs/migrations/016_support_tickets.sql's comment).
support.post('/support/tickets', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const body = await c.req.json().catch(() => ({}))
  const subject = requireText(body.subject, { field: 'subject', max: 120 })
  if (subject.error) return c.json({ error: subject.error }, 400)
  const message = requireText(body.body, { field: 'message', max: 2000 })
  if (message.error) return c.json({ error: message.error }, 400)

  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ user_id: c.get('userId'), subject: subject.value, body: message.value })
    .select('id, subject, body, status, created_at')
    .single()
  if (error) return dbError(c, error, 'Could not submit your request', 500)

  return c.json(data, 201)
})

export default support
