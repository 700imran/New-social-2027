import { Hono } from 'hono'
import { adminClient } from '../lib/supabase.js'
import { requireAuth } from '../lib/authMiddleware.js'

const auth = new Hono()

// POST /v1/auth/signup  { email? , phone?, password, displayName }
// Supabase Auth owns password hashing + verification email/OTP dispatch —
// per the guideline, we never touch a password ourselves.
auth.post('/signup', async (c) => {
  const { email, phone, password, displayName } = await c.req.json()
  if (!password || (!email && !phone)) {
    return c.json({ error: 'email or phone, and password, are required' }, 400)
  }

  const supabase = adminClient(c.env)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: false, // Supabase sends its own confirmation flow
  })
  if (error) return c.json({ error: error.message }, 400)

  // Mirror the identity into our own `users` + `profiles` rows (Model 1).
  // auth.users (Supabase-managed) and public.users (app-managed) share
  // the same id by convention so the rest of the schema can FK to either.
  const userId = data.user.id
  await supabase.from('users').insert({ id: userId, email, phone })
  await supabase.from('profiles').insert({ user_id: userId, display_name: displayName || 'New user' })
  await supabase.from('consent_preferences').insert({ user_id: userId })
  await supabase.from('user_roles').insert({ user_id: userId, role_id: 1 }) // 'user'
  await supabase.from('audit_log').insert({
    actor_id: userId,
    action: 'signup',
    entity_type: 'user',
    entity_id: userId,
  })

  return c.json({ userId }, 201)
})

// POST /v1/auth/login  { email? , phone?, password }
auth.post('/login', async (c) => {
  const { email, phone, password } = await c.req.json()
  const supabase = adminClient(c.env)
  const { data, error } = await supabase.auth.signInWithPassword({ email, phone, password })
  if (error) return c.json({ error: error.message }, 401)
  return c.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    userId: data.user.id,
  })
})

// POST /v1/auth/logout
auth.post('/logout', requireAuth, async (c) => {
  // Stateless JWTs: "logout" is a client-side token discard. If you need
  // server-side revocation, call supabase.auth.admin.signOut(jwt) here.
  return c.json({ ok: true })
})

// POST /v1/auth/mfa/enroll — TOTP enrollment, offered to creator/brand roles
auth.post('/mfa/enroll', requireAuth, async (c) => {
  const supabase = adminClient(c.env)
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

export default auth
