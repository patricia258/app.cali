-- CALI Workspace · V25 · exclusão segura do cliente, tempo de atendimento e digest diário de chat

alter table cali_workspace.account_records
  add column if not exists first_admin_opened_at timestamptz,
  add column if not exists first_admin_opened_by uuid references auth.users(id) on delete set null;

alter table cali_workspace.work_timers
  add column if not exists account_record_id uuid references cali_workspace.account_records(id) on delete cascade;

alter table cali_workspace.hour_entries
  add column if not exists account_record_id uuid references cali_workspace.account_records(id) on delete set null;

create index if not exists work_timers_account_record_idx
  on cali_workspace.work_timers(account_record_id,status,started_at desc)
  where account_record_id is not null;
create index if not exists hour_entries_account_record_idx
  on cali_workspace.hour_entries(account_record_id,work_date,created_at)
  where account_record_id is not null;
create index if not exists account_records_first_admin_opened_idx
  on cali_workspace.account_records(first_admin_opened_at)
  where first_admin_opened_at is not null;

update cali_workspace.account_records
set include_in_report=true
where source_actor='client'
  and visibility='client'
  and record_type in ('occurrence','request','context_change','other');

create or replace function cali_workspace.mark_account_record_opened(p_record_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=cali_workspace,public,auth
as $$
declare
  v_record cali_workspace.account_records%rowtype;
begin
  if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode registrar a abertura.' using errcode='42501'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Solicitação não encontrada.' using errcode='P0002'; end if;
  update cali_workspace.account_records
     set first_admin_opened_at=coalesce(first_admin_opened_at,now()),
         first_admin_opened_by=coalesce(first_admin_opened_by,auth.uid()),
         updated_at=now()
   where id=p_record_id;
  return jsonb_build_object('record_id',p_record_id,'first_admin_opened_at',coalesce(v_record.first_admin_opened_at,now()));
end;
$$;
revoke all on function cali_workspace.mark_account_record_opened(uuid) from public;
grant execute on function cali_workspace.mark_account_record_opened(uuid) to authenticated;

create or replace function cali_workspace.client_delete_unopened_account_record(p_record_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=cali_workspace,public,auth
as $$
declare
  v_profile cali_workspace.profiles%rowtype;
  v_record cali_workspace.account_records%rowtype;
begin
  select * into v_profile from cali_workspace.profiles where id=auth.uid() and active=true;
  if not found or v_profile.role<>'client' then raise exception 'Apenas o cliente pode usar esta ação.' using errcode='42501'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id for update;
  if not found then raise exception 'Solicitação não encontrada.' using errcode='P0002'; end if;
  if v_record.company_id is distinct from v_profile.company_id or v_record.created_by is distinct from auth.uid() or v_record.source_actor<>'client' then
    raise exception 'Esta solicitação não pertence ao seu acesso.' using errcode='42501';
  end if;
  if v_record.first_admin_opened_at is not null
     or v_record.workflow_status is distinct from 'open'
     or exists(select 1 from cali_workspace.account_record_messages m where m.record_id=v_record.id and m.author_role='admin' and m.deleted_at is null) then
    raise exception 'Esta solicitação já foi aberta pela CALI e não pode mais ser excluída.' using errcode='23514';
  end if;

  delete from cali_workspace.notifications where entity_type='account_record' and entity_id=v_record.id;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_record.company_id,auth.uid(),'client_unopened_record_deleted','account_record',v_record.id,
    jsonb_build_object('protocol',v_record.protocol,'title',v_record.title,'record_type',v_record.record_type));
  delete from cali_workspace.account_records where id=v_record.id;
  return jsonb_build_object('deleted',true,'record_id',p_record_id);
end;
$$;
revoke all on function cali_workspace.client_delete_unopened_account_record(uuid) from public;
grant execute on function cali_workspace.client_delete_unopened_account_record(uuid) to authenticated;

create or replace function cali_workspace.close_timer_session_at(
  p_timer_id uuid,
  p_end_at timestamptz,
  p_event_type text default 'timer_session_closed',
  p_actor_user_id uuid default null
) returns integer
language plpgsql
security definer
set search_path to 'pg_catalog','cali_workspace','auth'
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
  select * into v from cali_workspace.work_timers where id=p_timer_id and status in ('active','paused') for update;
  if not found then return 0; end if;
  v_end := case when v.status='paused' and v.paused_at is not null then least(coalesce(p_end_at,now()),v.paused_at) else coalesce(p_end_at,now()) end;
  v_paused := coalesce(v.paused_seconds,0);
  v_seconds := greatest(1,floor(extract(epoch from (v_end-v.started_at)))::integer-v_paused);
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
$$;

create or replace function cali_workspace.start_account_record_timer(p_record_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','cali_workspace','auth'
as $$
declare
  v_record cali_workspace.account_records%rowtype;
  v_cycle_id uuid;
  v_id uuid;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso restrito ao administrador do Workspace' using errcode='42501'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Solicitação não encontrada.' using errcode='P0002'; end if;
  if v_record.workflow_status in ('completed','cancelled') then raise exception 'Esta solicitação já foi encerrada e não aceita novas horas.' using errcode='23514'; end if;
  if exists(select 1 from cali_workspace.work_timers where user_id=auth.uid() and company_id=v_record.company_id and status='active') then
    raise exception 'Já existe um timer ativo para esta empresa. Pause a sessão atual antes de iniciar outra.' using errcode='23505';
  end if;
  select sc.id into v_cycle_id
    from cali_workspace.service_cycles sc
   where sc.company_id=v_record.company_id
     and date_trunc('month',sc.reference_month)::date=date_trunc('month',current_date)::date
   order by case when sc.project_id is not distinct from v_record.project_id then 0 else 1 end,sc.created_at desc
   limit 1;

  update cali_workspace.account_records
     set first_admin_opened_at=coalesce(first_admin_opened_at,now()),
         first_admin_opened_by=coalesce(first_admin_opened_by,auth.uid()),
         updated_at=now()
   where id=v_record.id;

  insert into cali_workspace.work_timers(
    company_id,project_id,cycle_id,account_record_id,user_id,category,description,note,client_visible,status
  ) values(
    v_record.company_id,v_record.project_id,v_cycle_id,v_record.id,auth.uid(),'Ocorrências e solicitações',
    coalesce(v_record.protocol || ' · ','') || v_record.title,
    coalesce(v_record.protocol || ' · ','') || v_record.title,false,'active'
  ) returning id into v_id;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_record.company_id,auth.uid(),'account_record_timer_started','account_record',v_record.id,
    jsonb_build_object('timer_id',v_id,'protocol',v_record.protocol));
  return v_id;
end;
$$;
revoke all on function cali_workspace.start_account_record_timer(uuid) from public;
grant execute on function cali_workspace.start_account_record_timer(uuid) to authenticated;

create or replace function cali_workspace.get_account_record_time_summary(p_record_id uuid)
returns jsonb
language sql
security definer
set search_path=cali_workspace,auth
as $$
  select jsonb_build_object(
    'record_id',r.id,
    'total_minutes',coalesce(sum(h.minutes),0),
    'sessions',count(h.id),
    'average_session_minutes',coalesce(round(avg(h.minutes)::numeric,1),0)
  )
  from cali_workspace.account_records r
  left join cali_workspace.hour_entries h on h.account_record_id=r.id
  where r.id=p_record_id
    and (cali_workspace.is_admin() or r.company_id=cali_workspace.current_company_id())
  group by r.id;
$$;
grant execute on function cali_workspace.get_account_record_time_summary(uuid) to authenticated;

create or replace view cali_workspace.account_record_interaction_metrics as
select
  r.id as record_id,
  r.company_id,
  r.project_id,
  r.protocol,
  r.record_type,
  r.title,
  r.occurred_at,
  r.created_at,
  r.first_admin_opened_at,
  r.closed_at,
  r.workflow_status,
  count(distinct m.id) filter (where m.deleted_at is null) as message_count,
  min(m.created_at) filter (where m.author_role='admin' and m.deleted_at is null) as first_admin_response_at,
  coalesce(sum(distinct_case.minutes),0)::integer as total_work_minutes,
  count(distinct distinct_case.id) as work_sessions,
  case when min(m.created_at) filter (where m.author_role='admin' and m.deleted_at is null) is null then null
       else round(extract(epoch from (min(m.created_at) filter (where m.author_role='admin' and m.deleted_at is null)-r.created_at))/60.0,1) end as first_response_minutes
from cali_workspace.account_records r
left join cali_workspace.account_record_messages m on m.record_id=r.id
left join lateral (
  select h.id,h.minutes from cali_workspace.hour_entries h where h.account_record_id=r.id
) distinct_case on true
where r.workflow_status is not null
  and r.visibility='client'
group by r.id,r.company_id,r.project_id,r.protocol,r.record_type,r.title,r.occurred_at,r.created_at,r.first_admin_opened_at,r.closed_at,r.workflow_status;

create or replace view cali_workspace.account_interaction_monthly_metrics as
select
  company_id,
  date_trunc('month',occurred_at)::date as reference_month,
  count(*)::integer as interactions_count,
  count(*) filter (where record_type='request')::integer as requests_count,
  count(*) filter (where record_type='occurrence')::integer as occurrences_count,
  count(*) filter (where workflow_status='completed')::integer as completed_count,
  coalesce(sum(total_work_minutes),0)::integer as total_work_minutes,
  coalesce(round(avg(total_work_minutes)::numeric,1),0) as average_work_minutes_per_interaction,
  coalesce(round(avg(first_response_minutes) filter (where first_response_minutes is not null)::numeric,1),0) as average_first_response_minutes
from cali_workspace.account_record_interaction_metrics
group by company_id,date_trunc('month',occurred_at)::date;

grant select on cali_workspace.account_record_interaction_metrics to authenticated;
grant select on cali_workspace.account_interaction_monthly_metrics to authenticated;

create or replace function cali_workspace.post_account_record_message(
  p_record_id uuid,
  p_body text,
  p_internal boolean default false
) returns jsonb
language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_profile cali_workspace.profiles%rowtype;
  v_record cali_workspace.account_records%rowtype;
  v_message_id uuid;
  v_status text;
  v_target text;
  v_title text;
  v_body text;
  v_action_url text;
  v_notification_ids uuid[];
  v_had_messages boolean;
  v_notification_type text;
  v_email_required boolean:=false;
begin
  if v_user_id is null then raise exception 'Sessão não encontrada.'; end if;
  if char_length(btrim(coalesce(p_body,'')))<1 then raise exception 'Escreva uma mensagem antes de enviar.'; end if;
  select * into v_profile from cali_workspace.profiles where id=v_user_id and active=true;
  if not found then raise exception 'Perfil não disponível.'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;
  if v_profile.role='client' and (v_record.company_id is distinct from v_profile.company_id or v_record.visibility<>'client') then raise exception 'Registro não disponível para este acesso.'; end if;
  if v_profile.role<>'admin' and p_internal then raise exception 'Apenas a CALI pode criar nota interna.'; end if;
  if v_record.workflow_status='cancelled' then raise exception 'Esta conversa está cancelada.'; end if;
  if v_record.workflow_status='completed' then raise exception 'Reabra a solicitação antes de responder.'; end if;

  select exists(select 1 from cali_workspace.account_record_messages where record_id=v_record.id and deleted_at is null) into v_had_messages;

  insert into cali_workspace.account_record_messages(record_id,company_id,author_id,author_role,body,visibility)
  values(v_record.id,v_record.company_id,v_user_id,v_profile.role,btrim(p_body),case when p_internal then 'internal' else 'client' end)
  returning id into v_message_id;

  if p_internal then
    update cali_workspace.account_records set last_activity_at=now(),updated_at=now() where id=v_record.id;
    return jsonb_build_object('message_id',v_message_id,'record_id',v_record.id,'notification_ids','[]'::jsonb);
  end if;

  if v_profile.role='client' then
    v_status:=case when v_record.workflow_status in ('waiting_client','standby') then 'in_progress' else coalesce(v_record.workflow_status,'open') end;
    v_target:='admin';
    v_title:=case when not v_had_messages then 'Nova solicitação do cliente' else 'Nova mensagem do cliente' end;
    v_body:=coalesce(v_profile.full_name,'Cliente') || case when not v_had_messages then ' abriu “' else ' respondeu em “' end || v_record.title || '”.';
    v_action_url:='/admin/registros?record=' || v_record.id::text;
  else
    v_status:='waiting_client';
    v_target:='client';
    v_title:=case when not v_had_messages then 'Novo acompanhamento da CALI' else 'Nova resposta da Patrícia' end;
    v_body:=case when not v_had_messages then 'A CALI iniciou “' else 'A CALI respondeu em “' end || v_record.title || '”.';
    v_action_url:='/cliente/registros?record=' || v_record.id::text;
  end if;

  v_notification_type:=case when not v_had_messages then 'record_created' else 'record_message' end;
  v_email_required:=not v_had_messages;

  update cali_workspace.account_records
     set workflow_status=v_status,
         last_activity_at=now(),
         requires_action=(v_profile.role='client'),
         assigned_to=case when v_profile.role='admin' then v_user_id else assigned_to end,
         include_in_report=case when v_profile.role='client' then true else include_in_report end,
         updated_at=now()
   where id=v_record.id;

  v_notification_ids:=cali_workspace.notify_workspace_movement(
    v_record.company_id,v_user_id,v_target,v_notification_type,v_title,v_body,
    'account_record',v_record.id,v_action_url,case when not v_had_messages then 'high' else 'normal' end,v_email_required
  );

  return jsonb_build_object('message_id',v_message_id,'record_id',v_record.id,'notification_ids',to_jsonb(v_notification_ids),'workflow_status',v_status);
end;
$$;
grant execute on function cali_workspace.post_account_record_message(uuid,text,boolean) to authenticated;

create or replace function cali_workspace.set_account_record_status(p_record_id uuid,p_status text)
returns jsonb
language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_record cali_workspace.account_records%rowtype;
  v_label text;
  v_ids uuid[];
  v_timer record;
begin
  if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode alterar o status.'; end if;
  if p_status not in ('open','in_progress','waiting_client','standby','completed','cancelled') then raise exception 'Status inválido.'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;

  if p_status in ('completed','cancelled') then
    for v_timer in select id from cali_workspace.work_timers where account_record_id=p_record_id and status='active' loop
      perform cali_workspace.close_timer_session_at(v_timer.id,now(),'account_record_timer_closed_on_status',v_user_id);
    end loop;
  end if;

  update cali_workspace.account_records
     set workflow_status=p_status,
         requires_action=case when p_status in ('open','in_progress') then true else false end,
         assigned_to=case when p_status='in_progress' then v_user_id else assigned_to end,
         first_admin_opened_at=coalesce(first_admin_opened_at,now()),
         first_admin_opened_by=coalesce(first_admin_opened_by,v_user_id),
         closed_at=case when p_status in ('completed','cancelled') then now() else null end,
         last_activity_at=now(),updated_at=now()
   where id=p_record_id;

  v_label:=case p_status when 'open' then 'Aberta' when 'in_progress' then 'Em andamento' when 'waiting_client' then 'Aguardando cliente' when 'standby' then 'Stand by' when 'completed' then 'Finalizada' else 'Cancelada' end;
  if v_record.visibility='client' then
    v_ids:=cali_workspace.notify_workspace_movement(
      v_record.company_id,v_user_id,'client','record_status','Atualização na sua solicitação',
      '“' || v_record.title || '” agora está como ' || v_label || '.',
      'account_record',v_record.id,'/cliente/registros?record=' || v_record.id::text,
      case when p_status in ('completed','cancelled') then 'high' else 'normal' end,
      p_status in ('completed','cancelled')
    );
  end if;
  return jsonb_build_object('record_id',v_record.id,'workflow_status',p_status,'notification_ids',to_jsonb(coalesce(v_ids,'{}'::uuid[])));
end;
$$;
grant execute on function cali_workspace.set_account_record_status(uuid,text) to authenticated;

create extension if not exists pg_cron with schema pg_catalog;

create or replace function cali_workspace.dispatch_daily_chat_digest()
returns void
language plpgsql
security definer
set search_path=cali_workspace,public,net
as $$
declare
  v_hook text;
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key='notification_email_hook';
  if v_hook is null then return; end if;
  perform net.http_post(
    url := 'https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/workspace-daily-chat-digest',
    headers := jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),
    body := jsonb_build_object('source','daily_cron')
  );
end;
$$;

do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='workspace-daily-chat-digest' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
end $$;
select cron.schedule('workspace-daily-chat-digest','0 11 * * *',$cron$select cali_workspace.dispatch_daily_chat_digest();$cron$);
