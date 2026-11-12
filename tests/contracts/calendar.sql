set local role authenticated;
do $calendar$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  start_a timestamptz := date_trunc('day', now()) + interval '10 days 14 hours';
  start_b timestamptz := date_trunc('day', now()) + interval '12 days 14 hours';
  slots jsonb := jsonb_build_array(
    jsonb_build_object('startsAt',start_a,'endsAt',start_a + interval '90 minutes'),
    jsonb_build_object('startsAt',start_b,'endsAt',start_b + interval '90 minutes'));
  mismatched jsonb := jsonb_set(slots,'{1,endsAt}',to_jsonb(start_b + interval '1 hour'));
  request_id uuid;
  requester uuid;
begin
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  requester := auth.uid();
  begin
    perform cali_workspace.client_request_online_extra_v1('Agenda QA','Pauta QA',slots);
    raise exception 'Cliente contornou ciência e preço pelo RPC legado.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform cali_workspace.client_request_online_extra_v2('Agenda QA','Pauta QA',slots,'Pessoa Cliente',false);
    raise exception 'Pedido aceito sem ciência.';
  exception when raise_exception then
    if sqlerrm <> 'Informe seu nome completo e confirme que leu as condições.' then raise; end if;
  end;
  begin
    perform cali_workspace.client_request_online_extra_v2('Agenda QA','Pauta QA',mismatched,'Pessoa Cliente',true);
    raise exception 'Pedido aceito com opções de duração divergentes.';
  exception when raise_exception then
    if sqlerrm <> 'A reunião online extra deve durar 1h ou 1h30 nas duas opções.' then raise; end if;
  end;

  request_id := (cali_workspace.client_request_online_extra_v2('Agenda QA','Pauta QA',slots,' Pessoa Cliente ',true)->>'id')::uuid;
  if not exists(select 1 from cali_workspace.scheduling_requests r where r.id=request_id
    and r.company_id=company_a and r.requested_by=requester and r.status='submitted' and r.confirmed_event_id is null
    and r.meeting_entitlement='extra' and r.contract_session_number is null and r.billable_extra
    and r.online_extra_quote_cents=30000 and r.online_extra_quote_accepted_at is not null
    and r.online_extra_request_ack_name='Pessoa Cliente' and r.billing_acknowledged_by=requester) then
    raise exception 'Pedido extra não conservou preço, estado, ciência e empresa.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  if exists(select 1 from cali_workspace.scheduling_requests r where r.id=request_id) then
    raise exception 'Empresa B viu o pedido de agenda da empresa A.';
  end if;
  begin
    perform cali_workspace.client_accept_online_extra_quote_v1(request_id);
    raise exception 'Empresa B aceitou o orçamento da empresa A.';
  exception when raise_exception then
    if sqlerrm <> 'Orçamento indisponível.' then raise; end if;
  end;

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  if (select count(*) from cali_workspace.notifications n where n.entity_id=request_id
    and n.notification_type='scheduling_extra_request_receipt') <> 1
    or not exists(select 1 from cali_workspace.notifications n where n.entity_id=request_id
      and n.notification_type='scheduling_extra_request_receipt' and n.user_id=requester and n.email_required) then
    raise exception 'Recibo do pedido extra precisa ser único e destinado ao solicitante.';
  end if;
end;
$calendar$;

select 'PASS preço fixo, ciência, pendência de agenda, isolamento e recibo da reunião extra';

reset role;
do $meeting_changes$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  client_a uuid := (current_setting('qa.claims_client_a')::jsonb->>'sub')::uuid;
  meeting uuid := gen_random_uuid();
  cancelled_meeting uuid := gen_random_uuid();
  past_meeting uuid := gen_random_uuid();
  future_monday timestamp := date_trunc('week', now() at time zone 'America/Sao_Paulo') + interval '14 days 10 hours';
  original_start timestamptz := future_monday at time zone 'America/Sao_Paulo';
  slot_a timestamptz := (future_monday + interval '1 day') at time zone 'America/Sao_Paulo';
  slot_b timestamptz := (future_monday + interval '2 days') at time zone 'America/Sao_Paulo';
  transcript text := 'meeting-transcripts/'||company_a||'/'||past_meeting||'/qa.pdf';
  slots jsonb := jsonb_build_array(
    jsonb_build_object('startsAt',slot_a,'endsAt',slot_a + interval '1 hour'),
    jsonb_build_object('startsAt',slot_b,'endsAt',slot_b + interval '1 hour'));
  change_id uuid;
  cancel_id uuid;
  decision jsonb;
