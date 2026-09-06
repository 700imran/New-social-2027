-- Migration 003: saved posts (bookmarks)
--
-- Additive only — run once against your existing Supabase project (SQL
-- Editor). Nothing in bharatspace_level1_schema.sql needs to change.
--
-- Why this exists: "save a post" was previously a local-only, per-session
-- UI affordance (see docs/SECURITY.md's history) because no table existed
-- for it. This adds one, following the same pattern as `reactions` —
-- one row per (user, post), so a user can't save the same post twice.

create table saved_posts (
  user_id uuid references users(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index saved_posts_user_idx on saved_posts(user_id, created_at desc);

alter table saved_posts enable row level security;

-- You can only see and manage your own saved posts — nobody else's
-- bookmark list is anybody else's business, including whether a post has
-- been saved at all (unlike likes/follows, which are public).
create policy "users manage their own saved posts"
  on saved_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
