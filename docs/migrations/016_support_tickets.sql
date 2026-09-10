-- Migration 016: Settings -> Tools & Support -> Help & support. Same
-- pattern as 002_reports.sql exactly: create-and-read-your-own from the
-- app, admin review via Supabase's Table Editor (no admin UI built for
-- either one yet — see 002_reports.sql's own comment on that tradeoff).
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_status_idx on support_tickets(status);

alter table support_tickets enable row level security;

drop policy if exists "users create their own tickets" on support_tickets;
create policy "users create their own tickets"
  on support_tickets for insert with check (auth.uid() = user_id);

drop policy if exists "users read their own tickets" on support_tickets;
create policy "users read their own tickets"
  on support_tickets for select using (auth.uid() = user_id);

drop policy if exists "admins read all tickets" on support_tickets;
create policy "admins read all tickets"
  on support_tickets for select using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'admin'
    )
  );

drop policy if exists "admins update ticket status" on support_tickets;
create policy "admins update ticket status"
  on support_tickets for update using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'admin'
    )
  );

grant select, insert, update on public.support_tickets to authenticated;
