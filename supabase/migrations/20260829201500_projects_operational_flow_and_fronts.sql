alter table cali_workspace.companies add column if not exists service_plan text;
alter table cali_workspace.companies drop constraint if exists companies_service_plan_check;
alter table cali_workspace.companies add constraint companies_service_plan_check check (service_plan is null or service_plan in ('partner','full'));

alter table cali_workspace.deliverable_tasks
  add column if not exists estimated_minutes integer not null default 0,
  add column if not exists assigned_user_id uuid,
  add column if not exists started_at timestamptz;

create table if not exists cali_workspace.work_timers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid references cali_workspace.projects(id) on delete set null,
  deliverable_id uuid references cali_workspace.deliverables(id) on delete set null,
  task_id uuid references cali_workspace.deliverable_tasks(id) on delete set null,
  user_id uuid not null,
  started_at timestamptz not null default now(),
  stopped_at timestamptz,
  minutes integer,
  status text not null default 'active' check (status in ('active','stopped','discarded')),
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists work_timers_one_active_per_user on cali_workspace.work_timers(user_id) where status='active';
alter table cali_workspace.work_timers enable row level security;
drop policy if exists work_timers_admin_all on cali_workspace.work_timers;
create policy work_timers_admin_all on cali_workspace.work_timers for all using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());

create table if not exists cali_workspace.project_workstreams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid not null references cali_workspace.projects(id) on delete cascade,
  protocol text not null default cali_workspace.generate_protocol('FRT'),
  name text not null,
  objective text,
  roadmap_month_start integer,
  roadmap_month_end integer,
  status text not null default 'planned' check (status in ('planned','active','completed','cancelled')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table cali_workspace.deliverables add column if not exists workstream_id uuid references cali_workspace.project_workstreams(id) on delete set null;
alter table cali_workspace.project_workstreams enable row level security;
drop policy if exists project_workstreams_admin_all on cali_workspace.project_workstreams;
create policy project_workstreams_admin_all on cali_workspace.project_workstreams for all using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
drop policy if exists project_workstreams_client_select on cali_workspace.project_workstreams;
create policy project_workstreams_client_select on cali_workspace.project_workstreams for select using (company_id=cali_workspace.current_company_id());
create index if not exists project_workstreams_project_idx on cali_workspace.project_workstreams(project_id,sort_order);
create index if not exists deliverables_workstream_idx on cali_workspace.deliverables(workstream_id,sort_order);
