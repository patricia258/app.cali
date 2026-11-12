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
