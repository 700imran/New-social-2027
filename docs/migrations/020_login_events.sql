-- Migration 020: Settings -> Account protection / App & device ("where
-- you're logged in"). Deliberately NOT logged from inside
-- backend/src/routes/auth.js's login handler — that file has had 10
-- commits of your own refactoring since I last touched anything near it
-- (see backend/src/lib/email.js's history), so adding a call there risks
-- a merge conflict with work already in progress. Instead this is logged
-- from the frontend right after a successful sign-in (see
-- src/context/AppContext.jsx's signInInternal and the bootstrap/refresh
-- path) via its own POST /v1/account/sessions endpoint — same end
-- result, zero touch on auth.js.
create table if not exists login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists login_events_user_idx on login_events(user_id, created_at desc);

alter table login_events enable row level security;

drop policy if exists "users log their own sessions" on login_events;
create policy "users log their own sessions"
  on login_events for insert with check (auth.uid() = user_id);

drop policy if exists "users read their own sessions" on login_events;
create policy "users read their own sessions"
  on login_events for select using (auth.uid() = user_id);

grant select, insert on public.login_events to authenticated;
