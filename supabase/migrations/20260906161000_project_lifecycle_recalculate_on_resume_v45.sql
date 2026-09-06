-- CALI Workspace · recalculo de rota em pausa/suspensao V45
-- Meta desejada permanece fixa; Previsao CALI e deadlines afetadas acompanham o tempo efetivamente interrompido.

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
  v_project_start date;
  v_scope_label text;
  v_event_id uuid;
  v_exec text;
  v_title text;
  v_body text;
  v_visible boolean := true;
  v_front_id uuid;
  v_hold_event record;
  v_effective_start date;
  v_shift_days integer := 0;
  v_shifted integer := 0;
  v_downtime_hours numeric := 0;
  v_forecast date;
begin
  if not exists(select 1 from cali_workspace.profiles p where p.id=auth.uid() and p.role='admin' and p.active=true) then
    raise exception 'Apenas a administracao CALI pode alterar o ciclo de execucao.';
  end if;
  if p_action not in ('pause','suspend','cancel','resume') then raise exception 'Acao invalida.'; end if;
  if p_scope_type not in ('project','front','deliverable') then raise exception 'Escopo invalido.'; end if;
  if length(trim(coalesce(p_reason,''))) < 4 then raise exception 'Informe uma justificativa para registrar e comunicar ao cliente.'; end if;

  select company_id,name,protocol,planning_status,start_date
    into v_company_id,v_project_name,v_project_protocol,v_planning_status,v_project_start
  from cali_workspace.projects where id=p_project_id;
  if v_company_id is null then raise exception 'Projeto nao encontrado.'; end if;
  v_visible := v_planning_status <> 'draft';

  if p_scope_type='project' then
    v_scope_label := v_project_name;
  elsif p_scope_type='front' then
    select name into v_scope_label from cali_workspace.project_workstreams where id=p_scope_id and project_id=p_project_id;
    if v_scope_label is null then raise exception 'Frente nao encontrada neste projeto.'; end if;
  else
    select title,workstream_id into v_scope_label,v_front_id from cali_workspace.deliverables where id=p_scope_id and project_id=p_project_id;
    if v_scope_label is null then raise exception 'Entregavel nao encontrado neste projeto.'; end if;
  end if;

  if p_action in ('pause','suspend') and exists(
    select 1 from cali_workspace.project_lifecycle_events e
     where e.project_id=p_project_id and e.scope_type=p_scope_type
       and ((p_scope_type='project' and e.scope_id is null) or e.scope_id=p_scope_id)
       and e.action in ('pause','suspend') and e.resolved_at is null
  ) then
    raise exception 'Este escopo ja possui uma pausa ou suspensao ativa. Retome antes de criar uma nova interrupcao.';
  end if;

  if p_action='resume' then
    select e.* into v_hold_event
      from cali_workspace.project_lifecycle_events e
     where e.project_id=p_project_id and e.scope_type=p_scope_type
       and ((p_scope_type='project' and e.scope_id is null) or e.scope_id=p_scope_id)
       and e.action in ('pause','suspend') and e.resolved_at is null
     order by e.created_at asc limit 1;
    if v_hold_event.id is null then raise exception 'Nao existe pausa ou suspensao ativa para este escopo.'; end if;

    v_effective_start := greatest(v_hold_event.created_at::date, coalesce(v_project_start,v_hold_event.created_at::date));
    if current_date > v_effective_start then
      v_shift_days := greatest(cali_workspace.business_days_delta(v_effective_start,current_date),0);
    end if;
    v_downtime_hours := round((extract(epoch from (now()-v_hold_event.created_at))/3600.0)::numeric,2);

    if v_shift_days > 0 then
      if p_scope_type='project' then
        v_shifted := cali_workspace.shift_project_deadlines(
          p_project_id,-1,v_shift_days,
          format('Retomada apos %s dia(s) util(eis) de interrupcao · %s',v_shift_days,v_hold_event.reason)
        );
        update cali_workspace.deliverables
           set client_response_due_at = case when client_response_due_at is null then null else (cali_workspace.add_business_days(client_response_due_at::date,v_shift_days)::timestamp + client_response_due_at::time) at time zone 'America/Sao_Paulo' end,
               updated_at=now()
         where project_id=p_project_id and status not in ('approved','cancelled') and client_response_due_at is not null;
      elsif p_scope_type='front' then
        update cali_workspace.deliverables d
           set original_due_at=coalesce(d.original_due_at,d.due_at),
               due_at=case when d.due_at is null then null else (cali_workspace.add_business_days(d.due_at::date,v_shift_days)::timestamp + d.due_at::time) at time zone 'America/Sao_Paulo' end,
               client_response_due_at=case when d.client_response_due_at is null then null else (cali_workspace.add_business_days(d.client_response_due_at::date,v_shift_days)::timestamp + d.client_response_due_at::time) at time zone 'America/Sao_Paulo' end,
               updated_at=now()
         where d.project_id=p_project_id and d.workstream_id=p_scope_id and d.status not in ('approved','cancelled');
        get diagnostics v_shifted = row_count;
      else
        update cali_workspace.deliverables d
           set original_due_at=coalesce(d.original_due_at,d.due_at),
               due_at=case when d.due_at is null then null else (cali_workspace.add_business_days(d.due_at::date,v_shift_days)::timestamp + d.due_at::time) at time zone 'America/Sao_Paulo' end,
               client_response_due_at=case when d.client_response_due_at is null then null else (cali_workspace.add_business_days(d.client_response_due_at::date,v_shift_days)::timestamp + d.client_response_due_at::time) at time zone 'America/Sao_Paulo' end,
               updated_at=now()
         where d.id=p_scope_id and d.project_id=p_project_id and d.status not in ('approved','cancelled');
        get diagnostics v_shifted = row_count;
      end if;
    end if;
  end if;

  v_exec := case p_action when 'pause' then 'paused' when 'suspend' then 'suspended' when 'cancel' then 'cancelled' else 'normal' end;

  if p_scope_type='project' then
    if p_action='resume' then
      if (select execution_status from cali_workspace.projects where id=p_project_id)='cancelled' then raise exception 'Projeto cancelado nao pode ser retomado.'; end if;
      update cali_workspace.projects set execution_status='normal',status=case when status='paused' then 'active' else status end,lifecycle_reason=null,lifecycle_resume_date=null,lifecycle_updated_at=now(),updated_at=now() where id=p_project_id;
      update cali_workspace.project_workstreams w set execution_status=case when exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=p_project_id and e.scope_type='front' and e.scope_id=w.id and e.action in ('pause','suspend') and e.resolved_at is null) then coalesce((select case e.action when 'pause' then 'paused' else 'suspended' end from cali_workspace.project_lifecycle_events e where e.project_id=p_project_id and e.scope_type='front' and e.scope_id=w.id and e.action in ('pause','suspend') and e.resolved_at is null order by e.created_at desc limit 1),'normal') else 'normal' end,updated_at=now() where w.project_id=p_project_id and w.execution_status in ('paused','suspended');
      update cali_workspace.deliverables d set execution_status=case when exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=p_project_id and e.scope_type='deliverable' and e.scope_id=d.id and e.action in ('pause','suspend') and e.resolved_at is null) then coalesce((select case e.action when 'pause' then 'paused' else 'suspended' end from cali_workspace.project_lifecycle_events e where e.project_id=p_project_id and e.scope_type='deliverable' and e.scope_id=d.id and e.action in ('pause','suspend') and e.resolved_at is null order by e.created_at desc limit 1),'normal') when exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=p_project_id and e.scope_type='front' and e.scope_id=d.workstream_id and e.action in ('pause','suspend') and e.resolved_at is null) then coalesce((select case e.action when 'pause' then 'paused' else 'suspended' end from cali_workspace.project_lifecycle_events e where e.project_id=p_project_id and e.scope_type='front' and e.scope_id=d.workstream_id and e.action in ('pause','suspend') and e.resolved_at is null order by e.created_at desc limit 1),'normal') else 'normal' end,updated_at=now() where d.project_id=p_project_id and d.execution_status in ('paused','suspended');
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
      if (select execution_status from cali_workspace.project_workstreams where id=p_scope_id)='cancelled' then raise exception 'Frente cancelada nao pode ser retomada.'; end if;
      update cali_workspace.project_workstreams set execution_status='normal',updated_at=now() where id=p_scope_id and project_id=p_project_id;
      update cali_workspace.deliverables d set execution_status=case when exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=p_project_id and e.scope_type='deliverable' and e.scope_id=d.id and e.action in ('pause','suspend') and e.resolved_at is null) then coalesce((select case e.action when 'pause' then 'paused' else 'suspended' end from cali_workspace.project_lifecycle_events e where e.project_id=p_project_id and e.scope_type='deliverable' and e.scope_id=d.id and e.action in ('pause','suspend') and e.resolved_at is null order by e.created_at desc limit 1),'normal') else 'normal' end,updated_at=now() where d.project_id=p_project_id and d.workstream_id=p_scope_id and d.execution_status in ('paused','suspended');
    elsif p_action in ('pause','suspend') then
      update cali_workspace.project_workstreams set execution_status=v_exec,updated_at=now() where id=p_scope_id and project_id=p_project_id;
      update cali_workspace.deliverables set execution_status=v_exec,updated_at=now() where project_id=p_project_id and workstream_id=p_scope_id and status<>'cancelled';
    else
      update cali_workspace.project_workstreams set execution_status='cancelled',status='cancelled',updated_at=now() where id=p_scope_id and project_id=p_project_id;
      update cali_workspace.deliverables set execution_status='cancelled',status='cancelled',updated_at=now() where project_id=p_project_id and workstream_id=p_scope_id and status<>'approved';
    end if;
  else
    if p_action='resume' then
      if (select execution_status from cali_workspace.deliverables where id=p_scope_id)='cancelled' then raise exception 'Entregavel cancelado nao pode ser retomado.'; end if;
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
    update cali_workspace.project_lifecycle_events
       set resolved_at=now(),resolved_by=auth.uid(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('downtime_hours',v_downtime_hours,'shift_business_days',v_shift_days,'deliverables_shifted',v_shifted,'resumed_at',now())
     where id=v_hold_event.id;
  end if;

  perform cali_workspace.refresh_project_forecast(p_project_id) into v_forecast;

  insert into cali_workspace.project_lifecycle_events(company_id,project_id,scope_type,scope_id,scope_label,action,reason,resume_date,client_visible,created_by,metadata)
  values(v_company_id,p_project_id,p_scope_type,case when p_scope_type='project' then null else p_scope_id end,v_scope_label,p_action,trim(p_reason),p_resume_date,v_visible,auth.uid(),jsonb_build_object('project_protocol',v_project_protocol,'shift_business_days',v_shift_days,'downtime_hours',v_downtime_hours,'forecast_after',v_forecast)) returning id into v_event_id;

  v_title := case p_action when 'pause' then 'Execucao pausada' when 'suspend' then 'Execucao suspensa' when 'cancel' then 'Execucao cancelada' else 'Execucao retomada' end;
  v_body := case p_scope_type when 'project' then 'Projeto ' when 'front' then 'Frente ' else 'Entregavel ' end || v_scope_label || ': ' || trim(p_reason);
  if p_action in ('pause','suspend') then
    v_body := v_body || case when p_resume_date is not null then ' · previsao de retomada '||to_char(p_resume_date,'DD/MM/YYYY') else '' end || '. O cronograma fica congelado durante a interrupcao e sera recalculado na retomada.';
  elsif p_action='resume' then
    v_body := v_body || format('. Interrupcao contabilizada: %s dia(s) util(eis). Cronograma recalculado%s.',v_shift_days,case when v_forecast is null then '' else ' · nova Previsao CALI '||to_char(v_forecast,'DD/MM/YYYY') end);
  end if;

  if v_visible then
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    select v_company_id,p.id,'project_lifecycle',v_title,v_body,'project',p_project_id,'/cliente/entregaveis',case when p_action in ('cancel','suspend') then 'high' else 'normal' end,true
      from cali_workspace.profiles p where p.company_id=v_company_id and p.role='client' and p.active=true;
  end if;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_company_id,auth.uid(),'project_lifecycle_'||p_action,p_scope_type,case when p_scope_type='project' then p_project_id else p_scope_id end,jsonb_build_object('project_id',p_project_id,'scope_label',v_scope_label,'reason',trim(p_reason),'resume_date',p_resume_date,'client_visible',v_visible,'shift_business_days',v_shift_days,'downtime_hours',v_downtime_hours,'forecast_after',v_forecast));

  return v_event_id;
end;
$$;

grant execute on function cali_workspace.admin_set_project_lifecycle_v44(uuid,text,text,uuid,text,date) to authenticated;
