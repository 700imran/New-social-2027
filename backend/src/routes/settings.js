import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth } from '../lib/authMiddleware.js'
import { checkRateLimit, LIMITS } from '../lib/security.js'

const settings = new Hono()

// Mirrors the column defaults in docs/migrations/011_user_settings.sql —
// duplicated here (rather than fetched) so GET /settings can hand a
// caller who has never saved anything a complete, correctly-shaped
// object on their very first request, before any row exists for them.
const DEFAULTS = {
  notifications: {
    likes: { push: true, email: false, inApp: true },
    comments: { push: true, email: false, inApp: true },
    follows: { push: true, email: false, inApp: true },
    mentions: { push: true, email: true, inApp: true },
    messages: { push: true, email: false, inApp: true },
  },
  privacy: {
    isPrivate: false,
    whoCanMessage: 'everyone',
    whoCanComment: 'everyone',
    sensitiveContentFilter: 'standard',
  },
  appearance: { theme: 'system', language: 'en', textSize: 'medium' },
  focus: { enabled: false, quietHoursStart: null, quietHoursEnd: null },
  muted_words: [],
}

const NOTIFICATION_CATEGORIES = ['likes', 'comments', 'follows', 'mentions', 'messages']
const NOTIFICATION_CHANNELS = ['push', 'email', 'inApp']
const WHO_CAN = ['everyone', 'followers', 'nobody']
const SENSITIVE_FILTER = ['more', 'standard', 'less']
const THEMES = ['light', 'dark', 'system']
const TEXT_SIZES = ['small', 'medium', 'large']
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/ // "HH:MM", 24-hour

function shape(row) {
  // Shallow-merge per top-level key so a row saved before some later
  // field existed (or with only one category customized) still comes
  // back with every key the frontend expects, same reasoning as
  // AppContext.jsx's mapApiPost normalizing older/partial API rows.
  return {
    notifications: { ...DEFAULTS.notifications, ...(row?.notifications || {}) },
    privacy: { ...DEFAULTS.privacy, ...(row?.privacy || {}) },
    appearance: { ...DEFAULTS.appearance, ...(row?.appearance || {}) },
    focus: { ...DEFAULTS.focus, ...(row?.focus || {}) },
    muted_words: Array.isArray(row?.muted_words) ? row.muted_words : [],
  }
}

// GET /v1/settings
settings.get('/settings', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', c.get('userId'))
    .maybeSingle()
  if (error) return dbError(c, error, 'Could not load settings')
  return c.json(shape(data))
})

