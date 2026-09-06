-- Migration 010: RLS + grants on `blocks`, `users`, and `audit_log` —
-- three tables the base schema (bharatspace_level1_schema.sql) created
-- with no RLS enabled at all, and that migration 006's grant pass also
-- missed (it only covered the tables that were causing the visible
-- likes/comments/saves symptom at the time). Found during a follow-up
-- audit of every table for the same gap.
--
-- Why this matters, same reasoning as migration 006:
-- 1) Security today: with RLS off, nothing at the *database* layer stops
--    one authenticated caller from reading or writing another user's
--    rows in these tables directly through the Data API — only this
--    app's own Worker code choosing to always scope queries to the
--    caller's own id ever kept that from mattering. RLS is the layer
--    that's supposed to make that true regardless of what any given
--    piece of application code does.
-- 2) A live bug today: with no RLS/rehydration for `blocks`, there was
--    no GET /v1/blocks endpoint at all — so AppContext.jsx's
--    `blockedUserIds` was never seeded from the `blocks` table on load,
--    only ever set by calling toggleBlock() again in that same session.
--    A page refresh silently un-hid a blocked user's posts from the
--    feed, even though the block itself was still there server-side the
--    whole time. This migration is paired with a new GET /blocks route
--    (backend/src/routes/follows.js) and AppContext fetching it on
--    session hydrate, same as hidden_posts/mutes already do.
-- 3) A ticking bug: Supabase requires an explicit grant for Data API
--    access from Oct 30, 2026 (see migration 006's Part 1 for the full
--    explanation) — any table relying on the old auto-grant behavior,
--    including these three, silently stops working on that date without
--    this.
--
-- Safe to re-run: IF NOT EXISTS / DROP+CREATE POLICY throughout.

-- ---------------------------------------------------------------------
-- blocks — same visibility model as saved_posts/hidden_posts/mutes: only
-- you can see or manage who you've blocked.
-- ---------------------------------------------------------------------
alter table blocks enable row level security;

drop policy if exists "users read their own blocks" on blocks;
create policy "users read their own blocks"
  on blocks for select using (auth.uid() = blocker_id);

drop policy if exists "users create their own blocks" on blocks;
create policy "users create their own blocks"
  on blocks for insert with check (auth.uid() = blocker_id);

drop policy if exists "users remove their own blocks" on blocks;
create policy "users remove their own blocks"
  on blocks for delete using (auth.uid() = blocker_id);

grant select, insert, delete on public.blocks to authenticated;

-- ---------------------------------------------------------------------
-- users — holds `email`/`phone`, which is more sensitive than anything
-- else this app treats as "publicly readable" (profiles/posts/follows/
-- etc.). But `id` and `created_at` genuinely do need to be visible for
-- *any* user, not just yourself — GET /v1/profiles/:id (any profile,
-- not just your own) reads another user's `users.created_at` to show
-- "Joined <month year>" on their profile. RLS controls row visibility,
-- not columns, so the fix is a public SELECT policy (every other public
-- table in this schema already uses `using (true)` for exactly this)
-- *combined with* a column-level GRANT that only exposes `id` and
-- `created_at` — never `email`/`phone` — to anon/authenticated. Postgres
-- enforces column grants independently of RLS, and PostgREST (Supabase's
-- Data API) respects them, so this is what actually keeps email/phone
-- out of reach even though the row itself is publicly selectable.
-- Application code already never selects more than id/created_at
-- through the anon/authenticated path (backend/src/routes/users.js,
-- routes/posts.js) — the one place email/phone IS read
-- (routes/admin.js's broadcast feature) uses the service-role client,
-- which bypasses RLS and column grants entirely by design.
-- ---------------------------------------------------------------------
alter table users enable row level security;

drop policy if exists "id and creation date are publicly visible" on users;
create policy "id and creation date are publicly visible"
  on users for select using (true);

grant select (id, created_at) on public.users to anon, authenticated;

-- ---------------------------------------------------------------------
-- audit_log — an internal record, not something regular users should be
-- able to browse (no SELECT grant for anon/authenticated at all). It IS
-- written from the user-scoped client in two places today
-- (backend/src/routes/follows.js's block handler, routes/consent.js) —
-- both already pass `actor_id: c.get('userId')`, so this policy just
-- makes that the enforced rule rather than an unenforced convention.
-- Every other write site (routes/auth.js signup, routes/admin.js
-- broadcast) uses the service-role client already, unaffected by this.
-- ---------------------------------------------------------------------
alter table audit_log enable row level security;

drop policy if exists "users log their own actions" on audit_log;
create policy "users log their own actions"
  on audit_log for insert with check (auth.uid() = actor_id);

grant insert on public.audit_log to authenticated;

-- =====================================================================
-- After this runs: `blocks`, `users`, and `audit_log` behave like every
-- other table in this schema — RLS on, access scoped to what the app
-- actually needs, nothing left on the old auto-grant behavior Supabase
-- is phasing out.
-- =====================================================================
