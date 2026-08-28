create extension if not exists pgcrypto;

create type public.workspace_role as enum ('admin','client');
create type public.project_status as enum ('draft','internal_review','client_review','adjustment_requested','active','closed','cancelled');
create type public.deliverable_status as enum ('not_started','in_progress','internal_review','client_review','adjustment_requested','approved','cancelled');
create type public.time_entry_type as enum ('timer','manual','interaction');
create type public.report_status as enum ('draft','review','published','acknowledged');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  document_number text,
  logo_path text,
  primary_contact_name text,
  primary_contact_email text not null,
  contracted_hours numeric(8,2) not null default 0,
  alert_threshold_1 smallint not null default 80 check (alert_threshold_1 between 1 and 100),
  alert_threshold_2 smallint not null default 90 check (alert_threshold_2 between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.workspace_role not null,
  company_id uuid references public.companies(id) on delete cascade,
  full_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_requires_company check ((role = 'client' and company_id is not null) or (role = 'admin' and company_id is null))
);

create unique index one_client_access_per_company on public.profiles(company_id) where role = 'client' and active = true;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null unique,
  name text not null,
  description text,
  starts_on date,
  ends_on date,
  status public.project_status not null default 'draft',
  client_change_count smallint not null default 0,
  client_change_limit smallint not null default 2,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null unique,
  title text not null,
  description text,
  workstream text,
  complexity text,
  due_on date,
  status public.deliverable_status not null default 'not_started',
  approval_requested_at timestamptz,
  approved_at timestamptz,
  cancellation_reason text,
  is_document boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deliverable_tasks (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  deliverable_id uuid references public.deliverables(id) on delete set null,
  entry_type public.time_entry_type not null,
  channel text,
  started_at timestamptz,
  ended_at timestamptz,
  minutes integer not null check (minutes >= 0),
  internal_justification text,
  client_description text not null,
  created_by uuid not null references public.profiles(id),
  requires_review boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index one_active_timer_per_admin on public.time_entries(created_by) where entry_type = 'timer' and started_at is not null and ended_at is null;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  deliverable_id uuid references public.deliverables(id) on delete set null,
  title text not null,
  event_type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  meeting_url text,
  client_visible boolean not null default true,
  google_event_id text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  deliverable_id uuid references public.deliverables(id) on delete set null,
  title text not null,
  category text not null default 'document',
  storage_path text,
  external_provider text check (external_provider in ('google_drive') or external_provider is null),
  external_file_id text,
  external_url text,
  client_visible boolean not null default true,
  final_version boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  deliverable_id uuid references public.deliverables(id) on delete cascade,
  report_id uuid,
  body text not null,
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.deliverable_reviews (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  decision text not null check (decision in ('approved','adjustment_requested')),
  comment text,
  reviewed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.nps_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  deliverable_id uuid not null references public.deliverables(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text,
  responded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint low_score_requires_comment check (score >= 4 or length(trim(coalesce(comment,''))) > 0)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reference_month date not null,
  title text not null,
  executive_summary text,
  movements text,
  decisions text,
  risks text,
  next_steps text,
  hours_summary jsonb not null default '{}'::jsonb,
  operational_snapshot jsonb not null default '{}'::jsonb,
  status public.report_status not null default 'draft',
  pdf_storage_path text,
  drive_file_id text,
  drive_url text,
  published_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, reference_month)
);

alter table public.comments add constraint comments_report_fk foreign key (report_id) references public.reports(id) on delete cascade;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  action_url text,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.current_role() returns public.workspace_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.current_company_id() returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid() and active = true;
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.deliverables enable row level security;
alter table public.deliverable_tasks enable row level security;
alter table public.time_entries enable row level security;
alter table public.events enable row level security;
alter table public.files enable row level security;
alter table public.comments enable row level security;
alter table public.deliverable_reviews enable row level security;
alter table public.nps_responses enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;

create policy admin_all_companies on public.companies for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_own_company on public.companies for select using (public.current_role() = 'client' and id = public.current_company_id());

create policy admin_all_profiles on public.profiles for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy profile_self on public.profiles for select using (id = auth.uid());

create policy admin_all_projects on public.projects for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_own_projects on public.projects for select using (public.current_role() = 'client' and company_id = public.current_company_id() and status not in ('draft','internal_review'));

create policy admin_all_deliverables on public.deliverables for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_own_deliverables on public.deliverables for select using (public.current_role() = 'client' and company_id = public.current_company_id() and status in ('client_review','adjustment_requested','approved','cancelled'));

create policy admin_all_tasks on public.deliverable_tasks for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_tasks_for_visible_deliverables on public.deliverable_tasks for select using (exists(select 1 from public.deliverables d where d.id = deliverable_id and d.company_id = public.current_company_id() and d.status in ('client_review','adjustment_requested','approved','cancelled')));

create policy admin_all_time_entries on public.time_entries for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_own_time_entries on public.time_entries for select using (public.current_role() = 'client' and company_id = public.current_company_id());

create policy admin_all_events on public.events for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_own_visible_events on public.events for select using (public.current_role() = 'client' and company_id = public.current_company_id() and client_visible = true);

create policy admin_all_files on public.files for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_own_visible_files on public.files for select using (public.current_role() = 'client' and company_id = public.current_company_id() and client_visible = true);

create policy comments_visible_to_company on public.comments for select using (public.current_role() = 'admin' or company_id = public.current_company_id());
create policy comments_insert_by_participant on public.comments for insert with check (author_id = auth.uid() and (public.current_role() = 'admin' or company_id = public.current_company_id()));

create policy admin_all_reviews on public.deliverable_reviews for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_own_reviews on public.deliverable_reviews for select using (public.current_role() = 'client' and company_id = public.current_company_id());
create policy client_create_review on public.deliverable_reviews for insert with check (public.current_role() = 'client' and company_id = public.current_company_id() and reviewed_by = auth.uid());

create policy admin_all_nps on public.nps_responses for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_own_nps on public.nps_responses for select using (public.current_role() = 'client' and company_id = public.current_company_id());
create policy client_create_nps on public.nps_responses for insert with check (public.current_role() = 'client' and company_id = public.current_company_id() and responded_by = auth.uid());

create policy admin_all_reports on public.reports for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy client_own_published_reports on public.reports for select using (public.current_role() = 'client' and company_id = public.current_company_id() and status in ('published','acknowledged'));
create policy client_ack_report on public.reports for update using (public.current_role() = 'client' and company_id = public.current_company_id() and status = 'published') with check (company_id = public.current_company_id() and acknowledged_by = auth.uid());

create policy own_notifications on public.notifications for select using (recipient_id = auth.uid());
create policy own_notification_read on public.notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy admin_insert_notifications on public.notifications for insert with check (public.current_role() = 'admin');

create policy admin_activity_log on public.activity_log for select using (public.current_role() = 'admin');

create index idx_projects_company on public.projects(company_id);
create index idx_deliverables_company_status on public.deliverables(company_id, status);
create index idx_time_entries_company_created on public.time_entries(company_id, created_at desc);
create index idx_events_company_start on public.events(company_id, starts_at);
create index idx_files_company on public.files(company_id);
create index idx_reports_company_month on public.reports(company_id, reference_month desc);
create index idx_notifications_recipient on public.notifications(recipient_id, read_at, created_at desc);
create index idx_activity_company_created on public.activity_log(company_id, created_at desc);
