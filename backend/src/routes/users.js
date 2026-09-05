import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth, optionalAuth } from '../lib/authMiddleware.js'
import { requireText, LIMITS } from '../lib/security.js'

const users = new Hono()

// GET /v1/users/:id
users.get('/users/:id', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data, error } = await supabase.from('users').select('id, created_at').eq('id', c.req.param('id')).single()
  if (error) return dbError(c, error, 'Not found', 404)
  return c.json(data)
})

// GET /v1/profiles/:id — public read, RLS policy "profiles are publicly readable".
// Enriched with the same shape the frontend needs to render a profile
// screen in one call: resolved avatar URL, joined date, and follower/
// following/post counts — none of which live directly on the `profiles`
// row itself (see docs/bharatspace_level1_schema.sql).
users.get('/profiles/:id', optionalAuth, async (c) => {
  const userId = c.req.param('id')
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single()
  if (error) return dbError(c, error, 'Not found', 404)

  const [userRes, avatarRes, followersRes, followingRes, postsRes] = await Promise.all([
    supabase.from('users').select('created_at').eq('id', userId).single(),
    profile.avatar_asset_id
      ? supabase.from('media_assets').select('storage_key').eq('id', profile.avatar_asset_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', userId),
    supabase.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', userId),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId),
  ])

  return c.json({
    ...profile,
    avatarUrl: avatarRes.data ? `${c.env.R2_PUBLIC_BASE_URL}/${avatarRes.data.storage_key}` : null,
    joinedAt: userRes.data?.created_at || null,
    followerCount: followersRes.count || 0,
    followingCount: followingRes.count || 0,
    postCount: postsRes.count || 0,
  })
})

// PATCH /v1/profiles/:id — RLS policy restricts this to auth.uid() = user_id,
// so this also 403s at the database level if userId !== :id.
users.patch('/profiles/:id', requireAuth, async (c) => {
  if (c.get('userId') !== c.req.param('id')) {
    return c.json({ error: 'Cannot edit another user\'s profile' }, 403)
  }
  const body = await c.req.json().catch(() => ({}))
  const supabase = userClient(c.env, c.get('jwt'))

  // Allowlist + validate rather than forwarding the raw body straight to
  // Postgres: RLS already stops you editing someone *else's* profile, but
  // nothing stops a crafted request from writing arbitrary columns
  // (avatar_asset_id pointing at media you don't own, junk in a column
  // the UI never exposes) onto your *own* row without this.
  const updates = {}
  if (body.display_name !== undefined) {
    const v = requireText(body.display_name, { field: 'display_name', max: LIMITS.displayName })
    if (v.error) return c.json({ error: v.error }, 400)
    updates.display_name = v.value
  }
  if (body.bio !== undefined) {
    const v = requireText(body.bio, { field: 'bio', max: LIMITS.bio, required: false })
    if (v.error) return c.json({ error: v.error }, 400)
    updates.bio = v.value
  }
  if (body.location !== undefined) {
    const v = requireText(body.location, { field: 'location', max: LIMITS.location, required: false })
    if (v.error) return c.json({ error: v.error }, 400)
    updates.location = v.value
  }
  if (body.interests !== undefined) {
    if (!Array.isArray(body.interests) || body.interests.length > LIMITS.interestsMax) {
      return c.json({ error: `interests must be a list of at most ${LIMITS.interestsMax} topics` }, 400)
    }
    if (!body.interests.every((t) => typeof t === 'string' && t.length <= LIMITS.topic)) {
      return c.json({ error: 'Each interest must be a short piece of text' }, 400)
    }
    updates.interests = body.interests
  }
  if (body.avatar_asset_id !== undefined) {
    // Ownership check: you can only set your avatar to media *you*
    // uploaded — RLS on media_assets already enforces this at the DB
    // layer too, but failing here with a clear message is friendlier
    // than a generic RLS-denied error bubbling up.
    const { data: asset, error: assetErr } = await supabase
      .from('media_assets')
      .select('owner_id')
      .eq('id', body.avatar_asset_id)
      .single()
    if (assetErr || !asset || asset.owner_id !== c.get('userId')) {
      return c.json({ error: 'That media asset does not belong to you' }, 403)
    }
    updates.avatar_asset_id = body.avatar_asset_id
  }

  if (Object.keys(updates).length === 0) return c.json({ error: 'No valid fields to update' }, 400)

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', c.req.param('id'))
    .select()
    .single()
  if (error) return dbError(c, error)

  // Resolve avatarUrl the same way GET /profiles/:id does, so a caller
  // that just changed their photo (Edit Profile) can show it immediately
  // without a second round-trip — see src/context/AppContext.jsx's
  // updateProfile().
  let avatarUrl = null
  if (data.avatar_asset_id) {
    const { data: asset } = await supabase
      .from('media_assets')
      .select('storage_key')
      .eq('id', data.avatar_asset_id)
      .single()
    if (asset) avatarUrl = `${c.env.R2_PUBLIC_BASE_URL}/${asset.storage_key}`
  }

  return c.json({ ...data, avatarUrl })
})

export default users
