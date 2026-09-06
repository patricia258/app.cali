-- CALI Workspace · ciclo de execução de projetos, frentes e entregáveis V44
-- Mantém planejamento (planning_status) separado do estado operacional.

alter table cali_workspace.projects
  add column if not exists execution_status text not null default 'normal',
  add column if not exists lifecycle_reason text,
  add column if not exists lifecycle_resume_date date,
  add column if not exists lifecycle_updated_at timestamptz;

alter table cali_workspace.project_workstreams
  add column if not exists execution_status text not null default 'normal';

alter table cali_workspace.deliverables
  add column if not exists execution_status text not null default 'normal';

do $$ begin
  alter table cali_workspace.projects add constraint projects_execution_status_check_v44
    check (execution_status in ('normal','paused','suspended','cancelled'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table cali_workspace.project_workstreams add constraint project_workstreams_execution_status_check_v44
    check (execution_status in ('normal','paused','suspended','cancelled'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table cali_workspace.deliverables add constraint deliverables_execution_status_check_v44
    check (execution_status in ('normal','paused','suspended','cancelled'));
exception when duplicate_object then null; end $$;

create table if not exists cali_workspace.project_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid not null references cali_workspace.projects(id) on delete cascade,
  scope_type text not null check (scope_type in ('project','front','deliverable')),
  scope_id uuid,
  scope_label text not null,
  action text not null check (action in ('pause','suspend','cancel','resume')),
  reason text not null,
  resume_date date,
  client_visible boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists project_lifecycle_events_project_idx_v44 on cali_workspace.project_lifecycle_events(project_id, created_at desc);
create index if not exists project_lifecycle_events_scope_idx_v44 on cali_workspace.project_lifecycle_events(scope_type, scope_id, created_at desc);

alter table cali_workspace.project_lifecycle_events enable row level security;

drop policy if exists project_lifecycle_events_admin_all_v44 on cali_workspace.project_lifecycle_events;
create policy project_lifecycle_events_admin_all_v44 on cali_workspace.project_lifecycle_events
for all to authenticated
using (exists(select 1 from cali_workspace.profiles p where p.id=auth.uid() and p.role='admin' and p.active=true))
with check (exists(select 1 from cali_workspace.profiles p where p.id=auth.uid() and p.role='admin' and p.active=true));

drop policy if exists project_lifecycle_events_client_read_v44 on cali_workspace.project_lifecycle_events;
create policy project_lifecycle_events_client_read_v44 on cali_workspace.project_lifecycle_events
for select to authenticated
using (client_visible=true and company_id=cali_workspace.current_company_id() and exists(select 1 from cali_workspace.projects p where p.id=project_id and p.company_id=company_id and p.planning_status<>'draft'));

create or replace function cali_workspace.client_can_view_project(p_project_id uuid)
returns boolean language sql stable security definer
set search_path to 'pg_catalog','cali_workspace'
as $$
  select exists(select 1 from cali_workspace.projects p where p.id=p_project_id and p.company_id=cali_workspace.current_company_id() and p.planning_status in ('client_review','adjustment_requested','approved','active','rebriefing','closed'));
$$;

create or replace function cali_workspace.admin_set_project_lifecycle_v44(
  p_project_id uuid,
  p_action text,
  p_scope_type text,
  p_scope_id uuid,
  p_reason text,
  p_resume_date date default null
)
returns uuid language plpgsql security definer
set search_path to 'pg_catalog','cali_workspace'
as $$
declare
  v_company_id uuid;
  v_project_name text;
  v_project_protocol text;
  v_planning_status text;
  v_scope_label text;
  v_event_id uuid;
  v_exec text;
  v_title text;
  v_body text;
  v_visible boolean := true;
  v_front_id uuid;
begin
  if not exists(select 1 from cali_workspace.profiles p where p.id=auth.uid() and p.role='admin' and p.active=true) then raise exception 'Apenas a administração CALI pode alterar o ciclo de execução.'; end if;
  if p_action not in ('pause','suspend','cancel','resume') then raise exception 'Ação inválida.'; end if;
  if p_scope_type not in ('project','front','deliverable') then raise exception 'Escopo inválido.'; end if;
  if length(trim(coalesce(p_reason,''))) < 4 then raise exception 'Informe uma justificativa para registrar e comunicar ao cliente.'; end if;

  select company_id,name,protocol,planning_status into v_company_id,v_project_name,v_project_protocol,v_planning_status from cali_workspace.projects where id=p_project_id;
  if v_company_id is null then raise exception 'Projeto não encontrado.'; end if;
  v_visible := v_planning_status <> 'draft';

  if p_scope_type='project' then
    v_scope_label := v_project_name;
  elsif p_scope_type='front' then
    select name into v_scope_label from cali_workspace.project_workstreams where id=p_scope_id and project_id=p_project_id;
    if v_scope_label is null then raise exception 'Frente não encontrada neste projeto.'; end if;
  else
    select title,workstream_id into v_scope_label,v_front_id from cali_workspace.deliverables where id=p_scope_id and project_id=p_project_id;
    if v_scope_label is null then raise exception 'Entregável não encontrado neste projeto.'; end if;
  end if;

  v_exec := case p_action when 'pause' then 'paused' when 'suspend' then 'suspended' when 'cancel' then 'cancelled' else 'normal' end;

  if p_scope_type='project' then
    if p_action='resume' then
      if (select execution_status from cali_workspace.projects where id=p_project_id)='cancelled' then raise exception 'Projeto cancelado não pode ser retomado.'; end if;
      update cali_workspace.projects set execution_status='normal',status=case when status='paused' then 'active' else status end,lifecycle_reason=null,lifecycle_resume_date=null,lifecycle_updated_at=now(),updated_at=now() where id=p_project_id;
      update cali_workspace.project_workstreams set execution_status='normal',updated_at=now() where project_id=p_project_id and execution_status in ('paused','suspended');
      update cali_workspace.deliverables set execution_status='normal',updated_at=now() where project_id=p_project_id and execution_status in ('paused','suspended');
    elsif p_action in ('pause','suspend') then
      update cali_workspace.projects set execution_status=v_exec,status='paused',lifecycle_reason=trim(p_reason),lifecycle_resume_date=p_resume_date,lifecycle_updated_at=now(),updated_at=now() where id=p_project_id;
      update cali_workspace.project_workstreams set execution_status=v_exec,updated_at=now() where project_id=p_project_id and status<>'cancelled';
      update cali_workspace.deliverables set execution_status=v_exec,updated_at=now() where project_id=p_project_id and status<>'cancelled';
    else
      update cali_workspace.projects set execution_status='cancelled',status='cancelled',planning_status='closed',completed_at=coalesce(completed_at,now()),lifecycle_reason=trim(p_reason),lifecycle_resume_date=null,lifecycle_updated_at=now(),updated_at=now() where id=p_project_id;
      update cali_workspace.project_workstreams set execution_status='cancelled',status='cancelled',updated_at=now() where project_id=p_project_id and status<>'completed';
      update cali_workspace.deliverables set execution_status='cancelled',status='cancelled',updated_at=now() where project_id=p_project_id and status<>'approved';
    end if;
  elsif p_scope_type='front' then
    if p_action='resume' then
      if (select execution_status from cali_workspace.project_workstreams where id=p_scope_id)='cancelled' then raise exception 'Frente cancelada não pode ser retomada.'; end if;
      update cali_workspace.project_workstreams set execution_status='normal',updated_at=now() where id=p_scope_id and project_id=p_project_id;
      update cali_workspace.deliverables set execution_status='normal',updated_at=now() where project_id=p_project_id and workstream_id=p_scope_id and execution_status in ('paused','suspended');
    elsif p_action in ('pause','suspend') then
      update cali_workspace.project_workstreams set execution_status=v_exec,updated_at=now() where id=p_scope_id and project_id=p_project_id;
      update cali_workspace.deliverables set execution_status=v_exec,updated_at=now() where project_id=p_project_id and workstream_id=p_scope_id and status<>'cancelled';
    else
      update cali_workspace.project_workstreams set execution_status='cancelled',status='cancelled',updated_at=now() where id=p_scope_id and project_id=p_project_id;
      update cali_workspace.deliverables set execution_status='cancelled',status='cancelled',updated_at=now() where project_id=p_project_id and workstream_id=p_scope_id and status<>'approved';
    end if;
  else
    if p_action='resume' then
      if (select execution_status from cali_workspace.deliverables where id=p_scope_id)='cancelled' then raise exception 'Entregável cancelado não pode ser retomado.'; end if;
      update cali_workspace.deliverables set execution_status='normal',updated_at=now() where id=p_scope_id and project_id=p_project_id;
    elsif p_action in ('pause','suspend') then
      update cali_workspace.deliverables set execution_status=v_exec,updated_at=now() where id=p_scope_id and project_id=p_project_id;
    else
      update cali_workspace.deliverables set execution_status='cancelled',status='cancelled',updated_at=now() where id=p_scope_id and project_id=p_project_id and status<>'approved';
    end if;
  end if;

  if p_action in ('pause','suspend','cancel') then
    update cali_workspace.work_timers wt set status='paused',paused_at=coalesce(paused_at,now())
     where wt.status='active' and wt.project_id=p_project_id and (p_scope_type='project' or (p_scope_type='deliverable' and wt.deliverable_id=p_scope_id) or (p_scope_type='front' and exists(select 1 from cali_workspace.deliverables d where d.id=wt.deliverable_id and d.workstream_id=p_scope_id)));
  end if;

  if p_action='resume' then
    update cali_workspace.project_lifecycle_events set resolved_at=now(),resolved_by=auth.uid()
     where project_id=p_project_id and scope_type=p_scope_type and ((p_scope_type='project' and scope_id is null) or scope_id=p_scope_id) and action in ('pause','suspend') and resolved_at is null;
  end if;

  insert into cali_workspace.project_lifecycle_events(company_id,project_id,scope_type,scope_id,scope_label,action,reason,resume_date,client_visible,created_by,metadata)
  values(v_company_id,p_project_id,p_scope_type,case when p_scope_type='project' then null else p_scope_id end,v_scope_label,p_action,trim(p_reason),p_resume_date,v_visible,auth.uid(),jsonb_build_object('project_protocol',v_project_protocol)) returning id into v_event_id;

  v_title := case p_action when 'pause' then 'Execução pausada' when 'suspend' then 'Execução suspensa' when 'cancel' then 'Execução cancelada' else 'Execução retomada' end;
  v_body := case p_scope_type when 'project' then 'Projeto ' when 'front' then 'Frente ' else 'Entregável ' end || v_scope_label || ': ' || trim(p_reason) || case when p_resume_date is not null and p_action in ('pause','suspend') then ' · previsão de retomada '||to_char(p_resume_date,'DD/MM/YYYY') else '' end;

  if v_visible then
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    select v_company_id,p.id,'project_lifecycle',v_title,v_body,'project',p_project_id,'/cliente/entregaveis',case when p_action='cancel' then 'high' else 'normal' end,true
      from cali_workspace.profiles p where p.company_id=v_company_id and p.role='client' and p.active=true;
  end if;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_company_id,auth.uid(),'project_lifecycle_'||p_action,p_scope_type,case when p_scope_type='project' then p_project_id else p_scope_id end,jsonb_build_object('project_id',p_project_id,'scope_label',v_scope_label,'reason',trim(p_reason),'resume_date',p_resume_date,'client_visible',v_visible));

  perform cali_workspace.refresh_project_forecast(p_project_id);
  return v_event_id;
end;
$$;

grant select on cali_workspace.project_lifecycle_events to authenticated;
grant execute on function cali_workspace.admin_set_project_lifecycle_v44(uuid,text,text,uuid,text,date) to authenticated;
