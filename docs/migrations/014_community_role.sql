-- Account types (Personal/Creator/Brand/Community) reuse the roles /
-- user_roles seam docs/bharatspace_level1_schema.sql already built for
-- this ("Scale seam... ABAC-style multi-role logic can be added later
-- without a schema migration") — 'user','creator','brand','admin' are
-- already there from day one; this adds the one missing option.
insert into roles (name)
select 'community'
where not exists (select 1 from roles where name = 'community');

-- roles/user_roles were created in the base schema with no RLS and no
-- grant to anon/authenticated at all (verified by grep against every
-- migration — everything else in this schema follows an explicit
-- default-deny-then-grant pattern, e.g. 006's `grant select on
-- public.notifications to authenticated`, and these two tables were
-- simply never given one). Read-only, no per-row RLS needed: same
-- treatment as `grant select (id, created_at) on public.users` in
-- 010_blocks_users_auditlog_rls.sql — a role name is meant to be
-- visible on the profile that has it (a "Creator"/"Brand" badge is
-- public by nature), not a secret. Write access stays service_role-only
-- (backend/src/routes/account.js's PATCH /account/type uses
-- adminClient specifically so a crafted request can't grant itself
-- 'admin' through this same table).
grant select on public.roles, public.user_roles to anon, authenticated;
