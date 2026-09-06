import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { adminClient, userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth } from '../lib/authMiddleware.js'
import {
  checkEmailDeliverability,
  checkRateLimit,
  clientKey,
  isStrongPassword,
  isValidEmail,
  requireText,
  verifyTurnstile,
  LIMITS,
} from '../lib/security.js'
import { sendWelcomeEmail } from '../lib/email.js'

const auth = new Hono()

const REFRESH_COOKIE = 'bs_rt'
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days — a practical "stay signed in" window, not Supabase's own token lifetime

// The refresh token only ever lives in this httpOnly cookie, never in a
// JSON response body — see docs/SECURITY.md's "session security" section
// for why. httpOnly means client-side JS (including anything an XSS bug
// might inject) cannot read it at all; SameSite=None+Secure is required
// because the frontend and this Worker are on different domains.
function setRefreshCookie(c, refreshToken) {
  setCookie(c, REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  })
}

function clearRefreshCookie(c) {
  deleteCookie(c, REFRESH_COOKIE, { path: '/v1/auth', secure: true, sameSite: 'None' })
}

// A fixed, generic message for anything auth-failure-shaped — never let a
// caller distinguish "no such account" from "wrong password" from "email
// not confirmed" via the message text; that distinction is exactly what
// makes an endpoint useful for enumerating real accounts.
const GENERIC_AUTH_ERROR = 'Invalid credentials, or this account is not yet confirmed.'

