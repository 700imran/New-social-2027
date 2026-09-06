# Security

What's implemented, why, and what to configure before launch. Written
against the constraint you gave: zero budget on both Supabase and
Cloudflare — every mechanism here either costs nothing at the traffic
level a new app actually sees, or fails safely if you never configure it.

If you haven't read [`CONNECT_EXISTING_INFRA.md`](./CONNECT_EXISTING_INFRA.md)
yet, do that first — this assumes your Supabase project, R2 bucket, and
Worker are already deployed and reachable.

---

## 1. Rate limiting — the primary cost-glitch guard

**What**: Four Cloudflare Workers `ratelimit` bindings (`AUTH_RATE_LIMITER`,
`REFRESH_RATE_LIMITER`, `WRITE_RATE_LIMITER`, `MEDIA_RATE_LIMITER`,
configured in `backend/wrangler.toml`), checked at the top of every route
that creates data or touches auth.

**Why this mechanism specifically**: this is Cloudflare's own GA (Sept
2025) Workers runtime API — not the dashboard's "Rate Limiting Rules"
product, which needs a Pro ($20/mo) or Business ($200/mo) zone plan and
only grants 1–2 rules even then. The `ratelimit` binding is part of the
Workers Free plan itself, with no separate provisioning step: you pick an
account-unique `namespace_id` integer and a `limit`/`period` in
`wrangler.toml`, and it exists once deployed. No KV, no Durable Objects,
no per-request storage writes to budget against (Workers KV's free tier
is capped at **1,000 writes/day**, which a naive per-request counter would
blow through in minutes).

**Requires Wrangler v4+**. Older Wrangler versions don't recognize the
`[[ratelimits]]` config field at all — it'll silently produce an
"Unexpected fields found" warning and the binding won't exist at runtime.
`backend/package.json` already pins `"wrangler": "^4"`; if you're
upgrading an existing local checkout, `rm -rf node_modules && npm install`.

**Verify it's live**: `npx wrangler deploy --dry-run` should list all
four `env.*_RATE_LIMITER` bindings under "Your Worker has access to the
following bindings." If they're missing, you're on an old Wrangler.

**Current limits** (edit directly in `wrangler.toml`, no dashboard step):

| Binding | Limit | Applied to |
|---|---|---|
| `AUTH_RATE_LIMITER` | 10/min, keyed on IP+identity | signup, login, forgot-password |
| `REFRESH_RATE_LIMITER` | 30/min, keyed on IP | session refresh |
| `WRITE_RATE_LIMITER` | 20/min, keyed on user id | create post/comment, react, follow, block |
| `MEDIA_RATE_LIMITER` | 10/min, keyed on user id | requesting an upload URL |

**Fails open, deliberately**: if a binding is missing or the call throws,
the request is allowed through (see `backend/src/lib/security.js`'s
`checkRateLimit`), with a `console.warn` you'll see in `wrangler tail`. A
rate limiter that takes the whole API down when it can't reach its own
backing store would be a worse outage than the abuse it's meant to stop.
RLS and input validation are the layers that must never fail open — they
don't.

---

## 2. Turnstile — bot mitigation on signup

**What**: Cloudflare Turnstile, a free, unlimited CAPTCHA alternative.
Wired into `SignUp.jsx` and the forgot-password flow only, not login (see
below for why).

**Setup** (skip and everything still works — see "opt-in" below):

1. Cloudflare dashboard → Turnstile → Add widget. Domain: your frontend's
   domain. Widget mode: Managed is a reasonable default.
2. Copy the **Site Key** → frontend `.env.local`'s `VITE_TURNSTILE_SITE_KEY`.
3. Copy the **Secret Key** → `npx wrangler secret put TURNSTILE_SECRET_KEY`
   in `backend/`.
4. Redeploy both sides.

**Opt-in by design**: `TurnstileWidget.jsx` renders nothing if
`VITE_TURNSTILE_SITE_KEY` is unset, and `security.js`'s `verifyTurnstile`
returns `{ ok: true, skipped: true }` if `TURNSTILE_SECRET_KEY` is unset
on the backend. Signup and password reset work either way — you're not
blocked from going live before setting this up, but you should before
real traffic arrives, since account creation is what most directly burns
Supabase's 50,000 free Auth MAU allotment if bots find the endpoint.

