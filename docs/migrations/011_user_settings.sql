-- Migration 011: `user_settings` — backs the "live" Settings screens
-- (Notifications, Privacy & content controls, Language & appearance,
-- Focus mode, Words & comments) added to Settings.jsx. One row per user,
-- same shape as `profiles` (migration 000/base schema): a single-row
-- table keyed by user_id rather than one table per settings category,
-- because every field here is read and written together (GET /v1/settings
-- returns the whole thing, PATCH /v1/settings merges into it) and none of
-- it is ever queried *across* users the way follows/blocks/mutes are —
-- there's no "who has push notifications on" query anywhere in this app.
--
-- Deliberately NOT covering every leaf in Settings.jsx's new navigation:
-- Payments, Creator tools, and the Insights group need real subsystems
-- (a payments processor, an analytics pipeline) that don't exist yet in
-- this schema — a settings row can't make those "live" on its own, so
-- those stay ComingSoon. What's here is the genuine subset that's just
-- user preferences with no other feature dependency.
--
-- Safe to re-run: IF NOT EXISTS / DROP+CREATE POLICY throughout, same as
-- migrations 006/010.

create table if not exists user_settings (
  user_id uuid primary key references users(id) on delete cascade,

  -- Per-category × per-channel notification toggles. Read by the app as
  -- a single blob (no route currently queries into individual keys), so
  -- jsonb rather than a wide table of boolean columns — same tradeoff
  -- `profiles.interests` already makes for a similarly free-form field.
  notifications jsonb not null default '{
    "likes":    {"push": true,  "email": false, "inApp": true},
    "comments": {"push": true,  "email": false, "inApp": true},
    "follows":  {"push": true,  "email": false, "inApp": true},
    "mentions": {"push": true,  "email": true,  "inApp": true},
    "messages": {"push": true,  "email": false, "inApp": true}
  }'::jsonb,

  -- whoCanMessage/whoCanComment: 'everyone' | 'followers' | 'nobody'.
  -- sensitiveContentFilter: 'more' | 'standard' | 'less'.
  -- Enforced app-side in backend/src/routes/settings.js (allow-listed
  -- values), not as a Postgres CHECK constraint — consistent with how
  -- e.g. `posts.visibility` in the base schema is validated in route code
  -- rather than the database.
  privacy jsonb not null default '{
    "isPrivate": false,
    "whoCanMessage": "everyone",
    "whoCanComment": "everyone",
    "sensitiveContentFilter": "standard"
  }'::jsonb,

  -- theme: 'light' | 'dark' | 'system'. textSize: 'small' | 'medium' | 'large'.
  appearance jsonb not null default '{
    "theme": "system",
    "language": "en",
    "textSize": "medium"
  }'::jsonb,

  -- quietHoursStart/End are "HH:MM" 24-hour strings, or null when unset.
  focus jsonb not null default '{
    "enabled": false,
    "quietHoursStart": null,
    "quietHoursEnd": null
  }'::jsonb,

  -- Comments containing any of these (case-insensitive substring match,
  -- applied client-side in PostDetail.jsx) are collapsed behind a "hidden
  -- comment" disclosure rather than deleted — same reasoning as the
  -- existing per-post `hidden_posts` table hides without destroying.
  muted_words text[] not null default '{}',

  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

drop policy if exists "users read their own settings" on user_settings;
create policy "users read their own settings"
  on user_settings for select using (auth.uid() = user_id);

drop policy if exists "users create their own settings" on user_settings;
create policy "users create their own settings"
  on user_settings for insert with check (auth.uid() = user_id);

drop policy if exists "users update their own settings" on user_settings;
create policy "users update their own settings"
  on user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No delete policy: settings rows are cleaned up via the user_id FK's
-- `on delete cascade` when the account itself is deleted
-- (DeleteAccountRequest.jsx's flow), not deleted independently.

grant select, insert, update on public.user_settings to authenticated;
