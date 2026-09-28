-- An extra visit is a paid extension of an existing scheduling request, never a contractual session.
alter table cali_workspace.scheduling_requests
  add column if not exists extra_visit boolean not null default false,
  add column if not exists extra_visit_fee_cents integer,
  add column if not exists extra_visit_ack_name text,
  add column if not exists extra_visit_terms_version text,
  add column if not exists extra_visit_cancellation_fee_cents integer,
  add column if not exists extra_visit_cancellation_note text,
  add column if not exists extra_visit_billing_period date;

alter table cali_workspace.scheduling_requests
  add constraint extra_visit_fee_snapshot_check check (not extra_visit or
    (request_mode = 'in_person' and billable_extra and extra_visit_fee_cents = 80000
      and length(btrim(extra_visit_ack_name)) >= 5 and billing_acknowledged_at is not null));

create or replace function cali_workspace.enforce_extra_visit_v1()
returns trigger language plpgsql security definer set search_path=pg_catalog,cali_workspace as $$
begin
  if not new.extra_visit then return new; end if;
  if tg_op='UPDATE' and old.extra_visit and
    (new.extra_visit_fee_cents, new.extra_visit_ack_name, new.extra_visit_terms_version)
    is distinct from (old.extra_visit_fee_cents, old.extra_visit_ack_name, old.extra_visit_terms_version) then
    raise exception 'As condições aceitas da visita não podem ser alteradas.';
  end if;
  new.meeting_entitlement := 'extra'; new.contract_session_number := null;
  new.billable_extra := true; new.urgency_fee_applies := false;
  if new.billing_acknowledged_at is null then
    new.billing_acknowledged_at := now(); new.billing_acknowledged_by := new.requested_by;
  end if;
  if new.status='client_review' and (tg_op='INSERT' or new.admin_proposed_slots is distinct from old.admin_proposed_slots) then
    perform cali_workspace.check_extra_visit_slots_v1(new.admin_proposed_slots,0);
  end if;
  if new.status='confirmed' and new.confirmed_event_id is null then raise exception 'A visita confirmada precisa de evento na agenda.'; end if;
  return new;
end $$;
create trigger enforce_extra_visit_before_write_v1 before insert or update on cali_workspace.scheduling_requests
for each row execute function cali_workspace.enforce_extra_visit_v1();

create or replace function cali_workspace.classify_extra_visit_event_v1()
returns trigger language plpgsql security definer set search_path=pg_catalog,cali_workspace as $$
begin
  if new.extra_visit and new.confirmed_event_id is not null then
    update cali_workspace.events set schedule_class='extra',contract_session_number=null,billing_applies=true,
      billing_reason='Visita extra R$ 800,00 / 4h; despesas comprovadas à parte; cobrança após realização'
      where id=new.confirmed_event_id;
  end if;
  return null;
end $$;
create trigger classify_extra_visit_after_write_v1 after insert or update on cali_workspace.scheduling_requests
for each row execute function cali_workspace.classify_extra_visit_event_v1();

create or replace function cali_workspace.check_extra_visit_slots_v1(p_slots jsonb, p_notice_hours integer default 0)
returns void language plpgsql security invoker set search_path = pg_catalog, cali_workspace as $$
declare v_slot jsonb; v_start timestamptz; v_end timestamptz; v_local timestamp; v_seen timestamptz[] := '{}';
begin
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) <> 2 then
    raise exception 'Informe duas opções distintas de data e horário.';
  end if;
  for v_slot in select value from jsonb_array_elements(p_slots) loop
    begin
      v_start := (v_slot->>'startsAt')::timestamptz;
      v_end := (v_slot->>'endsAt')::timestamptz;
    exception when others then raise exception 'Revise as datas e horários informados.'; end;
    if v_start is null or v_end is null or v_start <= now() + make_interval(hours => p_notice_hours) then
      raise exception 'Escolha horários com pelo menos 48 horas corridas de antecedência.';
    end if;
    v_local := v_start at time zone 'America/Sao_Paulo';
    if extract(isodow from v_local) > 5 or v_local::time < time '09:00' or
      (v_end at time zone 'America/Sao_Paulo')::date <> v_local::date or
      (v_end at time zone 'America/Sao_Paulo')::time > time '16:00' or
      v_end - v_start <> interval '4 hours' then
      raise exception 'A visita deve ter 4 horas e ocorrer entre 9h e 16h, de segunda a sexta (horário de Brasília).';
    end if;
    if v_start = any(v_seen) then raise exception 'Escolha duas opções diferentes.'; end if;
    v_seen := array_append(v_seen,v_start);
  end loop;