**Why not on login**: `AppContext.jsx`'s `signUp()` immediately calls
`signIn()` with the same credentials right after account creation.
Turnstile tokens are single-use — the signup call already consumes it, so
requiring a second one for the auto-login half of the same flow would
just break it. Rate limiting (`AUTH_RATE_LIMITER`, keyed on IP+email)
covers login/credential-stuffing instead; that's a real, if less complete,
mitigation, and doesn't have this token-reuse conflict.

---

## 3. Password policy

Enforced **server-side** in `backend/src/lib/security.js`'s
`isStrongPassword` (signup and password change/reset both call it) — the
frontend's matching client-side check in `SignUp.jsx`/`ResetPassword.jsx`
is only for immediate UX feedback, never trusted on its own.

Minimum 8 characters, at least one letter and one number. Deliberately
not stricter (no mandatory special characters, no rotation policy):
length is what actually matters for brute-force resistance, and Supabase
Auth already salts+hashes with bcrypt server-side — additional complexity
rules mostly just push people toward predictable substitutions
("password1" → "Password1!") without a real security gain.

---

## 4. Session security — why the refresh token isn't in localStorage

**The risk this addresses**: this app previously (like most SPA tutorials)
stored both the access token and the long-lived refresh token in
`localStorage`. Any successful XSS — a dependency vulnerability, a
misconfigured third-party widget, anything that gets attacker JS running
on the page — could read `localStorage` and exfiltrate a refresh token
that stays valid indefinitely, giving permanent account takeover instead
of a temporary one.

**What changed**:
- The **refresh token never reaches JavaScript at all**. `POST
  /v1/auth/login` and `/v1/auth/refresh` set it as an `httpOnly` cookie
  (`backend/src/routes/auth.js`) — httpOnly means no JS on the page,
  malicious or not, can read `document.cookie` and get it.
- The cookie is scoped to `Path=/v1/auth` (only sent on auth endpoints),
  `SameSite=None; Secure` (required since the frontend and Worker are
  different origins), and rotates on every refresh (Supabase refresh
  tokens are single-use — the old one is invalidated the moment a new one
  is issued, so the cookie is always re-set with the new value).
- The **access token lives only in memory** (a module-level variable in
  `src/api/client.js`), never persisted. A page reload loses it
  intentionally — `AppContext.jsx`'s bootstrap effect calls
  `POST /v1/auth/refresh` (cookie sent automatically) to get a fresh one.
- This requires `credentials: 'include'` on every frontend fetch call
  (already set in `client.js`) and `credentials: true` + an **exact**
  origin allowlist in the Worker's CORS config (already set in
  `index.js` — browsers silently drop credentialed cross-origin
  cookies/responses if the origin is `*` instead of an exact match).

**What this does and doesn't fix**: an XSS bug can still call authenticated
APIs using the in-memory access token for as long as that tab stays open
and the token hasn't naturally expired (~1 hour). What it removes is the
attacker's ability to silently mint *new* access tokens forever after —
the actual credential capable of that never touches attacker-readable
storage.

**Local dev note**: `Secure` cookies normally require HTTPS, but Chrome
and Firefox both exempt `http://localhost` as a documented dev
convenience, so `npm run dev` against `wrangler dev` on `localhost` works
without extra setup. Testing against a LAN IP or a non-localhost hostname
without HTTPS will not — use the deployed HTTPS Worker URL for that case.

---

## 5. Password reset

Two new endpoints (`backend/src/routes/auth.js`) and two new pages
(`ForgotPassword.jsx`, `ResetPassword.jsx`) — there was no account
recovery path at all before this.

- `POST /v1/auth/forgot-password` — always returns the same generic
  success message regardless of whether the email is registered, rate
  limited, and Turnstile-gated. The response itself must not be usable to
  enumerate accounts; a different UI state for "no such email" would
  defeat that.
- `PATCH /v1/auth/password` — serves both "change my password while
  signed in" and "set a new one from the emailed reset link." Both cases
  present a valid Supabase-issued Bearer token to `requireAuth`, so one
  route covers both without needing to know which case it is.
- Supabase sends the actual email; the link redirects to
  `${FRONTEND_URL}/reset-password#access_token=...&type=recovery`
  (`FRONTEND_URL` is a Cloudflare dashboard Variable, not a `wrangler.toml`
  value — **set this to your real deployed frontend URL or the reset
  link will point at the placeholder**).
  `ResetPassword.jsx` reads the token from the URL fragment (never sent to
  any server on its own) and immediately strips it from the visible URL.

