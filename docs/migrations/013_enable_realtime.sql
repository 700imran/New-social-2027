-- Migration 013: turns on Realtime for the two tables src/api/realtime.js
-- subscribes to. RLS alone (already correct on both — see 011_user_settings.sql
-- and 012_direct_messages.sql) scopes who can see what; it does NOT make a
-- table emit change events over the Realtime websocket. That's a separate
-- opt-in: a table has to be added to the `supabase_realtime` publication,
-- which this migration does directly via SQL (equivalent to toggling
-- Database -> Replication -> supabase_realtime for these two tables in the
-- dashboard, which works exactly as well — this is just the reproducible,
-- reviewable version of the same one-time step).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.user_settings;
