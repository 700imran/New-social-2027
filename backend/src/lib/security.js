// lib/security.js — shared, boring security primitives used across routes.
// Nothing here is exotic on purpose: production-readiness on a $0 budget
// means every check has to survive the free-tier limits it's protecting
// (see docs/SECURITY.md), not just look thorough.

// ---------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------
//
// Backed by the Workers `ratelimit` binding (GA, free — see wrangler.toml's
// [[ratelimits]] blocks), not Cloudflare's dashboard "Rate Limiting Rules"
// product, which needs a Pro/Business zone plan. Each binding has a fixed
// limit/period baked in at deploy time; `key` is what you vary per call
// (an IP for anonymous endpoints, a user id for authenticated ones).
//
// Fails OPEN, not closed: if the binding is missing (e.g. it hasn't been
// added to wrangler.toml yet, or a local `wrangler dev` run without it
// configured) or the call itself throws, the request is allowed through
// and a warning is logged. A rate limiter that takes the whole API down
// when it can't reach its own backing store is a worse outage than the
// abuse it was meant to prevent — the DB-level RLS policies and the
// validation below are the layers that must never fail open.
export async function checkRateLimit(env, bindingName, key) {
  const binding = env[bindingName]
  if (!binding || typeof binding.limit !== 'function') {
    console.warn(`[security] rate limit binding "${bindingName}" not configured — allowing request`)
    return { allowed: true }
  }
  try {
    const { success } = await binding.limit({ key })
    return { allowed: success }
  } catch (err) {
    console.warn(`[security] rate limit check failed for "${bindingName}", allowing request`, err)
    return { allowed: true }
  }
}

// IP first (works for anonymous callers), falling back to Cloudflare's
// per-request Ray ID so a request is never rate-limited on an *empty*
// key (which would make every anonymous caller share one bucket).
export function clientKey(c) {
  return c.req.header('CF-Connecting-IP') || c.req.header('cf-ray') || 'unknown'
}

export async function rateLimited(c, bindingName, key) {
  const { allowed } = await checkRateLimit(c.env, bindingName, key)
  if (!allowed) {
    return c.json({ error: 'Too many requests — please slow down and try again shortly.' }, 429)
  }
  return null
}

// ---------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------
//
// Every one of these caps exists for a cost reason as much as a UX one:
// Supabase's free Postgres is 500MB total, so unbounded text columns are
// a real (if slow) way to burn through that on a free-tier project, and
// oversized bodies cost real CPU-ms parsing JSON on a 10ms/request budget.
export const LIMITS = {
  postBody: 2000,
  commentBody: 1000,
  displayName: 60,
  bio: 280,
  location: 80,
  topic: 40,
  interestsMax: 12,
}

// Returns a trimmed string on success, or a Response-ready error object —
// callers do `const v = requireText(...); if (v.error) return c.json(...)`.
export function requireText(value, { field, max, min = 1, required = true }) {
  if (value === undefined || value === null || value === '') {
    if (!required) return { value: '' }
    return { error: `${field} is required` }
  }
  if (typeof value !== 'string') return { error: `${field} must be text` }
  const trimmed = value.trim()
  if (trimmed.length < min) return { error: `${field} is too short` }
  if (trimmed.length > max) return { error: `${field} must be ${max} characters or fewer` }
  return { value: trimmed }
}

export function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// ---------------------------------------------------------------------
// Disposable-email / dead-domain rejection at signup
// ---------------------------------------------------------------------
//
// A short, deliberately non-exhaustive list of well-known disposable-email
// providers — this is a cheap first filter, not a complete blocklist (new
// disposable domains appear constantly; a real deployment at scale would
// want a maintained third-party list). Catching the well-known ones is
// still worth doing: they're what the overwhelming majority of casual
// spam signups actually use.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'throwawaymail.com', 'yopmail.com', 'trashmail.com',
  'getnada.com', 'sharklasers.com', 'dispostable.com', 'fakeinbox.com', 'maildrop.cc',
  'mintemail.com', 'mohmal.com', 'moakt.com', 'emailondeck.com', 'tempinbox.com',
])

// Cloudflare's own DNS-over-HTTPS endpoint — a plain fetch(), no special
// binding or account needed, and it's how a Worker can check MX records
// at all (Workers don't have a native DNS resolution API). A domain with
// no MX records can't receive mail, which is a strong signal the address
// was never meant to actually be verified — but treated as a warning
// signal alongside the blocklist above, not used alone to hard-block,
// since a small number of oddly-configured-but-real domains route mail
// via bare A/AAAA records instead.
async function hasMxRecords(domain) {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { accept: 'application/dns-json' },
    })
    const data = await res.json()
    return Array.isArray(data.Answer) && data.Answer.length > 0
  } catch (err) {
    console.warn('[security] MX lookup failed, treating as inconclusive', err)
    return true // fail open — a DNS hiccup shouldn't block real signups
  }
}

// Returns null if the email looks acceptable, or a user-facing error
// string if it should be rejected.
export async function checkEmailDeliverability(email) {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return 'Enter a valid email address'
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return 'Please use a permanent email address, not a disposable one'
  }
  if (!(await hasMxRecords(domain))) {
    return "That email domain doesn't appear to accept mail — double-check for a typo"
  }
  return null
}

// Deliberately not exotic: length + a letter + a number. Anything stricter
// (special characters, rotation policies) trades security theater for
// real usability cost — length is what actually matters for brute-force
// resistance, and Supabase Auth already salts+hashes with bcrypt.
export function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)
}

// ---------------------------------------------------------------------
// Turnstile (bot/credential-stuffing mitigation on signup + login)
// ---------------------------------------------------------------------
//
// Opt-in: if TURNSTILE_SECRET_KEY isn't set, this is a no-op that lets
// every request through, so the app keeps working before you've set up
// a Turnstile widget (docs/SECURITY.md walks through adding one — it's
// free and unlimited, and you're already on Cloudflare).
export async function verifyTurnstile(env, token, remoteip) {
  if (!env.TURNSTILE_SECRET_KEY) return { ok: true, skipped: true }
  if (!token) return { ok: false, error: 'Verification required' }

  try {
    const body = new FormData()
    body.append('secret', env.TURNSTILE_SECRET_KEY)
    body.append('response', token)
    if (remoteip) body.append('remoteip', remoteip)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })
    const data = await res.json()
    return { ok: !!data.success }
  } catch (err) {
    console.error('[security] Turnstile verification request failed', err)
    // Fails CLOSED (unlike rate limiting) — a broken bot-check should not
    // silently become "no bot check," since its entire job is to gate an
    // action that costs Auth MAU / email quota if abused at volume.
    return { ok: false, error: 'Could not verify — please try again' }
  }
}
