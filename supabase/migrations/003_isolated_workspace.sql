-- CALI Workspace · isolated shared-project schema
-- Temporary architecture: reuse the existing Supabase project without mixing
-- Workspace tables with Mapa/Portal tables. All Workspace business tables live
-- in the dedicated cali_workspace schema so a later migration is straightforward.

create schema if not exists cali_workspace;

create or replace function cali_workspace.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, cali_workspace
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table cali_workspace.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  logo_url text,
  status text not null default 'active' check (status in ('active','paused','closed')),
  service_type text,
  start_date date,
  end_date date,
  monthly_hours_contracted numeric(8,2) check (monthly_hours_contracted is null or monthly_hours_contracted >= 0),
  show_hours_to_client boolean not null default false,
  drive_folder_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cali_workspace.client_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  email text not null,
  full_name text not null,
  is_primary boolean not null default true,
  active boolean not null default true,
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);

create table cali_workspace.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references cali_workspace.companies(id) on delete set null,
  email text not null,
  full_name text not null,
  role text not null default 'client' check (role in ('admin','client')),
  is_primary boolean not null default false,
  active boolean not null default true,
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cali_workspace.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('planned','active','paused','completed','cancelled')),
  start_date date,
  target_end_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cali_workspace.service_cycles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid references cali_workspace.projects(id) on delete set null,
  reference_month date not null,
  contracted_hours numeric(8,2) check (contracted_hours is null or contracted_hours >= 0),
  status text not null default 'open' check (status in ('planned','open','review','closed')),
  executive_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, reference_month)
);

