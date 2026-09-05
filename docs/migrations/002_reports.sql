-- Migration 002: content/user reporting
--
-- Additive only — run this once against your existing Supabase project
-- (SQL Editor). Nothing in docs/bharatspace_level1_schema.sql needs to
-- change; this is a new table plus its own RLS policies, same pattern the
-- original schema already uses throughout.
--
-- Why this exists: Google Play's User Generated Content policy requires
-- an in-app way to report objectionable content/users before an app with
-- public posts/comments can be listed — see
-- ../PLAY_STORE_CHECKLIST.md. It's also just a normal trust & safety
-- feature independent of that requirement.

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references users(id) on delete cascade,
  -- Polymorphic reference (target_type + target_id) rather than three
  -- nullable FK columns — deliberately no FK constraint on target_id
  -- itself, since it points at a different table depending on
  -- target_type. Validated at the application layer (see
  -- backend/src/routes/reports.js) instead.
  target_type text not null,             -- 'post' | 'comment' | 'user'
  target_id uuid not null,
  reason text not null,                  -- 'spam' | 'harassment' | 'hate_speech' | 'nudity' | 'violence' | 'illegal' | 'other'
  details text,
  status text not null default 'open',   -- 'open' | 'reviewed' | 'actioned' | 'dismissed'
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index reports_status_idx on reports(status);
create index reports_target_idx on reports(target_type, target_id);

alter table reports enable row level security;

create policy "users create their own reports"
  on reports for insert with check (auth.uid() = reporter_id);

create policy "users read their own submitted reports"
  on reports for select using (auth.uid() = reporter_id);

-- The 'admin' role already exists in `roles` (seeded in the original
-- schema) but nothing currently promotes anyone into it — see
-- ../PLAY_STORE_CHECKLIST.md for how to review reports today (Supabase's
-- own Table Editor, no admin UI needed yet) versus building one later.
create policy "admins read all reports"
  on reports for select using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'admin'
    )
  );

create policy "admins update report status"
  on reports for update using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'admin'
    )
  );
