import { Hono } from 'hono'
import { adminClient, userClient } from '../lib/supabase.js'
import { requireAuth, getAccountType } from '../lib/authMiddleware.js'
import { deleteR2Object } from '../lib/r2.js'

const account = new Hono()

const ACCOUNT_TYPES = ['user', 'creator', 'brand', 'community']

// GET/PATCH /v1/account/type — the account-type switch in Settings ->
// Money & Business -> Account type. Reuses the roles/user_roles seam
// (docs/bharatspace_level1_schema.sql, docs/migrations/014_community_role.sql)
// rather than a new column: switching type = the caller's non-admin
// role row is swapped for the new one. 'admin' is never touched here —
// it's a separately granted permission (see requireRole), not a type.
account.get('/account/type', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const accountType = await getAccountType(supabase, c.get('userId'))
  return c.json({ accountType })
})

account.patch('/account/type', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!ACCOUNT_TYPES.includes(body.accountType)) {
    return c.json({ error: `accountType must be one of: ${ACCOUNT_TYPES.join(', ')}` }, 400)
  }
  const userId = c.get('userId')
  // Needs adminClient, not the caller's own RLS-scoped client:
  // 014_community_role.sql only grants anon/authenticated SELECT on
  // user_roles, deliberately — no insert/update/delete grant exists for
  // them at all, so a crafted request can't use this same table to grant
  // itself 'admin'. service_role (adminClient) is the only thing that
  // can write here.
  const supabase = adminClient(c.env)

  const { data: role, error: roleErr } = await supabase.from('roles').select('id').eq('name', body.accountType).single()
  if (roleErr || !role) return c.json({ error: 'Server misconfiguration: role not found' }, 500)

  const { data: nonAdminRoles } = await supabase.from('roles').select('id').neq('name', 'admin')
  const nonAdminIds = (nonAdminRoles || []).map((r) => r.id)
  const { error: deleteErr } = await supabase.from('user_roles').delete().eq('user_id', userId).in('role_id', nonAdminIds)
  if (deleteErr) return c.json({ error: 'Could not update account type — please try again.' }, 500)

  const { error: insertErr } = await supabase.from('user_roles').insert({ user_id: userId, role_id: role.id })
  if (insertErr) return c.json({ error: 'Could not update account type — please try again.' }, 500)

  return c.json({ accountType: body.accountType })
})

// POST /v1/account/sessions — logs "a session started" for Settings ->
// Account protection / App & device's login-activity list. Called from
// the frontend right after sign-in succeeds (see docs/migrations/020's
// comment on why this isn't in auth.js's login handler instead).
account.post('/account/sessions', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase
    .from('login_events')
    .insert({ user_id: c.get('userId'), user_agent: c.req.header('User-Agent') || null })
  if (error) return c.json({ error: 'Could not log this session' }, 500)
  return c.json({ ok: true }, 201)
})

// GET /v1/account/sessions — most recent first, capped at 20.
account.get('/account/sessions', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('login_events')
    .select('id, user_agent, created_at')
    .eq('user_id', c.get('userId'))
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return c.json({ error: 'Could not load your login activity' }, 500)
  return c.json({ sessions: data || [] })
})

// DELETE /v1/account
//
// Permanently deletes the caller's account and everything referencing it.
// Required by Google Play's "Account and data deletion" policy for any
// app that supports account creation — see ../../docs/PLAY_STORE_CHECKLIST.md.
// There's no soft-delete/deactivation option: this is the one path, and
// it's irreversible by design. A "delete" that quietly keeps the data
// around doesn't satisfy the policy, or a real deletion request.
account.delete('/account', requireAuth, async (c) => {
  const userId = c.get('userId')
  const supabase = adminClient(c.env)

  // Media lives in R2, not Postgres — the media_assets *rows* cascade away
  // with the user (below), but the actual objects wouldn't without this
  // explicit step, leaving orphaned files (and slowly-accumulating R2
  // storage cost) behind.
  const { data: assets } = await supabase.from('media_assets').select('storage_key').eq('owner_id', userId)
  await Promise.all((assets || []).map((a) => deleteR2Object(c.env, a.storage_key)))

  // Deleting the `public.users` row cascades to every table with
  // `references users(id) on delete cascade` — profiles, posts, comments,
  // reactions, follows (either direction), blocks (either direction),
  // notifications, media_assets, consent_preferences, user_roles, and
  // reports (docs/bharatspace_level1_schema.sql,
  // docs/migrations/002_reports.sql). One delete, not eleven.
  const { error: dbError } = await supabase.from('users').delete().eq('id', userId)
  if (dbError) {
    console.error('Account deletion failed at the database step', dbError)
    return c.json({ error: 'Could not delete your account — please try again or contact support.' }, 500)
  }

  // The Auth identity is separate from the app's own `users` table (see
  // the schema's own note on this) — remove it last, once the app data is
  // confirmed gone.
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  if (authError) {
    // Not fatal to the caller — their data is already gone either way.
    // Logged for manual cleanup of the now-orphaned auth identity.
    console.error('Deleted account data but failed to delete the auth identity', authError)
  }

  return c.json({ ok: true })
})

export default account
