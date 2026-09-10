import { createRemoteJWKSet, jwtVerify } from 'jose'
import { adminClient } from './supabase.js'

function getJWKS(env) {
  return createRemoteJWKSet(
    new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
  )
}

export async function requireAuth(c, next) {
  const header = c.req.header('Authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!jwt) return c.json({ error: 'Missing Authorization: Bearer <token>' }, 401)

  try {
    const JWKS = getJWKS(c.env)
    const { payload } = await jwtVerify(jwt, JWKS, {
      algorithms: ['RS256'],
      audience: 'authenticated',
    })
    c.set('userId', payload.sub)
    c.set('jwt', jwt)
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  await next()
}

export async function optionalAuth(c, next) {
  const header = c.req.header('Authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  if (jwt) {
    try {
      const JWKS = getJWKS(c.env)
      const { payload } = await jwtVerify(jwt, JWKS, {
        algorithms: ['RS256'],
        audience: 'authenticated',
      })
      c.set('userId', payload.sub)
      c.set('jwt', jwt)
    } catch {
      /* treat as anonymous */
    }
  }
  await next()
}

// The four selectable account types (Personal/Creator/Brand/Community)
// are rows in the existing roles/user_roles seam — see
// docs/migrations/014_community_role.sql for why this reuses it instead
// of adding a column. 'admin' is deliberately excluded: it's an
// elevated permission granted separately (see requireRole above), not
// something an account switches into via routes/account.js's
// PATCH /account/type.
const ACCOUNT_TYPE_ROLES = ['user', 'creator', 'brand', 'community']

export async function getAccountType(supabase, userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)
  if (error || !data) return 'user'
  const names = data.map((r) => r.roles?.name).filter(Boolean)
  return names.find((n) => ACCOUNT_TYPE_ROLES.includes(n)) || 'user'
}

export function requireRole(roleName) {
  return async (c, next) => {
    const userId = c.get('userId')
    if (!userId) return c.json({ error: 'Missing Authorization: Bearer <token>' }, 401)

    const supabase = adminClient(c.env)
    const { data: role, error: roleLookupError } = await supabase.from('roles').select('id').eq('name', roleName).single()
    if (roleLookupError || !role) {
      console.error(`[authMiddleware] role "${roleName}" not found in roles table`, roleLookupError)
      return c.json({ error: 'Server misconfiguration' }, 500)
    }

    const { data: grant } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', userId)
      .eq('role_id', role.id)
      .maybeSingle()

    if (!grant) return c.json({ error: 'Forbidden' }, 403)
    await next()
  }
}