end $$;

create or replace function cali_workspace.create_extra_visit_request_v1(
  p_title text,p_purpose text,p_location text,p_requested_slots jsonb,p_ack_name text,p_acknowledged boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
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
  return jsonb_build_object('id',v_id,'billable_extra',true,'fee_cents',80000);
end $$;

create or replace function cali_workspace.admin_confirm_extra_visit_v1(p_request_id uuid,p_slot_index integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_req record; v_client record; v_slot jsonb; v_start timestamptz; v_end timestamptz; v_event uuid;
begin
  if not exists(select 1 from cali_workspace.profiles where id=auth.uid() and active and role='admin') then raise exception 'Acesso não autorizado.'; end if;
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and extra_visit for update;
  if not found or v_req.status not in ('submitted','reschedule_review') or p_slot_index not between 0 and 1 then raise exception 'Pedido indisponível para confirmação.'; end if;
  v_slot := v_req.requested_slots->p_slot_index; v_start := (v_slot->>'startsAt')::timestamptz; v_end := (v_slot->>'endsAt')::timestamptz;
  if v_start <= now() then raise exception 'A data proposta já passou.'; end if;
  if exists(select 1 from cali_workspace.events where company_id=v_req.company_id and starts_at<v_end and ends_at>v_start and event_type='meeting' and source_type='scheduling_request') then raise exception 'Já existe um compromisso neste horário.'; end if;
  select id,full_name,email into v_client from cali_workspace.profiles where id=v_req.requested_by;
  insert into cali_workspace.events(company_id,title,event_type,starts_at,ends_at,mode,location,description,visibility,timezone,source_type,source_entity_id,sync_status,created_by,schedule_class,billing_applies,billing_reason)
  values(v_req.company_id,v_req.title,'meeting',v_start,v_end,'in_person',v_req.location,nullif(v_req.purpose,''),'client','America/Sao_Paulo','scheduling_request',v_req.id,'pending',auth.uid(),'extra',true,'Visita extra R$ 800,00 / 4h; despesas comprovadas à parte; cobrança após realização') returning id into v_event;
  insert into cali_workspace.event_attendees(event_id,company_id,user_id,name,email,attendee_type,status)
  values(v_event,v_req.company_id,v_client.id,coalesce(v_client.full_name,'Cliente'),v_client.email,'client','pending');
  update cali_workspace.scheduling_requests set selected_slot=v_slot,status='confirmed',confirmed_event_id=v_event,
    meeting_entitlement='extra',contract_session_number=null,billable_extra=true,
    extra_visit_billing_period=date_trunc('month',(v_start at time zone 'America/Sao_Paulo'))::date where id=p_request_id;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  values(v_req.company_id,v_client.id,'scheduling_confirmed','Sua visita extra foi confirmada',v_req.title||' entrou na agenda.','event',v_event,'/cliente/cronograma','high',false);
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'scheduling_request_confirmed','scheduling_request',p_request_id,jsonb_build_object('event_id',v_event,'selected_slot',v_slot,'extra_visit',true,'fee_cents',80000));
  return jsonb_build_object('status','confirmed','event_id',v_event);
end $$;

create or replace function cali_workspace.client_accept_extra_visit_proposal_v1(p_request_id uuid,p_slot_index integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_req record; v_profile record; v_admin record; v_event uuid; v_slot jsonb; v_start timestamptz; v_end timestamptz;
begin
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and extra_visit for update;
  if not found then raise exception 'Solicitação de visita extra não encontrada.'; end if;
  if v_req.requested_by <> auth.uid() and not exists
    (select 1 from cali_workspace.profiles where id=auth.uid() and active and role='client' and company_id=v_req.company_id) then
    raise exception 'Acesso não autorizado.';
  end if;
  if v_req.status <> 'client_review' or p_slot_index < 0 or p_slot_index >= jsonb_array_length(v_req.admin_proposed_slots) then
    raise exception 'Esta opção não está disponível.';
  end if;
  v_slot := v_req.admin_proposed_slots->p_slot_index;
  v_start := (v_slot->>'startsAt')::timestamptz; v_end := (v_slot->>'endsAt')::timestamptz;
  if v_start <= now() or
    ((v_slot->>'startsAt')::timestamptz at time zone 'America/Sao_Paulo')::time < time '09:00' or
    ((v_slot->>'endsAt')::timestamptz at time zone 'America/Sao_Paulo')::time > time '16:00' or
    extract(isodow from ((v_slot->>'startsAt')::timestamptz at time zone 'America/Sao_Paulo')) > 5 or
    (v_slot->>'endsAt')::timestamptz - (v_slot->>'startsAt')::timestamptz <> interval '4 hours' then
    raise exception 'Peça uma nova opção de visita entre 9h e 16h, de segunda a sexta.';
  end if;
  if exists(select 1 from cali_workspace.events e where e.company_id=v_req.company_id and e.starts_at<v_end and e.ends_at>v_start and e.event_type='meeting' and e.source_type='scheduling_request') then
    raise exception 'Já existe um compromisso neste horário. Peça outra opção.';
  end if;
  select full_name,email into v_profile from cali_workspace.profiles where id=auth.uid();
  insert into cali_workspace.events(company_id,title,event_type,starts_at,ends_at,mode,location,description,visibility,timezone,source_type,source_entity_id,sync_status,created_by,schedule_class,contract_session_number,billing_applies,billing_reason)
  values(v_req.company_id,v_req.title,'meeting',v_start,v_end,'in_person',v_req.location,nullif(v_req.purpose,''),'client','America/Sao_Paulo','scheduling_request',v_req.id,'pending',auth.uid(),'extra',null,true,'Visita extra R$ 800,00 / 4h; despesas comprovadas à parte; cobrança após realização') returning id into v_event;
  insert into cali_workspace.event_attendees(event_id,company_id,user_id,name,email,attendee_type,status)
  values(v_event,v_req.company_id,auth.uid(),coalesce(v_profile.full_name,'Cliente'),v_profile.email,'client','pending');
  update cali_workspace.scheduling_requests set selected_slot=v_slot,status='confirmed',confirmed_event_id=v_event,
    meeting_entitlement='extra',contract_session_number=null,billable_extra=true,
    extra_visit_billing_period=date_trunc('month',(v_start at time zone 'America/Sao_Paulo'))::date where id=p_request_id;
  for v_admin in select id from cali_workspace.profiles where role='admin' and active loop
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    values(v_req.company_id,v_admin.id,'scheduling_confirmed','Visita extra confirmada',v_req.title||' foi confirmada e entrou na agenda.','event',v_event,'/admin/calendario','high',false);
  end loop;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'scheduling_request_confirmed','scheduling_request',p_request_id,jsonb_build_object('event_id',v_event,'selected_slot',v_slot,'extra_visit',true,'fee_cents',80000));
  return jsonb_build_object('status','confirmed','event_id',v_event,'billable_extra',true,'fee_cents',80000);
end $$;

create or replace function cali_workspace.admin_set_extra_visit_cancellation_v1(p_request_id uuid,p_charge boolean,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_req record;
begin
  if not exists(select 1 from cali_workspace.profiles where id=auth.uid() and active and role='admin') then raise exception 'Acesso não autorizado.'; end if;
  if length(btrim(coalesce(p_note,'')))<5 then raise exception 'Registre o motivo da decisão.'; end if;
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and extra_visit for update;
  if not found or v_req.status not in ('not_occurred','reschedule_review') then raise exception 'Registre primeiro a não ocorrência da visita.'; end if;
  update cali_workspace.scheduling_requests set extra_visit_cancellation_fee_cents=case when p_charge then 16000 else 0 end,
    extra_visit_cancellation_note=btrim(p_note) where id=p_request_id;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'extra_visit_cancellation_decided','scheduling_request',p_request_id,
    jsonb_build_object('fee_cents',case when p_charge then 16000 else 0 end,'reason',btrim(p_note)));
  return jsonb_build_object('fee_cents',case when p_charge then 16000 else 0 end);
end $$;

grant execute on function cali_workspace.check_extra_visit_slots_v1(jsonb,integer) to authenticated;
grant execute on function cali_workspace.create_extra_visit_request_v1(text,text,text,jsonb,text,boolean) to authenticated;
grant execute on function cali_workspace.admin_confirm_extra_visit_v1(uuid,integer) to authenticated;
grant execute on function cali_workspace.client_accept_extra_visit_proposal_v1(uuid,integer) to authenticated;
grant execute on function cali_workspace.admin_set_extra_visit_cancellation_v1(uuid,boolean,text) to authenticated;
