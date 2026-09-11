-- Migration 021: Settings -> Your Experience -> Feed & recommendations.
-- Same jsonb-blob pattern as 017/019. "Reset recommendations" on this
-- screen doesn't need a new column — it clears the existing
-- hidden_posts list (007_hidden_posts.sql), which is the real,
-- already-working mechanism "see fewer posts like this" maps to.
alter table user_settings
  add column if not exists feed_preferences jsonb not null default '{
    "prioritizeFollowing": false
  }'::jsonb;
