-- CALI Workspace · Projetos + Entregáveis
-- Espelha as migrations já aplicadas no projeto Supabase cali_workspace.

alter table cali_workspace.projects
  add column if not exists planning_status text not null default 'draft',
  add column if not exists client_response_business_days integer not null default 3,
  add column if not exists adjustment_limit integer not null default 3,
  add column if not exists roadmap_start_date date,
  add column if not exists roadmap_end_date date,
  add column if not exists client_approved_at timestamptz,
  add column if not exists activated_at timestamptz;

alter table cali_workspace.projects drop constraint if exists projects_planning_status_check;
alter table cali_workspace.projects add constraint projects_planning_status_check check (planning_status in ('draft','client_review','adjustment_requested','approved','active','rebriefing','closed'));
alter table cali_workspace.projects drop constraint if exists projects_client_response_days_check;
alter table cali_workspace.projects add constraint projects_client_response_days_check check (client_response_business_days between 1 and 30);
alter table cali_workspace.projects drop constraint if exists projects_adjustment_limit_check;
alter table cali_workspace.projects add constraint projects_adjustment_limit_check check (adjustment_limit between 0 and 20);

alter table cali_workspace.deliverables
  add column if not exists complexity text,
  add column if not exists workstream text,
  add column if not exists roadmap_month_start integer,
  add column if not exists roadmap_month_end integer,
  add column if not exists original_due_at timestamptz,
  add column if not exists client_response_due_at timestamptz,
  add column if not exists client_delay_business_days integer not null default 0,
  add column if not exists adjustment_count integer not null default 0,
  add column if not exists rebriefing_required boolean not null default false,
  add column if not exists is_document boolean not null default false,
  add column if not exists locked_at timestamptz,
  add column if not exists estimated_effort_note text;

alter table cali_workspace.deliverables drop constraint if exists deliverables_complexity_check;
alter table cali_workspace.deliverables add constraint deliverables_complexity_check check (complexity is null or complexity in ('MC1','MC2','MC3'));
alter table cali_workspace.deliverables drop constraint if exists deliverables_roadmap_month_check;
alter table cali_workspace.deliverables add constraint deliverables_roadmap_month_check check ((roadmap_month_start is null or roadmap_month_start between 1 and 60) and (roadmap_month_end is null or roadmap_month_end between 1 and 60) and (roadmap_month_start is null or roadmap_month_end is null or roadmap_month_end >= roadmap_month_start));

create table if not exists cali_workspace.deliverable_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  deliverable_id uuid not null references cali_workspace.deliverables(id) on delete cascade,
  protocol text not null default cali_workspace.generate_protocol('TSK'),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','doing','done','cancelled')),
  due_at timestamptz,
  client_visible boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cali_workspace.deliverable_dependencies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  deliverable_id uuid not null references cali_workspace.deliverables(id) on delete cascade,
  depends_on_deliverable_id uuid not null references cali_workspace.deliverables(id) on delete cascade,
  relation_type text not null default 'finish_to_start' check (relation_type='finish_to_start'),
  created_at timestamptz not null default now(),
  unique(deliverable_id, depends_on_deliverable_id),
  check (deliverable_id <> depends_on_deliverable_id)
);

