-- Migration 019: Settings -> Tools & Support -> Data usage. Same
-- jsonb-blob pattern as 017_accessibility_ads_settings.sql — no new
-- RLS/grant needed.
alter table user_settings
  add column if not exists data_usage jsonb not null default '{
    "dataSaver": false,
    "autoPlayVideos": "wifi"
  }'::jsonb;
