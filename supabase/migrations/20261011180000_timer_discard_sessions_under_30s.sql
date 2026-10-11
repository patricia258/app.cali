-- Cronômetros (Horas, projetos, ocorrências): sessão com menos de 30 segundos não gera lançamento de horas.
-- Decisão da Patricia em 2026-10-11. Antes, toda sessão valia no mínimo 1 minuto (um play de 1 segundo virava 1 minuto).
-- O restante da regra não muda: a partir de 30 segundos, a sessão é arredondada para cima em minutos.
create or replace function cali_workspace.close_timer_session_at(p_timer_id uuid, p_end_at timestamp with time zone, p_event_type text default 'timer_session_closed'::text, p_actor_user_id uuid default null::uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'cali_workspace', 'auth'
as $function$
declare
  v cali_workspace.work_timers%rowtype;
  v_end timestamptz;
  v_paused integer;
  v_raw_seconds integer;
  v_seconds integer;
  v_minutes integer;
  v_description text;
  v_entry_id uuid;
begin
  select * into v from cali_workspace.work_timers where id=p_timer_id and status in ('active','paused') for update;
  if not found then return 0; end if;
  v_end := case when v.status='paused' and v.paused_at is not null then least(coalesce(p_end_at,now()),v.paused_at) else coalesce(p_end_at,now()) end;
  v_paused := coalesce(v.paused_seconds,0);
  v_raw_seconds := floor(extract(epoch from (v_end-v.started_at)))::integer-v_paused;

  if v_raw_seconds < 30 then
    update cali_workspace.work_timers
       set stopped_at=v_end,minutes=0,status='discarded',paused_at=null
     where id=v.id;
    insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(v.company_id,coalesce(p_actor_user_id,auth.uid()),'timer_session_discarded','work_timer',v.id,
      jsonb_build_object('timer_id',v.id,'seconds',greatest(0,v_raw_seconds),'reason','under_30_seconds','closing_event',p_event_type,
        'project_id',v.project_id,'deliverable_id',v.deliverable_id,'task_id',v.task_id,'account_record_id',v.account_record_id,'ended_at',v_end));
    return 0;
  end if;

  v_seconds := greatest(1,v_raw_seconds);
  v_minutes := greatest(1,ceil(v_seconds/60.0)::integer);
  v_description := coalesce(nullif(trim(coalesce(v.description,'')),''),nullif(trim(coalesce(v.note,'')),''),'Atividade registrada por timer');

  update cali_workspace.work_timers
     set stopped_at=v_end,minutes=v_minutes,status='stopped',paused_at=null,description=v_description
   where id=v.id;

  insert into cali_workspace.hour_entries(
    company_id,project_id,cycle_id,deliverable_id,task_id,account_record_id,work_date,minutes,description,category,
    client_visible,created_by,source_type,started_at,ended_at,internal_note
  ) values(
    v.company_id,v.project_id,v.cycle_id,v.deliverable_id,v.task_id,v.account_record_id,
    (v_end at time zone 'America/Sao_Paulo')::date,v_minutes,v_description,coalesce(v.category,'Execução'),
    v.client_visible,v.user_id,'timer',v.started_at,v_end,null
  ) returning id into v_entry_id;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v.company_id,coalesce(p_actor_user_id,auth.uid()),coalesce(nullif(trim(p_event_type),''),'timer_session_closed'),'hour_entry',v_entry_id,
    jsonb_build_object('timer_id',v.id,'minutes',v_minutes,'project_id',v.project_id,'deliverable_id',v.deliverable_id,
      'task_id',v.task_id,'account_record_id',v.account_record_id,'ended_at',v_end));
  return v_minutes;
end;
$function$;
