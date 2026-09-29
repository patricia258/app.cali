-- A request never silently moves or removes an agreed meeting. CALI decides first.
create table if not exists cali_workspace.agenda_change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id),
  event_id uuid not null references cali_workspace.events(id),
  requested_by uuid not null references cali_workspace.profiles(id),
  action text not null check(action in ('cancel','reschedule')),
  reason text not null,
  slots jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check(status in ('pending','approved','declined')),
  decision_note text,
  decided_by uuid references cali_workspace.profiles(id),
  decided_at timestamptz,
  chosen_slot jsonb,
  original_starts_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index if not exists agenda_change_one_pending_per_event on cali_workspace.agenda_change_requests(event_id) where status='pending';
create index if not exists agenda_change_company_history on cali_workspace.agenda_change_requests(company_id,created_at desc);
alter table cali_workspace.agenda_change_requests enable row level security;
drop policy if exists agenda_change_read on cali_workspace.agenda_change_requests;
create policy agenda_change_read on cali_workspace.agenda_change_requests for select to authenticated
using(cali_workspace.is_admin() or company_id=cali_workspace.current_company_id());
grant select on cali_workspace.agenda_change_requests to authenticated;

create or replace function cali_workspace.add_weekday_hours_v1(p_from timestamptz,p_hours integer)
returns timestamptz language plpgsql stable set search_path=pg_catalog as $$
declare v_at timestamptz:=p_from; v_count integer:=0;
begin
  while v_count<p_hours loop
    v_at:=v_at+interval '1 hour';
    if extract(isodow from v_at at time zone 'America/Sao_Paulo')<=5 then v_count:=v_count+1; end if;
  end loop;
  return v_at;
end $$;

-- Extra visits keep their 48 clock-hour booking rule; changes require 48 weekday hours.
create or replace function cali_workspace.guard_extra_visit_reschedule_notice_v1()
returns trigger language plpgsql set search_path=pg_catalog,cali_workspace as $$
declare v_slot jsonb;
begin
  if new.extra_visit and new.extra_visit_change_kind='reschedule' and
     new.extra_visit_change_at is distinct from old.extra_visit_change_at then
    for v_slot in select value from jsonb_array_elements(new.requested_slots) loop
      if (v_slot->>'startsAt')::timestamptz < cali_workspace.add_weekday_hours_v1(now(),48) then
        raise exception 'Para reagendar, escolha datas com pelo menos 48 horas úteis de antecedência.';
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists scheduling_extra_visit_reschedule_notice_v1 on cali_workspace.scheduling_requests;
create trigger scheduling_extra_visit_reschedule_notice_v1 before update on cali_workspace.scheduling_requests
for each row execute function cali_workspace.guard_extra_visit_reschedule_notice_v1();

create or replace function cali_workspace.client_request_agenda_change_v1(p_event_id uuid,p_action text,p_reason text,p_slots jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_actor record; v_event cali_workspace.events%rowtype; v_slot jsonb; v_start timestamptz; v_end timestamptz; v_id uuid; v_admin record;
begin
  select id,company_id,role,active into v_actor from cali_workspace.profiles where id=auth.uid();
  if not found or not v_actor.active or v_actor.role<>'client' then raise exception 'Acesso não autorizado.'; end if;
  select * into v_event from cali_workspace.events where id=p_event_id and company_id=v_actor.company_id and visibility='client' and event_type='meeting' and cancelled_at is null for update;
  if not found or v_event.starts_at<=now() then raise exception 'Esta reunião não aceita novos pedidos de alteração.'; end if;
  if p_action not in ('cancel','reschedule') or length(btrim(coalesce(p_reason,'')))<5 then raise exception 'Informe o tipo e o motivo da alteração.'; end if;
  if exists(select 1 from cali_workspace.agenda_change_requests where event_id=p_event_id and status='pending') then raise exception 'Já existe uma alteração desta reunião em análise.'; end if;
  if p_action='reschedule' then
    if jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots)<>2 or p_slots->0->>'startsAt'=p_slots->1->>'startsAt' then raise exception 'Informe duas novas opções distintas.'; end if;
    for v_slot in select value from jsonb_array_elements(p_slots) loop
      begin v_start:=(v_slot->>'startsAt')::timestamptz; v_end:=(v_slot->>'endsAt')::timestamptz;
      exception when others then raise exception 'Revise as datas e horários.'; end;
      if v_start is null or v_end is null or v_start<cali_workspace.add_weekday_hours_v1(now(),48) or
         extract(isodow from v_start at time zone 'America/Sao_Paulo')>5 or
         (v_start at time zone 'America/Sao_Paulo')::time<time '09:00' or
         (v_end at time zone 'America/Sao_Paulo')::date<>(v_start at time zone 'America/Sao_Paulo')::date or
         (v_end at time zone 'America/Sao_Paulo')::time>time '16:00' or
         v_end-v_start<>v_event.ends_at-v_event.starts_at then raise exception 'Sugira horários úteis com 48 horas de antecedência, entre 9h e 16h, mantendo a duração da reunião.'; end if;
    end loop;
  else p_slots:='[]'::jsonb; end if;
  insert into cali_workspace.agenda_change_requests(company_id,event_id,requested_by,action,reason,slots,original_starts_at)
  values(v_actor.company_id,p_event_id,v_actor.id,p_action,btrim(p_reason),p_slots,v_event.starts_at) returning id into v_id;
  for v_admin in select id from cali_workspace.profiles where role='admin' and active loop
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    values(v_actor.company_id,v_admin.id,'scheduling_request',case when p_action='cancel' then 'Cliente pediu cancelamento de reunião' else 'Cliente pediu reagendamento de reunião' end,
      v_event.title||' · '||to_char(v_event.starts_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')||'. Motivo: '||btrim(p_reason),
      'event',p_event_id,'/admin/calendario','high',true);
  end loop;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_actor.company_id,v_actor.id,'agenda_change_requested','event',p_event_id,jsonb_build_object('change_id',v_id,'action',p_action,'reason',btrim(p_reason),'slots',p_slots));
  return jsonb_build_object('id',v_id,'status','pending');
