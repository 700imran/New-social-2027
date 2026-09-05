-- =====================================================================
-- BharatSpace — Application Level 1 — Schema (run in Supabase SQL editor)
-- Organized by the 3 core models: User & Trust / Commerce / Media
-- Zero-cost, scale-ready: UUID PKs, RLS, append-only ledger + audit log,
-- JSONB extension points so nothing below needs a breaking migration
-- when the funded/full versions from the Master TRD are built later.
-- =====================================================================

create extension if not exists pgcrypto; -- for gen_random_uuid()

-- =====================================================================
-- MODEL 1 — USER & TRUST
-- =====================================================================

create table users (
  id uuid primary key default gen_random_uuid(),
  phone text unique,
  email text unique,
  created_at timestamptz not null default now()
);
-- Note: password/OTP handling itself lives in Supabase Auth (auth.users);
-- this table holds app-level identity and links to it via matching id.

create table roles (
  id serial primary key,
  name text unique not null            -- 'user' | 'creator' | 'brand' | 'admin'
);
insert into roles (name) values ('user'), ('creator'), ('brand'), ('admin');

create table user_roles (
  user_id uuid references users(id) on delete cascade,
  role_id int references roles(id),
  primary key (user_id, role_id)
);
-- Scale seam: this is intentionally a many-to-many join, not a single
-- `role` column on users — so ABAC-style multi-role/multi-permission
-- logic can be added later without an schema migration.

create table profiles (
  user_id uuid primary key references users(id) on delete cascade,
  display_name text not null,
  bio text,
  avatar_asset_id uuid,                -- references media_assets(id), added below
  location text,
  interests text[] default '{}',       -- e.g. {India News,Technology,Culture}
  updated_at timestamptz not null default now()
);

create table follows (
  follower_id uuid references users(id) on delete cascade,
  followee_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

create table blocks (
  blocker_id uuid references users(id) on delete cascade,
  blocked_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table consent_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  data_processing boolean not null default true,
  marketing boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Immutable audit log — cheap to enforce now, expensive to retrofit later.
create table audit_log (
  id bigserial primary key,
  actor_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create rule audit_log_no_update as on update to audit_log do instead nothing;
create rule audit_log_no_delete as on delete to audit_log do instead nothing;

-- Row-Level Security — the single highest-value zero-cost security control.
alter table profiles enable row level security;
create policy "profiles are publicly readable"
  on profiles for select using (true);
create policy "users can update their own profile"
  on profiles for update using (auth.uid() = user_id);

alter table consent_preferences enable row level security;
create policy "users manage their own consent"
  on consent_preferences for all using (auth.uid() = user_id);

alter table follows enable row level security;
create policy "follows are publicly readable"
  on follows for select using (true);
create policy "users manage their own follow edges"
  on follows for insert with check (auth.uid() = follower_id);
create policy "users can unfollow"
  on follows for delete using (auth.uid() = follower_id);

-- =====================================================================
-- MODEL 3 — MEDIA INFRASTRUCTURE  (defined before Model 2 since Model 1
-- and social content below reference it)
-- =====================================================================

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete cascade,
  storage_key text not null,                    -- R2 object key
  mime_type text not null,
  size_bytes bigint not null,
  rendition_strategy text not null default 'single',  -- 'single' now, 'adaptive' later
  renditions jsonb not null default '{}',              -- filled in by the full Media Engine later
  created_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_avatar_fk foreign key (avatar_asset_id) references media_assets(id);

alter table media_assets enable row level security;
create policy "media metadata is publicly readable"
  on media_assets for select using (true);
create policy "owners manage their own media"
  on media_assets for all using (auth.uid() = owner_id);

-- =====================================================================
-- Social core (Level 1 build order L1.2–L1.5) — part of Model 1's surface
-- =====================================================================

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references users(id) on delete cascade,
  body text,
  media_asset_id uuid references media_assets(id),
  topic text,                          -- 'India News' | 'Tech' | 'Culture' | ...
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  author_id uuid references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table reactions (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  type text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references users(id) on delete cascade,
  type text not null,                  -- 'mention' | 'reply' | 'follow' | 'trending'
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table posts enable row level security;
create policy "posts are publicly readable" on posts for select using (true);
create policy "authors manage their own posts" on posts for all using (auth.uid() = author_id);

alter table notifications enable row level security;
create policy "users read their own notifications"
  on notifications for select using (auth.uid() = recipient_id);

-- =====================================================================
-- MODEL 2 — CREATOR–BRAND COMMERCE
-- Schema created now (zero cost) even though Level 1's active build order
-- does not ship the matching/payout UI yet — this avoids a painful
-- migration once real campaign money starts moving through it.
-- =====================================================================

create table brands (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users(id),
  name text not null,
  created_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  title text not null,
  budget numeric(14,2) not null,
  requirements jsonb not null default '{}',
  status text not null default 'draft',    -- see Phase 4 state machine
  created_at timestamptz not null default now()
);

create table creator_offers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  creator_id uuid references users(id),
  status text not null default 'offered',  -- offered | accepted | declined
  created_at timestamptz not null default now()
);

create table deliverables (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references creator_offers(id) on delete cascade,
  media_asset_id uuid references media_assets(id),
  status text not null default 'submitted', -- submitted | revision | approved
  created_at timestamptz not null default now()
);

-- Immutable, append-only ledger — the one place "zero cost" must never
-- mean "cut a corner": get this structurally right on day 1.
create table transactions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id),
  type text not null,   -- 'gross' | 'creator_allocation' | 'platform_fee' | 'payment_cost' | 'refund'
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);
create rule transactions_no_update as on update to transactions do instead nothing;
create rule transactions_no_delete as on delete to transactions do instead nothing;

-- =====================================================================
-- End of Level 1 schema. Nothing above requires a breaking change to
-- support the full Master TRD/DB Schema (Phase 2/5) later — new tables
-- and columns get added alongside, not instead of, these.
-- =====================================================================