// POST /v1/auth/signup  { email? , phone?, password, displayName, turnstileToken? }
// Supabase Auth owns password hashing + verification email/OTP dispatch —
// per the guideline, we never touch a password ourselves.
auth.post('/signup', async (c) => {
  const rate = await checkRateLimit(c.env, 'AUTH_RATE_LIMITER', clientKey(c))
  if (!rate.allowed) return c.json({ error: 'Too many attempts — please wait a minute and try again.' }, 429)

  const { email, phone, password, displayName, turnstileToken, website } = await c.req.json().catch(() => ({}))

  // Honeypot: a hidden form field real users never fill (see
  // SignUp.jsx). A non-empty value means a bot filled every input it
  // could find. Return a fake success rather than an error — telling a
  // bot "rejected" just teaches it to leave that field blank next time.
  if (website) {
    return c.json({ userId: 'ok' }, 201)
  }

  const turnstile = await verifyTurnstile(c.env, turnstileToken, clientKey(c))
  if (!turnstile.ok) return c.json({ error: turnstile.error }, 400)

  if (!email && !phone) return c.json({ error: 'email or phone is required' }, 400)
  if (email && !isValidEmail(email)) return c.json({ error: 'Enter a valid email address' }, 400)
  if (email) {
    const deliverabilityError = await checkEmailDeliverability(email)
    if (deliverabilityError) return c.json({ error: deliverabilityError }, 400)
  }
  if (!isStrongPassword(password)) {
    return c.json({ error: 'Password must be at least 8 characters and include a letter and a number' }, 400)
  }
  const name = requireText(displayName, { field: 'displayName', max: LIMITS.displayName, required: false })
  if (name.error) return c.json({ error: name.error }, 400)

  const supabase = adminClient(c.env)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: false, // Supabase sends its own confirmation flow
  })
  // Don't echo Supabase's raw error (can reveal "already registered", i.e.
  // account enumeration) — a fixed, still-actionable message instead.
  if (error) return c.json({ error: 'Could not create this account — it may already be registered.' }, 400)

  // Mirror the identity into our own `users` + `profiles` rows (Model 1).
  // auth.users (Supabase-managed) and public.users (app-managed) share
  // the same id by convention so the rest of the schema can FK to either.
  const userId = data.user.id

  const { error: usersError } = await supabase.from('users').insert({ id: userId, email, phone })
  const { error: profileError } = usersError
    ? { error: usersError }
    : await supabase.from('profiles').insert({ user_id: userId, display_name: name.value || 'New user' })

  // These two rows are load-bearing: every other route (getProfile,
  // hydrateSession on the frontend, the entire feed) assumes a `profiles`
  // row exists for every `users` row. A silent failure here previously
  // meant `auth.admin.createUser` had already succeeded — so the email
  // was permanently "already registered" — while nothing else worked,
  // with no error ever surfaced to the client. That's exactly the "signup
  // does nothing" failure mode this fixes.
  if (usersError || profileError) {
    console.error('Signup failed after auth user creation — rolling back', { usersError, profileError })
    await supabase.auth.admin.deleteUser(userId).catch((e) => console.error('Rollback also failed', e))
    return c.json({ error: 'Could not finish creating your account — please try again.' }, 500)
  }

  // Non-fatal to the signup itself if these fail (defaults are safe to
  // miss), but still logged rather than silently swallowed.
  const [{ error: consentError }, { error: roleError }] = await Promise.all([
    supabase.from('consent_preferences').insert({ user_id: userId }),
    supabase.from('user_roles').insert({ user_id: userId, role_id: 1 }), // 'user'
  ])
  if (consentError) console.error('Signup: consent_preferences insert failed (non-fatal)', consentError)
  if (roleError) console.error('Signup: user_roles insert failed (non-fatal)', roleError)

  await supabase
    .from('audit_log')
    .insert({ actor_id: userId, action: 'signup', entity_type: 'user', entity_id: userId })
    .then(({ error: auditError }) => {
      if (auditError) console.error('Signup: audit_log insert failed (non-fatal)', auditError)
    })

  // Fire-and-forget welcome email — never blocks or fails the signup
  // response itself (see lib/email.js: sendWelcomeEmail already no-ops
  // safely if RESEND_API_KEY isn't configured).
  if (email) {
    sendWelcomeEmail(c.env, { to: email, displayName: name.value || 'there' }).catch((e) =>
      console.error('Signup: welcome email failed (non-fatal)', e)
    )
  }

  // Tell the frontend directly whether this account still needs Supabase's
  // own email-confirmation step, instead of making it guess from a later
  // login attempt's error text. `email_confirmed_at` is null on the just-
  // created user whenever Supabase's dashboard "Confirm email" setting is
  // on — this is the exact same signal Supabase itself uses, so it can
  // never drift out of sync with GENERIC_AUTH_ERROR below the way a
  // string-matched login-error message could.
  const needsConfirmation = !data.user.email_confirmed_at
  return c.json({ userId, needsConfirmation }, 201)
})

// POST /v1/auth/login  { email? , phone?, password }
// No Turnstile check here on purpose: signUp() immediately calls this with
// the same credentials right after account creation, and a Turnstile token
// can only be verified once — the signup call already consumed it.
// AUTH_RATE_LIMITER (keyed on IP+identity below) is what actually gates
// brute-force/credential-stuffing attempts against this endpoint.
auth.post('/login', async (c) => {
  const { email, phone, password } = await c.req.json().catch(() => ({}))

  // Keyed on IP *and* the identity being attempted: an IP-only key lets one
  // attacker's rate limit get "used up" by legitimate traffic behind the
  // same NAT/proxy; an identity-only key lets a botnet distribute a
  // credential-stuffing run across many IPs against one account. Keying on
  // both closes each gap without needing per-account server-side lockouts
  // (which are themselves a denial-of-service vector against a known
  // email).
  const rate = await checkRateLimit(c.env, 'AUTH_RATE_LIMITER', `${clientKey(c)}:${email || phone || ''}`)
  if (!rate.allowed) return c.json({ error: 'Too many attempts — please wait a minute and try again.' }, 429)

  if (!password || (!email && !phone)) return c.json({ error: GENERIC_AUTH_ERROR }, 401)

  const supabase = adminClient(c.env)
  const { data, error } = await supabase.auth.signInWithPassword({ email, phone, password })
  if (error) return c.json({ error: GENERIC_AUTH_ERROR }, 401)

  setRefreshCookie(c, data.session.refresh_token)
  return c.json({
    accessToken: data.session.access_token,
    expiresIn: data.session.expires_in,
    userId: data.user.id,
  })
})

