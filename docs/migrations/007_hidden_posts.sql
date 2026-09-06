-- Migration 007: hidden posts ("Not interested" / "Hide this post")
--
-- Additive only — run once against your existing Supabase project (SQL
-- Editor), after 006. Mirrors 003_saved_posts.sql exactly: one row per
-- (user, post), private to the owner, RLS on from the start this time
-- (see 006's postmortem on what happens when a table skips that step).

create table hidden_posts (
  user_id uuid references users(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index hidden_posts_user_idx on hidden_posts(user_id, created_at desc);

alter table hidden_posts enable row level security;

-- Same visibility model as saved_posts: only you can see or manage what
-- you've hidden — it says nothing public about the post itself.
create policy "users manage their own hidden posts"
  on hidden_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.hidden_posts to authenticated;
