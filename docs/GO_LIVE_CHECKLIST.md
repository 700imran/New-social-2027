# Go-live checklist

Everything in order, start to finish, on a $0 Supabase + Cloudflare setup.
Each step says which doc has the detail if you need it — this page is the
sequence, not the explanation.

Total cost at the traffic level a new app actually sees: **$0**. Every
mechanism used here (Workers rate limiting, Turnstile, R2, Supabase Auth)
has a free tier sized for exactly this stage. See
[`SECURITY.md`](./SECURITY.md) for why each one was chosen with that
constraint in mind, and the note at the bottom of this page for what to
watch as you actually grow past it.

## 0. Prerequisites

- [ ] Node 18+, and in `backend/`: `wrangler` is pinned to `^4` in
      `package.json`. If you have an older checkout, `rm -rf node_modules
      package-lock.json && npm install` to pick it up — **the new rate
      limiting config silently doesn't work on Wrangler 3**, see
      `SECURITY.md` §1.
- [ ] A Supabase project and a Cloudflare account with an R2 bucket
      already exist (per your own setup) — this checklist verifies and
      completes their configuration, it doesn't create them from scratch.

## 1. Supabase

- [ ] Schema matches `docs/bharatspace_level1_schema.sql` (Table Editor —
      spot-check the table list). Run the file in SQL Editor if anything's
      missing. Then run `docs/migrations/004_catch_up_to_current_scope.sql`
      (additive — adds `reports` and `saved_posts`, the two tables the
      current code needs that aren't in the base schema file; safe to
      run even if you'd already run `002_reports.sql`/`003_saved_posts.sql`
      individually before).
- [ ] Authentication → Providers → Email → decide on "Confirm email" (on
      = safer, needs working outbound email; off = faster to test with).
- [ ] **Authentication → Emails → SMTP Settings**: Supabase's built-in
      sender has a low rate limit and often lands in spam — for anything
      beyond local testing, connect a real SMTP provider (Resend's free
      tier is a common choice). Password reset (§ below) depends on this
      actually arriving. Full walkthrough, plus the separate welcome/
      promotional email setup: `EMAIL_SETUP.md`.
- [ ] `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` Worker secrets set, if you
      want the welcome email and `/admin/broadcast` to actually send
      (`EMAIL_SETUP.md` §2) — optional, both no-op safely if left unset.
- [ ] **Authentication → URL Configuration → Redirect URLs**: add your
      deployed frontend origin.
- [ ] Note down: Project URL, `anon` key, `service_role` key, JWT Secret
      (Project Settings → API). Full detail: `CONNECT_EXISTING_INFRA.md` §1.

## 2. Cloudflare — R2 + Turnstile

- [ ] R2 bucket exists, and either a custom domain or the r2.dev public
      URL is enabled under its Settings → Public access. Note the
      resulting URL.
- [ ] R2 bucket's **CORS policy** allows `PUT` from your frontend's real
      origin (dashboard → your bucket → Settings → CORS Policy) — uploads
      go browser-to-R2 directly, so this is required on the bucket
      itself, not just the Worker. Detail + JSON snippet:
      `CONNECT_EXISTING_INFRA.md` §2.1.
- [ ] An R2 API token exists with Object Read & Write on this bucket
      (dashboard → R2 → Manage R2 API Tokens).
- [ ] *(Recommended, free)* Create a Turnstile widget (dashboard →
      Turnstile → Add widget) for your frontend's domain. Note the Site
      Key and Secret Key. Detail: `SECURITY.md` §2.

## 3. Backend config — Cloudflare dashboard only, never in a file

Workers & Pages → **bharatspace-api** → Settings → **Variables and Secrets**
→ Add. `wrangler.toml` no longer declares a `[vars]` block on purpose —
values committed there get re-pushed on every deploy and silently
overwrite anything set in the dashboard, which is what broke signup/login
last time even though the secrets looked right. Set everything here
instead (the dashboard's "Variable" vs "Secret" toggle doesn't change how
the code reads them — `c.env.NAME` either way — use Secret for anything
sensitive):