begin
  insert into cali_workspace.events(id,company_id,title,starts_at,ends_at) values
    (meeting,company_a,'QA reunião para remarcar',original_start,original_start + interval '1 hour'),
    (cancelled_meeting,company_a,'QA reunião para cancelar',original_start,original_start + interval '1 hour'),
    (past_meeting,company_a,'QA reunião para transcrever',now()-interval '2 days',now()-interval '2 days'+interval '1 hour');
  insert into storage.objects(bucket_id,name) values('cali-workspace-private',transcript);

  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  begin
    perform cali_workspace.client_request_agenda_change_v1(meeting,'cancel','Conflito de agenda QA');
    raise exception 'Empresa B solicitou alteração da reunião de A.';
  exception when raise_exception then
    if sqlerrm <> 'Esta reunião não aceita novos pedidos de alteração.' then raise; end if;
  end;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  begin
    perform cali_workspace.client_request_agenda_change_v1(meeting,'reschedule','Conflito de agenda QA',jsonb_build_array(slots->0,slots->0));
    raise exception 'Reagendamento aceitou duas opções iguais.';
  exception when raise_exception then
    if sqlerrm <> 'Informe duas novas opções distintas.' then raise; end if;
  end;
  change_id := (cali_workspace.client_request_agenda_change_v1(meeting,'reschedule','Conflito de agenda QA',slots)->>'id')::uuid;
  cancel_id := (cali_workspace.client_request_agenda_change_v1(cancelled_meeting,'cancel','Conflito de agenda QA')->>'id')::uuid;
  begin
    perform cali_workspace.client_request_agenda_change_v1(meeting,'cancel','Conflito de agenda QA');
    raise exception 'Reunião recebeu duas alterações pendentes.';
  exception when raise_exception then
    if sqlerrm <> 'Já existe uma alteração desta reunião em análise.' then raise; end if;
  end;
  begin
    perform cali_workspace.admin_decide_agenda_change_v1(change_id,true,'Escolha de horário QA',1);
    raise exception 'Cliente aprovou a própria solicitação.';
  exception when raise_exception then
    if sqlerrm <> 'Acesso não autorizado.' then raise; end if;
  end;
  if not exists(select 1 from cali_workspace.events e where e.id=meeting and e.starts_at=original_start) then
    raise exception 'Solicitação pendente mudou a reunião.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  decision := cali_workspace.admin_decide_agenda_change_v1(change_id,true,'Escolha de horário QA',1);
  if decision->>'status' is distinct from 'approved'
    or not exists(select 1 from cali_workspace.events e where e.id=meeting and e.starts_at=slot_b and e.ends_at=slot_b + interval '1 hour' and e.sync_status='pending')
    or not exists(select 1 from cali_workspace.notifications n where n.entity_id=meeting and n.user_id=client_a and n.notification_type='scheduling_response' and n.email_required) then
    raise exception 'Aprovação perdeu horário escolhido, sincronização ou notificação do solicitante.';
  end if;
  decision := cali_workspace.admin_decide_agenda_change_v1(cancel_id,true,'Cancelamento confirmado QA');
  if decision->>'status' is distinct from 'approved'
    or not exists(select 1 from cali_workspace.events e where e.id=cancelled_meeting and e.cancelled_at is not null) then
    raise exception 'Cancelamento aprovado manteve a reunião ativa.';
  end if;
  begin
    perform cali_workspace.admin_decide_agenda_change_v1(change_id,false,'Decisão repetida QA');
    raise exception 'Pedido decidido recebeu segunda decisão.';
  exception when raise_exception then
    if sqlerrm <> 'Este pedido já foi respondido.' then raise; end if;
  end;
  begin
    perform cali_workspace.admin_attach_meeting_record_v1(past_meeting,transcript,'Ata QA.pdf');
    raise exception 'Transcrição aceita sem resultado da reunião.';
  exception when raise_exception then
    if sqlerrm <> 'Registre primeiro que a reunião aconteceu.' then raise; end if;
  end;
  perform cali_workspace.admin_mark_calendar_event_outcome_v66(past_meeting,'occurred');
  perform cali_workspace.admin_attach_meeting_record_v1(past_meeting,transcript,'Ata QA.pdf');

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if not exists(select 1 from cali_workspace.client_meeting_records_v1() r where r.event_id=past_meeting
    and r.outcome='occurred' and r.attachment_path=transcript and r.attachment_name='Ata QA.pdf') then
    raise exception 'Cliente perdeu resultado ou transcrição da reunião própria.';
  end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  if exists(select 1 from cali_workspace.client_meeting_records_v1() r where r.event_id=past_meeting) then
    raise exception 'Empresa B recebeu resultado da reunião de A.';
  end if;
  reset role;
end;
$meeting_changes$;
