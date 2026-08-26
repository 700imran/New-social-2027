# BharatSpace API — Reference Backend

A Cloudflare Workers implementation of the `/v1/...` contract from
[`../docs/Application_Level_1_Execution_Guideline.md`](../docs/Application_Level_1_Execution_Guideline.md),
backed by Supabase (Postgres + Auth) and Cloudflare R2 (media storage).
Zero-cost on both platforms' free tiers.

This is a **reference implementation you deploy yourself** — Claude can't
create a Supabase project or Cloudflare account on your behalf, so nothing
here is live until you complete the steps below. The frontend app runs
perfectly well without it (see the root README) and only needs this once
you're ready to move past the mock data.

## What's implemented

| Model | Routes | Status |
|---|---|---|
| 1 — User & Trust | `/v1/auth/*`, `/v1/users/*`, `/v1/profiles/*`, `/v1/follows`, `/v1/blocks`, `/v1/consent` | Full |
| 1 (social surface) | `/v1/posts`, `/v1/posts/:id/comments`, `/v1/posts/:id/react`, `/v1/notifications` | Full — extends Model 1 to back the feed, matching the `posts`/`comments`/`reactions`/`notifications` tables already in the schema |
| 3 — Media | `/v1/media/upload-url`, `/v1/media/:id` | Full — presigned R2 PUT URLs, server-side size/MIME validation |
| 2 — Commerce | `/v1/campaigns`, `/v1/offers`, `/v1/deliverables` | Basic CRUD only, as specified — matching/payouts stay stubbed |

Every route that touches user data builds its Supabase client from the
caller's own JWT (`src/lib/supabase.js`), so Postgres RLS — not just this
code — is what actually enforces "users only touch their own rows."

## Setup

1. **Create a free Supabase project** at supabase.com. In the SQL editor,
   run [`../docs/bharatspace_level1_schema.sql`](../docs/bharatspace_level1_schema.sql) exactly as provided.
2. **Collect your keys**: Project Settings → API → `Project URL`, `anon` key,
   `service_role` key, and Project Settings → API → JWT Settings → `JWT Secret`.
3. **Create a Cloudflare account** (free) and an R2 bucket:
   ```
   npx wrangler login
   npx wrangler r2 bucket create bharatspace-media
   ```
   Then Cloudflare dashboard → R2 → Manage R2 API Tokens → create an
   access key pair scoped to that bucket.
4. **Fill in config**:
   - Edit `wrangler.toml` → `[vars]`: set `SUPABASE_URL`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`.
   - Copy `.dev.vars.example` → `.dev.vars` and fill in the secret values from steps 2–3 (this file is gitignored).
5. **Install and run locally**:
   ```
   npm install
   npm run dev
   ```
   The API is now at `http://localhost:8787`. Try `GET /v1/health`.
6. **Point the frontend at it**: in `../` (the frontend root), set
   `VITE_API_BASE_URL=http://localhost:8787/v1` in a `.env.local` file.
   See `../src/api/client.js` for how the frontend picks this up — mock
   mode is the default until that variable is set.
7. **Deploy** when ready: `npm run deploy`, then for each secret in
   `.dev.vars`, run `npx wrangler secret put NAME` once so production has
   them too (wrangler.toml `[vars]` are plaintext and fine for non-secrets
   only).

## Notes and known gaps (called out explicitly, per the guideline)

- Signup/login here go through the Worker for convenience of having one
  base URL; in a typical Supabase app you'd often call `supabase-js`
  directly from the frontend for `/auth/*` instead. Both are valid —
  this repo picks the single-base-URL version so `src/api/client.js`
  only ever needs one `VITE_API_BASE_URL`.
- No malware/content-abuse scanning on uploads — explicitly deferred to
  a later phase in the guideline, not a silent omission.
- Rate limiting on `/v1/auth/*` is configured in the Cloudflare dashboard
  (Security → WAF → Rate limiting rules on the free plan), not in code.
- This backend hasn't been run against a live Supabase/Cloudflare project
  from this environment (no credentials available here) — the code is
  syntax-checked and reviewed against the Supabase/Hono/aws4fetch APIs,
  but test it against your own project before relying on it.
