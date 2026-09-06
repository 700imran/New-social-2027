import { createClient } from '@supabase/supabase-js'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * Verify a Supabase JWT using the asymmetric RS256 public keys (JWKS).
 * This replaces the legacy HS256 symmetric secret verification.
 */
export async function verifyUser(jwt, env) {
  if (!jwt) throw new Error('Missing JWT')

  const JWKS = createRemoteJWKSet(
    new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
  )

  const { payload } = await jwtVerify(jwt, JWKS, {
    algorithms: ['RS256'],
    audience: 'authenticated',
  })

  return payload
}

/**
 * Extract & verify the JWT from the Authorization header.
 */
export async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }
  const jwt = authHeader.slice(7)
  return verifyUser(jwt, env)
}

/**
 * Returns a Supabase client scoped to the *calling user's* JWT.
 */
export function userClient(env, jwt) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Service-role client that bypasses RLS entirely.
 */
export function adminClient(env) {
  if (!env.SUPABASE_URL) console.error('DEBUG: SUPABASE_URL is missing/undefined')
  if (!env.SUPABASE_SERVICE_ROLE_KEY) console.error('DEBUG: SUPABASE_SERVICE_ROLE_KEY is missing/undefined')
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
