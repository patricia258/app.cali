-- Changes requested by the client remain auditable and require a CALI fee decision.
alter table cali_workspace.scheduling_requests
  add column if not exists extra_visit_previous_slot jsonb,
  add column if not exists extra_visit_change_reason text,
  add column if not exists extra_visit_change_at timestamptz,
  add column if not exists extra_visit_change_kind text,
  add column if not exists extra_visit_change_was_confirmed boolean;

create or replace function cali_workspace.client_change_extra_visit_v2(
  p_request_id uuid, p_action text, p_reason text, p_slots jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, auth, cali_workspace as $$
declare v_req cali_workspace.scheduling_requests%rowtype; v_actor record; v_admin record;
  v_prior jsonb; v_event uuid; v_notice text;
begin
  select id,company_id,role,active into v_actor from cali_workspace.profiles where id=auth.uid();
  if not found or not v_actor.active or v_actor.role <> 'client' then raise exception 'Acesso não autorizado.'; end if;
  select * into v_req from cali_workspace.scheduling_requests
    where id=p_request_id and company_id=v_actor.company_id and extra_visit for update;
  if not found or v_req.status not in ('submitted','client_review','reschedule_review','confirmed') then
    raise exception 'Esta visita não está disponível para alteração.';
  end if;
  if p_action not in ('cancel','reschedule') then raise exception 'Escolha cancelar ou reagendar.'; end if;
  if length(btrim(coalesce(p_reason,''))) < 5 then raise exception 'Conte brevemente o motivo da alteração.'; end if;
  if p_action='reschedule' then perform cali_workspace.check_extra_visit_slots_v1(p_slots,48); end if;
  v_prior := coalesce(v_req.selected_slot,v_req.requested_slots->0);
  v_event := v_req.confirmed_event_id;
  if v_event is not null then
    update cali_workspace.events set cancelled_at=now() where id=v_event and company_id=v_req.company_id and cancelled_at is null;
  end if;
  update cali_workspace.scheduling_requests set
    status=case when p_action='cancel' then 'cancelled' else 'reschedule_review' end,
    requested_slots=case when p_action='reschedule' then p_slots else requested_slots end,
    admin_proposed_slots=case when p_action='reschedule' then '[]'::jsonb else admin_proposed_slots end,
    selected_slot=case when p_action='reschedule' then null else selected_slot end,
    confirmed_event_id=case when p_action='reschedule' then null else confirmed_event_id end,
    reschedule_count=case when p_action='reschedule' then coalesce(reschedule_count,0)+1 else reschedule_count end,
    extra_visit_previous_slot=v_prior,
    extra_visit_change_reason=btrim(p_reason),extra_visit_change_at=now(),extra_visit_change_kind=p_action,
    extra_visit_change_was_confirmed=(v_req.status='confirmed'),
    client_note=btrim(p_reason),
    extra_visit_cancellation_fee_cents=null,extra_visit_cancellation_note=null
  where id=p_request_id;
  v_notice := case when p_action='cancel' then 'cancelou' else 'pediu o reagendamento da' end;
  for v_admin in select id from cali_workspace.profiles where role='admin' and active loop
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    values(v_req.company_id,v_admin.id,'scheduling_response',
      case when p_action='cancel' then 'Cliente cancelou visita extra' else 'Cliente pediu reagendamento da visita extra' end,
      'O cliente '||v_notice||' visita em '||to_char(((v_prior->>'startsAt')::timestamptz at time zone 'America/Sao_Paulo'),'DD/MM/YYYY "às" HH24:MI')||'. Motivo: '||btrim(p_reason),
      'scheduling_request',p_request_id,'/admin/calendario','high',true);
  end loop;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'extra_visit_client_changed','scheduling_request',p_request_id,
    jsonb_build_object('action',p_action,'reason',btrim(p_reason),'previous_status',v_req.status,'previous_slot',v_prior,'new_slots',p_slots,'event_id',v_event));
  return jsonb_build_object('status',case when p_action='cancel' then 'cancelled' else 'reschedule_review' end,'cancelled_event_id',v_event);
end $$;

revoke all on function cali_workspace.client_change_extra_visit_v2(uuid,text,text,jsonb) from public,anon;
grant execute on function cali_workspace.client_change_extra_visit_v2(uuid,text,text,jsonb) to authenticated;

