create or replace function cali_workspace.report_generation_readiness_v61(
  p_company_id uuid,
  p_report_type text,
  p_period_start date,
  p_period_end date
) returns jsonb
language plpgsql
security definer
set search_path = cali_workspace, public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_company_start date;
  v_collection_start date;
  v_collection_end date;
  v_collected_days integer := 0;
  v_required_days integer := case when coalesce(p_report_type,'monthly')='monthly' then 20 else 0 end;
  v_available_on date;
  v_official record;
  v_mode text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select role into v_role from cali_workspace.profiles where id=v_uid and active=true;
  if v_role <> 'admin' then raise exception 'Usuário sem permissão para gerenciar relatórios.'; end if;
  if p_company_id is null or p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    raise exception 'Período inválido.';
  end if;

  select start_date into v_company_start from cali_workspace.companies where id=p_company_id;
  if not found then raise exception 'Cliente não encontrado.'; end if;

  v_collection_start := greatest(p_period_start, coalesce(v_company_start,p_period_start));
  v_collection_end := least(current_date,p_period_end);
  if v_collection_end >= v_collection_start then
    v_collected_days := (v_collection_end-v_collection_start)+1;
  end if;
  v_available_on := case when v_required_days>0 then v_collection_start+(v_required_days-1) else v_collection_start end;

  select r.id,r.protocol,r.version,r.status,r.sent_at,r.acknowledged_at
    into v_official
  from cali_workspace.reports r
  where r.company_id=p_company_id
    and r.report_type=coalesce(p_report_type,'monthly')
    and r.period_start=p_period_start
    and r.period_end=p_period_end
    and r.status in ('sent','published')
  order by r.version desc
  limit 1;

  if v_official.id is not null then
    v_mode := 'simulation';
  elsif v_required_days>0 and v_collected_days<v_required_days then
    v_mode := 'preview';
  else
    v_mode := 'official';
  end if;

  return jsonb_build_object(
    'mode',v_mode,
    'company_start_date',v_company_start,
    'collection_start',v_collection_start,
    'collection_end',v_collection_end,
    'collected_days',v_collected_days,
    'required_days',v_required_days,
    'available_on',v_available_on,
    'can_generate_official',(v_official.id is null and (v_required_days=0 or v_collected_days>=v_required_days)),
    'can_send',(v_official.id is null and (v_required_days=0 or v_collected_days>=v_required_days)),
    'official_report_id',v_official.id,
    'official_protocol',v_official.protocol,
    'official_version',v_official.version,
    'official_status',v_official.status,
    'official_sent_at',v_official.sent_at,
    'official_acknowledged_at',v_official.acknowledged_at
  );
end;
$$;

grant execute on function cali_workspace.report_generation_readiness_v61(uuid,text,date,date) to authenticated;

create or replace function cali_workspace.client_submit_report_question_v61(
  p_report_id uuid,
  p_body text
) returns jsonb
language plpgsql
security definer
set search_path = cali_workspace, public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_profile record;
  v_report record;
  v_body text := btrim(coalesce(p_body,''));
  v_deadline date;
  v_record_id uuid;
  v_record_protocol text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if char_length(v_body)<4 then raise exception 'Escreva sua dúvida ou observação antes de enviar.'; end if;
  if char_length(v_body)>4000 then raise exception 'A mensagem deve ter no máximo 4.000 caracteres.'; end if;

  select id,company_id,role,active,full_name,email into v_profile
  from cali_workspace.profiles where id=v_uid;
  if not found or v_profile.role<>'client' or v_profile.active=false then
    raise exception 'Usuário sem permissão para enviar esta dúvida.';
  end if;

  select id,company_id,cycle_id,protocol,status,client_first_opened_at into v_report
  from cali_workspace.reports where id=p_report_id;
  if not found or v_report.company_id is distinct from v_profile.company_id then
    raise exception 'Relatório não encontrado para esta conta.';
  end if;
  if v_report.status not in ('sent','published') then
    raise exception 'Este relatório ainda não está disponível para dúvidas.';
  end if;
  if v_report.client_first_opened_at is null then
    raise exception 'Abra o relatório antes de enviar uma dúvida.';
  end if;

  v_deadline := cali_workspace.add_business_days(v_report.client_first_opened_at::date,3);
  if current_date>v_deadline then
    raise exception 'O prazo de 3 dias úteis para dúvidas deste relatório foi encerrado.';
  end if;

  insert into cali_workspace.account_records(
    company_id,cycle_id,record_type,title,visibility,source_actor,participants,summary,
    decisions,attention_points,next_actions,impact_level,include_in_report,requires_action,
    created_by,workflow_status,last_activity_at
  ) values (
    v_report.company_id,v_report.cycle_id,'request',
    'Dúvida sobre relatório · '||coalesce(v_report.protocol,'sem protocolo'),
    'client','client',
    jsonb_build_array(jsonb_build_object('name',coalesce(v_profile.full_name,'Cliente'),'email',v_profile.email)),
    v_body,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'medium',false,true,
    v_uid,'open',now()
  ) returning id,protocol into v_record_id,v_record_protocol;

  insert into cali_workspace.report_client_events(report_id,company_id,user_id,event_type,metadata)
  values(v_report.id,v_report.company_id,v_uid,'question_submitted',jsonb_build_object(
    'record_id',v_record_id,'record_protocol',v_record_protocol,'deadline',v_deadline
  ));

  insert into cali_workspace.notifications(
    company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required
  )
  select v_report.company_id,p.id,'report_question','Nova dúvida sobre relatório',
    coalesce(v_profile.full_name,'Cliente')||' enviou uma dúvida sobre '||coalesce(v_report.protocol,'um relatório')||'.',
    'account_record',v_record_id,'/admin/registros?record='||v_record_id::text,'high',false
  from cali_workspace.profiles p
  where p.role='admin' and p.active=true;

  return jsonb_build_object(
    'ok',true,'record_id',v_record_id,'record_protocol',v_record_protocol,'deadline',v_deadline
  );
end;
$$;

grant execute on function cali_workspace.client_submit_report_question_v61(uuid,text) to authenticated;
