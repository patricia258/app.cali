-- CALI Workspace · Calendário e preparação Google Workspace

alter table cali_workspace.events alter column company_id drop not null;

alter table cali_workspace.events
  add column if not exists color_hex text,
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists all_day boolean not null default false,
  add column if not exists source_type text not null default 'manual',
  add column if not exists source_entity_id uuid,
  add column if not exists google_calendar_id text,
  add column if not exists google_event_id text,
  add column if not exists sync_status text not null default 'local',
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table cali_workspace.events drop constraint if exists events_event_type_check;
alter table cali_workspace.events add constraint events_event_type_check check (
  event_type in ('meeting','validation','deadline','milestone','training','internal','other')
);

alter table cali_workspace.events drop constraint if exists events_source_type_check;
alter table cali_workspace.events add constraint events_source_type_check check (
  source_type in ('manual','deliverable','project','google')
);

alter table cali_workspace.events drop constraint if exists events_sync_status_check;
alter table cali_workspace.events add constraint events_sync_status_check check (
  sync_status in ('local','pending','synced','error')
);

alter table cali_workspace.events drop constraint if exists events_color_hex_check;
alter table cali_workspace.events add constraint events_color_hex_check check (
  color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'
);

create table if not exists cali_workspace.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references cali_workspace.events(id) on delete cascade,
  company_id uuid references cali_workspace.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  attendee_type text not null default 'external' check (attendee_type in ('admin','client','external')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','tentative')),
  response_note text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

create table if not exists cali_workspace.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  account_email text,
  calendar_id text,
  credential_key text,
  sync_enabled boolean not null default true,
  status text not null default 'pending' check (status in ('pending','connected','expired','revoked','error')),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists events_company_start_active_idx on cali_workspace.events(company_id, starts_at) where cancelled_at is null;
create index if not exists events_google_event_idx on cali_workspace.events(google_event_id) where google_event_id is not null;
create index if not exists events_source_entity_idx on cali_workspace.events(source_type, source_entity_id) where source_entity_id is not null;
create index if not exists event_attendees_event_idx on cali_workspace.event_attendees(event_id, status);
create index if not exists event_attendees_email_idx on cali_workspace.event_attendees(lower(email));

create trigger calendar_connections_touch_updated_at before update on cali_workspace.calendar_connections for each row execute function cali_workspace.touch_updated_at();

alter table cali_workspace.event_attendees enable row level security;
alter table cali_workspace.calendar_connections enable row level security;

grant select, insert, update, delete on cali_workspace.event_attendees, cali_workspace.calendar_connections to authenticated, service_role;

create policy event_attendees_admin_all on cali_workspace.event_attendees
for all to authenticated
using (cali_workspace.is_admin())
with check (cali_workspace.is_admin());

create policy event_attendees_client_select on cali_workspace.event_attendees
for select to authenticated
using (
  company_id = cali_workspace.current_company_id()
  and exists (
    select 1 from cali_workspace.events e
    where e.id = event_id
      and e.company_id = cali_workspace.current_company_id()
      and e.visibility = 'client'
      and e.cancelled_at is null
  )
);

create policy event_attendees_client_update_own on cali_workspace.event_attendees
for update to authenticated
using (
  company_id = cali_workspace.current_company_id()
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  company_id = cali_workspace.current_company_id()
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy calendar_connections_admin_all on cali_workspace.calendar_connections
for all to authenticated
using (cali_workspace.is_admin())
with check (cali_workspace.is_admin());

create policy calendar_connections_self_select on cali_workspace.calendar_connections
for select to authenticated
using (user_id = auth.uid());

-- Reforça que cliente só enxerga evento relevante e ativo.
drop policy if exists events_client_select on cali_workspace.events;
create policy events_client_select on cali_workspace.events
for select to authenticated
using (
  company_id = cali_workspace.current_company_id()
  and visibility = 'client'
  and cancelled_at is null
);
