import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth, optionalAuth } from '../lib/authMiddleware.js'
import { requireText, LIMITS } from '../lib/security.js'

const live = new Hono()

// GET /v1/live/active — feeds the "Go Live" rail on Home.jsx. Public
// (optionalAuth): whether someone is live is meant to be visible to a
// logged-out visitor too, same as the rest of the rail.
live.get('/live/active', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data: streams, error } = await supabase
    .from('live_streams')
    .select('id, host_id, title, started_at')
    .eq('status', 'live')
    .order('started_at', { ascending: false })
    .limit(20)
  if (error) return dbError(c, error, 'Could not load live streams', 500)
  if (!streams?.length) return c.json({ streams: [] })

  const hostIds = [...new Set(streams.map((s) => s.host_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_asset_id')
    .in('user_id', hostIds)
  const profileById = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]))

  const avatarIds = (profiles || []).map((p) => p.avatar_asset_id).filter(Boolean)
  const { data: media } = avatarIds.length
    ? await supabase.from('media_assets').select('id, storage_key').in('id', avatarIds)
    : { data: [] }
  const mediaById = Object.fromEntries((media || []).map((m) => [m.id, m]))

  return c.json({
    streams: streams.map((s) => {
      const profile = profileById[s.host_id]
      const storageKey = profile?.avatar_asset_id ? mediaById[profile.avatar_asset_id]?.storage_key : null
      return {
        id: s.id,
        hostId: s.host_id,
        hostName: profile?.display_name || 'BharatSpace user',
        hostAvatarUrl: storageKey ? `${c.env.R2_PUBLIC_BASE_URL}/${storageKey}` : null,
        title: s.title,
        startedAt: s.started_at,
      }
    }),
  })
})

// POST /v1/live/start — ends any of the caller's own still-'live' rows
// first (a crashed tab/app that never called .../end shouldn't let one
// account show up twice in the rail), then opens the new one.
live.post('/live/start', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const v = requireText(body.title, { field: 'title', max: LIMITS.liveTitle })
  if (v.error) return c.json({ error: v.error }, 400)

  const userId = c.get('userId')
  const supabase = userClient(c.env, c.get('jwt'))

  await supabase
    .from('live_streams')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('host_id', userId)
    .eq('status', 'live')

  const { data, error } = await supabase
    .from('live_streams')
    .insert({ host_id: userId, title: v.value })
    .select('id, title, started_at')
    .single()
  if (error) return dbError(c, error, 'Could not start your stream', 500)

  return c.json({ id: data.id, title: data.title, startedAt: data.started_at })
})

// PATCH /v1/live/:id/end — RLS (015_live_streams.sql) already restricts
// this to the row's own host_id, so a mismatched id 404s at the DB layer
// (no matching row to update) rather than needing a manual ownership
// check here first.
live.patch('/live/:id/end', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('live_streams')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', c.req.param('id'))
    .eq('host_id', c.get('userId'))
    .select('id')
    .single()
  if (error || !data) return c.json({ error: 'Stream not found' }, 404)
  return c.json({ ok: true })
})

export default live
