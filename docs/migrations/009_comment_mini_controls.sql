-- Migration 009: comment mini-controls — like a comment, pin a comment,
-- and let a post's own author delete any comment on their post (not just
-- comment authors deleting their own, which migration 006 already
-- covers).
--
-- Additive only — run once against your existing Supabase project (SQL
-- Editor), after 008. Safe to re-run: IF NOT EXISTS / DROP+CREATE POLICY
-- throughout, same convention as every prior migration in this folder.

-- ---------------------------------------------------------------------
-- comment_reactions — one row per (comment, user), same shape as the
-- existing `reactions` table just scoped to comments instead of posts.
-- Public read (who-liked-what is already public info for post reactions,
-- same reasoning applies here), write restricted to your own row.
-- ---------------------------------------------------------------------
create table if not exists comment_reactions (
  comment_id uuid references comments(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  type text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_reactions_comment_idx on comment_reactions(comment_id);

alter table comment_reactions enable row level security;

drop policy if exists "comment reactions are publicly readable" on comment_reactions;
create policy "comment reactions are publicly readable"
  on comment_reactions for select using (true);

drop policy if exists "users manage their own comment reactions" on comment_reactions;
create policy "users manage their own comment reactions"
  on comment_reactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.comment_reactions to anon;
grant select, insert, update, delete on public.comment_reactions to authenticated;

-- ---------------------------------------------------------------------
-- posts.pinned_comment_id — one pinned comment per post. Only the post's
-- own author can set it (checked explicitly in
-- backend/src/routes/posts.js's PATCH /posts/:id/pinned-comment, same
-- pattern as every other author-only mutation in this schema — RLS's
-- existing "authors manage their own posts" policy backs it up at the DB
-- layer too). `on delete set null` so deleting a pinned comment can never
-- leave a post pointing at a row that no longer exists.
-- ---------------------------------------------------------------------
alter table posts add column if not exists pinned_comment_id uuid references comments(id) on delete set null;

-- ---------------------------------------------------------------------
-- Post authors deleting ANY comment on their own post (moderation) —
-- alongside migration 006's "authors delete their own comments" (a
-- comment's own author deleting it). Postgres OR's multiple permissive
-- policies for the same command together, so both apply at once: a
-- delete succeeds if EITHER policy's condition is true.
-- ---------------------------------------------------------------------
drop policy if exists "post authors delete comments on their own posts" on comments;
create policy "post authors delete comments on their own posts"
  on comments for delete
  using (exists (select 1 from posts where posts.id = comments.post_id and posts.author_id = auth.uid()));

-- =====================================================================
-- After this runs: liking/unliking a comment, deleting a comment (as its
-- author OR the post's author), and pinning/unpinning a comment
-- (post author only) all work end to end.
-- =====================================================================