end $$;
revoke all on function cali_workspace.client_request_agenda_change_v1(uuid,text,text,jsonb) from public,anon;
grant execute on function cali_workspace.client_request_agenda_change_v1(uuid,text,text,jsonb) to authenticated;

create or replace function cali_workspace.admin_decide_agenda_change_v1(p_change_id uuid,p_approve boolean,p_note text,p_slot_index integer default 0)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_change cali_workspace.agenda_change_requests%rowtype; v_event cali_workspace.events%rowtype; v_slot jsonb;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso não autorizado.'; end if;
  if length(btrim(coalesce(p_note,'')))<5 then raise exception 'Explique a decisão ao cliente.'; end if;
  select * into v_change from cali_workspace.agenda_change_requests where id=p_change_id for update;
  if not found or v_change.status<>'pending' then raise exception 'Este pedido já foi respondido.'; end if;
  select * into v_event from cali_workspace.events where id=v_change.event_id and company_id=v_change.company_id for update;
  if not found or v_event.cancelled_at is not null then raise exception 'A reunião não está mais ativa.'; end if;
  if p_approve then
    if v_change.action='reschedule' then
      v_slot:=v_change.slots->p_slot_index;
      if v_slot is null then raise exception 'Escolha uma das duas datas sugeridas.'; end if;
      update cali_workspace.events set starts_at=(v_slot->>'startsAt')::timestamptz,ends_at=(v_slot->>'endsAt')::timestamptz,sync_status='pending' where id=v_event.id;
    else update cali_workspace.events set cancelled_at=now() where id=v_event.id; end if;
  end if;
  update cali_workspace.agenda_change_requests set status=case when p_approve then 'approved' else 'declined' end,
    decision_note=btrim(p_note),decided_by=auth.uid(),decided_at=now(),chosen_slot=v_slot where id=p_change_id;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  values(v_change.company_id,v_change.requested_by,'scheduling_response',
    (case when p_approve then 'Alteração de reunião confirmada' else 'Alteração de reunião não confirmada' end),
    v_event.title||' · '||to_char(v_change.original_starts_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')||'. '||btrim(p_note),
    'event',v_event.id,'/cliente/cronograma','high',true);
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_change.company_id,auth.uid(),'agenda_change_decided','event',v_event.id,
    jsonb_build_object('change_id',p_change_id,'approved',p_approve,'note',btrim(p_note),'slot',v_slot));
  return jsonb_build_object('status',case when p_approve then 'approved' else 'declined' end,'event_id',v_event.id,'action',v_change.action);
end $$;
revoke all on function cali_workspace.admin_decide_agenda_change_v1(uuid,boolean,text,integer) from public,anon;
grant execute on function cali_workspace.admin_decide_agenda_change_v1(uuid,boolean,text,integer) to authenticated;

