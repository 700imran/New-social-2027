import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth } from '../lib/authMiddleware.js'
import { checkRateLimit, requireText } from '../lib/security.js'

const reports = new Hono()

const TARGET_TYPES = new Set(['post', 'comment', 'user'])
const REASONS = new Set(['spam', 'harassment', 'hate_speech', 'nudity', 'violence', 'illegal', 'other'])

// POST /v1/reports  { targetType, targetId, reason, details? }
//
// Requires docs/migrations/002_reports.sql to have been run — see
// ../../docs/PLAY_STORE_CHECKLIST.md for why this endpoint exists (Google
// Play's User Generated Content policy) and how to actually review
// incoming reports today (Supabase's Table Editor; no admin UI yet).
reports.post('/reports', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const { targetType, targetId, reason, details } = await c.req.json().catch(() => ({}))
  if (!TARGET_TYPES.has(targetType)) return c.json({ error: 'targetType must be post, comment, or user' }, 400)
  if (!targetId) return c.json({ error: 'targetId is required' }, 400)
  if (!REASONS.has(reason)) return c.json({ error: 'Unrecognized reason' }, 400)

  const detailsCheck = requireText(details, { field: 'details', max: 500, required: false })
  if (detailsCheck.error) return c.json({ error: detailsCheck.error }, 400)

  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase.from('reports').insert({
    reporter_id: c.get('userId'),
    target_type: targetType,
    target_id: targetId,
    reason,
    details: detailsCheck.value || null,
  })
  if (error) return dbError(c, error)

  return c.json({ ok: true }, 201)
})

export default reports
