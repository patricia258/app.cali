-- CALI Workspace · operação, horas e integrações
-- Complementa a estrutura inicial sem carregar módulos do antigo Connect que não pertencem à CALI.

create type public.integration_owner as enum ('cali','client');
create type public.integration_status as enum ('pending','connected','expired','revoked','error');
create type public.sync_status as enum ('pending','processing','synced','error');

create table public.service_cycles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  service_name text,
  starts_on date not null,
  ends_on date not null,
  contracted_hours numeric(8,2) not null default 0 check (contracted_hours >= 0),
  alert_threshold_1 smallint not null default 70 check (alert_threshold_1 between 1 and 100),
  alert_threshold_2 smallint not null default 85 check (alert_threshold_2 between 1 and 100),
  alert_threshold_3 smallint not null default 100 check (alert_threshold_3 between 1 and 100),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_cycle_dates check (ends_on >= starts_on),
  constraint ordered_hour_thresholds check (alert_threshold_1 < alert_threshold_2 and alert_threshold_2 <= alert_threshold_3)
);

alter table public.time_entries
  add column cycle_id uuid references public.service_cycles(id) on delete set null;

create index idx_service_cycles_company_dates on public.service_cycles(company_id, starts_on desc, ends_on desc);
create index idx_time_entries_cycle on public.time_entries(cycle_id, created_at desc);

create table public.hour_alerts (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.service_cycles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  threshold_percent smallint not null check (threshold_percent between 1 and 100),
  consumed_minutes integer not null default 0 check (consumed_minutes >= 0),
  contracted_minutes integer not null default 0 check (contracted_minutes >= 0),
  client_notified_at timestamptz,
  admin_notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(cycle_id, threshold_percent)
);

create table public.deliverable_status_history (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  from_status public.deliverable_status,
  to_status public.deliverable_status not null,
  actor_id uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create index idx_deliverable_history_deliverable on public.deliverable_status_history(deliverable_id, created_at desc);
create index idx_deliverable_history_company on public.deliverable_status_history(company_id, created_at desc);

create table public.drive_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  owner_type public.integration_owner not null,
  account_email text,
  google_account_id text,
  root_folder_id text,
  root_folder_name text,
  credential_key text,
  status public.integration_status not null default 'pending',
  last_sync_at timestamptz,
  connected_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_drive_requires_company check ((owner_type = 'client' and company_id is not null) or owner_type = 'cali')
);

create unique index one_active_cali_drive
  on public.drive_connections(owner_type)
  where owner_type = 'cali' and status = 'connected';

create unique index one_active_client_drive_per_company
  on public.drive_connections(company_id)
  where owner_type = 'client' and status = 'connected';

create table public.file_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  connection_id uuid not null references public.drive_connections(id) on delete cascade,
  status public.sync_status not null default 'pending',
  target_folder_id text,
  external_file_id text,
  external_url text,
  error_message text,
  attempts smallint not null default 0 check (attempts >= 0),
  requested_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_file_sync_jobs_file on public.file_sync_jobs(file_id, created_at desc);
create index idx_file_sync_jobs_status on public.file_sync_jobs(status, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger service_cycles_set_updated_at
before update on public.service_cycles
for each row execute function public.set_updated_at();

create trigger drive_connections_set_updated_at
before update on public.drive_connections
for each row execute function public.set_updated_at();

create trigger file_sync_jobs_set_updated_at
before update on public.file_sync_jobs
for each row execute function public.set_updated_at();

create or replace function public.log_deliverable_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.deliverable_status_history (
      deliverable_id,
      company_id,
      from_status,
      to_status,
      actor_id
    ) values (
      new.id,
      new.company_id,
      old.status,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger deliverables_status_history
  after update of status on public.deliverables
  for each row execute function public.log_deliverable_status_change();

create unique index one_nps_per_deliverable
  on public.nps_responses(deliverable_id);

alter table public.service_cycles enable row level security;
alter table public.hour_alerts enable row level security;
alter table public.deliverable_status_history enable row level security;
alter table public.drive_connections enable row level security;
alter table public.file_sync_jobs enable row level security;

create policy admin_all_service_cycles
  on public.service_cycles for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy client_own_service_cycles
  on public.service_cycles for select
  using (public.current_role() = 'client' and company_id = public.current_company_id());

create policy admin_all_hour_alerts
  on public.hour_alerts for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy client_own_hour_alerts
  on public.hour_alerts for select
  using (public.current_role() = 'client' and company_id = public.current_company_id());

create policy admin_deliverable_status_history
  on public.deliverable_status_history for select
  using (public.current_role() = 'admin');

create policy client_own_deliverable_status_history
  on public.deliverable_status_history for select
  using (public.current_role() = 'client' and company_id = public.current_company_id());

-- Conexões OAuth e referências de credenciais ficam restritas ao backend/Admin.
-- O cliente consulta o status por função/Edge Function, sem receber credential_key.
create policy admin_drive_connections
  on public.drive_connections for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy admin_file_sync_jobs
  on public.file_sync_jobs for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy client_own_file_sync_jobs
  on public.file_sync_jobs for select
  using (public.current_role() = 'client' and company_id = public.current_company_id());

create or replace view public.cycle_hour_usage
with (security_invoker = true)
as
select
  c.id as cycle_id,
  c.company_id,
  c.name,
  c.starts_on,
  c.ends_on,
  c.contracted_hours,
  coalesce(sum(te.minutes), 0)::integer as consumed_minutes,
  round(coalesce(sum(te.minutes), 0)::numeric / 60, 2) as consumed_hours,
  greatest(round((c.contracted_hours * 60 - coalesce(sum(te.minutes), 0))::numeric / 60, 2), 0) as remaining_hours,
  case
    when c.contracted_hours = 0 then 0
    else round((coalesce(sum(te.minutes), 0)::numeric / (c.contracted_hours * 60)) * 100, 1)
  end as consumed_percent
from public.service_cycles c
left join public.time_entries te on te.cycle_id = c.id
where c.active = true
group by c.id;
