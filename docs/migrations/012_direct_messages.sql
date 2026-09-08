-- Migration 012: Direct messages (1:1 chat) — conversations, messages, and
-- per-user read tracking, plus support for sharing a post/reel straight
-- into a conversation (Reels/PostCard's Share button -> "Send to...").
--
-- Additive only — run once against your existing Supabase project (SQL
-- Editor), after 011. Safe to re-run: IF NOT EXISTS / DROP+CREATE POLICY
-- throughout, same convention as every prior migration in this folder.
--
-- Design notes:
-- * One row per pair of users in `conversations` (not one row per
--   message-thread-you-could-imagine) — `user_one_id`/`user_two_id` are
--   always stored with the smaller uuid first (enforced by the unique
--   index below plus the backend always normalizing order before
--   insert/lookup — see backend/src/routes/messages.js), so a lookup
--   never has to try both orderings.
-- * Messages are hard-deleted by their own sender (like migration 006's
--   comment delete), not soft-deleted — nothing else in this schema soft-
--   deletes, and a DM has no equivalent of "the post author moderates
--   other people's comments" that would need a delete to remain visible
--   as a record for someone else.
-- * No separate "conversations you can start" allowlist — RLS just checks
--   you're one of the two participants; the blocked-user check happens in
--   the route (backend/src/routes/messages.js), same pattern
--   backend/src/routes/follows.js already uses for follow requests.

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references users(id) on delete cascade,
  user_two_id uuid not null references users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint conversations_distinct_users check (user_one_id <> user_two_id),
  constraint conversations_ordered_pair check (user_one_id < user_two_id)
);

-- Enforces "only one conversation per pair of people" — combined with the
-- ordered-pair check above so (a,b) and (b,a) can never both exist.
create unique index if not exists conversations_pair_idx on conversations(user_one_id, user_two_id);
create index if not exists conversations_user_one_idx on conversations(user_one_id);
create index if not exists conversations_user_two_idx on conversations(user_two_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body text,
  -- Set when this message is "Share to..." a post/reel rather than plain
  -- text (see Reels.jsx / PostCard.jsx's Share sheet) — `on delete set
  -- null` so a deleted post doesn't take the whole message history with
  -- it; the frontend just renders "Post no longer available" for those.
  shared_post_id uuid references posts(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint messages_has_content check (body is not null or shared_post_id is not null)
);

create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

-- One row per (user, conversation) — "how far into this conversation has
-- this participant read." Same shape as notifications.read_at, just
-- scoped per-conversation instead of per-row, since marking a whole
-- thread read in one call is the only pattern the UI needs (see
-- ChatThread.jsx).
create table if not exists conversation_reads (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table conversations enable row level security;

drop policy if exists "participants read their own conversations" on conversations;
create policy "participants read their own conversations"
  on conversations for select
  using (auth.uid() = user_one_id or auth.uid() = user_two_id);

drop policy if exists "participants create conversations they are in" on conversations;
create policy "participants create conversations they are in"
  on conversations for insert
  with check (auth.uid() = user_one_id or auth.uid() = user_two_id);

alter table messages enable row level security;

drop policy if exists "participants read messages in their conversations" on messages;
create policy "participants read messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and (conversations.user_one_id = auth.uid() or conversations.user_two_id = auth.uid())
    )
  );

drop policy if exists "participants send messages as themselves" on messages;
create policy "participants send messages as themselves"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and (conversations.user_one_id = auth.uid() or conversations.user_two_id = auth.uid())
    )
  );

-- "delete after if want" — a message's own sender only. Unlike comments
-- (migration 009), there's no post-author-style moderator here.
drop policy if exists "senders delete their own messages" on messages;
create policy "senders delete their own messages"
  on messages for delete
  using (auth.uid() = sender_id);

alter table conversation_reads enable row level security;

drop policy if exists "users manage their own read state" on conversation_reads;
create policy "users manage their own read state"
  on conversation_reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert on public.conversations to authenticated;
grant select, insert, delete on public.messages to authenticated;
grant select, insert, update, delete on public.conversation_reads to authenticated;

-- =====================================================================
-- After this runs: two users can find-or-create a conversation, send and
-- read messages (plain text or a shared post/reel), delete their own
-- messages, and mark a thread read — all enforced at the RLS layer, not
-- just by the Worker choosing to scope queries correctly.
-- =====================================================================
