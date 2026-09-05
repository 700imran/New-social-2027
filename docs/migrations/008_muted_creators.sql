-- Migration 008: muted creators ("Mute" — distinct from Block)
--
-- Muting silences someone without the social weight of blocking: their
-- posts stop appearing in *your* feed (see src/context/AppContext.jsx's
-- visiblePosts filter, same client-side pattern hidden_posts/blocks
-- already use), you keep following them if you did, they're never
-- notified, and nothing changes on their end at all.
--
-- Additive only — run once against your existing Supabase project (SQL
-- Editor), after 007. Mirrors hidden_posts.sql's shape exactly: one row
-- per (user, muted user), private to the owner, RLS on from the start.

create table muted_creators (
  user_id uuid references users(id) on delete cascade,
  muted_user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_user_id)
);

create index muted_creators_user_idx on muted_creators(user_id, created_at desc);

alter table muted_creators enable row level security;

-- Same visibility model as hidden_posts/saved_posts: only you can see or
-- manage who you've muted — it says nothing public about them.
create policy "users manage their own mutes"
  on muted_creators for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.muted_creators to authenticated;

-- After this runs: backend/src/routes/follows.js's POST/DELETE/GET
-- /mutes work end to end, and muted authors' posts disappear from the
-- feed the same way blocked/hidden ones already do.
