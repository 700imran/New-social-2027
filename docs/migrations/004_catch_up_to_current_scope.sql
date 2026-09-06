-- =====================================================================
-- BharatSpace — bring an existing database up to current scope
-- Run this once in Supabase SQL Editor, on top of the base schema you
-- already ran (bharatspace_level1_schema.sql).
--
-- What this is: the exact same content as
-- docs/migrations/002_reports.sql and docs/migrations/003_saved_posts.sql,
-- combined into one file for convenience. Nothing here changes any
-- existing table — every statement is additive only, matching the same
-- pattern the base schema already uses throughout.
--
-- Safe to re-run: tables/indexes use IF NOT EXISTS, and policies are
-- dropped-then-recreated rather than erroring if they already exist — so
-- running this twice, or after having already run 002/003 individually,
-- does nothing destructive either way.
--
-- How this list was produced: every backend/src/routes/*.js file was
-- grepped for `.from('table_name')` and checked against
-- bharatspace_level1_schema.sql. `reports` and `saved_posts` were the
-- only two tables the code queries that the base schema doesn't define —
-- everything else your app currently does is already covered by what you
-- ran the first time.
-- =====================================================================

-- ---------------------------------------------------------------------
-- reports — content/user reporting (backend/src/routes/reports.js)
-- Required for Google Play's User Generated Content policy before an app
-- with public posts/comments can be listed — see
-- docs/PLAY_STORE_CHECKLIST.md.
-- ---------------------------------------------------------------------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references users(id) on delete cascade,
  -- Polymorphic reference (target_type + target_id) rather than three
  -- nullable FK columns — no FK constraint on target_id itself, since it
  -- points at a different table depending on target_type. Validated at
  -- the application layer instead (see routes/reports.js).
  target_type text not null,             -- 'post' | 'comment' | 'user'
  target_id uuid not null,
  reason text not null,                  -- 'spam' | 'harassment' | 'hate_speech' | 'nudity' | 'violence' | 'illegal' | 'other'
  details text,
  status text not null default 'open',   -- 'open' | 'reviewed' | 'actioned' | 'dismissed'
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists reports_status_idx on reports(status);
create index if not exists reports_target_idx on reports(target_type, target_id);

alter table reports enable row level security;

drop policy if exists "users create their own reports" on reports;
create policy "users create their own reports"
  on reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "users read their own submitted reports" on reports;
create policy "users read their own submitted reports"
  on reports for select using (auth.uid() = reporter_id);

-- The 'admin' role already exists in `roles` (seeded in the base schema)
-- but nothing promotes anyone into it automatically — see
-- docs/EMAIL_SETUP.md §2 for granting it via SQL, and
-- docs/PLAY_STORE_CHECKLIST.md for reviewing reports today (Supabase's
-- own Table Editor — no admin UI needed for this yet).
drop policy if exists "admins read all reports" on reports;
create policy "admins read all reports"
  on reports for select using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'admin'
    )
  );

drop policy if exists "admins update report status" on reports;
create policy "admins update report status"
  on reports for update using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'admin'
    )
  );

-- ---------------------------------------------------------------------
-- saved_posts — bookmarks (backend/src/routes/posts.js: POST/DELETE
-- /posts/:id/save, GET /saved-posts)
-- ---------------------------------------------------------------------
create table if not exists saved_posts (
  user_id uuid references users(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists saved_posts_user_idx on saved_posts(user_id, created_at desc);

alter table saved_posts enable row level security;

-- You can only see and manage your own saved posts — nobody else's
-- bookmark list is anybody else's business, including whether a post has
-- been saved at all (unlike likes/follows, which are public).
drop policy if exists "users manage their own saved posts" on saved_posts;
create policy "users manage their own saved posts"
  on saved_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- After this runs, Table Editor should show reports and saved_posts
-- alongside everything from the base schema — 20 tables total (18 from
-- the base file + these 2). `brands` and `transactions` also already
-- exist from the base schema but aren't queried by any route yet (the
-- commerce model is dormant — schema-ready, UI not built — see
-- src/api/client.js's comment on createCampaign/getCampaign).
-- =====================================================================