create table if not exists cali_workspace.deliverable_adjustments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid references cali_workspace.projects(id) on delete cascade,
  deliverable_id uuid not null references cali_workspace.deliverables(id) on delete cascade,
  protocol text not null default cali_workspace.generate_protocol('ADJ'),
  request_number integer not null,
  request_kind text not null default 'adjustment' check (request_kind in ('adjustment','rebriefing')),
  reason text not null,
  requested_by uuid references auth.users(id) on delete set null,
  old_due_at timestamptz,
  new_due_at timestamptz,
  impact_business_days integer not null default 0,
  status text not null default 'open' check (status in ('open','accepted','resolved','declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(deliverable_id, request_number)
);

create table if not exists cali_workspace.project_review_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid not null references cali_workspace.projects(id) on delete cascade,
  protocol text not null default cali_workspace.generate_protocol('REV'),
  review_type text not null default 'schedule' check (review_type in ('schedule','deliverable')),
  status text not null default 'pending' check (status in ('pending','approved','adjustment_requested','expired','cancelled')),
  requested_at timestamptz not null default now(),
  response_due_at timestamptz,
  responded_at timestamptz,
  response_note text,
  delay_business_days integer not null default 0,
  downstream_shift_business_days integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  responded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists cali_workspace.business_holidays (
  holiday_date date primary key,
  name text not null,
  scope text not null default 'BR' check (scope in ('BR','PR','CURITIBA','CUSTOM')),
  created_at timestamptz not null default now()
);

create or replace function cali_workspace.is_business_day(p_date date) returns boolean language sql stable security definer set search_path='pg_catalog','cali_workspace' as $$
  select extract(isodow from p_date) between 1 and 5 and not exists (select 1 from cali_workspace.business_holidays h where h.holiday_date=p_date);
$$;

create or replace function cali_workspace.add_business_days(p_date date,p_days integer) returns date language plpgsql stable security definer set search_path='pg_catalog','cali_workspace' as $$
declare v_date date:=p_date; v_left integer:=greatest(coalesce(p_days,0),0);
begin while v_left>0 loop v_date:=v_date+1; if cali_workspace.is_business_day(v_date) then v_left:=v_left-1; end if; end loop; return v_date; end;
$$;

create or replace function cali_workspace.shift_project_deadlines(p_project_id uuid,p_from_sort_order integer,p_business_days integer,p_reason text default null) returns integer language plpgsql security definer set search_path='pg_catalog','cali_workspace' as $$
declare v_company_id uuid; v_shifted integer:=0; r record;
begin
  select company_id into v_company_id from cali_workspace.projects where id=p_project_id;
  if v_company_id is null or not cali_workspace.can_access_company(v_company_id) then raise exception 'access denied'; end if;
  if coalesce(p_business_days,0)<=0 then return 0; end if;
  for r in select id,due_at from cali_workspace.deliverables where project_id=p_project_id and sort_order>coalesce(p_from_sort_order,-1) and due_at is not null and status not in ('approved','cancelled') order by sort_order loop
    update cali_workspace.deliverables set original_due_at=coalesce(original_due_at,due_at), due_at=(cali_workspace.add_business_days(r.due_at::date,p_business_days)::timestamp+r.due_at::time) at time zone 'America/Sao_Paulo', updated_at=now() where id=r.id;
    v_shifted:=v_shifted+1;
  end loop;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata) values(v_company_id,auth.uid(),'project_deadlines_shifted','project',p_project_id,jsonb_build_object('business_days',p_business_days,'from_sort_order',p_from_sort_order,'reason',p_reason,'deliverables_shifted',v_shifted));
  return v_shifted;
end;
$$;

create or replace function cali_workspace.register_client_delay(p_deliverable_id uuid,p_delay_business_days integer,p_reason text default 'Atraso na resposta do cliente') returns integer language plpgsql security definer set search_path='pg_catalog','cali_workspace' as $$
declare v_company_id uuid; v_project_id uuid; v_sort_order integer; v_shifted integer;
begin
  select company_id,project_id,sort_order into v_company_id,v_project_id,v_sort_order from cali_workspace.deliverables where id=p_deliverable_id;
  if v_company_id is null or not cali_workspace.can_access_company(v_company_id) then raise exception 'access denied'; end if;
  if v_project_id is null then return 0; end if;
  update cali_workspace.deliverables set client_delay_business_days=client_delay_business_days+greatest(coalesce(p_delay_business_days,0),0),updated_at=now() where id=p_deliverable_id;
  v_shifted:=cali_workspace.shift_project_deadlines(v_project_id,v_sort_order,greatest(coalesce(p_delay_business_days,0),0),p_reason);
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata) values(v_company_id,auth.uid(),'client_response_delay','deliverable',p_deliverable_id,jsonb_build_object('business_days',p_delay_business_days,'reason',p_reason,'downstream_shifted',v_shifted));
  return v_shifted;
end;
$$;

