-- Migration 017: two more user_settings categories — Settings -> Tools &
-- Support -> Accessibility, and Settings -> Money & Business -> Ads &
-- preferences. Same jsonb-blob-with-default pattern as every existing
-- column here (011_user_settings.sql) — no new RLS/grant needed, the
-- existing per-row policies on user_settings already cover any column
-- on it.
alter table user_settings
  add column if not exists accessibility jsonb not null default '{
    "reduceMotion": false,
    "highContrast": false,
    "captionsDefaultOn": false
  }'::jsonb,
  add column if not exists ads_preferences jsonb not null default '{
    "personalizedAds": true,
    "topics": []
  }'::jsonb;
