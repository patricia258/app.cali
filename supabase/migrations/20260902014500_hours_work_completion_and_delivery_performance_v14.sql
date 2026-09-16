-- CALI Workspace · Horas V14
-- Sessão de trabalho (pause) x encerramento definitivo (stop) x aprovação do cliente.

alter table cali_workspace.deliverables
  add column if not exists started_at timestamptz,
  add column if not exists work_closed_at timestamptz,
  add column if not exists work_close_reason text,
  add column if not exists work_closed_by uuid references auth.users(id) on delete set null;

alter table cali_workspace.deliverable_tasks
  add column if not exists work_closed_at timestamptz,
  add column if not exists work_close_reason text,
  add column if not exists work_closed_by uuid references auth.users(id) on delete set null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='deliverables_work_close_reason_check'
      and conrelid='cali_workspace.deliverables'::regclass
  ) then
    alter table cali_workspace.deliverables
      add constraint deliverables_work_close_reason_check
      check (work_close_reason is null or work_close_reason in ('client_approval','admin_finalized','cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='deliverable_tasks_work_close_reason_check'
      and conrelid='cali_workspace.deliverable_tasks'::regclass
  ) then
    alter table cali_workspace.deliverable_tasks
      add constraint deliverable_tasks_work_close_reason_check
      check (work_close_reason is null or work_close_reason in ('client_approval','admin_finalized','cancelled'));
  end if;
end $$;

create or replace function cali_workspace.business_days_delta(p_due date, p_done date)
returns integer
language plpgsql
stable security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_count integer := 0;
begin
  if p_due is null or p_done is null or p_due = p_done then return 0; end if;

  if p_done > p_due then
    select count(*)::integer into v_count
    from generate_series(p_due + 1, p_done, interval '1 day') g(d)
    where cali_workspace.is_business_day(g.d::date);
    return v_count;
  end if;

  select count(*)::integer into v_count
  from generate_series(p_done + 1, p_due, interval '1 day') g(d)
  where cali_workspace.is_business_day(g.d::date);
  return -v_count;
end;
$$;

grant execute on function cali_workspace.business_days_delta(date,date) to authenticated, service_role;

create or replace function cali_workspace.close_timer_session_at(
  p_timer_id uuid,
  p_end_at timestamptz,
  p_event_type text default 'timer_session_closed',
  p_actor_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace, auth
as $$
declare
  v cali_workspace.work_timers%rowtype;
  v_end timestamptz;
  v_paused integer;
  v_seconds integer;
  v_minutes integer;
  v_description text;
  v_entry_id uuid;
begin
  select * into v
  from cali_workspace.work_timers
  where id=p_timer_id and status in ('active','paused')
  for update;
  if not found then return 0; end if;

  v_end := case
    when v.status='paused' and v.paused_at is not null then least(coalesce(p_end_at,now()),v.paused_at)
    else coalesce(p_end_at,now())
  end;
  v_paused := coalesce(v.paused_seconds,0);
  v_seconds := greatest(1,floor(extract(epoch from (v_end-v.started_at)))::integer-v_paused);
  v_minutes := greatest(1,ceil(v_seconds/60.0)::integer);
  v_description := coalesce(
    nullif(trim(coalesce(v.description,'')),''),
    nullif(trim(coalesce(v.note,'')),''),
    'Atividade registrada por timer'
  );

  update cali_workspace.work_timers
     set stopped_at=v_end,
         minutes=v_minutes,
         status='stopped',
         paused_at=null,
         description=v_description
   where id=v.id;

  insert into cali_workspace.hour_entries(
    company_id,project_id,cycle_id,deliverable_id,task_id,
    work_date,minutes,description,category,client_visible,created_by,
    source_type,started_at,ended_at,internal_note
  ) values(
    v.company_id,v.project_id,v.cycle_id,v.deliverable_id,v.task_id,
    (v_end at time zone 'America/Sao_Paulo')::date,v_minutes,v_description,
    coalesce(v.category,'Execução'),v.client_visible,v.user_id,
    'timer',v.started_at,v_end,null
  ) returning id into v_entry_id;

  insert into cali_workspace.activity_log(
    company_id,actor_user_id,event_type,entity_type,entity_id,metadata
  ) values(
    v.company_id,
    coalesce(p_actor_user_id,auth.uid()),
    coalesce(nullif(trim(p_event_type),''),'timer_session_closed'),
    'hour_entry',
    v_entry_id,
    jsonb_build_object(
      'timer_id',v.id,
      'minutes',v_minutes,
      'project_id',v.project_id,
      'deliverable_id',v.deliverable_id,
      'task_id',v.task_id,
      'ended_at',v_end
    )
  );

  return v_minutes;
end;
$$;

revoke all on function cali_workspace.close_timer_session_at(uuid,timestamptz,text,uuid) from public, anon, authenticated;
grant execute on function cali_workspace.close_timer_session_at(uuid,timestamptz,text,uuid) to service_role;

create or replace function cali_workspace.assert_hour_context(
  p_company_id uuid,
  p_project_id uuid default null,
  p_deliverable_id uuid default null,
  p_task_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace, auth
as $$
declare
  v_deliverable_project uuid;
  v_deliverable_status text;
  v_deliverable_closed timestamptz;
  v_task_deliverable uuid;
  v_task_status text;
  v_task_closed timestamptz;
begin
  if not cali_workspace.is_admin() then
    raise exception 'Acesso restrito ao administrador do Workspace' using errcode='42501';
  end if;

  if not exists (
    select 1 from cali_workspace.companies c
    where c.id=p_company_id and c.status<>'closed'
  ) then
    raise exception 'Empresa ativa não encontrada.' using errcode='23503';
  end if;

  if p_project_id is not null and not exists (
    select 1 from cali_workspace.projects p
    where p.id=p_project_id and p.company_id=p_company_id
  ) then
    raise exception 'O projeto não pertence à empresa selecionada.' using errcode='23503';
  end if;

  if p_deliverable_id is not null then
    select d.project_id,d.status,d.work_closed_at
      into v_deliverable_project,v_deliverable_status,v_deliverable_closed
    from cali_workspace.deliverables d
    where d.id=p_deliverable_id and d.company_id=p_company_id;

    if not found then
      raise exception 'O entregável não pertence à empresa selecionada.' using errcode='23503';
    end if;
    if p_project_id is not null and v_deliverable_project is distinct from p_project_id then
      raise exception 'O entregável não pertence ao projeto selecionado.' using errcode='23503';
    end if;
    if v_deliverable_status in ('approved','cancelled') or v_deliverable_closed is not null then
      raise exception 'Este entregável já teve a execução encerrada e não aceita novas horas.' using errcode='23514';
    end if;
  end if;

  if p_task_id is not null then
    select t.deliverable_id,t.status,t.work_closed_at
      into v_task_deliverable,v_task_status,v_task_closed
    from cali_workspace.deliverable_tasks t
    where t.id=p_task_id and t.company_id=p_company_id;

    if not found then
      raise exception 'A subtarefa não pertence à empresa selecionada.' using errcode='23503';
    end if;
    if p_deliverable_id is not null and v_task_deliverable is distinct from p_deliverable_id then
      raise exception 'A subtarefa não pertence ao entregável selecionado.' using errcode='23503';
    end if;
    if v_task_status in ('done','cancelled') or v_task_closed is not null then
      raise exception 'Esta subtarefa já foi finalizada e não aceita novas horas.' using errcode='23514';
    end if;
  end if;
end;
$$;

grant execute on function cali_workspace.assert_hour_context(uuid,uuid,uuid,uuid) to authenticated, service_role;

create or replace function cali_workspace.track_hour_entry_actual_start()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_start timestamptz := coalesce(new.started_at,new.created_at,now());
begin
  if new.deliverable_id is not null then
    update cali_workspace.deliverables
    set started_at=coalesce(started_at,v_start)
    where id=new.deliverable_id;
  end if;
  if new.task_id is not null then
    update cali_workspace.deliverable_tasks
    set started_at=coalesce(started_at,v_start)
    where id=new.task_id;
  end if;
  return new;
end;
$$;

drop trigger if exists hour_entries_track_actual_start on cali_workspace.hour_entries;
create trigger hour_entries_track_actual_start
after insert on cali_workspace.hour_entries
for each row execute function cali_workspace.track_hour_entry_actual_start();

create or replace function cali_workspace.guard_hour_entry_open_context()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
begin
  if new.deliverable_id is not null and exists (
    select 1 from cali_workspace.deliverables d
    where d.id=new.deliverable_id
      and (d.status in ('approved','cancelled') or d.work_closed_at is not null)
  ) then
    raise exception 'Este entregável já teve a execução encerrada e não aceita novas horas.' using errcode='23514';
  end if;

  if new.task_id is not null and exists (
    select 1 from cali_workspace.deliverable_tasks t
    where t.id=new.task_id
      and (t.status in ('done','cancelled') or t.work_closed_at is not null)
  ) then
    raise exception 'Esta subtarefa já foi finalizada e não aceita novas horas.' using errcode='23514';
  end if;
  return new;
end;
$$;

drop trigger if exists hour_entries_guard_open_context on cali_workspace.hour_entries;
create trigger hour_entries_guard_open_context
before insert on cali_workspace.hour_entries
for each row execute function cali_workspace.guard_hour_entry_open_context();

create or replace function cali_workspace.start_work_timer_v2(
  p_company_id uuid,
  p_project_id uuid default null,
  p_deliverable_id uuid default null,
  p_task_id uuid default null,
  p_category text default 'Execução',
  p_description text default null,
  p_client_visible boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace, auth
as $$
declare
  v_id uuid;
  v_cycle_id uuid;
  v_now timestamptz:=now();
begin
  perform cali_workspace.assert_hour_context(p_company_id,p_project_id,p_deliverable_id,p_task_id);

  if exists (
    select 1 from cali_workspace.work_timers
    where user_id=auth.uid() and company_id=p_company_id and status='active'
  ) then
    raise exception 'Já existe um timer ativo para esta empresa. Pause a sessão atual antes de iniciar outra.' using errcode='23505';
  end if;

  if p_deliverable_id is not null then
    select d.cycle_id into v_cycle_id
    from cali_workspace.deliverables d
    where d.id=p_deliverable_id;
  end if;

  if v_cycle_id is null then
    select sc.id into v_cycle_id
    from cali_workspace.service_cycles sc
    where sc.company_id=p_company_id
      and date_trunc('month',sc.reference_month)::date=date_trunc('month',current_date)::date
    order by case when sc.project_id is not distinct from p_project_id then 0 else 1 end,
             sc.created_at desc
    limit 1;
  end if;

  insert into cali_workspace.work_timers(
    company_id,project_id,deliverable_id,task_id,cycle_id,user_id,
    category,description,note,client_visible,status
  ) values(
    p_company_id,p_project_id,p_deliverable_id,p_task_id,v_cycle_id,auth.uid(),
    coalesce(nullif(trim(p_category),''),'Execução'),
    nullif(trim(coalesce(p_description,'')),''),
    nullif(trim(coalesce(p_description,'')),''),
    coalesce(p_client_visible,false),'active'
  ) returning id into v_id;

  if p_deliverable_id is not null then
    update cali_workspace.deliverables
    set started_at=coalesce(started_at,v_now),
        status=case when status='not_started' then 'in_progress' else status end
    where id=p_deliverable_id;
  end if;

  if p_task_id is not null then
    update cali_workspace.deliverable_tasks
    set started_at=coalesce(started_at,v_now),
        status=case when status='todo' then 'doing' else status end
    where id=p_task_id;
  end if;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(
    p_company_id,auth.uid(),'timer_started','work_timer',v_id,
    jsonb_build_object(
      'project_id',p_project_id,
      'deliverable_id',p_deliverable_id,
      'task_id',p_task_id,
      'category',coalesce(nullif(trim(p_category),''),'Execução')
    )
  );

  return v_id;
end;
$$;

grant execute on function cali_workspace.start_work_timer_v2(uuid,uuid,uuid,uuid,text,text,boolean) to authenticated, service_role;

create or replace function cali_workspace.pause_work_timer(p_timer_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace, auth
as $$
begin
  if not cali_workspace.is_admin() then
    raise exception 'Acesso restrito ao administrador do Workspace' using errcode='42501';
  end if;
  if not exists (
    select 1 from cali_workspace.work_timers
    where id=p_timer_id and user_id=auth.uid() and status='active'
  ) then
    raise exception 'Timer ativo não encontrado.' using errcode='P0002';
  end if;
  perform cali_workspace.close_timer_session_at(p_timer_id,now(),'timer_session_paused',auth.uid());
end;
$$;

grant execute on function cali_workspace.pause_work_timer(uuid) to authenticated, service_role;

create or replace function cali_workspace.stop_work_timer(p_timer_id uuid, p_description text default null)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace, auth
as $$
declare
  v cali_workspace.work_timers%rowtype;
  v_minutes integer;
  v_now timestamptz:=now();
begin
  if not cali_workspace.is_admin() then
    raise exception 'Acesso restrito ao administrador do Workspace' using errcode='42501';
  end if;

  select * into v
  from cali_workspace.work_timers
  where id=p_timer_id and user_id=auth.uid() and status='active'
  for update;
  if not found then
    raise exception 'Timer ativo não encontrado.' using errcode='P0002';
  end if;

  if p_description is not null then
    update cali_workspace.work_timers
    set description=nullif(trim(p_description),'')
    where id=v.id;
  end if;

  v_minutes:=cali_workspace.close_timer_session_at(v.id,v_now,'timer_final_session_closed',auth.uid());

  if v.task_id is not null then
    update cali_workspace.deliverable_tasks
    set status='done',
        completed_at=v_now,
        work_closed_at=coalesce(work_closed_at,v_now),
        work_close_reason=coalesce(work_close_reason,'admin_finalized'),
        work_closed_by=coalesce(work_closed_by,auth.uid())
    where id=v.task_id;

    insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(
      v.company_id,auth.uid(),'task_work_finalized','deliverable_task',v.task_id,
      jsonb_build_object('timer_id',v.id,'closed_at',v_now)
    );
  elsif v.deliverable_id is not null then
    update cali_workspace.deliverables
    set work_closed_at=coalesce(work_closed_at,v_now),
        work_close_reason=coalesce(work_close_reason,'admin_finalized'),
        work_closed_by=coalesce(work_closed_by,auth.uid()),
        locked_at=coalesce(locked_at,v_now)
    where id=v.deliverable_id;

    insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(
      v.company_id,auth.uid(),'deliverable_work_finalized','deliverable',v.deliverable_id,
      jsonb_build_object('timer_id',v.id,'closed_at',v_now,'before_client_approval',true)
    );
  end if;

  return v_minutes;
end;
$$;

grant execute on function cali_workspace.stop_work_timer(uuid,text) to authenticated, service_role;

create or replace function cali_workspace.add_manual_hour_entry(
  p_company_id uuid,
  p_project_id uuid default null,
  p_deliverable_id uuid default null,
  p_task_id uuid default null,
  p_work_date date default current_date,
  p_minutes integer default 0,
  p_description text default null,
  p_category text default 'Execução',
  p_internal_note text default null,
  p_client_visible boolean default false,
  p_started_at timestamptz default null,
  p_ended_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace, auth
as $$
declare
  v_id uuid;
  v_start timestamptz:=coalesce(p_started_at,now());
begin
  perform cali_workspace.assert_hour_context(p_company_id,p_project_id,p_deliverable_id,p_task_id);

  if p_minutes<=0 or p_minutes>1440 then
    raise exception 'Informe uma duração entre 1 e 1440 minutos.' using errcode='22023';
  end if;
  if nullif(trim(coalesce(p_description,'')),'') is null then
    raise exception 'A descrição do trabalho é obrigatória.' using errcode='22023';
  end if;
  if nullif(trim(coalesce(p_internal_note,'')),'') is null then
    raise exception 'Justifique o lançamento manual para manter a trilha de auditoria.' using errcode='22023';
  end if;

  insert into cali_workspace.hour_entries(
    company_id,project_id,deliverable_id,task_id,work_date,minutes,
    description,category,client_visible,created_by,source_type,
    started_at,ended_at,internal_note
  ) values(
    p_company_id,p_project_id,p_deliverable_id,p_task_id,
    coalesce(p_work_date,current_date),p_minutes,trim(p_description),
    coalesce(nullif(trim(p_category),''),'Execução'),coalesce(p_client_visible,false),
    auth.uid(),'manual',p_started_at,p_ended_at,trim(p_internal_note)
  ) returning id into v_id;

  if p_deliverable_id is not null then
    update cali_workspace.deliverables
    set started_at=coalesce(started_at,v_start)
    where id=p_deliverable_id;
  end if;
  if p_task_id is not null then
    update cali_workspace.deliverable_tasks
    set started_at=coalesce(started_at,v_start)
    where id=p_task_id;
  end if;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(
    p_company_id,auth.uid(),'hours_manual_added','hour_entry',v_id,
    jsonb_build_object(
      'minutes',p_minutes,
      'project_id',p_project_id,
      'deliverable_id',p_deliverable_id,
      'task_id',p_task_id,
      'reason',trim(p_internal_note)
    )
  );

  return v_id;
end;
$$;

grant execute on function cali_workspace.add_manual_hour_entry(uuid,uuid,uuid,uuid,date,integer,text,text,text,boolean,timestamptz,timestamptz) to authenticated, service_role;

create or replace function cali_workspace.client_approve_deliverable_with_feedback(
  p_deliverable_id uuid,
  p_score integer,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace, public, auth
as $$
declare
  v_company_id uuid;
  v_status text;
  v_client_visible boolean;
  v_now timestamptz:=now();
  v_timer record;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_score<1 or p_score>5 then raise exception 'score must be between 1 and 5'; end if;
  if p_score<=3 and length(trim(coalesce(p_comment,'')))<3 then
    raise exception 'comment required for scores from 1 to 3';
  end if;

  select company_id,status,client_visible
    into v_company_id,v_status,v_client_visible
  from cali_workspace.deliverables
  where id=p_deliverable_id
  for update;

  if v_company_id is null then raise exception 'deliverable not found'; end if;
  if v_company_id is distinct from cali_workspace.current_company_id() then raise exception 'access denied'; end if;
  if not coalesce(v_client_visible,false) then raise exception 'deliverable not visible to client'; end if;
  if v_status<>'client_review' then raise exception 'deliverable is not awaiting client review'; end if;

  for v_timer in
    select wt.id
    from cali_workspace.work_timers wt
    where wt.deliverable_id=p_deliverable_id
      and wt.status in ('active','paused')
    for update
  loop
    perform cali_workspace.close_timer_session_at(
      v_timer.id,
      v_now,
      'timer_closed_by_client_approval',
      auth.uid()
    );
  end loop;

  insert into cali_workspace.nps_responses(company_id,user_id,deliverable_id,score,comment)
  values(v_company_id,auth.uid(),p_deliverable_id,p_score,nullif(trim(coalesce(p_comment,'')),''));

  update cali_workspace.deliverables
  set status='approved',
      client_response_at=v_now,
      approved_at=v_now,
      work_closed_at=coalesce(work_closed_at,v_now),
      work_close_reason=coalesce(work_close_reason,'client_approval'),
      locked_at=v_now,
      updated_at=v_now
  where id=p_deliverable_id;

  update cali_workspace.deliverable_tasks
  set status=case when status='cancelled' then status else 'done' end,
      completed_at=case when status='cancelled' then completed_at else coalesce(completed_at,v_now) end,
      work_closed_at=case when status='cancelled' then work_closed_at else coalesce(work_closed_at,v_now) end,
      work_close_reason=case when status='cancelled' then work_close_reason else coalesce(work_close_reason,'client_approval') end
  where deliverable_id=p_deliverable_id;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(
    v_company_id,auth.uid(),'deliverable_client_approved','deliverable',p_deliverable_id,
    jsonb_build_object(
      'score',p_score,
      'comment_provided',length(trim(coalesce(p_comment,'')))>0,
      'approved_at',v_now
    )
  );

  return jsonb_build_object(
    'ok',true,
    'deliverable_id',p_deliverable_id,
    'score',p_score,
    'approved_at',v_now
  );
end;
$$;

grant execute on function cali_workspace.client_approve_deliverable_with_feedback(uuid,integer,text) to authenticated, service_role;

create or replace view cali_workspace.deliverable_delivery_performance
with (security_invoker=true)
as
select
  d.id as deliverable_id,
  d.company_id,
  d.project_id,
  d.protocol,
  d.title,
  d.status,
  d.workstream,
  coalesce(p.roadmap_start_date,p.start_date) as project_planned_start,
  case
    when coalesce(p.roadmap_start_date,p.start_date) is not null
     and d.roadmap_month_start is not null
    then (
      coalesce(p.roadmap_start_date,p.start_date)
      + ((d.roadmap_month_start-1)||' months')::interval
    )::date
    else null
  end as planned_start_date,
  d.started_at as actual_started_at,
  d.original_due_at,
  d.due_at as effective_due_at,
  d.work_closed_at,
  d.work_close_reason,
  d.approved_at,
  d.client_response_at,
  coalesce(d.approved_at,d.work_closed_at) as completion_at,
  case
    when coalesce(d.approved_at,d.work_closed_at) is null or d.due_at is null then 'open'
    when coalesce(d.approved_at,d.work_closed_at)::date < d.due_at::date then 'before_deadline'
    when coalesce(d.approved_at,d.work_closed_at)::date = d.due_at::date then 'on_time'
    else 'after_deadline'
  end as delivery_timing,
  case
    when coalesce(d.approved_at,d.work_closed_at) is null or d.due_at is null then null
    else cali_workspace.business_days_delta(
      d.due_at::date,
      coalesce(d.approved_at,d.work_closed_at)::date
    )
  end as business_days_from_deadline,
  case
    when d.started_at is null
      or coalesce(p.roadmap_start_date,p.start_date) is null
      or d.roadmap_month_start is null then 'unknown'
    when d.started_at::date < (
      coalesce(p.roadmap_start_date,p.start_date)
      + ((d.roadmap_month_start-1)||' months')::interval
    )::date then 'started_early'
    when d.started_at::date = (
      coalesce(p.roadmap_start_date,p.start_date)
      + ((d.roadmap_month_start-1)||' months')::interval
    )::date then 'started_on_time'
    else 'started_late'
  end as start_timing,
  case
    when d.original_due_at is null or coalesce(d.approved_at,d.work_closed_at) is null then null
    else cali_workspace.business_days_delta(
      d.original_due_at::date,
      coalesce(d.approved_at,d.work_closed_at)::date
    )
  end as business_days_from_original_deadline,
  coalesce((
    select sum(h.minutes)
    from cali_workspace.hour_entries h
    where h.deliverable_id=d.id
  ),0)::integer as total_minutes
from cali_workspace.deliverables d
left join cali_workspace.projects p on p.id=d.project_id;

grant select on cali_workspace.deliverable_delivery_performance to authenticated, service_role;