**Reminder from `CONNECT_EXISTING_INFRA.md`**: Supabase's own built-in
email sender has a low rate limit and often lands in spam. For anything
beyond testing, configure a custom SMTP provider (Supabase dashboard →
Project Settings → Auth → SMTP Settings; Resend's free tier is a common
pairing) — otherwise password-reset and confirmation emails may simply
not arrive reliably at real-world volume.

---

## 6. Input validation

Centralized in `backend/src/lib/security.js`'s `requireText`/`LIMITS`,
applied everywhere user text reaches the database: post body (2000
chars), comment body (1000), display name (60), bio (280), location (80),
topic (40), interests (max 12 items). Enforced server-side regardless of
what the frontend sends.

This is as much a cost guard as a correctness one: Supabase's free
Postgres is 500MB total, and oversized/malformed request bodies cost real
CPU-ms parsing on a 10ms-per-request free-plan budget (`index.js`'s
`Content-Length` guard rejects anything over 100KB before the body is
even read, for the same reason — every real payload on this API is a few
hundred bytes to a few KB).

Profile updates (`PATCH /v1/profiles/:id`) also moved from forwarding the
raw request body straight to Postgres to an explicit allowlist — RLS
already stops you editing someone *else's* profile, but nothing
previously stopped a crafted request from writing arbitrary columns
(e.g. an `avatar_asset_id` pointing at media you don't own) onto your own
row. Setting an avatar now checks that the referenced media asset's
`owner_id` actually matches the caller.

Reaction `type` is now checked against an explicit allowlist (`{'like'}`)
instead of accepting arbitrary text — previously a crafted request could
write any string into that column.

---

## 7. Authorization & abuse-pattern checks

- **Self-follow / self-block** now return a clear 400 instead of silently
  succeeding (`follows.js`).
- **Block enforcement on new follows**: if either account has blocked the
  other, a new follow request is rejected. Blocking someone now also
  unwinds any existing follow relationship in either direction. This is
  partial, not comprehensive — it doesn't yet filter a blocked user's
  existing posts/comments out of feeds, which would need every read
  endpoint to consider blocks, not just the follow-write path. Worth
  scoping as a dedicated pass if moderation becomes a priority.
- **Generic auth error messages**: login and signup return a fixed
  message regardless of whether the failure was "no such account,"
  "wrong password," or "not yet confirmed" — the distinction is exactly
  what makes an endpoint useful for enumerating real accounts.
- Every ownership check that already existed (profile edits, media
  uploads) is backed by RLS at the database layer, not just Worker code —
  see `docs/bharatspace_level1_schema.sql`'s policies. The Worker checks
  are a friendlier error message layered on top, not the actual boundary.

---

## 8. Transport & headers

`index.js` now sets `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
and `Strict-Transport-Security`. These matter more for a browser rendering
HTML than a JSON API, but they're free and this Worker does serve the
`GET /media/:id` path, so they're set globally rather than judged
case-by-case.

CORS (`index.js`) only ever echoes back an origin from your explicit
`ALLOWED_ORIGINS` list — never `*` — which is also a hard requirement for
the credentialed-cookie flow in §4 to work at all.

---

## 9. Error handling

`app.onError` (`index.js`) logs the full error server-side
(`console.error`, visible via `npx wrangler tail` or the dashboard's Logs
tab) and returns a fixed `{"error":"Internal server error"}` to the
client — Postgres/Supabase error text can otherwise leak column names,
constraint names, or query structure. Route-level errors (validation
failures, RLS denials) still return specific, actionable messages; only
unexpected 500s are genericized.

---

## 10. What's explicitly not covered

Named rather than silently absent:

- **MFA isn't enforced anywhere.** `POST /v1/auth/mfa/enroll` exists
  (TOTP via Supabase) but nothing in the UI surfaces it or requires it for
  any account type.
- **No server-side revocation list for access tokens.** A stolen access
  token remains valid for its natural ~1 hour lifetime; there's no
  mechanism to invalidate one early short of rotating `SUPABASE_JWT_SECRET`
  (which invalidates *every* session).
- **CSRF**: mitigated structurally (data-mutating requests need a
  `Bearer` header a different origin's JS can't read; the cookie only
  guards the low-consequence `/refresh` endpoint, and CORS blocks a
  cross-origin page from reading its response) rather than via an
  explicit CSRF token. Documented here as a deliberate tradeoff, not an
  oversight, but worth a second look if you add any cookie-authenticated
  (rather than Bearer-authenticated) endpoint later.
- **No dependency vulnerability scanning** (`npm audit` / Dependabot)
  configured in this repo.
- **No automated backups** beyond whatever Supabase's free tier includes
  by default (worth checking current terms — this changes).
- **Block enforcement is partial** — see §7.

None of this blocks a real launch; all of it is worth revisiting before
handling data you'd be upset to lose or leak at real scale.

---

## Testing checklist

- [ ] Trigger 11 signups from the same IP within a minute → the 11th gets
      a 429
- [ ] Trigger 11 failed logins for the same email within a minute → 429,
      and the error text never distinguishes "wrong password" from
      "no such account"
- [ ] Sign up without solving the Turnstile challenge (if configured) →
      rejected
- [ ] Submit a password under 8 characters, or without a number → 400,
      both from the API directly (curl/Postman) and via the UI
- [ ] Log in, then inspect Application → Cookies in devtools → `bs_rt`
      is present, `HttpOnly` is checked, `Secure` is checked — and it is
      **not** visible anywhere in `localStorage`
- [ ] Close the tab, reopen the app → still signed in (refresh-via-cookie
      works)
- [ ] Click "Forgot password?", request a reset for an email that
      *doesn't* exist → same success message as for one that does
- [ ] Complete a real reset via the emailed link → old password no longer
      works, new one does
- [ ] Try to follow yourself, and try to follow an account you've blocked
      (or that's blocked you) → both rejected
- [ ] Submit a 3,000-character post → 400 with a clear message, not a
      500
## 11. Checklist scorecard

Mapped directly against the anti-hacking/anti-spam/APK-hardening
checklist this was built against, category by category — ✅ done, ⚠️
partial (with what's missing), ❌ not done (with why).

**Input & Data Protection**
- ✅ Server-side validation — `lib/security.js`'s `requireText`/`LIMITS`, never trusts the client (§6)
- ✅ Parameterized queries — Supabase's JS client parameterizes everything; no raw SQL string-building anywhere in this codebase
- ✅ Contextual output encoding — React escapes all rendered text by default; no `dangerouslySetInnerHTML` anywhere in this codebase
- ✅ Cryptographic storage — passwords: Supabase Auth's own bcrypt hashing (never touched directly, per the guideline); data at rest: Supabase's Postgres and Cloudflare R2 both encrypt at rest by default at the infrastructure level

**Identity & Access Management**
- ⚠️ MFA — `POST /v1/auth/mfa/enroll` exists (TOTP via Supabase); nothing in the UI surfaces it, and login doesn't challenge for a second factor yet. Enforcing MFA for *all* users is also a real product tradeoff (locks out anyone without an authenticator app) worth deciding deliberately rather than defaulting to — see §10
- ✅ Context-aware authorization (anti-BOLA/IDOR) — every mutating route uses `c.get('userId')` from the verified JWT, never a client-supplied id; RLS enforces this a second time at the database layer independent of Worker code (§7)
- ✅/⚠️ Secure session handling — high-entropy session IDs (Supabase-issued JWTs); `Secure` and `HttpOnly` both set. `SameSite=None`, not `Strict` — this is a deliberate, necessary deviation: the frontend (Vercel) and backend (Workers) are different origins, and `SameSite=Strict` would stop the browser from ever sending the cookie back to the API at all, breaking login entirely. `None` is the correct choice for a genuinely cross-origin architecture; `Secure` (HTTPS-only) is what actually does the protective work here

**Network & Infrastructure**
- ⚠️ TLS 1.3 + HSTS — HSTS header is set (`index.js`). Minimum TLS version is a Cloudflare **dashboard** setting, not Worker code: SSL/TLS → Edge Certificates → Minimum TLS Version → set to 1.3, and HSTS preloading is in the same section. Not done from here since it's account/zone configuration, not something a code change controls
- ⚠️ WAF — Cloudflare's dashboard-configured "Rate Limiting Rules"/managed WAF rulesets need a Pro ($20/mo) or Business plan for meaningful coverage; the Free plan's WAF allowance is minimal. Given the stated zero-budget constraint, this repo's actual abuse defense is the Workers-level `ratelimit` bindings (§1) plus Turnstile (§2) plus input validation — genuinely free, and covers the same threat model (volumetric abuse, credential stuffing, spam) reasonably well at this scale, but isn't a drop-in replacement for a real WAF's signature-based exploit detection
- ✅ Dependency auditing — `.github/workflows/dependency-audit.yml`, daily + on every push, across all three Node projects. Split into two checks per project: a **blocking** audit of production dependencies only (`--omit=dev` — exactly what ships to a user's browser or Android device) and a **non-blocking, informational** audit of dev-only tooling (bundlers, CLIs). One current, accepted finding lives in that second category: `android/`'s `@capacitor/cli` (a build-time-only tool, never bundled into the shipped APK) pins an old `tar` version with several disclosed advisories and no non-breaking fix — the fix requires jumping Capacitor's major version (6→8), which also means regenerating the native Android project and re-verifying the Gradle build end-to-end by hand (this can't be validated from a sandboxed environment without real Android SDK/network access — see `android/README.md`'s "why not build it here"). Tracked, not silently ignored: the informational audit step still surfaces it on every run

**Anti-Spam & Anti-Bot**
- ✅ Behavioral CAPTCHA — Cloudflare Turnstile on signup (§2)
- ✅ Multi-layered rate limiting — by IP (anonymous endpoints) and by user id (authenticated mutations), stricter on auth endpoints than general writes (§1). Not layered by *device fingerprint* — deliberately: this app's `Privacy.jsx` explicitly tells users no fingerprinting/tracking happens, so adding it here would mean either quietly breaking that promise or updating the privacy policy for a technique that adds real complexity for a marginal gain over IP+user keying at this app's scale
- ❌ Proof-of-Work challenges — not implemented. At this app's scale, Turnstile plus rate limiting already covers the bot-economics goal PoW is going for (making automated abuse computationally/financially unattractive); adding a second, custom-built layer on top is real engineering complexity for limited marginal benefit until traffic patterns actually show Turnstile+rate-limiting being insufficient

**Form & Registration Security**
- ✅ Honeypot fields — hidden field on signup (`SignUp.jsx` + `routes/auth.js`); a filled honeypot gets a fake success, never an error, so it doesn't teach bots what tripped it
- ✅ Disposable-email blocking + MX record checks — `lib/security.js`'s `checkEmailDeliverability`: a known-disposable-domain blocklist plus a live MX lookup via DNS-over-HTTPS (a plain `fetch()` to Cloudflare's own DoH endpoint — no extra account/binding needed)
- ❌ IP reputation scoring (Tor/VPN/proxy detection against live threat feeds) — genuinely requires either Cloudflare's paid Bot Management product or a third-party API (IPQualityScore, AbuseIPDB, etc.) with its own cost and API key. Not wired in, given the zero-budget constraint — this is the one item on the list that doesn't have a free-tier equivalent worth faking. Worth revisiting if/when there's budget for it

**Android APK Specific Hardening**
- ⚠️ Certificate pinning — deliberately not enabled by default. See the extensive comment in `android/app/src/main/res/xml/network_security_config.xml`: this backend is Cloudflare-fronted, and Cloudflare rotates edge certificates on its own schedule outside this app's control — pinning without backup pins (and a plan to update them) risks the app silently losing all connectivity on the next rotation, a self-inflicted outage that's arguably worse than the risk being defended against on a TLS-already-encrypted, non-payments app. A commented, ready-to-uncomment config with the exact `openssl` command to compute real pins is there if you want to pursue it anyway
- ✅ Code obfuscation — R8 minification + resource shrinking enabled for release builds (`android/app/build.gradle`), with the Capacitor-specific keep rules (`proguard-rules.pro`) required to avoid it silently breaking the native bridge
- ❌ Anti-tampering / Play Integrity API — not wired in. This needs its own Google Cloud/Play Console project and API credentials that don't exist yet (same category as Turnstile/Supabase: infrastructure only you can provision, tied to your own developer account). Recommended path when ready: `@capacitor-community/*` doesn't currently ship this — most Capacitor apps integrate it via a small custom native plugin calling Google's Play Integrity API directly
- ✅ Explicit component protection — reviewed the full manifest: `MainActivity` is `exported="true"` (correctly — it's the launcher activity, this is required for it to be launchable at all) and Capacitor's `FileProvider` was already `exported="false"` by default. No other components exist to misconfigure. Also hardened `android:allowBackup` from `true` to `false` (not on the original checklist, but directly relevant to the "secure session handling" goal above: `allowBackup="true"` would let an `adb backup` or cloud backup extract the WebView's cookie database file at the OS level, which is a way around `HttpOnly`'s browser-layer protection)