create or replace function cali_workspace.request_deliverable_adjustment(p_deliverable_id uuid,p_reason text,p_impact_business_days integer default 0) returns jsonb language plpgsql security definer set search_path='pg_catalog','cali_workspace' as $$
declare v_company_id uuid; v_project_id uuid; v_sort_order integer; v_due_at timestamptz; v_count integer; v_limit integer; v_kind text; v_new_due timestamptz; v_adjustment_id uuid;
begin
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason required'; end if;
  select d.company_id,d.project_id,d.sort_order,d.due_at,d.adjustment_count,coalesce(p.adjustment_limit,3) into v_company_id,v_project_id,v_sort_order,v_due_at,v_count,v_limit from cali_workspace.deliverables d left join cali_workspace.projects p on p.id=d.project_id where d.id=p_deliverable_id;
  if v_company_id is null or not cali_workspace.can_access_company(v_company_id) then raise exception 'access denied'; end if;
  v_count:=coalesce(v_count,0)+1; v_kind:=case when v_count>v_limit then 'rebriefing' else 'adjustment' end; v_new_due:=v_due_at;
  if v_due_at is not null and coalesce(p_impact_business_days,0)>0 then v_new_due:=(cali_workspace.add_business_days(v_due_at::date,p_impact_business_days)::timestamp+v_due_at::time) at time zone 'America/Sao_Paulo'; end if;
  update cali_workspace.deliverables set adjustment_count=v_count,rebriefing_required=(v_kind='rebriefing'),status='adjustment_requested',original_due_at=coalesce(original_due_at,due_at),due_at=v_new_due,updated_at=now() where id=p_deliverable_id;
  insert into cali_workspace.deliverable_adjustments(company_id,project_id,deliverable_id,request_number,request_kind,reason,requested_by,old_due_at,new_due_at,impact_business_days) values(v_company_id,v_project_id,p_deliverable_id,v_count,v_kind,trim(p_reason),auth.uid(),v_due_at,v_new_due,greatest(coalesce(p_impact_business_days,0),0)) returning id into v_adjustment_id;
  if v_project_id is not null and coalesce(p_impact_business_days,0)>0 then perform cali_workspace.shift_project_deadlines(v_project_id,v_sort_order,p_impact_business_days,case when v_kind='rebriefing' then 'Rebriefing após novo pedido de alteração' else 'Ajuste solicitado pelo cliente' end); end if;
  if v_kind='rebriefing' and v_project_id is not null then update cali_workspace.projects set planning_status='rebriefing',updated_at=now() where id=v_project_id; end if;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata) values(v_company_id,auth.uid(),case when v_kind='rebriefing' then 'deliverable_rebriefing_required' else 'deliverable_adjustment_requested' end,'deliverable',p_deliverable_id,jsonb_build_object('request_number',v_count,'limit',v_limit,'impact_business_days',p_impact_business_days,'reason',trim(p_reason)));
  return jsonb_build_object('adjustment_id',v_adjustment_id,'request_number',v_count,'kind',v_kind,'new_due_at',v_new_due);
end;
$$;

alter table cali_workspace.deliverable_tasks enable row level security;
alter table cali_workspace.deliverable_dependencies enable row level security;
alter table cali_workspace.deliverable_adjustments enable row level security;
alter table cali_workspace.project_review_requests enable row level security;
alter table cali_workspace.business_holidays enable row level security;

drop policy if exists deliverable_tasks_admin_all on cali_workspace.deliverable_tasks;
create policy deliverable_tasks_admin_all on cali_workspace.deliverable_tasks for all using(cali_workspace.is_admin()) with check(cali_workspace.is_admin());
drop policy if exists deliverable_tasks_client_select on cali_workspace.deliverable_tasks;
create policy deliverable_tasks_client_select on cali_workspace.deliverable_tasks for select using(company_id=cali_workspace.current_company_id() and client_visible);
drop policy if exists deliverable_dependencies_admin_all on cali_workspace.deliverable_dependencies;
create policy deliverable_dependencies_admin_all on cali_workspace.deliverable_dependencies for all using(cali_workspace.is_admin()) with check(cali_workspace.is_admin());
drop policy if exists deliverable_dependencies_client_select on cali_workspace.deliverable_dependencies;
create policy deliverable_dependencies_client_select on cali_workspace.deliverable_dependencies for select using(company_id=cali_workspace.current_company_id());
drop policy if exists deliverable_adjustments_admin_all on cali_workspace.deliverable_adjustments;
create policy deliverable_adjustments_admin_all on cali_workspace.deliverable_adjustments for all using(cali_workspace.is_admin()) with check(cali_workspace.is_admin());
drop policy if exists deliverable_adjustments_client_select on cali_workspace.deliverable_adjustments;
create policy deliverable_adjustments_client_select on cali_workspace.deliverable_adjustments for select using(company_id=cali_workspace.current_company_id());
drop policy if exists project_review_requests_admin_all on cali_workspace.project_review_requests;
create policy project_review_requests_admin_all on cali_workspace.project_review_requests for all using(cali_workspace.is_admin()) with check(cali_workspace.is_admin());
drop policy if exists project_review_requests_client_select on cali_workspace.project_review_requests;
create policy project_review_requests_client_select on cali_workspace.project_review_requests for select using(company_id=cali_workspace.current_company_id());
drop policy if exists business_holidays_admin_all on cali_workspace.business_holidays;
create policy business_holidays_admin_all on cali_workspace.business_holidays for all using(cali_workspace.is_admin()) with check(cali_workspace.is_admin());
drop policy if exists business_holidays_authenticated_select on cali_workspace.business_holidays;
create policy business_holidays_authenticated_select on cali_workspace.business_holidays for select using(auth.uid() is not null);

create index if not exists deliverable_tasks_deliverable_idx on cali_workspace.deliverable_tasks(deliverable_id,sort_order);
create index if not exists deliverable_adjustments_deliverable_idx on cali_workspace.deliverable_adjustments(deliverable_id,created_at desc);
create index if not exists project_review_requests_project_idx on cali_workspace.project_review_requests(project_id,created_at desc);
create index if not exists deliverables_project_sort_idx on cali_workspace.deliverables(project_id,sort_order);