-- Meeting notes are visible only to the company of the signed-in client.
alter table cali_workspace.event_outcomes add column if not exists transcription_attachment_path text;
alter table cali_workspace.event_outcomes add column if not exists transcription_attachment_name text;
create or replace function cali_workspace.client_meeting_records_v1()
returns table(event_id uuid,outcome text,transcription_url text,transcription_note text,attachment_path text,attachment_name text)
language sql stable security definer set search_path=pg_catalog,auth,cali_workspace as $$
select e.id,o.outcome,o.transcription_url,o.transcription_note,o.transcription_attachment_path,o.transcription_attachment_name
from cali_workspace.events e join cali_workspace.event_outcomes o on o.event_id=e.id
where e.company_id=cali_workspace.current_company_id() and e.visibility='client' and e.event_type='meeting'
  and exists(select 1 from cali_workspace.profiles p where p.id=auth.uid() and p.active and p.role='client');
$$;
revoke all on function cali_workspace.client_meeting_records_v1() from public,anon;
grant execute on function cali_workspace.client_meeting_records_v1() to authenticated;

drop policy if exists meeting_transcription_admin_upload on storage.objects;
create policy meeting_transcription_admin_upload on storage.objects for insert to authenticated with check(
  bucket_id='cali-workspace-private' and split_part(name,'/',1)='meeting-transcripts' and cali_workspace.is_admin());
drop policy if exists meeting_transcription_company_read on storage.objects;
create policy meeting_transcription_company_read on storage.objects for select to authenticated using(
  bucket_id='cali-workspace-private' and split_part(name,'/',1)='meeting-transcripts' and
  (cali_workspace.is_admin() or split_part(name,'/',2)=cali_workspace.current_company_id()::text));
create or replace function cali_workspace.admin_attach_meeting_record_v1(p_event_id uuid,p_path text,p_name text)
returns void language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace,storage as $$
declare v_event cali_workspace.events%rowtype;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso não autorizado.'; end if;
  select * into v_event from cali_workspace.events where id=p_event_id and event_type='meeting';
  if not found or p_path not like 'meeting-transcripts/'||v_event.company_id::text||'/'||p_event_id::text||'/%' or
    not exists(select 1 from storage.objects where bucket_id='cali-workspace-private' and name=p_path) then raise exception 'Anexo inválido para esta reunião.'; end if;
  update cali_workspace.event_outcomes set transcription_attachment_path=p_path,transcription_attachment_name=left(btrim(p_name),240)
  where event_id=p_event_id and outcome='occurred';
  if not found then raise exception 'Registre primeiro que a reunião aconteceu.'; end if;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_event.company_id,auth.uid(),'meeting_transcript_attached','event',p_event_id,jsonb_build_object('path',p_path,'name',p_name));
end $$;
revoke all on function cali_workspace.admin_attach_meeting_record_v1(uuid,text,text) from public,anon;
grant execute on function cali_workspace.admin_attach_meeting_record_v1(uuid,text,text) to authenticated;

-- Notify each active client when a new or changed meeting transcription becomes available.
create or replace function cali_workspace.notify_meeting_transcription_v1()
returns trigger language plpgsql security definer
set search_path=pg_catalog,cali_workspace,net as $$
declare v_event record; v_client record; v_notification uuid; v_hook text;
begin
  if new.outcome<>'occurred' or (nullif(btrim(coalesce(new.transcription_url,'')),'') is null and new.transcription_attachment_path is null) then return new; end if;
  if tg_op='UPDATE' and new.transcription_url is not distinct from old.transcription_url
    and new.transcription_attachment_path is not distinct from old.transcription_attachment_path then return new; end if;
  select id,company_id,title,starts_at into v_event from cali_workspace.events
    where id=new.event_id and event_type='meeting' and visibility='client' and company_id is not null;
  if not found then return new; end if;
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key='notification_email_hook';
  for v_client in select id from cali_workspace.profiles where company_id=v_event.company_id and role='client' and active loop
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    values(v_event.company_id,v_client.id,'meeting_transcription','Transcrição da reunião disponível',
      'O registro de “'||v_event.title||'” ('||to_char(v_event.starts_at at time zone 'America/Sao_Paulo','DD/MM/YYYY')||') está disponível para conferência no histórico de reuniões.',
      'event',v_event.id,'/cliente/cronograma','normal',true) returning id into v_notification;
    if v_hook is not null then
      perform net.http_post(url:='https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/workspace-notification-email-hook',
        headers:=jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),body:=jsonb_build_object('notification_id',v_notification));
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists event_outcome_transcription_notify_v1 on cali_workspace.event_outcomes;
create trigger event_outcome_transcription_notify_v1 after insert or update of transcription_url,transcription_attachment_path
on cali_workspace.event_outcomes for each row execute function cali_workspace.notify_meeting_transcription_v1();

