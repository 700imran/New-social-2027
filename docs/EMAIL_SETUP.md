# Email setup: confirmation/OTP, welcome mail, and promotional mail

Three different kinds of email touch this app, sent by two different
systems. Mixing them up is the single most common cause of "signup works
but login doesn't" reports — see §0 before touching anything else.

| Email | Sent by | Configured in |
|---|---|---|
| Signup confirmation, password reset, MFA | **Supabase Auth** | Supabase dashboard only — no code involved |
| Welcome email after signup | **This backend**, via Resend | `backend/src/lib/email.js` + two Worker secrets |
| Promotional/marketing blasts | **This backend**, via Resend, admin-triggered | Same as above, plus an `admin` role grant |

---

## 0. Read this first if login is failing right after signup

If signup succeeds but every subsequent login attempt returns "Invalid
credentials, or this account is not yet confirmed" — **this is almost
always Supabase's "Confirm email" setting combined with confirmation mail
that never arrived**, not a bug in the password handling. Nothing in this
codebase hashes a password itself; `backend/src/routes/auth.js` hands the
raw password straight to `supabase.auth.admin.createUser()` and
`supabase.auth.signInWithPassword()` — Supabase Auth is the only thing
that ever touches or hashes it, once, on its own side. There is no second
hash to go wrong.

What actually happens with "Confirm email" **on** (the default) and no
custom SMTP connected:

1. Signup creates the user with `email_confirm: false` — intentional, so
   Supabase sends its own confirmation email.
2. Supabase's built-in mail sender has a very low rate limit and often
   never lands in the inbox at all (dashboard note: "for testing only").
3. The account sits permanently unconfirmed. `signInWithPassword` then
   fails with "Email not confirmed" on every attempt, which
   `routes/auth.js` deliberately turns into the same generic message a
   wrong password would give — see the `GENERIC_AUTH_ERROR` comment there
   for why (so the error text itself can't be used to enumerate which
   emails are already registered).

**As of this update**, `/auth/signup` no longer makes the frontend guess
this from a login error's text — it reads the new user's own
`email_confirmed_at` field and returns `needsConfirmation: true/false`
directly, so `SignUp.jsx` can show the right message immediately instead
of silently trying (and failing) an auto-login first. That fixes the UX;
it does **not** by itself make confirmation email arrive — that's §1.

Two ways forward, pick one:

- **Fastest for testing**: Supabase dashboard → Authentication →
  Providers → Email → turn **"Confirm email" off**. New signups can sign
  in immediately, no email involved. Turn this back on before real users
  sign up — an app that never confirms addresses will accumulate
  unreachable/typo'd accounts.
- **Correct for production**: keep "Confirm email" on and connect real
  SMTP so the confirmation mail actually sends — §1.

---

## 1. Supabase's own mail (confirmation, password reset, MFA) — dashboard only

This cannot be done from this repo's code; Supabase Auth owns this
entirely.

1. Supabase dashboard → **Authentication → Emails → SMTP Settings**.
2. Create a free [Resend](https://resend.com) account (3,000 emails/mo,
   100/day free — plenty at Level 1 scale).
3. Resend → **Domains** → add and verify the domain you'll send from
   (DNS records they give you — takes a few minutes to a few hours to
   verify, depending on your DNS host).
4. Resend → **API Keys** → create one.
5. Back in Supabase's SMTP Settings, fill in:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (TLS)
   - Username: `resend`
   - Password: the API key from step 4
   - Sender email: an address on the domain you verified
6. Save, then Supabase dashboard → Authentication → Providers → Email →
   send yourself a test signup and confirm the email actually arrives.

Nothing in `wrangler.toml` or `.dev.vars` is involved in this section —
it's entirely inside Supabase's own settings.

---

## 2. Welcome + promotional mail (this backend, via Resend)

This part **is** code, already wired up:

- `backend/src/lib/email.js` — thin Resend HTTP API wrapper (no SMTP
  client needed; Workers can't run one anyway). Fails soft everywhere: a
  missing key or a Resend outage logs a warning and never breaks signup
  or anything else that triggers it.
- `sendWelcomeEmail()` — called once, fire-and-forget, at the end of
  `POST /v1/auth/signup`.
- `sendPromotionalEmailBatch()` — used by the new `POST
  /v1/admin/broadcast` route, sending only to users whose
  `consent_preferences.marketing` is `true` (opt-in by default — see the
  schema; nobody is emailed promotionally without asking).

### Setup

You can reuse the exact same Resend account and verified domain from §1,
or use a different one — Resend doesn't care which product uses the key.

1. Resend → **API Keys** → create one (or reuse the one from §1 — a
   separate key isn't required, just tidier if you ever want to revoke
   one without affecting the other).
2. Set two Worker secrets (Cloudflare dashboard → Workers & Pages →
   your Worker → Settings → Variables and Secrets, or `wrangler secret
   put <NAME>` from `backend/`):
   - `RESEND_API_KEY` — the key from step 1
   - `EMAIL_FROM_ADDRESS` — e.g. `BharatSpace <hello@yourdomain.com>`,
     where `yourdomain.com` is verified in Resend
3. Deploy (`npm run deploy` from `backend/`). Sign up a new test account
   and confirm the welcome email arrives.

Leave either secret unset and both features no-op safely — nothing else
in the app depends on them.

### Sending a promotional email

`POST /v1/admin/broadcast` with a Bearer token belonging to a user who
holds the `admin` role:

```json
{ "subject": "New in BharatSpace", "html": "<p>...</p>" }
```

There's no UI for granting the `admin` role yet — do it once via
Supabase's SQL Editor:

```sql
insert into user_roles (user_id, role_id)
select '<your-user-id>', id from roles where name = 'admin';
```

The route itself re-derives the recipient list from
`consent_preferences.marketing = true` every time — you can't pass an
address list in, by design, so this can never be used to mail someone who
hasn't opted in.

---

## 3. OTP specifically

`docs/Application_Level_1_Execution_Guideline.md` lists `POST
/v1/auth/otp/verify` as a planned phone-OTP endpoint. Phone OTP (unlike
email confirmation) is sent and verified entirely by Supabase Auth's own
SMS provider integration (Twilio, MessageBird, etc., configured under
Authentication → Providers → Phone) — the same "dashboard, not code"
rule as §1 applies, with a paid SMS provider instead of SMTP. That
endpoint isn't implemented in `routes/auth.js` yet; this doc only covers
the email side.