create table cali_workspace.deliverables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid references cali_workspace.projects(id) on delete set null,
  cycle_id uuid references cali_workspace.service_cycles(id) on delete set null,
  code text,
  title text not null,
  description text,
  status text not null default 'not_started' check (status in ('not_started','in_progress','internal_review','client_review','adjustment_requested','approved','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  due_at timestamptz,
  client_visible boolean not null default true,
  approval_requested_at timestamptz,
  client_response_at timestamptz,
  approved_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  final_drive_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cali_workspace.deliverable_status_history (
  id bigint generated always as identity primary key,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  deliverable_id uuid not null references cali_workspace.deliverables(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table cali_workspace.hour_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid references cali_workspace.projects(id) on delete set null,
  cycle_id uuid references cali_workspace.service_cycles(id) on delete set null,
  deliverable_id uuid references cali_workspace.deliverables(id) on delete set null,
  work_date date not null default current_date,
  minutes integer not null check (minutes > 0 and minutes <= 1440),
  description text not null,
  category text,
  client_visible boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cali_workspace.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid references cali_workspace.projects(id) on delete set null,
  title text not null,
  event_type text not null default 'meeting' check (event_type in ('meeting','validation','deadline','milestone','other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  mode text check (mode is null or mode in ('remote','in_person')),
  location text,
  meeting_url text,
  description text,
  visibility text not null default 'client' check (visibility in ('internal','client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cali_workspace.files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid references cali_workspace.projects(id) on delete set null,
  deliverable_id uuid references cali_workspace.deliverables(id) on delete set null,
  title text not null,
  category text not null default 'other' check (category in ('policy','manual','flow','guide','report','onboarding','deliverable','other')),
  storage_path text,
  drive_url text,
  version_label text,
  is_final boolean not null default false,
  client_visible boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or drive_url is not null)
);

create table cali_workspace.reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  cycle_id uuid references cali_workspace.service_cycles(id) on delete set null,
  title text not null,
  reference_month date not null,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  executive_summary text,
  movements jsonb not null default '[]'::jsonb check (jsonb_typeof(movements) = 'array'),
  decisions jsonb not null default '[]'::jsonb check (jsonb_typeof(decisions) = 'array'),
  risks jsonb not null default '[]'::jsonb check (jsonb_typeof(risks) = 'array'),
  next_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(next_steps) = 'array'),
  hours_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(hours_summary) = 'object'),
  pdf_path text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, reference_month)
);

create table cali_workspace.comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  target_type text not null check (target_type in ('deliverable','report','event','project')),
  target_id uuid not null,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  client_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cali_workspace.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references cali_workspace.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create table cali_workspace.nps_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  deliverable_id uuid references cali_workspace.deliverables(id) on delete cascade,
  cycle_id uuid references cali_workspace.service_cycles(id) on delete cascade,
  score smallint not null check (score between 0 and 10),
  comment text,
  created_at timestamptz not null default now(),
  check (deliverable_id is not null or cycle_id is not null)
);

create unique index nps_one_per_user_deliverable on cali_workspace.nps_responses (user_id, deliverable_id) where deliverable_id is not null;
create unique index nps_one_per_user_cycle on cali_workspace.nps_responses (user_id, cycle_id) where cycle_id is not null;

create table cali_workspace.activity_log (
  id bigint generated always as identity primary key,
  company_id uuid references cali_workspace.companies(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index projects_company_idx on cali_workspace.projects(company_id);
create index cycles_company_month_idx on cali_workspace.service_cycles(company_id, reference_month desc);
create index deliverables_company_status_idx on cali_workspace.deliverables(company_id, status);
create index deliverables_project_idx on cali_workspace.deliverables(project_id);
create index hour_entries_company_date_idx on cali_workspace.hour_entries(company_id, work_date desc);
create index events_company_start_idx on cali_workspace.events(company_id, starts_at);
create index files_company_created_idx on cali_workspace.files(company_id, created_at desc);
create index reports_company_month_idx on cali_workspace.reports(company_id, reference_month desc);
create index comments_target_idx on cali_workspace.comments(target_type, target_id, created_at);
create index notifications_user_unread_idx on cali_workspace.notifications(user_id, read_at, created_at desc);
create index activity_company_created_idx on cali_workspace.activity_log(company_id, created_at desc);

create trigger companies_touch_updated_at before update on cali_workspace.companies for each row execute function cali_workspace.touch_updated_at();
create trigger client_invites_touch_updated_at before update on cali_workspace.client_invites for each row execute function cali_workspace.touch_updated_at();
create trigger profiles_touch_updated_at before update on cali_workspace.profiles for each row execute function cali_workspace.touch_updated_at();
create trigger projects_touch_updated_at before update on cali_workspace.projects for each row execute function cali_workspace.touch_updated_at();
create trigger cycles_touch_updated_at before update on cali_workspace.service_cycles for each row execute function cali_workspace.touch_updated_at();
create trigger deliverables_touch_updated_at before update on cali_workspace.deliverables for each row execute function cali_workspace.touch_updated_at();
create trigger hour_entries_touch_updated_at before update on cali_workspace.hour_entries for each row execute function cali_workspace.touch_updated_at();
create trigger events_touch_updated_at before update on cali_workspace.events for each row execute function cali_workspace.touch_updated_at();
create trigger files_touch_updated_at before update on cali_workspace.files for each row execute function cali_workspace.touch_updated_at();
create trigger reports_touch_updated_at before update on cali_workspace.reports for each row execute function cali_workspace.touch_updated_at();
create trigger comments_touch_updated_at before update on cali_workspace.comments for each row execute function cali_workspace.touch_updated_at();

create or replace function cali_workspace.is_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, auth, cali_workspace
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) = 'patricia@calirh.com'; $$;

create or replace function cali_workspace.current_company_id()
returns uuid language sql stable security definer
set search_path = pg_catalog, auth, cali_workspace
as $$
  select p.company_id from cali_workspace.profiles p
  where p.id = auth.uid() and p.active limit 1;
$$;

create or replace function cali_workspace.can_access_company(target_company_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, auth, cali_workspace
as $$ select cali_workspace.is_admin() or target_company_id = cali_workspace.current_company_id(); $$;

grant usage on schema cali_workspace to authenticated, service_role;
grant select, insert, update, delete on all tables in schema cali_workspace to authenticated, service_role;
grant usage, select on all sequences in schema cali_workspace to authenticated, service_role;
grant execute on function cali_workspace.is_admin() to authenticated, service_role;
grant execute on function cali_workspace.current_company_id() to authenticated, service_role;
grant execute on function cali_workspace.can_access_company(uuid) to authenticated, service_role;

alter default privileges in schema cali_workspace grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema cali_workspace grant usage, select on sequences to authenticated, service_role;

alter table cali_workspace.companies enable row level security;
alter table cali_workspace.client_invites enable row level security;
alter table cali_workspace.profiles enable row level security;
alter table cali_workspace.projects enable row level security;
alter table cali_workspace.service_cycles enable row level security;
alter table cali_workspace.deliverables enable row level security;
alter table cali_workspace.deliverable_status_history enable row level security;
alter table cali_workspace.hour_entries enable row level security;
alter table cali_workspace.events enable row level security;
alter table cali_workspace.files enable row level security;
alter table cali_workspace.reports enable row level security;
alter table cali_workspace.comments enable row level security;
alter table cali_workspace.notifications enable row level security;
alter table cali_workspace.nps_responses enable row level security;
alter table cali_workspace.activity_log enable row level security;

create policy companies_admin_all on cali_workspace.companies for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy companies_client_select on cali_workspace.companies for select to authenticated using (id = cali_workspace.current_company_id());
create policy invites_admin_all on cali_workspace.client_invites for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy profiles_admin_all on cali_workspace.profiles for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy profiles_self_select on cali_workspace.profiles for select to authenticated using (id = auth.uid());
create policy projects_admin_all on cali_workspace.projects for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy projects_client_select on cali_workspace.projects for select to authenticated using (company_id = cali_workspace.current_company_id());
create policy cycles_admin_all on cali_workspace.service_cycles for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy cycles_client_select on cali_workspace.service_cycles for select to authenticated using (company_id = cali_workspace.current_company_id());
create policy deliverables_admin_all on cali_workspace.deliverables for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy deliverables_client_select on cali_workspace.deliverables for select to authenticated using (company_id = cali_workspace.current_company_id() and client_visible);
create policy deliverable_history_admin_all on cali_workspace.deliverable_status_history for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy deliverable_history_client_select on cali_workspace.deliverable_status_history for select to authenticated using (company_id = cali_workspace.current_company_id());
create policy hours_admin_all on cali_workspace.hour_entries for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy hours_client_select on cali_workspace.hour_entries for select to authenticated using (company_id = cali_workspace.current_company_id() and client_visible and exists (select 1 from cali_workspace.companies c where c.id = company_id and c.show_hours_to_client));
create policy events_admin_all on cali_workspace.events for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy events_client_select on cali_workspace.events for select to authenticated using (company_id = cali_workspace.current_company_id() and visibility = 'client');
create policy files_admin_all on cali_workspace.files for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy files_client_select on cali_workspace.files for select to authenticated using (company_id = cali_workspace.current_company_id() and client_visible);
create policy reports_admin_all on cali_workspace.reports for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy reports_client_select on cali_workspace.reports for select to authenticated using (company_id = cali_workspace.current_company_id() and status = 'published');
create policy comments_admin_all on cali_workspace.comments for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy comments_client_select on cali_workspace.comments for select to authenticated using (company_id = cali_workspace.current_company_id() and client_visible);
create policy notifications_admin_all on cali_workspace.notifications for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy notifications_self_select on cali_workspace.notifications for select to authenticated using (user_id = auth.uid());
create policy nps_admin_select on cali_workspace.nps_responses for select to authenticated using (cali_workspace.is_admin());
create policy activity_admin_all on cali_workspace.activity_log for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());

insert into cali_workspace.profiles (id, email, full_name, role, is_primary, active)
select u.id, lower(u.email), coalesce(nullif(u.raw_user_meta_data ->> 'full_name',''), 'Patrícia Lima'), 'admin', false, true
from auth.users u
where lower(u.email) = 'patricia@calirh.com'
on conflict (id) do update set role = 'admin', active = true, email = excluded.email;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cali-workspace-private','cali-workspace-private',false,52428800,array['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;
