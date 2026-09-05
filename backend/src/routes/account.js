import { Hono } from 'hono'
import { adminClient } from '../lib/supabase.js'
import { requireAuth } from '../lib/authMiddleware.js'
import { deleteR2Object } from '../lib/r2.js'

const account = new Hono()

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
