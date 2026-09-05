import { Hono } from 'hono'
import { adminClient } from '../lib/supabase.js'
import { requireAuth, requireRole } from '../lib/authMiddleware.js'
import { checkRateLimit, requireText } from '../lib/security.js'
import { sendPromotionalEmailBatch } from '../lib/email.js'

const admin = new Hono()

// POST /v1/admin/broadcast  { subject, html }
//
// Sends one promotional email to every user who has opted in
// (consent_preferences.marketing = true — defaults to false at signup,
// see docs/bharatspace_level1_schema.sql, so this is opt-in only, never
// opt-out). Admin-only: see lib/authMiddleware.js's requireRole for how
// that's checked, and docs/EMAIL_SETUP.md for granting yourself the
// 'admin' role in the first place (there's no UI for it yet).
admin.post('/admin/broadcast', requireAuth, requireRole('admin'), async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const { subject, html } = await c.req.json().catch(() => ({}))
  const subjectCheck = requireText(subject, { field: 'subject', max: 200 })
  if (subjectCheck.error) return c.json({ error: subjectCheck.error }, 400)
  const htmlCheck = requireText(html, { field: 'html', max: 20000 })
  if (htmlCheck.error) return c.json({ error: htmlCheck.error }, 400)

  const supabase = adminClient(c.env)

  // Opted-in user ids, then their emails — two queries rather than a
  // Postgres join through supabase-js, which keeps this readable and is
  // cheap at Level 1 scale (thousands, not millions, of rows).
  const { data: optedIn, error: consentError } = await supabase
    .from('consent_preferences')
    .select('user_id')
    .eq('marketing', true)
  if (consentError) return c.json({ error: consentError.message }, 400)
  if (!optedIn.length) return c.json({ sent: 0, failed: 0, skipped: false, message: 'No opted-in recipients' })

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('email')
    .in(
      'id',
      optedIn.map((r) => r.user_id)
    )
    .not('email', 'is', null)
  if (usersError) return c.json({ error: usersError.message }, 400)

  const recipients = users.map((u) => u.email)
  const result = await sendPromotionalEmailBatch(c.env, { recipients, subject: subjectCheck.value, html: htmlCheck.value })

  await supabase.from('audit_log').insert({
    actor_id: c.get('userId'),
    action: 'promotional_broadcast',
    entity_type: 'broadcast',
    entity_id: c.get('userId'),
    metadata: { subject: subjectCheck.value, recipientCount: recipients.length, ...result },
  })

  return c.json(result)
})

export default admin