-- Client-initiated online meetings never consume a contractual session. CALI quotes first.
alter table cali_workspace.scheduling_requests add column if not exists online_extra_requested boolean not null default false;
alter table cali_workspace.scheduling_requests add column if not exists online_extra_quote_cents integer;
alter table cali_workspace.scheduling_requests add column if not exists online_extra_quote_accepted_at timestamptz;
create or replace function cali_workspace.enforce_online_extra_quote_v1()
returns trigger language plpgsql security definer set search_path=pg_catalog,cali_workspace as $$
begin
  if not new.online_extra_requested then return new; end if;
  new.meeting_entitlement:='extra'; new.contract_session_number:=null; new.billable_extra:=true;
  if new.status='confirmed' and (new.online_extra_quote_cents is null or new.online_extra_quote_accepted_at is null) then
    raise exception 'A reunião online extra exige orçamento informado e aceito antes da confirmação.';
  end if;
  return new;
end $$;
drop trigger if exists scheduling_online_extra_quote_guard_v1 on cali_workspace.scheduling_requests;
create trigger scheduling_online_extra_quote_guard_v1 before insert or update on cali_workspace.scheduling_requests
for each row execute function cali_workspace.enforce_online_extra_quote_v1();

create or replace function cali_workspace.client_request_online_extra_v1(p_title text,p_purpose text,p_slots jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_result jsonb; v_id uuid;
begin
  if jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots)<1 or jsonb_array_length(p_slots)>2 then raise exception 'Informe uma ou duas opções.'; end if;
  v_result:=cali_workspace.create_scheduling_request_v2('remote',p_title,p_purpose,null,p_slots,'regular',true);
  v_id:=(v_result->>'id')::uuid;
  update cali_workspace.scheduling_requests set online_extra_requested=true,meeting_entitlement='extra',contract_session_number=null,
    billable_extra=true,billing_notice='Reunião online adicional solicitada pelo cliente. A CALI informará o orçamento para aceite antes da confirmação.',
    billing_acknowledged_at=null,billing_acknowledged_by=null where id=v_id;
  return jsonb_build_object('id',v_id,'status','submitted');
end $$;
revoke all on function cali_workspace.client_request_online_extra_v1(text,text,jsonb) from public,anon;
grant execute on function cali_workspace.client_request_online_extra_v1(text,text,jsonb) to authenticated;

create or replace function cali_workspace.admin_quote_online_extra_v1(p_request_id uuid,p_amount_cents integer,p_note text)
returns void language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_req cali_workspace.scheduling_requests%rowtype;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso não autorizado.'; end if;
  if p_amount_cents<=0 or p_amount_cents>100000000 or length(btrim(coalesce(p_note,'')))<5 then raise exception 'Informe um valor e as condições do orçamento.'; end if;
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and online_extra_requested for update;
  if not found or v_req.status not in ('submitted','client_review') then raise exception 'Pedido indisponível para orçamento.'; end if;
  update cali_workspace.scheduling_requests set online_extra_quote_cents=p_amount_cents,online_extra_quote_accepted_at=null,
    billing_notice='Orçamento para reunião online extra: R$ '||to_char(p_amount_cents/100.0,'FM999G999G990D00')||'. '||btrim(p_note) where id=p_request_id;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  values(v_req.company_id,v_req.requested_by,'scheduling_response','Orçamento da sua reunião online extra',
    'A CALI informou o valor e as condições. Consulte e aceite antes da confirmação da reunião.',
    'scheduling_request',p_request_id,'/cliente/cronograma','high',true);
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'online_extra_quoted','scheduling_request',p_request_id,jsonb_build_object('amount_cents',p_amount_cents,'note',btrim(p_note)));
end $$;
revoke all on function cali_workspace.admin_quote_online_extra_v1(uuid,integer,text) from public,anon;
grant execute on function cali_workspace.admin_quote_online_extra_v1(uuid,integer,text) to authenticated;

create or replace function cali_workspace.client_accept_online_extra_quote_v1(p_request_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_req cali_workspace.scheduling_requests%rowtype;
begin
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and online_extra_requested for update;
  if not found or v_req.requested_by<>auth.uid() or v_req.online_extra_quote_cents is null or v_req.status not in ('submitted','client_review') then raise exception 'Orçamento indisponível.'; end if;
  update cali_workspace.scheduling_requests set online_extra_quote_accepted_at=now(),billing_acknowledged_at=now(),billing_acknowledged_by=auth.uid() where id=p_request_id;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'online_extra_quote_accepted','scheduling_request',p_request_id,jsonb_build_object('amount_cents',v_req.online_extra_quote_cents));
end $$;
revoke all on function cali_workspace.client_accept_online_extra_quote_v1(uuid) from public,anon;
grant execute on function cali_workspace.client_accept_online_extra_quote_v1(uuid) to authenticated;