- [ ] `SUPABASE_URL` — your real project URL, not a placeholder
- [ ] `R2_PUBLIC_BASE_URL`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME` — from §2
- [ ] `ALLOWED_ORIGINS` — your deployed frontend's real URL (you'll get
      this in §6 — come back and fill it in, then redeploy)
- [ ] `FRONTEND_URL` — same as above; this builds the password-reset
      email's redirect link
- [ ] `MEDIA_MAX_BYTES` — optional, defaults to 25 MB (26214400) if unset
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`
- [ ] `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- [ ] `TURNSTILE_SECRET_KEY` — optional, skip if not using Turnstile

Leaving any of `SUPABASE_URL`/`R2_ACCOUNT_ID`/`R2_PUBLIC_BASE_URL` unset or
as a leftover placeholder anywhere is the single most common reason
"I set the secrets but it still doesn't work."

For local `wrangler dev`: copy `backend/.dev.vars.example` to
`backend/.dev.vars` (gitignored) and fill in the same names there —
`wrangler dev` reads that file instead of the dashboard.

- [ ] `[[ratelimits]]` blocks in `wrangler.toml` — left as-is unless you
      want different thresholds (`SECURITY.md` §1 has the table of
      current limits). These stay in the file; they're not secrets.

## 5. Deploy the backend

```bash
cd backend
npm install
npx wrangler login   # if needed
npx wrangler deploy
```

- [ ] `npx wrangler deploy --dry-run` output lists all four
      `env.*_RATE_LIMITER` bindings (confirms Wrangler v4 picked up the
      rate-limit config)
- [ ] `curl https://YOUR-WORKER.workers.dev/v1/health` → `{"status":"ok"}`

## 6. Deploy the frontend (Vercel)

`.env.production` (repo root) already bakes in this bundle's backend URL
(`https://new-social-2027.imrankhan210r.workers.dev/v1`) — Vercel picks it
up automatically during its build, so there's no environment variable to
set in the Vercel dashboard unless you want to override it:

```bash
npm i -g vercel   # once
vercel --prod
```

`vercel.json` (repo root) handles client-side routing so direct
links to e.g. `/privacy` don't 404 — Vercel doesn't do SPA fallback
automatically the way some static hosts do.

- [ ] Note the URL Vercel gives you (`https://your-project.vercel.app` or
      a custom domain)
- [ ] To point at a *different* backend than the one baked in: either
      edit `web/.env.production` and redeploy, or set `VITE_API_BASE_URL`
      as a Vercel dashboard environment variable (Settings → Environment
      Variables) — the dashboard value takes precedence over the
      committed file
- [ ] Go back to step 4, set `ALLOWED_ORIGINS`/`FRONTEND_URL` on the
      Worker to this real Vercel URL (plus `https://localhost` if you're
      also using the Android app in `../android`), and redeploy the
      Worker. Both sides need each other's real URL, and it's easy to
      update one and forget the other.

(Any static host works, since this is a plain Vite build — Cloudflare
Pages, Netlify, etc. all work the same way if you'd rather not use
Vercel; just replace this step with that host's deploy command.)

## 6b. Build the Android app

`../android/` bundles this same web build into a native app via
Capacitor. Easiest path — push this whole bundle to GitHub and let
`.github/workflows/build-apk.yml` build a real APK on GitHub's runners:

- [ ] Push to GitHub (all four folders — `web/`, `backend/`, `android/`,
      `docs/` — at the repo root, as they are in this bundle)
- [ ] Actions tab → **Build Android APK** → Run workflow (or push to
      `main`)
- [ ] Download the `bharatspace-debug-apk` artifact once it finishes,
      install it on your device
- [ ] Confirm `https://localhost` is in the Worker's `ALLOWED_ORIGINS`
      (step 4) — this is Capacitor's WebView origin and is required
      regardless of what device the app runs on

Full detail, including signing a release build for Play Store, in
`../android/README.md`.

## 7. Verify end to end

Full walkthrough in `CONNECT_EXISTING_INFRA.md` §6; security-specific
checks in `SECURITY.md`'s testing checklist. Minimum before calling it
launched:

- [ ] Sign up with a real email, no CORS errors in the console
- [ ] Password reset email actually arrives (this is the step most likely
      to silently fail if §1's SMTP setup was skipped)
- [ ] Welcome email arrives if `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` are
      set (`EMAIL_SETUP.md` §2) — check spam the first time
- [ ] Create a post with a photo → the real photo renders, not a
      placeholder illustration (confirms R2 CORS from §2 is correct)
- [ ] Close the tab, reopen → still signed in
- [ ] `bs_rt` cookie is `HttpOnly` + `Secure` in devtools, and no token
      sits in `localStorage`

## 8. Ongoing — watching the free tier, not paying for it

Nothing here needs a credit card, but keep an eye on usage rather than
finding out the hard way. All checkable from the dashboards, no extra
tooling:

- **Cloudflare dashboard → Workers → your Worker → Metrics**: daily
  request count against the 100,000/day Free cap.
- **Cloudflare dashboard → R2 → your bucket → Metrics**: storage against
  10GB, Class A/B operations against their monthly allotments.
- **Supabase dashboard → Project → Usage**: database size against 500MB,
  Auth MAU against 50,000. Also note **free Supabase projects pause after
  a week with no activity** — a scheduled request (even just hitting
  `/v1/health` daily) or occasional real traffic keeps it warm.

If you outgrow any of these, it's a plan upgrade on that one service, not
a rebuild — nothing in this architecture assumes the free tier at the
code level, only at the config level (`wrangler.toml`'s rate limits, R2
CORS, etc.), all of which stay useful past $0 too.
