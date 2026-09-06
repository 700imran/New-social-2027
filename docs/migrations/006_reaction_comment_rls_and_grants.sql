-- =====================================================================
-- Migration 006: RLS on comments/reactions + explicit Data API grants
-- Run this once in Supabase SQL Editor, on top of everything already run.
-- Safe to re-run: IF NOT EXISTS / DROP+CREATE POLICY / idempotent GRANTs
-- throughout, same convention as every prior migration in this folder.
--
-- PART 1 — why this fixes "likes/comments/saves aren't reaching Supabase"
-- ---------------------------------------------------------------------
-- bharatspace_level1_schema.sql enables row level security on every
-- table it defines EXCEPT two: `comments` and `reactions`. Every write
-- to those two tables goes through backend/src/routes/posts.js's
-- `userClient(env, jwt)` — a Supabase client scoped to the caller's own
-- JWT, which reaches Postgres the same way the Data API always does.
--
-- Supabase changed the platform default for that path this year: new
-- tables (and, from Oct 30 2026, *existing* tables too) no longer get
-- automatic SELECT/INSERT/UPDATE/DELETE grants for anon/authenticated —
-- https://supabase.com/docs/guides/api/securing-your-api. Without an
-- explicit GRANT, PostgREST rejects the request with a 42501 permission
-- error *before RLS is even evaluated* — and this app's own
-- backend/src/lib/errorHandler.js deliberately converts that into a
-- generic "Something went wrong" response so raw Postgres errors never
-- reach the browser (see its top-of-file comment). That's why the
-- failure looked silent: `toggleLike`/`toggleSave`/`addComment` in
-- AppContext.jsx all catch the rejected call and roll the optimistic UI
-- back with a toast, exactly as designed — there was just no visible
-- trace of *why* pointing at these two tables specifically.
--
-- `posts`, `saved_posts`, `follows`, etc. already work because this
-- project predates that change and was grandfathered with the old
-- auto-grant behavior — but that grandfathering ends **Oct 30, 2026**,
-- after which every table below would stop working the same way unless
-- it has an explicit grant. Part 2 adds those now, project-wide, rather
-- than only for the two tables causing trouble today.
-- =====================================================================

-- ---------------------------------------------------------------------
-- comments — was missing RLS entirely (readable/writable by any grant
-- holder, no row filtering at all). Comments are meant to be public
-- (same visibility model as posts), but only the author should be able
-- to edit or delete their own.
-- ---------------------------------------------------------------------
alter table comments enable row level security;

drop policy if exists "comments are publicly readable" on comments;
create policy "comments are publicly readable"
  on comments for select using (true);

drop policy if exists "users create their own comments" on comments;
create policy "users create their own comments"
  on comments for insert with check (auth.uid() = author_id);

drop policy if exists "authors manage their own comments" on comments;
create policy "authors manage their own comments"
  on comments for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "authors delete their own comments" on comments;
create policy "authors delete their own comments"
  on comments for delete using (auth.uid() = author_id);

-- ---------------------------------------------------------------------
-- reactions — same gap. Who-liked-what is already public information
-- (enrichPosts() returns likeCount/likedByMe to any caller), so SELECT
-- is open; a user can only ever write their own row.
-- ---------------------------------------------------------------------
alter table reactions enable row level security;

drop policy if exists "reactions are publicly readable" on reactions;
create policy "reactions are publicly readable"
  on reactions for select using (true);

drop policy if exists "users manage their own reactions" on reactions;
create policy "users manage their own reactions"
  on reactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- PART 2 — explicit grants for every app table, ahead of the Oct 30 2026
-- enforcement date. `anon` only ever gets SELECT on publicly-readable
-- tables (matching what the RLS policies above already allow it to see
-- anyway); `authenticated` gets what its policies actually use;
-- `service_role` (adminClient() in backend/src/lib/supabase.js, used by
-- backend/src/routes/admin.js) gets full access since it bypasses RLS by
-- design.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Publicly-readable, authenticated-writable (their own rows)
grant select on public.comments, public.reactions, public.posts, public.follows,
  public.profiles, public.media_assets, public.post_tags to anon, authenticated;
grant insert, update, delete on public.comments, public.reactions, public.posts,
  public.follows, public.media_assets, public.post_tags to authenticated;

-- Private to the owner — no anon SELECT
grant select, insert, update, delete on public.saved_posts, public.consent_preferences
  to authenticated;

-- Auth-only, no direct client writes (backend still uses service_role for
-- these two — see routes/reports.js and routes/*.js's notify() calls —
-- but authenticated needs INSERT for reports per migration 002/004's
-- "users create their own reports" policy)
grant select on public.notifications to authenticated;
grant insert on public.reports to authenticated;
grant select on public.reports to authenticated;

-- Commerce model (brands/campaigns/creator_offers/deliverables/
-- transactions) — schema-ready but no route queries these yet (see
-- ARCHITECTURE.md's Model 2 note). Granting service_role now, ahead of
-- when Creator Studio/Brand Studio actually ship, costs nothing and
-- avoids a second migration later.
grant select, insert, update, delete on public.brands, public.campaigns,
  public.creator_offers, public.deliverables, public.transactions
  to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;

-- =====================================================================
-- After this runs: comments and reactions behave like every other table
-- in this schema (RLS on, public read, owner-only write), and every
-- table's Data API access is explicit rather than relying on the
-- platform default that Supabase is phasing out. Re-run safely any time.
-- =====================================================================
