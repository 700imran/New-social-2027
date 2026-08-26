import { jwtVerify } from 'jose'

/**
 * "Every Worker route verifies the Supabase JWT before touching the DB —
 *  a ~10-line check" — Application_Level_1_Execution_Guideline.md, Model 1.
 *
 * Reads the Bearer token, verifies its signature against the project's
 * JWT secret, and attaches { userId, jwt } to the request context so
 * downstream routes can build an RLS-scoped Supabase client with it.
 *
 * This checks the token is genuine and unexpired. It is a defense-in-depth
 * layer, not the primary guarantee — the RLS policies in the .sql file are
 * the real backstop even if a route forgets to call this.
 */
export async function requireAuth(c, next) {
  const header = c.req.header('Authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!jwt) return c.json({ error: 'Missing Authorization: Bearer <token>' }, 401)

  try {
    const secret = new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET)
    const { payload } = await jwtVerify(jwt, secret)
    c.set('userId', payload.sub)
    c.set('jwt', jwt)
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  await next()
}

/** Same check, but a missing/invalid token doesn't fail the request — used
 *  for endpoints (like public profile reads) that behave the same either
 *  way but personalize output when a caller happens to be signed in. */
export async function optionalAuth(c, next) {
  const header = c.req.header('Authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  if (jwt) {
    try {
      const secret = new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET)
      const { payload } = await jwtVerify(jwt, secret)
      c.set('userId', payload.sub)
      c.set('jwt', jwt)
    } catch {
      /* treat as anonymous */
    }
  }
  await next()
}
