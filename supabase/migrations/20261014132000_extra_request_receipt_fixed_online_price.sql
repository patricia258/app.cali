-- CALI Workspace: recibo de solicitações EXTRA e preço fixo online
-- Sem alterações de tabela, trigger, agendamentos existentes ou fluxos administrativos.
-- Preço já aceito no formulário: 1h R$ 200,00; 1h30 R$ 300,00.
-- Primeiro recibo não é confirmação de agenda nem cobrança.

CREATE OR REPLACE FUNCTION cali_workspace.client_request_online_extra_v2(p_title text, p_purpose text, p_slots jsonb, p_ack_name text, p_acknowledged boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'auth', 'cali_workspace'
AS $function$
declare v_result jsonb; v_id uuid; v_profile record; v_minutes integer; v_amount integer;
begin
  select id,role,active into v_profile from cali_workspace.profiles where id=auth.uid();
  if not found or not v_profile.active or v_profile.role<>'client' then raise exception 'Acesso não autorizado.'; end if;
  if not coalesce(p_acknowledged,false) or length(btrim(coalesce(p_ack_name,'')))<5 or
     btrim(p_ack_name) !~ '^[^[:space:]]+([[:space:]]+[^[:space:]]+)+$' then
    raise exception 'Informe seu nome completo e confirme que leu as condições.';
  end if;
  -- O preço da modalidade online é uma tabela, já aceita no formulário.
  -- Não permitir uma duração divergente entre as duas opções nem outro valor.
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) <> 2 then
    raise exception 'Informe duas opções de horário para a reunião online extra.';
  end if;
  if not (p_slots->0 ? 'startsAt' and p_slots->0 ? 'endsAt' and p_slots->1 ? 'startsAt' and p_slots->1 ? 'endsAt') then
    raise exception 'Datas da reunião online extra incompletas.';
  end if;
  v_minutes := round(extract(epoch from (
    ((p_slots->0->>'endsAt')::timestamptz - (p_slots->0->>'startsAt')::timestamptz)
  )) / 60)::integer;
  if v_minutes not in (60,90) or
    ((p_slots->1->>'endsAt')::timestamptz - (p_slots->1->>'startsAt')::timestamptz) <>
    ((p_slots->0->>'endsAt')::timestamptz - (p_slots->0->>'startsAt')::timestamptz)
  then raise exception 'A reunião online extra deve durar 1h ou 1h30 nas duas opções.'; end if;
  v_amount := case when v_minutes=60 then 20000 else 30000 end;
  v_result:=cali_workspace.client_request_online_extra_v1(p_title,p_purpose,p_slots);
  v_id:=(v_result->>'id')::uuid;
  update cali_workspace.scheduling_requests
     set online_extra_request_ack_name=btrim(p_ack_name), online_extra_request_ack_at=now(),
         online_extra_quote_cents=v_amount, online_extra_quote_accepted_at=now(),
         billing_acknowledged_at=now(), billing_acknowledged_by=v_profile.id,
         billing_notice=case when v_minutes=60 then
           'Reunião online extra de 1 hora: R$ 200,00. Condições e valor fixo aceitos na solicitação. Sujeita à confirmação de agenda; o pedido não gera cobrança.'
         else
           'Reunião online extra de 1h30: R$ 300,00. Condições e valor fixo aceitos na solicitação. Sujeita à confirmação de agenda; o pedido não gera cobrança.'
         end
   where id=v_id and requested_by=v_profile.id and online_extra_requested;
  if not found then raise exception 'Não foi possível registrar sua ciência.'; end if;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  select company_id,v_profile.id,'online_extra_conditions_acknowledged','scheduling_request',id,
         jsonb_build_object('name',btrim(p_ack_name),'acknowledged_at',online_extra_request_ack_at)
    from cali_workspace.scheduling_requests where id=v_id;
  -- Recibo: notificação EXCLUSIVA do solicitante, uma vez por pedido criado.
  -- O envio segue o hook autenticado atual e seu controle de emailed_at.
  insert into cali_workspace.notifications
    (company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  select company_id,requested_by,'scheduling_extra_request_receipt',
    'Pedido de reunião online extra recebido',
    'Recebemos as duas opções de horário. A CALI vai avaliar a disponibilidade.',
    'scheduling_request',id,'/cliente/cronograma','normal',true
  from cali_workspace.scheduling_requests
  where id=v_id and requested_by=v_profile.id and online_extra_requested
    and online_extra_quote_cents=v_amount and online_extra_quote_accepted_at is not null;
  if not found then raise exception 'Não foi possível registrar o comprovante do pedido online extra.'; end if;
  return v_result;
end $function$
;

CREATE OR REPLACE FUNCTION cali_workspace.create_extra_visit_request_v1(p_title text, p_purpose text, p_location text, p_requested_slots jsonb, p_ack_name text, p_acknowledged boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'auth', 'cali_workspace'
AS $function$
declare v_profile record; v_result jsonb; v_id uuid; v_notice text;
begin
  select id,full_name,role,active from cali_workspace.profiles where id=auth.uid() into v_profile;
  if not found or not v_profile.active or v_profile.role <> 'client' then raise exception 'Acesso não autorizado.'; end if;
  if not p_acknowledged or length(btrim(coalesce(p_ack_name,''))) < 5 or
    lower(regexp_replace(btrim(p_ack_name),'\s+',' ','g')) <> lower(regexp_replace(btrim(coalesce(v_profile.full_name,'')),'\s+',' ','g')) then
    raise exception 'Digite seu nome completo cadastrado e confirme a ciência das condições.';
  end if;
  perform cali_workspace.check_extra_visit_slots_v1(p_requested_slots,48);
  v_notice := 'Visita extra: R$ 800,00 por até 4 horas. Acima de 4 horas, orçamento e aceite prévios. Deslocamento, estacionamento e alimentação necessária à parte, com comprovantes. Cancelamento/no-show sem aviso ou justificativa: taxa de 20% (R$ 160,00), após avaliação da CALI. Conciliação no período da visita.';
  v_result := cali_workspace.create_scheduling_request_v2('in_person',p_title,p_purpose,p_location,p_requested_slots,'regular',true);
  v_id := (v_result->>'id')::uuid;
  update cali_workspace.scheduling_requests set extra_visit=true,extra_visit_fee_cents=80000,
    extra_visit_ack_name=btrim(p_ack_name),extra_visit_terms_version='2026-09-28-v1',
    meeting_entitlement='extra',contract_session_number=null,billable_extra=true,
    billing_notice=v_notice,urgency_fee_applies=false,
    policy_snapshot=coalesce(policy_snapshot,'{}'::jsonb)||jsonb_build_object('extraVisit',true,'feeCents',80000,'durationMinutes',240,'cancellationPercent',20,'termsVersion','2026-09-28-v1')
    where id=v_id;
  -- Recibo ao solicitante depois de gravar as condições aceitas da visita.
  insert into cali_workspace.notifications
    (company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  select company_id,requested_by,'scheduling_extra_request_receipt',
    'Pedido de visita presencial extra recebido',
    'Recebemos as duas opções de data da visita. A CALI vai avaliar a disponibilidade.',
    'scheduling_request',id,'/cliente/cronograma','normal',true
  from cali_workspace.scheduling_requests
  where id=v_id and requested_by=v_profile.id and extra_visit
    and extra_visit_fee_cents=80000 and extra_visit_ack_name is not null;
  if not found then raise exception 'Não foi possível registrar o comprovante do pedido presencial extra.'; end if;
  return jsonb_build_object('id',v_id,'billable_extra',true,'fee_cents',80000);
end $function$
;
