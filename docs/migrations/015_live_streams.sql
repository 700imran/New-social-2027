-- Migration 015: live_streams — backs the "Go Live" entry point at the
-- front of Home's Stories rail (previously a fully static mock card with
-- a fake "Live" badge, per docs/PRODUCT_DIRECTION_UPDATE.md's note that
-- Stories itself is frontend-only; this is deliberately a separate,
-- real table rather than folding into that placeholder).
--
-- Scope, stated plainly: this table is the *session lifecycle* only —
-- who's live, since when, what they titled it. Viewer count and chat use
-- Supabase Realtime's Presence/Broadcast channels instead of tables here
-- (ephemeral by nature, no row-per-viewer or row-per-message write load).
-- Actual video transport (capturing and delivering the stream itself)
-- needs a WebRTC signaling/media-server decision this migration doesn't
-- make — see src/pages/Live.jsx's own comment for exactly what that
-- gap is and what it would take to close it.
create table if not exists live_streams (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references users(id) on delete cascade,
  title text not null,
  status text not null default 'live' check (status in ('live', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists live_streams_status_idx on live_streams (status, started_at desc);

alter table live_streams enable row level security;

-- Publicly readable, same reasoning as profiles/posts: whether someone
-- is currently live is meant to be visible, including to logged-out
-- visitors browsing the Home rail.
drop policy if exists "live streams are publicly readable" on live_streams;
create policy "live streams are publicly readable"
  on live_streams for select using (true);

drop policy if exists "hosts start their own stream" on live_streams;
create policy "hosts start their own stream"
  on live_streams for insert with check (auth.uid() = host_id);

-- Update is host-only and is only ever used to end the caller's own
-- stream (status -> 'ended', ended_at set) — see PATCH /v1/live/:id/end.
drop policy if exists "hosts end their own stream" on live_streams;
create policy "hosts end their own stream"
  on live_streams for update using (auth.uid() = host_id) with check (auth.uid() = host_id);

grant select on public.live_streams to anon, authenticated;
grant insert, update on public.live_streams to authenticated;

-- So Home.jsx's rail can update the instant someone goes live/ends,
-- not just on its next poll. Added here (015), not 013_enable_realtime.sql,
-- because this table doesn't exist yet when 013 runs.
alter publication supabase_realtime add table public.live_streams;
