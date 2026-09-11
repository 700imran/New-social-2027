-- Migration 018: Close friends list (Settings -> Your Connections ->
-- Close friends). Mirrors muted_creators.sql's shape exactly — one row
-- per (user, close friend), private to the owner, RLS on from the
-- start. Nothing currently reads this list to change post visibility
-- (there's no "share to close friends only" audience option in
-- CreatePost.jsx yet) — this migration is the list itself, real and
-- manageable today, ready for that audience option later.
create table if not exists close_friends (
  user_id uuid references users(id) on delete cascade,
  friend_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create index if not exists close_friends_user_idx on close_friends(user_id, created_at desc);

alter table close_friends enable row level security;

drop policy if exists "users manage their own close friends" on close_friends;
create policy "users manage their own close friends"
  on close_friends for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.close_friends to authenticated;
