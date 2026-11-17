begin;

create function cali_session_guard.start_partner_workspace_timer(
  company uuid, project uuid, delivery uuid, task uuid, account_record uuid,
  category text, description text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actual_project uuid := project;
  actual_delivery uuid := delivery;
  parent_id uuid;
  cycle uuid;
  current_timer cali_workspace.work_timers;
  timer_id uuid;
  clean_category text := coalesce(nullif(btrim(category), ''), 'Execução');
  clean_description text := nullif(left(btrim(description), 500), '');
begin
  if not cali_workspace.workspace_private_access_v2()
    or not cali_workspace.partner_can_access(company, 'hours')
    or (account_record is not null and not cali_workspace.partner_can_access(company, 'records'))
    or (account_record is null and coalesce(project, delivery, task) is not null
      and not cali_workspace.partner_can_access(company, 'projects'))
  then
    raise exception using errcode = '42501', message = 'Vínculo indisponível para o cronômetro.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('workspace-partner-timer:' || actor::text, 0));
  if task is not null then
    select t.deliverable_id into parent_id from cali_workspace.deliverable_tasks t
    where t.id = task and t.company_id = company;
    if not found or (delivery is not null and delivery is distinct from parent_id) then
      raise exception using errcode = '42501', message = 'Subtarefa indisponível para o cronômetro.';
    end if;
    actual_delivery := parent_id;
  end if;
  if actual_delivery is not null then
    select d.project_id into parent_id from cali_workspace.deliverables d
    where d.id = actual_delivery and d.company_id = company;
    if not found or (project is not null and project is distinct from parent_id) then
      raise exception using errcode = '42501', message = 'Entregável indisponível para o cronômetro.';
    end if;
    actual_project := parent_id;
  end if;

  -- Mesma ordem de locks dos fluxos que encerram o trabalho.
  if actual_project is not null then
    perform 1 from cali_workspace.projects p
    where p.id = actual_project and p.company_id = company and p.execution_status = 'normal'
      and cali_workspace.hour_project_operational(p.id)
    for share;
    if not found then raise exception using errcode = '42501', message = 'Projeto indisponível para o cronômetro.'; end if;
  end if;
  if actual_delivery is not null then
    select d.cycle_id into cycle from cali_workspace.deliverables d
    where d.id = actual_delivery and d.company_id = company
      and d.project_id is not distinct from actual_project and d.execution_status = 'normal'
      and d.status not in ('approved', 'cancelled') and d.work_closed_at is null
    for share;
    if not found then raise exception using errcode = '42501', message = 'Entregável indisponível para o cronômetro.'; end if;
  end if;
  if task is not null then
    perform 1 from cali_workspace.deliverable_tasks t
    where t.id = task and t.company_id = company and t.deliverable_id = actual_delivery
      and t.status not in ('done', 'cancelled') and t.work_closed_at is null
    for share;
    if not found then raise exception using errcode = '42501', message = 'Subtarefa indisponível para o cronômetro.'; end if;
  end if;
  if account_record is not null then
    perform 1 from cali_workspace.account_records r
    where r.id = account_record and r.company_id = company and r.visibility = 'client'
      and r.project_id is not distinct from actual_project and r.workflow_status not in ('completed', 'cancelled')
    for share;
    if not found then raise exception using errcode = '42501', message = 'Ocorrência indisponível para o cronômetro.'; end if;
  end if;

  select t.* into current_timer from cali_workspace.work_timers t
  where t.user_id = actor and t.status in ('active', 'paused')
  order by t.started_at desc limit 1 for update;
  if found and current_timer.partner_managed and current_timer.status = 'active'
    and clock_timestamp() >= coalesce(current_timer.last_seen_at, current_timer.started_at) + interval '30 minutes'
  then
    perform cali_session_guard.advance_partner_timer(current_timer, clock_timestamp());
    current_timer.id := null;
  end if;
  if current_timer.id is not null then
    if current_timer.status = 'active'
      and row(current_timer.company_id, current_timer.project_id, current_timer.deliverable_id, current_timer.task_id,
        current_timer.account_record_id, current_timer.category, current_timer.description)
        is not distinct from row(company, actual_project, actual_delivery, task, account_record, clean_category, clean_description)
    then
      return current_timer.id;
    end if;
    raise exception using errcode = '23505', message = 'Encerre o cronômetro atual antes de iniciar outro.';
  end if;

  insert into cali_workspace.work_timers (
    company_id,project_id,deliverable_id,task_id,account_record_id,cycle_id,user_id,
    category,description,note,client_visible,status,started_at,last_seen_at
  ) values (
    company,actual_project,actual_delivery,task,account_record,cycle,actor,
    clean_category,clean_description,clean_description,false,'active',clock_timestamp(),clock_timestamp()
  )
  returning id into timer_id;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(company,actor,'timer_started','work_timer',timer_id,
    jsonb_build_object('project_id',actual_project,'deliverable_id',actual_delivery,'task_id',task,'account_record_id',account_record,'staff',true));
  return timer_id;
end;
$$;

create or replace function cali_workspace.partner_start_timer(
  p_company_id uuid, p_project_id uuid default null, p_deliverable_id uuid default null,
  p_task_id uuid default null, p_category text default 'Execução', p_description text default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select cali_session_guard.start_partner_workspace_timer(
    p_company_id,p_project_id,p_deliverable_id,p_task_id,null,p_category,p_description
  );
$$;

create or replace function cali_workspace.partner_start_deliverable_timer(p_deliverable_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery cali_workspace.deliverables;
begin
  select d.* into delivery from cali_workspace.deliverables d
  where d.id = p_deliverable_id and cali_workspace.partner_can_access(d.company_id, 'projects');
  if not found then raise exception using errcode = '42501', message = 'Entregável indisponível para o cronômetro.'; end if;

  return cali_session_guard.start_partner_workspace_timer(delivery.company_id,delivery.project_id,delivery.id,
    null,null,'Execução',coalesce(delivery.protocol || ' · ', '') || delivery.title);
end;
$$;

create or replace function cali_workspace.partner_start_record_timer(p_record_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  occurrence cali_workspace.account_records;
begin
  select r.* into occurrence from cali_workspace.account_records r
  where r.id = p_record_id and cali_workspace.partner_can_access(r.company_id, 'records');
  if not found then raise exception using errcode = '42501', message = 'Ocorrência indisponível para o cronômetro.'; end if;

  return cali_session_guard.start_partner_workspace_timer(occurrence.company_id,occurrence.project_id,
    null,null,occurrence.id,'Ocorrências e solicitações',coalesce(occurrence.protocol || ' · ', '') || occurrence.title);
end;
$$;

-- Todos os encerramentos Partner passam por esta função com o timer já bloqueado.
create function cali_session_guard.close_partner_workspace_timer(
  timer cali_workspace.work_timers, ended_at timestamptz, requested_description text, closing_event text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  submission cali_workspace.staff_hour_submissions;
  final_at timestamptz;
  counted_seconds integer;
  counted_minutes integer;
  submission_id uuid;
begin
  select s.* into submission from cali_workspace.staff_hour_submissions s where s.timer_source_id = timer.id;
  if found then
    return jsonb_build_object('discarded',false,'minutes',submission.minutes,'seconds',submission.timer_seconds,
      'submission_id',submission.id,'recovery_required',false);
  end if;
  if timer.partner_recovery_reason is not null then
    return jsonb_build_object('discarded',false,'minutes',timer.minutes,'seconds',timer.partner_counted_seconds,
      'submission_id',null,'recovery_required',true);
  end if;
  if timer.status = 'discarded' then
    return jsonb_build_object('discarded',true,'minutes',0,'seconds',coalesce(timer.partner_counted_seconds,0),
      'submission_id',null,'recovery_required',false);
  end if;
  if timer.status not in ('active', 'paused') then
    raise exception using errcode = '23514', message = 'Este cronômetro já foi encerrado.';
  end if;

  if timer.partner_managed and timer.status = 'active'
    and ended_at >= coalesce(timer.last_seen_at, timer.started_at) + interval '30 minutes'
  then
    perform cali_session_guard.advance_partner_timer(timer, ended_at);
    select * into timer from cali_workspace.work_timers where id = timer.id;
    return jsonb_build_object('discarded',false,'minutes',timer.minutes,'seconds',timer.partner_counted_seconds,
      'submission_id',null,'recovery_required',true);
  end if;

  final_at := greatest(timer.started_at, least(ended_at, coalesce(timer.paused_at, ended_at)));
  counted_seconds := cali_session_guard.partner_timer_elapsed_seconds(timer, final_at);
  counted_minutes := case when counted_seconds < 30 then 0 else least(1440, ceil(counted_seconds / 60.0)::integer) end;
  update cali_workspace.work_timers set status = case when counted_minutes = 0 then 'discarded' else 'stopped' end,
    stopped_at = final_at, minutes = counted_minutes, paused_at = null, partner_counted_seconds = counted_seconds,
    description = left(coalesce(nullif(btrim(requested_description), ''), nullif(btrim(timer.description), ''), 'Atividade registrada por cronômetro'), 500)
  where id = timer.id returning * into timer;
  if counted_minutes > 0 then
    submission_id := cali_session_guard.queue_partner_timer_review(timer,
      case closing_event when 'timer_session_paused' then 'Trecho confirmado ao pausar o cronômetro.'
        else 'Trecho encerrado pelo fluxo de trabalho.' end, counted_minutes);
  else
    insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(timer.company_id,timer.user_id,'timer_session_discarded','work_timer',timer.id,
      jsonb_build_object('seconds',counted_seconds,'reason','under_30_seconds','closing_event',closing_event));
  end if;
  return jsonb_build_object('discarded',counted_minutes = 0,'minutes',counted_minutes,'seconds',counted_seconds,
    'submission_id',submission_id,'recovery_required',false);
end;
$$;

create or replace function cali_workspace.partner_stop_timer(p_timer_id uuid, p_description text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  timer cali_workspace.work_timers;
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_partner() then
    raise exception using errcode = '42501', message = 'Acesso ao cronômetro indisponível.';
  end if;
  select t.* into timer from cali_workspace.work_timers t
  where t.id = p_timer_id and t.user_id = auth.uid()
    and cali_workspace.partner_can_access(t.company_id, 'hours')
  for update;
  if not found then raise exception using errcode = '42501', message = 'Cronômetro indisponível.'; end if;

  return cali_session_guard.close_partner_workspace_timer(timer,clock_timestamp(),p_description,'timer_session_paused');
end;
$$;

-- Os fluxos de entregável e subtarefa também fecham timers; Admin mantém a rotina original.
alter function cali_workspace.close_timer_session_at(uuid, timestamptz, text, uuid) set schema cali_session_guard;
revoke all on function cali_session_guard.close_timer_session_at(uuid, timestamptz, text, uuid)
  from public, anon, authenticated, service_role;

create function cali_workspace.close_timer_session_at(
  p_timer_id uuid, p_end_at timestamptz, p_event_type text default 'timer_session_closed',
  p_actor_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  timer cali_workspace.work_timers;
  result jsonb;
begin
  select t.* into timer from cali_workspace.work_timers t
  where t.id = p_timer_id and t.status in ('active', 'paused') for update;
  if not found then return 0; end if;
  if not timer.partner_managed and not exists (
    select 1 from cali_workspace.profiles p where p.id = timer.user_id and p.role = 'partner'
  ) then
    return cali_session_guard.close_timer_session_at(p_timer_id,p_end_at,p_event_type,p_actor_user_id);
  end if;
  result := cali_session_guard.close_partner_workspace_timer(timer,coalesce(p_end_at,clock_timestamp()),null,p_event_type);
  return coalesce((result->>'minutes')::integer, 0);
end;
$$;

-- Clientes e Admin não dependem da confirmação explícita introduzida para Partner.
create or replace function cali_workspace.touch_my_timers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_timer uuid;
  touched integer;
begin
  if not cali_workspace.workspace_private_access_v2() then return 0; end if;
  if cali_workspace.is_partner() then
    select t.id into active_timer from cali_workspace.work_timers t
    where t.user_id = auth.uid() and t.partner_managed and t.status = 'active';
    return case when active_timer is not null and cali_workspace.touch_partner_timer_v2(active_timer,false) then 1 else 0 end;
  end if;
  update cali_workspace.work_timers set last_seen_at = now()
  where user_id = auth.uid() and status = 'active' and not partner_managed;
  get diagnostics touched = row_count;
  return touched;
end;
$$;

create or replace function cali_workspace.close_stale_timers(p_idle interval default interval '30 minutes')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  timer cali_workspace.work_timers;
  counted_until timestamptz;
  body text;
  closed integer := 0;
begin
  for timer in
    select t.* from cali_workspace.work_timers t
    where t.status = 'active' and not t.partner_managed and coalesce(t.last_seen_at, t.started_at) < now() - p_idle
      and not exists (select 1 from cali_workspace.profiles p where p.id = t.user_id and p.role = 'partner')
    for update skip locked
  loop
    counted_until := coalesce(timer.last_seen_at, timer.started_at + interval '1 minute');
    perform cali_workspace.close_timer_session_at(timer.id,counted_until,'timer_auto_paused_inactivity',timer.user_id);
    body := 'O cronômetro de “' || coalesce(timer.description, 'atuação')
      || '” ficou 30 minutos sem atividade na tela e foi pausado sozinho. O tempo foi contado de '
      || to_char(timer.started_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || ' até '
      || to_char(counted_until at time zone 'America/Sao_Paulo', 'HH24:MI') || '. Se o horário real foi outro, corrija em Horas.';
    insert into cali_workspace.notifications (
      company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required
    ) values (
      timer.company_id,timer.user_id,'timer_auto_paused','Cronômetro pausado por inatividade',
      left(body,400),'work_timer',timer.id,'/admin/horas','high',true
    );
    insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(timer.company_id,timer.user_id,'timer_auto_paused_inactivity','work_timer',timer.id,
      jsonb_build_object('started_at',timer.started_at,'counted_until',counted_until,'staff',false));
    closed := closed + 1;
  end loop;
  return closed;
end;
$$;

-- O piloto mantém recibo e forma de retorno, mas deixa de gravar horas sem revisão.
do $pilot_timer$
declare
  definition text := pg_get_functiondef('cali_workspace.v2_change_partner_pilot_timer(uuid,uuid,text,uuid,text,uuid,text)'::regprocedure);
  first_anchor text := '    ended:=clock_timestamp();';
  last_anchor text := '    result:=p_timer;';
  first_position integer := strpos(definition,first_anchor);
  last_position integer := strpos(definition,last_anchor);
  body text := $replacement$
    ended:=clock_timestamp();
    duration:=cali_workspace.close_timer_session_at(p_timer,ended,'timer_session_paused',actor);
    select s.id into entry from cali_workspace.staff_hour_submissions s where s.timer_source_id=p_timer;
$replacement$;
begin
  if first_position = 0 or last_position <= first_position
    or strpos(substr(definition,first_position,last_position-first_position),'insert into cali_workspace.hour_entries') = 0
  then
    raise exception 'A rotina de cronômetro do piloto diverge do catálogo reconciliado.';
  end if;
  definition := substr(definition,1,first_position-1) || body || substr(definition,last_position);
  definition := replace(definition,'''hour_entry_id'',entry','''submission_id'',entry');
  definition := replace(definition,'  seconds integer;' || chr(10),'');
  execute definition;
end;
$pilot_timer$;

alter function cali_session_guard.start_partner_workspace_timer(uuid, uuid, uuid, uuid, uuid, text, text) owner to postgres;
alter function cali_session_guard.close_partner_workspace_timer(cali_workspace.work_timers, timestamptz, text, text) owner to postgres;
alter function cali_workspace.close_timer_session_at(uuid, timestamptz, text, uuid) owner to postgres;
revoke all on function cali_session_guard.start_partner_workspace_timer(uuid, uuid, uuid, uuid, uuid, text, text),
  cali_session_guard.close_partner_workspace_timer(cali_workspace.work_timers, timestamptz, text, text),
  cali_workspace.close_timer_session_at(uuid, timestamptz, text, uuid)
from public, anon, authenticated, service_role;
grant execute on function cali_workspace.close_timer_session_at(uuid, timestamptz, text, uuid) to service_role;

notify pgrst, 'reload schema';
commit;
