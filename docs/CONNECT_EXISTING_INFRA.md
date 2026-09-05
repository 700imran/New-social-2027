# Connecting BharatSpace to your existing Supabase + Cloudflare setup

You already created the Supabase project, the R2 bucket, and the Worker,
and already set the Worker's secrets. This guide does **not** ask you to
create any of that again. It's a checklist to **verify each piece is
configured correctly**, plus the one thing that wasn't done yet: the
frontend now actually calls the backend (see `ARCHITECTURE.md` for what
changed in the code). Go through this top to bottom once — most of it is
"open a dashboard tab and confirm a value."

Nothing here requires a new Supabase project, a new R2 bucket, or a new
Worker. You're pointing the existing frontend at the infrastructure you
already have.

**Two related docs, if you haven't seen them**: [`SECURITY.md`](./SECURITY.md)
covers the rate limiting / Turnstile / session-security additions in
detail, and [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md) is the
condensed, ordered version of everything in this file plus those two,
start to finish.

---

## 0. The three pieces and how they connect

```
 React app (Vite)          Cloudflare Worker            Supabase              Cloudflare R2
 src/api/client.js  ─────▶  backend/src/index.js  ─────▶ Postgres + Auth       object storage
 (VITE_API_BASE_URL)        (your deployed Worker)       (RLS-scoped queries)  (media, via presigned
                                    │                                          PUT URLs — never
                                    └──────────────────────────────────────▶   through the Worker)
```

- The **frontend never talks to Supabase or R2 directly** for data — only
  to your Worker, at whatever URL you deployed it to.
- The **Worker never touches file bytes** — it hands the browser a
  short-lived signed URL and the browser uploads straight to R2.
- Every DB query the Worker makes runs with *the calling user's own JWT*,
  so Postgres Row-Level Security (RLS) — not just the Worker's code — is
  what actually stops one user from reading/writing another's rows.

---

## 1. Verify your Supabase project

