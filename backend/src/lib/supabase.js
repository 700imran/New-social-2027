import { createClient } from '@supabase/supabase-js'

/**
 * Returns a Supabase client scoped to the *calling user's* JWT.
 *
 * This is the whole point of the RLS design in the guideline: every query
 * this client makes runs as that user in Postgres's eyes, so `auth.uid()`
 * inside the RLS policies resolves correctly and the database — not just
 * this route's logic — is what actually blocks cross-user access.
 */
export function userClient(env, jwt) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Service-role client that bypasses RLS entirely. Use only for the few
 * operations that must run with elevated privilege (e.g. reading another
 * user's public profile fields the anon/user key wouldn't otherwise see,
 * or admin-curated actions like Model 2's manual creator shortlist).
 * Never expose this key to the frontend.
 */
export function adminClient(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
