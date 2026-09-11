# Progress & next steps

Living record of what's been built, what's left, and what needs a decision
from you specifically (not something that can be coded around). Update
this file as things move, don't let it go stale — a wrong status here is
worse than no doc at all.

## Setup you still need to do (config, not code)

1. **Run migrations 013–021** (`docs/migrations/`) against your Supabase
   project, in order, if you haven't already. Each file's own comment
   says exactly what it does and why.
2. **Confirmation email isn't sending** because two Cloudflare Worker
   secrets aren't set yet — the code path is already correct (verified by
   reading the current `auth.js`/`email.js` directly):
   - `wrangler secret put RESEND_API_KEY`
   - `wrangler secret put EMAIL_FROM_ADDRESS` (must be on a Resend-verified sending domain)
   - `FRONTEND_URL` is already set correctly in `wrangler.toml` — nothing
     to do there.
   - Redeploy after adding secrets — they don't apply to an already-running Worker.
   - Separately: Supabase dashboard → Authentication → Providers → Email
     → "Confirm email" controls whether `signInWithPassword` actually
     blocks an unconfirmed user. That's independent of the sending pipeline above.
3. **Realtime** (`docs/migrations/013_enable_realtime.sql`) needs
   `messages` and `user_settings` added to the `supabase_realtime`
   publication — that migration does it via SQL, or toggle it in
   Database → Replication if you'd rather.

## Done and verified (builds clean, backend syntax-checked)

- **Bottom-anchoring / keyboard behavior** — Chat, Comments, Reels
  comment/share, Share sheet, New-message picker: all keyboard-aware via
  `src/utils/useKeyboardInset.js`, no hardcoded pixel offsets. BottomNav
  hides app-wide (not just visually covered) whenever any keyboard is
  open — see `src/components/AppLayout.jsx`.
- **Profile Share button** — was failing silently (no toast on any
  branch); now matches `PostDetail.jsx`'s already-correct pattern.
- **Account types** (Personal/Creator/Brand/Community) — reused the
  existing `roles`/`user_roles` seam rather than adding a column (see
  `docs/migrations/014_community_role.sql`). Real switcher at
  `/settings/account-type`.
- **Live streaming entry point** — real session lifecycle
  (`live_streams` table), live viewer count + chat via Supabase Realtime
  Presence/Broadcast. Video itself is **not** transported to viewers yet
  — see "Blocked on your decision" below.
- **Chat calling buttons** — same honest split as Live: real local
  preview + connection signaling, no actual peer audio/video yet.
- **Your Insights** (all 4 rows) — real aggregates from
  posts/reactions/comments/follows, no new tracking table.
- **Settings rows now real** (previously ComingSoon): Topics & interests,
  Help & support (real ticket table), Accessibility, Ads & preferences,
  Data usage, Close friends, Account protection + App & device (shared
  "login activity" screen, logged from the frontend post-sign-in — not
  from `auth.js`, deliberately, since that file was under your own
  active refactor and I didn't want to create a merge conflict with it),
  Time management + Your activity insights (device-local screen-time
  counter + a real reminder toggle), Feed & recommendations (prioritize
  toggle + a real "reset" that clears your actual hidden-posts list),
  Professional dashboard (points at the real Insights Overview).

## Not started yet

- **Archive / Your content** — needs an `archived` boolean on `posts`
  plus a management screen (list your posts, archive/unarchive, delete).
  Scoped, not started.

## Blocked on your decision, not effort

- **Payments** (Money & Business: payouts, transactions) — needs you to
  pick and connect a processor (Razorpay/Stripe/etc.). No code can make
  this real without that account existing first.
- **Real audio/video transport** for Live and Call — needs a WebRTC
  signaling/media-server choice (self-hosted vs. LiveKit/Agora/Cloudflare
  Calls/etc.). Every screen that touches this says so in its own comment
  and in the UI copy shown to users, rather than faking a connection.

## Patches applied so far (for reference)

- `changes.patch` (bottom-anchoring/keyboard fixes) — applied in
  `d621f55 "CHANGE"`.
- `changecommit.patch` (account types, Topics, Live, Call, Insights, Help
  & support) — applied in `1f56df6 "Apply changecommit patch"`.
- Next one covers everything in "Done and verified" above that isn't in
  those two.
