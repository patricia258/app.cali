-- CALI Workspace · operations, hours and Drive integration support
-- Depends only on cali_workspace objects created by 003_isolated_workspace.sql.

create table cali_workspace.hour_alerts (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cali_workspace.service_cycles(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  threshold_percent smallint not null check (threshold_percent between 1 and 100),
  consumed_minutes integer not null default 0 check (consumed_minutes >= 0),
  contracted_minutes integer not null default 0 check (contracted_minutes >= 0),
  client_notified_at timestamptz,
  admin_notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cycle_id, threshold_percent)
);

create table cali_workspace.drive_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references cali_workspace.companies(id) on delete cascade,
  owner_type text not null check (owner_type in ('cali','client')),
  account_email text,
  google_account_id text,
  root_folder_id text,
  root_folder_name text,
  credential_key text,
  status text not null default 'pending' check (status in ('pending','connected','expired','revoked','error')),
  last_sync_at timestamptz,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_type = 'client' and company_id is not null) or owner_type = 'cali')
);

create unique index one_active_cali_drive on cali_workspace.drive_connections(owner_type)
where owner_type = 'cali' and status = 'connected';
create unique index one_active_client_drive_per_company on cali_workspace.drive_connections(company_id)
where owner_type = 'client' and status = 'connected';

create table cali_workspace.file_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references cali_workspace.files(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  connection_id uuid not null references cali_workspace.drive_connections(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','synced','error')),
  target_folder_id text,
  external_file_id text,
  external_url text,
  error_message text,
  attempts smallint not null default 0 check (attempts >= 0),
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hour_alerts_company_idx on cali_workspace.hour_alerts(company_id, created_at desc);
create index deliverable_history_deliverable_idx on cali_workspace.deliverable_status_history(deliverable_id, created_at desc);
create index file_sync_jobs_file_idx on cali_workspace.file_sync_jobs(file_id, created_at desc);
create index file_sync_jobs_status_idx on cali_workspace.file_sync_jobs(status, created_at);

create trigger drive_connections_touch_updated_at before update on cali_workspace.drive_connections for each row execute function cali_workspace.touch_updated_at();
create trigger file_sync_jobs_touch_updated_at before update on cali_workspace.file_sync_jobs for each row execute function cali_workspace.touch_updated_at();

create or replace function cali_workspace.log_deliverable_status_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, auth, cali_workspace
as $$
begin
  if old.status is distinct from new.status then
    insert into cali_workspace.deliverable_status_history (
      company_id, deliverable_id, from_status, to_status, actor_user_id
    ) values (
      new.company_id, new.id, old.status, new.status, auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger deliverables_status_history
after update of status on cali_workspace.deliverables
for each row execute function cali_workspace.log_deliverable_status_change();

alter table cali_workspace.hour_alerts enable row level security;
alter table cali_workspace.drive_connections enable row level security;
alter table cali_workspace.file_sync_jobs enable row level security;

grant select, insert, update, delete on cali_workspace.hour_alerts, cali_workspace.drive_connections, cali_workspace.file_sync_jobs to authenticated, service_role;
grant execute on function cali_workspace.log_deliverable_status_change() to service_role;

create policy hour_alerts_admin_all on cali_workspace.hour_alerts for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy hour_alerts_client_select on cali_workspace.hour_alerts for select to authenticated using (
  company_id = cali_workspace.current_company_id()
  and exists (select 1 from cali_workspace.companies c where c.id = company_id and c.show_hours_to_client)
);
create policy drive_connections_admin_all on cali_workspace.drive_connections for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy file_sync_jobs_admin_all on cali_workspace.file_sync_jobs for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy file_sync_jobs_client_select on cali_workspace.file_sync_jobs for select to authenticated using (company_id = cali_workspace.current_company_id());

create or replace view cali_workspace.cycle_hour_usage
with (security_invoker = true)
as
select
  c.id as cycle_id,
  c.company_id,
  c.reference_month,
  c.contracted_hours,
  coalesce(sum(te.minutes), 0)::integer as consumed_minutes,
  round(coalesce(sum(te.minutes), 0)::numeric / 60, 2) as consumed_hours,
  greatest(round(((coalesce(c.contracted_hours, 0) * 60) - coalesce(sum(te.minutes), 0))::numeric / 60, 2), 0) as remaining_hours,
  case when coalesce(c.contracted_hours, 0) = 0 then 0
       else round((coalesce(sum(te.minutes), 0)::numeric / (c.contracted_hours * 60)) * 100, 1)
  end as consumed_percent
from cali_workspace.service_cycles c
left join cali_workspace.hour_entries te on te.cycle_id = c.id
group by c.id;

grant select on cali_workspace.cycle_hour_usage to authenticated, service_role;