// PATCH /v1/settings — partial update, deep-merged per category server
// side (see mergeCategory below) so a caller flipping one notification
// toggle can send just that one field, not the whole nested object.
//
// Every value is allow-listed against the enums above rather than
// forwarded as-is: RLS already stops you touching another user's row,
// but nothing stops a crafted request writing junk into a column the UI
// never offers (an unrecognized theme, a whoCanMessage value nothing
// else in the app knows how to interpret).
settings.patch('/settings', requireAuth, async (c) => {
  const userId = c.get('userId')
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', userId)
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const body = await c.req.json().catch(() => ({}))
  const supabase = userClient(c.env, c.get('jwt'))

  const { data: existingRow, error: fetchError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchError) return dbError(c, fetchError, 'Could not load settings')
  const current = shape(existingRow)

  const next = { ...current }

  if (body.notifications !== undefined) {
    if (typeof body.notifications !== 'object' || body.notifications === null) {
      return c.json({ error: 'notifications must be an object' }, 400)
    }
    const merged = { ...current.notifications }
    for (const [category, channels] of Object.entries(body.notifications)) {
      if (!NOTIFICATION_CATEGORIES.includes(category)) {
        return c.json({ error: `Unknown notification category: ${category}` }, 400)
      }
      if (typeof channels !== 'object' || channels === null) {
        return c.json({ error: `notifications.${category} must be an object` }, 400)
      }
      const mergedChannels = { ...merged[category] }
      for (const [channel, value] of Object.entries(channels)) {
        if (!NOTIFICATION_CHANNELS.includes(channel)) {
          return c.json({ error: `Unknown notification channel: ${channel}` }, 400)
        }
        if (typeof value !== 'boolean') {
          return c.json({ error: `notifications.${category}.${channel} must be true or false` }, 400)
        }
        mergedChannels[channel] = value
      }
      merged[category] = mergedChannels
    }
    next.notifications = merged
  }

  if (body.privacy !== undefined) {
    if (typeof body.privacy !== 'object' || body.privacy === null) {
      return c.json({ error: 'privacy must be an object' }, 400)
    }
    const p = { ...current.privacy }
    if (body.privacy.isPrivate !== undefined) {
      if (typeof body.privacy.isPrivate !== 'boolean') return c.json({ error: 'privacy.isPrivate must be true or false' }, 400)
      p.isPrivate = body.privacy.isPrivate
    }
    if (body.privacy.whoCanMessage !== undefined) {
      if (!WHO_CAN.includes(body.privacy.whoCanMessage)) return c.json({ error: `privacy.whoCanMessage must be one of ${WHO_CAN.join(', ')}` }, 400)
      p.whoCanMessage = body.privacy.whoCanMessage
    }
    if (body.privacy.whoCanComment !== undefined) {
      if (!WHO_CAN.includes(body.privacy.whoCanComment)) return c.json({ error: `privacy.whoCanComment must be one of ${WHO_CAN.join(', ')}` }, 400)
      p.whoCanComment = body.privacy.whoCanComment
    }
    if (body.privacy.sensitiveContentFilter !== undefined) {
      if (!SENSITIVE_FILTER.includes(body.privacy.sensitiveContentFilter)) {
        return c.json({ error: `privacy.sensitiveContentFilter must be one of ${SENSITIVE_FILTER.join(', ')}` }, 400)
      }
      p.sensitiveContentFilter = body.privacy.sensitiveContentFilter
    }
    next.privacy = p
  }

  if (body.appearance !== undefined) {
    if (typeof body.appearance !== 'object' || body.appearance === null) {
      return c.json({ error: 'appearance must be an object' }, 400)
    }
    const a = { ...current.appearance }
    if (body.appearance.theme !== undefined) {
      if (!THEMES.includes(body.appearance.theme)) return c.json({ error: `appearance.theme must be one of ${THEMES.join(', ')}` }, 400)
      a.theme = body.appearance.theme
    }
    if (body.appearance.language !== undefined) {
      if (typeof body.appearance.language !== 'string' || !/^[a-z]{2}(-[A-Z]{2})?$/.test(body.appearance.language)) {
        return c.json({ error: 'appearance.language must be a language code like "en" or "hi"' }, 400)
      }
      a.language = body.appearance.language
    }
    if (body.appearance.textSize !== undefined) {
      if (!TEXT_SIZES.includes(body.appearance.textSize)) return c.json({ error: `appearance.textSize must be one of ${TEXT_SIZES.join(', ')}` }, 400)
      a.textSize = body.appearance.textSize
    }
    next.appearance = a
  }

  if (body.focus !== undefined) {
    if (typeof body.focus !== 'object' || body.focus === null) {
      return c.json({ error: 'focus must be an object' }, 400)
    }
    const f = { ...current.focus }
    if (body.focus.enabled !== undefined) {
      if (typeof body.focus.enabled !== 'boolean') return c.json({ error: 'focus.enabled must be true or false' }, 400)
      f.enabled = body.focus.enabled
    }
    for (const key of ['quietHoursStart', 'quietHoursEnd']) {
      if (body.focus[key] !== undefined) {
        if (body.focus[key] !== null && !TIME_RE.test(body.focus[key])) {
          return c.json({ error: `focus.${key} must be "HH:MM" or null` }, 400)
        }
        f[key] = body.focus[key]
      }
    }
    next.focus = f
  }

  if (body.muted_words !== undefined) {
    if (!Array.isArray(body.muted_words)) return c.json({ error: 'muted_words must be a list' }, 400)
    if (body.muted_words.length > LIMITS.mutedWordsMax) {
      return c.json({ error: `You can mute at most ${LIMITS.mutedWordsMax} words` }, 400)
    }
    const cleaned = []
    for (const w of body.muted_words) {
      if (typeof w !== 'string' || !w.trim()) return c.json({ error: 'Each muted word must be non-empty text' }, 400)
      if (w.trim().length > LIMITS.mutedWord) return c.json({ error: `Muted words must be ${LIMITS.mutedWord} characters or fewer` }, 400)
      cleaned.push(w.trim().toLowerCase())
    }
    next.muted_words = [...new Set(cleaned)]
  }

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) return dbError(c, error, 'Could not save settings')
  return c.json(shape(data))
})

export default settings