// POST /v1/auth/refresh — refresh token comes from the httpOnly cookie set
// at login, never from the request body (see setRefreshCookie above).
// Doesn't require requireAuth — the cookie itself is the credential, and
// it's exactly what lets the frontend restore a session after a page
// reload without ever having held the refresh token in JS.
auth.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, REFRESH_COOKIE)
  if (!refreshToken) return c.json({ error: 'No session to refresh' }, 401)

  const rate = await checkRateLimit(c.env, 'REFRESH_RATE_LIMITER', clientKey(c))
  if (!rate.allowed) return c.json({ error: 'Too many requests — please slow down.' }, 429)

  const supabase = adminClient(c.env)
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
  if (error) {
    clearRefreshCookie(c) // it's dead — stop sending it
    return c.json({ error: 'Session expired — please sign in again.' }, 401)
  }

  // Supabase refresh tokens are single-use/rotating: the old one is now
  // invalid, so the cookie must always be re-set with the new one or the
  // *next* refresh call fails.
  setRefreshCookie(c, data.session.refresh_token)
  return c.json({
    accessToken: data.session.access_token,
    expiresIn: data.session.expires_in,
    userId: data.user.id,
  })
})

// POST /v1/auth/logout
auth.post('/logout', requireAuth, async (c) => {
  clearRefreshCookie(c)
  // Stateless JWTs: the access token itself just expires naturally within
  // the hour. If you need immediate server-side revocation of the whole
  // session, call supabase.auth.admin.signOut(jwt) here too.
  return c.json({ ok: true })
})

// POST /v1/auth/forgot-password  { email }
// Always returns the same generic response whether or not the email is
// registered — the response itself must not be usable to enumerate
// accounts, same reasoning as GENERIC_AUTH_ERROR above.
auth.post('/forgot-password', async (c) => {
  const { email, turnstileToken } = await c.req.json().catch(() => ({}))
  const rate = await checkRateLimit(c.env, 'AUTH_RATE_LIMITER', `${clientKey(c)}:${email || ''}`)
  const generic = { ok: true, message: 'If an account exists for that email, a reset link is on its way.' }
  if (!rate.allowed) return c.json(generic) // still generic — don't leak that rate limiting triggered

  const turnstile = await verifyTurnstile(c.env, turnstileToken, clientKey(c))
  if (!turnstile.ok) return c.json(generic) // generic here too — don't leak *why* nothing was sent

  if (!isValidEmail(email)) return c.json(generic)

  const supabase = adminClient(c.env)
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${c.env.FRONTEND_URL}/reset-password`,
  })
  // Intentionally ignore any error detail here (including "not found") —
  // see the comment above.
  return c.json(generic)
})

// PATCH /v1/auth/password  { password }
// Serves two flows with one route: changing your password while signed
// in normally, and setting a new one after clicking the emailed reset
// link (that link hands the frontend a short-lived Supabase session whose
// access token is a perfectly valid Bearer token for this same endpoint —
// requireAuth doesn't need to know which case it is).
auth.patch('/password', requireAuth, async (c) => {
  const { password } = await c.req.json().catch(() => ({}))
  if (!isStrongPassword(password)) {
    return c.json({ error: 'Password must be at least 8 characters and include a letter and a number' }, 400)
  }
  const supabase = userClient(c.env, c.get('jwt'))
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

// POST /v1/auth/mfa/enroll — TOTP enrollment, offered to creator/brand roles
auth.post('/mfa/enroll', requireAuth, async (c) => {
  const supabase = adminClient(c.env)
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error) return dbError(c, error)
  return c.json(data)
})

export default auth
