-- =====================================================================
-- Migration 005: reels + tagging
-- Run this once in Supabase SQL Editor, on top of everything already run
-- (bharatspace_level1_schema.sql, then 002/003/004 or the equivalent
-- 004_catch_up_to_current_scope.sql).
--
-- What this adds, and why it's additive rather than a new content type:
-- a "reel" is a post whose media happens to be a video, viewed in a
-- different UI (Reels.jsx) — it still needs a caption, likes, comments,
-- an author, and a topic, all of which `posts` already has. So instead
-- of a parallel `reels` table (duplicating every one of those columns
-- and every route that touches them), this adds one `kind` column to
-- the existing table. `backend/src/routes/media.js` already accepts
-- video/mp4 and video/webm uploads — see ARCHITECTURE.md's Model 3 row —
-- so no change was needed there.
--
-- `post_tags` is genuinely new: tagging other users in a post/reel
-- (distinct from @mention text parsing, which docs/CONNECT_EXISTING_INFRA.md
-- already calls out as not implemented) needed its own table since a
-- post can tag several people at once.
--
-- Safe to re-run: IF NOT EXISTS / DROP+CREATE POLICY throughout, same
-- convention as every prior migration file in this folder.
-- =====================================================================

-- ---------------------------------------------------------------------
-- posts.kind — 'post' (default, unchanged behavior for every existing
-- row) or 'reel'. Backend: POST /posts accepts an optional `kind` field
-- (backend/src/routes/posts.js); GET /posts accepts an optional
-- ?kind=reel filter for the Reels feed.
-- ---------------------------------------------------------------------
alter table posts add column if not exists kind text not null default 'post';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_kind_check'
  ) then
    alter table posts add constraint posts_kind_check check (kind in ('post', 'reel'));
  end if;
end $$;

create index if not exists posts_kind_idx on posts(kind, created_at desc);

-- ---------------------------------------------------------------------
-- post_tags — who's tagged in a post/reel (backend/src/routes/posts.js:
-- POST /posts accepts `taggedUserIds`; GET /users/:id/tagged-posts reads
-- this table). Publicly readable (same as reactions/follows — who's
-- tagged where isn't private), but only the post's own author can add or
-- remove tags on it.
-- ---------------------------------------------------------------------
create table if not exists post_tags (
  post_id uuid references posts(id) on delete cascade,
  tagged_user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, tagged_user_id)
);

create index if not exists post_tags_user_idx on post_tags(tagged_user_id, created_at desc);

alter table post_tags enable row level security;

drop policy if exists "tags are publicly readable" on post_tags;
create policy "tags are publicly readable"
  on post_tags for select using (true);

drop policy if exists "post authors manage tags on their own posts" on post_tags;
create policy "post authors manage tags on their own posts"
  on post_tags for all
  using (exists (select 1 from posts where posts.id = post_tags.post_id and posts.author_id = auth.uid()))
  with check (exists (select 1 from posts where posts.id = post_tags.post_id and posts.author_id = auth.uid()));

-- =====================================================================
-- After this runs: posts has a new `kind` column (every existing row
-- defaults to 'post', so nothing already published becomes a reel), and
-- a new post_tags table exists alongside it. Tagged users get a real
-- 'tag' notification the same way likes/comments/follows already do
-- (backend/src/lib/notify.js) — no schema change needed for that,
-- `notifications.type` was already free text.
-- =====================================================================