create or replace function cali_workspace.admin_decide_extra_visit_change_v2(p_request_id uuid,p_charge boolean,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_req cali_workspace.scheduling_requests%rowtype;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso não autorizado.'; end if;
  if length(btrim(coalesce(p_note,'')))<5 then raise exception 'Registre o motivo da decisão.'; end if;
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and extra_visit for update;
  if not found or v_req.extra_visit_change_kind not in ('cancel','reschedule') or
     v_req.status not in ('cancelled','reschedule_review','confirmed','completed') then raise exception 'Não há alteração para avaliar.'; end if;
  if p_charge and not coalesce(v_req.extra_visit_change_was_confirmed,false) then raise exception 'Só há análise de taxa após confirmação da visita original.'; end if;
  update cali_workspace.scheduling_requests
  set extra_visit_cancellation_fee_cents=case when p_charge then 16000 else 0 end,
      extra_visit_cancellation_note=btrim(p_note) where id=p_request_id;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  values(v_req.company_id,v_req.requested_by,'scheduling_response','Condição da sua visita extra',
    case when p_charge then 'A CALI registrou a taxa de R$ 160,00. ' else 'Não haverá taxa pela alteração. ' end||btrim(p_note),
    'scheduling_request',p_request_id,'/cliente/cronograma','high',true);
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'extra_visit_change_fee_decided','scheduling_request',p_request_id,
    jsonb_build_object('fee_cents',case when p_charge then 16000 else 0 end,'reason',btrim(p_note),'client_reason',v_req.extra_visit_change_reason));
  return jsonb_build_object('fee_cents',case when p_charge then 16000 else 0 end);
end $$;
revoke all on function cali_workspace.admin_decide_extra_visit_change_v2(uuid,boolean,text) from public,anon;
grant execute on function cali_workspace.admin_decide_extra_visit_change_v2(uuid,boolean,text) to authenticated;

-- The existing scheduling reply RPC remains the owner of the decision; this trigger supplies useful copy.
create or replace function cali_workspace.describe_extra_visit_response_v2()
returns trigger language plpgsql security definer set search_path=pg_catalog,cali_workspace as $$
declare v_req record; v_slot jsonb; v_when text;
begin
  if new.notification_type<>'scheduling_response' or new.entity_type<>'scheduling_request' or new.entity_id is null then return new; end if;
  select title,status,extra_visit,selected_slot,requested_slots,admin_proposed_slots,admin_note
  into v_req from cali_workspace.scheduling_requests where id=new.entity_id;
  if not found or not v_req.extra_visit then return new; end if;
  v_slot:=coalesce(v_req.selected_slot,v_req.requested_slots->0);
  v_when:=case when v_slot is null then 'data a combinar' else
    to_char(((v_slot->>'startsAt')::timestamptz at time zone 'America/Sao_Paulo'),'DD/MM/YYYY "às" HH24:MI') end;
  if v_req.status='declined' then
    new.title:='Visita extra não confirmada · '||v_when;
    new.body:='A CALI não conseguiu confirmar sua visita extra de '||v_when||'. '||coalesce(nullif(btrim(v_req.admin_note),''),'Veja os detalhes na agenda.');
  elsif v_req.status='client_review' then
    new.title:='Novas datas para sua visita extra';
    new.body:='A CALI enviou opções para sua visita extra. Veja as datas na agenda.';
  end if;
  new.email_required:=true;
  return new;
end $$;
drop trigger if exists notifications_describe_extra_visit_response_v2 on cali_workspace.notifications;
create trigger notifications_describe_extra_visit_response_v2 before insert on cali_workspace.notifications
for each row execute function cali_workspace.describe_extra_visit_response_v2();

-- Repair previously generic replies so existing declined visits also make sense in the client's inbox.
update cali_workspace.notifications n set
  title='Visita extra não confirmada · '||to_char((((r.requested_slots->0)->>'startsAt')::timestamptz at time zone 'America/Sao_Paulo'),'DD/MM/YYYY "às" HH24:MI'),
  body='A CALI não conseguiu confirmar sua visita extra de '||to_char((((r.requested_slots->0)->>'startsAt')::timestamptz at time zone 'America/Sao_Paulo'),'DD/MM/YYYY "às" HH24:MI')||'. '||coalesce(nullif(btrim(r.admin_note),''),'Veja os detalhes na agenda.'),
  email_required=true
from cali_workspace.scheduling_requests r
where n.entity_type='scheduling_request' and n.entity_id=r.id and n.notification_type='scheduling_response'
  and n.title='Solicitação de agenda respondida' and r.extra_visit and r.status='declined'
  and (r.requested_slots->0)->>'startsAt' is not null;