Open your project at [supabase.com](https://supabase.com/dashboard).

### 1.1 Schema

**Table Editor** → confirm these tables exist: `users`, `roles`,
`user_roles`, `profiles`, `follows`, `blocks`, `consent_preferences`,
`audit_log`, `media_assets`, `posts`, `comments`, `reactions`,
`notifications`, `brands`, `campaigns`, `creator_offers`, `deliverables`,
`transactions`, plus `reports` and `saved_posts` (added after the base
schema — see below).

If any of the first 18 are missing, open **SQL Editor** and run
[`docs/bharatspace_level1_schema.sql`](./bharatspace_level1_schema.sql)
exactly as provided — it's written to be safe to run once on an empty
schema. It will error (harmlessly) if some tables already exist and others
don't; in that case run it in a scratch/empty project instead, or add the
missing tables by hand from the file.

If `reports` and/or `saved_posts` are missing — expected if you ran the
base schema before those features existed — run
[`docs/migrations/004_catch_up_to_current_scope.sql`](./migrations/004_catch_up_to_current_scope.sql).
It's additive-only and safe to re-run.

### 1.2 Auth settings

**Authentication → Providers → Email**:

- **"Confirm email"** — if this is **on**, a new signup can't sign in until
  they click the confirmation link in their inbox. The app already handles
  this (`AppContext.jsx`'s `signUp()` reads `needsConfirmation` straight
  off the signup response and sends the person to the sign-in screen with
  a toast instead of straight into onboarding), so either setting works —
  **as long as the confirmation email itself actually arrives**, which
  needs SMTP configured (see `EMAIL_SETUP.md` — that doc's §0 is exactly
  the "signup succeeds, login always fails" symptom if you're seeing it).
  For fastest local testing, turning "Confirm email" **off** lets you sign
  up and land straight in the app with no inbox step.
- **Authentication → URL Configuration** — add your frontend's deployed
  URL (e.g. `https://bharatspace.pages.dev`) to **Redirect URLs** once you
  have one. Not required for the current flow (sign-up/sign-in return a
  session directly from the Worker, no email-link redirect involved yet),
  but Supabase will otherwise reject any confirmation-link redirect later.

### 1.3 Keys — where the Worker's secrets come from

**Project Settings → API**:

| Value | Goes into |
|---|---|
| Project URL | Cloudflare dashboard Variable → `SUPABASE_URL` (see §2.3 — not `wrangler.toml` anymore) |
| `anon` `public` key | `.dev.vars` / dashboard Secret → `SUPABASE_ANON_KEY` |
| `service_role` key | `.dev.vars` / dashboard Secret → `SUPABASE_SERVICE_ROLE_KEY` |

**Project Settings → API → JWT Settings**:

| Value | Goes into |
|---|---|
| JWT Secret | `.dev.vars` / `wrangler secret` → `SUPABASE_JWT_SECRET` |

You said these are already set as Worker secrets — the table above is just
so you can confirm each one is the *current* value for *this* project (a
common gotcha: pasting keys from an old/different Supabase project).

Quickest way to check what's actually live in production right now:

```bash
cd backend
npx wrangler secret list
```

This lists secret **names** only (not values, by design) — confirm
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`,
`R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` are all present. If one is
missing or you're not sure the value is current:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# paste the value, press enter
```

### 1.4 Row-Level Security sanity check

**Table Editor → profiles → RLS** should show "Enabled" with two policies
("profiles are publicly readable", "users can update their own profile").
Same for `posts`, `follows`, `consent_preferences`, `media_assets`,
`notifications`. If RLS shows "Disabled" on any of these, re-run the
relevant `alter table ... enable row level security;` lines from the
schema file.

> **Note on `users`, `roles`, `user_roles`, `blocks`, `audit_log`:** the
> Level 1 schema intentionally does not enable RLS on these (see the
> schema file's comments). `blocks` and `user_roles` having no RLS means
> any authenticated request can currently read/write them — fine for a
> small Level 1 build, worth tightening with an RLS policy before you have
> real users relying on blocking. Not something this pass changed or
> needed to change.

---

## 2. Verify your Cloudflare R2 bucket + Worker

### 2.1 R2 bucket

**Cloudflare dashboard → R2 → your bucket** (`bharatspace-media` unless
you named it differently):

- Confirm the bucket exists and note its name — it must match
  `R2_BUCKET_NAME` (Cloudflare dashboard Variable, see §2.3).
- **Settings → Public access**: for `R2_PUBLIC_BASE_URL` (used to render
  uploaded photos back in the feed) to resolve, the bucket needs either:
  - a **custom domain** connected (Settings → Custom Domains → Connect
    Domain), or
  - the **r2.dev** public bucket URL enabled (Settings → Public access →
    Allow Access — gives you a URL like
    `https://pub-xxxxxxxx.r2.dev`).

  Whichever you use, that exact URL (no trailing slash) is what
  `R2_PUBLIC_BASE_URL` (dashboard Variable) must be set to.

- **CORS**: uploads go *from the browser straight to R2* via a presigned
  URL (see `backend/src/routes/media.js`), which means **R2 itself**, not
  just the Worker, needs a CORS policy allowing your frontend origin to
  `PUT`. Settings → CORS Policy → add:

  ```json
  [
    {
      "AllowedOrigins": ["https://YOUR-FRONTEND.pages.dev", "http://localhost:5173"],
      "AllowedMethods": ["PUT"],
      "AllowedHeaders": ["Content-Type"],
      "MaxAgeSeconds": 3000
    }
  ]
  ```

  Without this, photo uploads will fail in the browser with a CORS error
  even though the presigned URL itself is valid — this is the single most
  common reason "everything's configured but uploads still fail."

### 2.2 R2 API token (used to *sign* upload URLs)

**Cloudflare dashboard → R2 → Manage R2 API Tokens** — confirm a token
exists scoped to this bucket with **Object Read & Write** permission, and
that its Access Key ID / Secret Access Key are what's stored in
`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (`wrangler secret list`, per
§1.3, to check the names are present; regenerate + re-put if you're not
sure the values are current).

### 2.3 Worker config — set in the Cloudflare dashboard, not a file

These are plaintext config, not secrets, but they're **no longer set in
`wrangler.toml`** — that file used to have a `[vars]` block, and committing
real-looking values there meant every `wrangler deploy` re-pushed
whatever was in the file and silently overwrote anything set through the
dashboard. Set every one of these instead at **Workers & Pages →
bharatspace-api → Settings → Variables and Secrets → Add**:

```
SUPABASE_URL       = https://YOUR-PROJECT.supabase.co      # from §1.3
R2_PUBLIC_BASE_URL = https://media.yourdomain.com           # from §2.1
R2_ACCOUNT_ID      = your-cloudflare-account-id             # dashboard → Overview, right sidebar
R2_BUCKET_NAME     = bharatspace-media                      # must match §2.1
MEDIA_MAX_BYTES    = 26214400                                # optional — code defaults to this if unset
ALLOWED_ORIGINS    = https://YOUR-FRONTEND.pages.dev         # see §3 — new in this pass
FRONTEND_URL       = https://YOUR-FRONTEND.pages.dev         # builds the password-reset email link, see SECURITY.md §5
```

For local `wrangler dev`, the same names go in `backend/.dev.vars`
(gitignored) — copy `.dev.vars.example` to get the full list, secrets
included.

Also see [`SECURITY.md`](./SECURITY.md) §1 for the `[[ratelimits]]` blocks,
which *do* still live in `wrangler.toml` (they're not secrets and aren't
per-account config) — those need **Wrangler v4+** to be recognized at all
(`backend/package.json` already pins this; `rm -rf node_modules &&
npm install` if you're on an older local checkout).

If any of these are still unset, or still say `YOUR-PROJECT` /
`your-cloudflare-account-id` in whatever you copied them from, **the
Worker is not actually pointed at your real project yet** — this is a
very common way for "I set the secrets" to still not work: secrets and
these plain variables are two different things, and only the former was
likely scripted/remembered. Fill these in with real values in the
dashboard, then redeploy (§4) to be sure the running Worker has picked
them up.

---

## 3. What changed in the code this pass

Three things were added/fixed so the frontend and backend can actually
talk to each other — not infrastructure, just code already in this repo:

1. **`ALLOWED_ORIGINS`** (`backend/src/index.js`, value set as a Cloudflare
   dashboard Variable — see §2.3) — CORS
   on the Worker itself was hardcoded to `localhost` only, so a deployed
   frontend would be silently blocked by the browser. It's now a
   comma-separated env var. **Set it to your deployed frontend's URL**
   (§2.3) or every request from the deployed app will fail CORS while
   `localhost` keeps working, which is a confusing way to debug.
2. **`POST /v1/auth/refresh`** (`backend/src/routes/auth.js`) — Supabase
   access tokens expire in ~1 hour. This lets the frontend silently renew
   a session instead of forcing a re-login every hour.
3. **Response enrichment** (`backend/src/routes/posts.js`,
   `backend/src/routes/users.js`) — `GET /posts`, `GET /posts/:id`,
   `GET /posts/:id/comments`, and `GET /profiles/:id` now return author
   name/avatar, like/comment counts, and resolved R2 media URLs inline,
   instead of the bare table rows. The frontend needs this in one call per
   screen rather than fetching every author separately.
4. **Notifications are now created** on follow / comment / like (via
   `backend/src/lib/notify.js`, using the service-role key since
   `notifications` only has a read policy, not an insert one — see the
   file's comment). Without this the Activity tab would stay empty forever
   even once wired up, since nothing was ever writing to that table.

The frontend side: `src/context/AppContext.jsx` now branches on whether
`VITE_API_BASE_URL` is set (§5) — real backend calls when it is, the
original in-memory mock behavior when it isn't. Every page/component is
unchanged; they only ever call `useApp()`, per `ARCHITECTURE.md`'s
original design. A few small, deliberate exceptions where a page needed
one new line: `SignUp.jsx`/`SignIn.jsx`'s submit handlers now `await` the
real call, `CreatePost.jsx` keeps the actual `File` object (not just its
base64 preview) so it can be uploaded, and `PostDetail.jsx` fetches real
comments on open.

---

## 4. Deploy the Worker

```bash
cd backend
npm install
npx wrangler login          # if you haven't already in this environment
npx wrangler deploy
```

Note the URL it prints (something like
`https://bharatspace-api.YOUR-SUBDOMAIN.workers.dev`). Confirm it's alive:

```bash
curl https://bharatspace-api.YOUR-SUBDOMAIN.workers.dev/v1/health
# {"status":"ok","time":"..."}
```

If you get a 500 here, it's almost always an unset or leftover-placeholder
value from §2.3 (most often `SUPABASE_URL`) — check the Cloudflare
dashboard's Variables and Secrets list for the Worker, not `wrangler.toml`.
Check `npx wrangler tail` while you retry the request to see the real error.

---

## 5. Point the frontend at it

In the frontend root (not `backend/`):

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_API_BASE_URL=https://bharatspace-api.YOUR-SUBDOMAIN.workers.dev/v1
```

**The `/v1` suffix is required** — `src/api/client.js` appends paths like
`/auth/signup` directly onto this value.

```bash
npm run dev
```

Sign up with a real email + password. If it works, you're live — check
`§6` below and then deploy the frontend for real (§7).

---

## 6. Testing checklist

Work through this in order — each step depends on the previous one
actually working, so stop and fix rather than skipping ahead:

- [ ] `GET /v1/health` returns `{"status":"ok"}` (§4)
- [ ] Sign up with a real email → no CORS error in the browser console
- [ ] If "Confirm email" is on (§1.2): check the inbox, confirm, then sign
      in from `/signin`
- [ ] Land on `/onboarding`, pick a few topics, "Get Started" → lands on
      `/home` with an empty feed (expected — no posts yet)
- [ ] Create a post with text only → appears at the top of the feed
      immediately
- [ ] Create a post with a photo → the **real photo** appears in the feed
      (if you instead see a generic purple/orange arch illustration, the
      upload silently failed — check the browser console for an R2 CORS
      error, §2.1)
- [ ] Like the post → heart count increases; refresh the page → it's still
      liked (confirms the like persisted and `likedByMe` round-trips)
- [ ] Open the post, add a comment → appears in the thread
- [ ] Sign up a **second** account (private/incognito window), follow the
      first account, like/comment on their post
- [ ] Back in the first account → Activity tab shows the follow + like +
      comment notifications
- [ ] Sign out, close the tab, reopen the app → still signed in (confirms
      session persistence + refresh, §3.2)
- [ ] Edit Profile → change name/bio/location → Save → Profile screen
      reflects it, and it survives a refresh

If a step fails, the error toast text plus `npx wrangler tail` (run this
in `backend/` while you retry the action in the browser) will tell you
which layer it's in — Worker code, Supabase, or R2.

---

## 7. Deploy the frontend

This bundle is set up for Vercel — `.env.production` (repo root) already
bakes in this project's backend URL, and `vercel.json` (repo root)
handles SPA routing:

```bash
npm i -g vercel
vercel --prod
```

Vercel picks up `.env.production` automatically; a Vercel dashboard
environment variable of the same name (Settings → Environment Variables)
overrides it if you set one. Then go back to §2.3/§3 and set
`ALLOWED_ORIGINS` on the Worker to this real Vercel URL and redeploy the
Worker — **both** sides need to know about each other's real URL, and
it's easy to update one and forget the other.

(Any static host works, since this is a plain Vite build — swap this
step for Cloudflare Pages'/Netlify's deploy command if you'd rather use
one of those instead.)

---

## 8. Known gaps (by design, not oversight)

These are called out explicitly rather than silently faked, matching the
existing repo's own convention in `backend/README.md`:

- **Bookmarks/"saved" posts** — no table in the Level 1 schema. Stays a
  local-only, per-session affordance in both mock and live mode.
- **Reposts** — the `reactions` table has one row per `(post_id,
  user_id)`, so a "repost" reaction type would silently overwrite a
  user's existing like on the same post. Needs a schema change (a
  dedicated `reposts` table, or a wider primary key) to persist for real;
  stays a local-only visual action for now.
- **@mentions** — `notifications.type = 'mention'` exists in the schema
  and is mapped on the frontend, but nothing currently parses post/comment
  text for `@handle` references to create one. Follows, replies, and
  likes do create real notifications (§3).
- **People search** — no full-text user search endpoint. `SearchOverlay`
  searches everyone the app has already encountered in your session (feed
  authors, commenters, people you follow) rather than every registered
  user.
- **Avatar upload** — `profiles.avatar_asset_id` and the media upload
  pipeline both exist and work end-to-end for post photos; Edit Profile's
  UI doesn't yet have a "change photo" control wired to it.
- **Consent & Blocks endpoints** — implemented in the API
  (`/v1/consent`, `/v1/blocks`) but not wired to any screen, same status
  as Model 2 (Creator–Brand Commerce) already had per `ARCHITECTURE.md`.
- **Trending topics / Live Now / story highlights on Discover & Home** —
  illustrative static content, same as before this pass. There's no
  schema for trending computation or live broadcasts in Level 1.

None of these block the core loop (sign up → post → like → comment →
follow → get notified) from being fully real.
