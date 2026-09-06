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

