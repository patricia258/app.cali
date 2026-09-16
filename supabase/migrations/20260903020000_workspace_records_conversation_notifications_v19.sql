-- CALI Workspace · Registros/Solicitações como conversa + base central de notificações

alter table cali_workspace.notifications
  add column if not exists action_url text,
  add column if not exists relevance text not null default 'normal',
  add column if not exists email_required boolean not null default false;

do $$ begin
  alter table cali_workspace.notifications
    add constraint notifications_relevance_check
    check (relevance in ('low','normal','high','critical'));
exception when duplicate_object then null; end $$;

alter table cali_workspace.account_records
  add column if not exists workflow_status text,
  add column if not exists last_activity_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

do $$ begin
  alter table cali_workspace.account_records
    add constraint account_records_workflow_status_check
    check (workflow_status is null or workflow_status in ('open','in_progress','waiting_client','standby','completed','cancelled'));
exception when duplicate_object then null; end $$;

update cali_workspace.account_records
set workflow_status = case
      when visibility='client' and source_actor='client' then 'open'
      when visibility='client' and record_type='request' then 'open'
      else workflow_status
    end,
    last_activity_at = coalesce(last_activity_at,updated_at,created_at)
where workflow_status is null or last_activity_at is null;

create table if not exists cali_workspace.account_record_messages (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references cali_workspace.account_records(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_role text not null check (author_role in ('admin','client','system')),
  body text not null check (char_length(btrim(body)) between 1 and 6000),
  visibility text not null default 'client' check (visibility in ('client','internal')),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists account_record_messages_record_created_idx
  on cali_workspace.account_record_messages(record_id,created_at);
create index if not exists account_record_messages_company_created_idx
  on cali_workspace.account_record_messages(company_id,created_at desc);

alter table cali_workspace.account_record_messages enable row level security;
drop policy if exists account_record_messages_admin_all on cali_workspace.account_record_messages;
create policy account_record_messages_admin_all
  on cali_workspace.account_record_messages for all to authenticated
  using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());

drop policy if exists account_record_messages_client_select on cali_workspace.account_record_messages;
create policy account_record_messages_client_select
  on cali_workspace.account_record_messages for select to authenticated
  using (
    company_id=cali_workspace.current_company_id()
    and visibility='client'
    and exists (
      select 1 from cali_workspace.account_records r
      where r.id=record_id
        and r.company_id=cali_workspace.current_company_id()
        and r.visibility='client'
    )
  );

drop policy if exists account_record_messages_client_insert on cali_workspace.account_record_messages;
create policy account_record_messages_client_insert
  on cali_workspace.account_record_messages for insert to authenticated
  with check (
    company_id=cali_workspace.current_company_id()
    and author_id=auth.uid()
    and author_role='client'
    and visibility='client'
    and exists (
      select 1 from cali_workspace.account_records r
      where r.id=record_id
        and r.company_id=cali_workspace.current_company_id()
        and r.visibility='client'
    )
  );

grant select,insert,update,delete on cali_workspace.account_record_messages to authenticated;

insert into cali_workspace.account_record_messages(record_id,company_id,author_id,author_role,body,visibility,created_at)
select r.id,r.company_id,r.created_by,'client',r.summary,'client',r.created_at
from cali_workspace.account_records r
where r.source_actor='client'
  and r.visibility='client'
  and nullif(btrim(coalesce(r.summary,'')),'') is not null
  and not exists (
    select 1 from cali_workspace.account_record_messages m where m.record_id=r.id
  );

create or replace function cali_workspace.notify_workspace_movement(
  p_company_id uuid,
  p_actor_id uuid,
  p_target text,
  p_notification_type text,
  p_title text,
  p_body text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_action_url text default null,
  p_relevance text default 'normal',
  p_email_required boolean default false
) returns uuid[]
language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_profile record;
  v_ids uuid[] := '{}';
  v_id uuid;
begin
  if p_target not in ('admin','client','involved') then raise exception 'Destino de notificação inválido.'; end if;
  if p_relevance not in ('low','normal','high','critical') then raise exception 'Relevância inválida.'; end if;

  for v_profile in
    select p.id,p.role
    from cali_workspace.profiles p
    where p.active=true
      and p.id is distinct from p_actor_id
      and (
        (p_target='admin' and p.role='admin')
        or (p_target='client' and p.role='client' and p.company_id=p_company_id)
        or (p_target='involved' and (p.role='admin' or (p.role='client' and p.company_id=p_company_id)))
      )
  loop
    insert into cali_workspace.notifications(
      company_id,user_id,notification_type,title,body,entity_type,entity_id,
      action_url,relevance,email_required
    ) values (
      p_company_id,v_profile.id,p_notification_type,p_title,p_body,p_entity_type,
      p_entity_id,p_action_url,p_relevance,p_email_required
    ) returning id into v_id;
    v_ids:=array_append(v_ids,v_id);
  end loop;
  return v_ids;
end;
$$;

revoke all on function cali_workspace.notify_workspace_movement(uuid,uuid,text,text,text,text,text,uuid,text,text,boolean) from public;
grant execute on function cali_workspace.notify_workspace_movement(uuid,uuid,text,text,text,text,text,uuid,text,text,boolean) to authenticated;

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
begin
  if v_user_id is null then raise exception 'Sessão não encontrada.'; end if;
  if char_length(btrim(coalesce(p_body,'')))<1 then raise exception 'Escreva uma mensagem antes de enviar.'; end if;

  select * into v_profile from cali_workspace.profiles where id=v_user_id and active=true;
  if not found then raise exception 'Perfil não disponível.'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;

  if v_profile.role='client' and (v_record.company_id is distinct from v_profile.company_id or v_record.visibility<>'client') then
    raise exception 'Registro não disponível para este acesso.';
  end if;
  if v_profile.role<>'admin' and p_internal then raise exception 'Apenas a CALI pode criar nota interna.'; end if;
  if v_record.workflow_status='cancelled' then raise exception 'Esta conversa está cancelada.'; end if;
  if v_record.workflow_status='completed' then raise exception 'Reabra a solicitação antes de responder.'; end if;

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
    v_title:='Nova mensagem do cliente';
    v_body:=coalesce(v_profile.full_name,'Cliente') || ' respondeu em “' || v_record.title || '”.';
    v_action_url:='/admin/registros?record=' || v_record.id::text;
  else
    v_status:='waiting_client';
    v_target:='client';
    v_title:='Nova resposta da Patrícia';
    v_body:='A CALI respondeu em “' || v_record.title || '”.';
    v_action_url:='/cliente/registros?record=' || v_record.id::text;
  end if;

  update cali_workspace.account_records
     set workflow_status=v_status,
         last_activity_at=now(),
         requires_action=(v_profile.role='client'),
         assigned_to=case when v_profile.role='admin' then v_user_id else assigned_to end,
         updated_at=now()
   where id=v_record.id;

  v_notification_ids:=cali_workspace.notify_workspace_movement(
    v_record.company_id,v_user_id,v_target,'record_message',v_title,v_body,
    'account_record',v_record.id,v_action_url,'high',true
  );

  return jsonb_build_object(
    'message_id',v_message_id,
    'record_id',v_record.id,
    'notification_ids',to_jsonb(v_notification_ids),
    'workflow_status',v_status
  );
end;
$$;

grant execute on function cali_workspace.post_account_record_message(uuid,text,boolean) to authenticated;

create or replace function cali_workspace.set_account_record_status(
  p_record_id uuid,
  p_status text
) returns jsonb
language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_record cali_workspace.account_records%rowtype;
  v_label text;
  v_ids uuid[];
begin
  if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode alterar o status.'; end if;
  if p_status not in ('open','in_progress','waiting_client','standby','completed','cancelled') then raise exception 'Status inválido.'; end if;

  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;

  update cali_workspace.account_records
     set workflow_status=p_status,
         requires_action=case when p_status in ('open','in_progress') then true else false end,
         assigned_to=case when p_status='in_progress' then v_user_id else assigned_to end,
         closed_at=case when p_status in ('completed','cancelled') then now() else null end,
         last_activity_at=now(),updated_at=now()
   where id=p_record_id;

  v_label:=case p_status
    when 'open' then 'Aberta'
    when 'in_progress' then 'Em andamento'
    when 'waiting_client' then 'Aguardando cliente'
    when 'standby' then 'Stand by'
    when 'completed' then 'Finalizada'
    else 'Cancelada' end;

  if v_record.visibility='client' then
    v_ids:=cali_workspace.notify_workspace_movement(
      v_record.company_id,v_user_id,'client','record_status','Atualização na sua solicitação',
      '“' || v_record.title || '” agora está como ' || v_label || '.',
      'account_record',v_record.id,'/cliente/registros?record=' || v_record.id::text,
      case when p_status in ('completed','cancelled') then 'high' else 'normal' end,
      p_status='completed'
    );
  end if;

  return jsonb_build_object('record_id',v_record.id,'workflow_status',p_status,'notification_ids',to_jsonb(coalesce(v_ids,'{}'::uuid[])));
end;
$$;

grant execute on function cali_workspace.set_account_record_status(uuid,text) to authenticated;

drop function if exists cali_workspace.client_submit_account_message(text,text);
create function cali_workspace.client_submit_account_message(p_kind text,p_message text)
returns jsonb
language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_company_id uuid;
  v_client_name text;
  v_record_id uuid;
  v_message_result jsonb;
  v_kind text;
  v_title text;
begin
  if v_user_id is null then raise exception 'Sessão não encontrada.'; end if;
  select p.company_id,coalesce(p.full_name,p.email,'Cliente') into v_company_id,v_client_name
  from cali_workspace.profiles p where p.id=v_user_id and p.role='client' and p.active=true;
  if v_company_id is null then raise exception 'Acesso cliente não vinculado a uma empresa.'; end if;
  if char_length(btrim(coalesce(p_message,'')))<2 then raise exception 'Escreva uma mensagem antes de enviar.'; end if;

  v_kind:=case lower(coalesce(p_kind,''))
    when 'context_change' then 'context_change'
    when 'occurrence' then 'occurrence'
    else 'request' end;
  v_title:=case lower(coalesce(p_kind,''))
    when 'context_change' then 'Mudança de contexto enviada pelo cliente'
    when 'occurrence' then 'Ocorrência enviada pelo cliente'
    when 'question' then 'Dúvida enviada pelo cliente'
    else 'Solicitação enviada pelo cliente' end;

  insert into cali_workspace.account_records(
    company_id,record_type,title,occurred_at,visibility,source_actor,participants,
    summary,decisions,attention_points,next_actions,impact_level,include_in_report,
    requires_action,created_by,workflow_status,last_activity_at
  ) values (
    v_company_id,v_kind,v_title,now(),'client','client',jsonb_build_array(v_client_name),
    btrim(p_message),'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'medium',false,true,
    v_user_id,'open',now()
  ) returning id into v_record_id;

  v_message_result:=cali_workspace.post_account_record_message(v_record_id,p_message,false);
  return v_message_result;
end;
$$;

grant execute on function cali_workspace.client_submit_account_message(text,text) to authenticated;

create or replace function cali_workspace.notify_event_attendee_change()
returns trigger language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_event cali_workspace.events%rowtype;
  v_label text;
begin
  select * into v_event from cali_workspace.events where id=new.event_id;
  if not found then return new; end if;
  v_label:=case new.status
    when 'accepted' then 'aceitou'
    when 'declined' then 'recusou'
    when 'tentative' then 'marcou como talvez'
    else 'ainda não respondeu ao' end;

  if tg_op='INSERT' and new.user_id is not null then
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    values(v_event.company_id,new.user_id,'calendar_invite','Novo convite de agenda',v_event.title || ' · ' || to_char(v_event.starts_at at time zone coalesce(v_event.timezone,'America/Sao_Paulo'),'DD/MM HH24:MI'),'event',v_event.id,'/cliente/cronograma','normal',false);
  elsif tg_op='UPDATE' and old.status is distinct from new.status then
    if v_event.created_by is not null and v_event.created_by is distinct from new.user_id then
      insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
      values(v_event.company_id,v_event.created_by,'calendar_response','Resposta ao convite',new.name || ' ' || v_label || ' convite “' || v_event.title || '”.','event',v_event.id,'/admin/calendario','normal',false);
    end if;
    if new.user_id is not null then
      insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
      values(v_event.company_id,new.user_id,'calendar_response','Status do convite atualizado','Sua presença em “' || v_event.title || '” está como ' || case new.status when 'accepted' then 'Aceito' when 'declined' then 'Recusado' when 'tentative' then 'Talvez' else 'Pendente' end || '.','event',v_event.id,'/cliente/cronograma','normal',false);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists event_attendees_movement_notifications on cali_workspace.event_attendees;
create trigger event_attendees_movement_notifications
after insert or update of status on cali_workspace.event_attendees
for each row execute function cali_workspace.notify_event_attendee_change();

create or replace function cali_workspace.notify_event_movement()
returns trigger language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_attendee record;
  v_title text;
  v_body text;
begin
  if old.title is not distinct from new.title
     and old.starts_at is not distinct from new.starts_at
     and old.ends_at is not distinct from new.ends_at
     and old.cancelled_at is not distinct from new.cancelled_at then return new; end if;

  if new.cancelled_at is not null and old.cancelled_at is distinct from new.cancelled_at then
    v_title:='Evento cancelado'; v_body:='“' || new.title || '” foi cancelado.';
  else
    v_title:='Evento atualizado'; v_body:='“' || new.title || '” teve uma atualização de agenda.';
  end if;

  for v_attendee in
    select distinct ea.user_id
    from cali_workspace.event_attendees ea
    where ea.event_id=new.id and ea.user_id is not null and ea.user_id is distinct from auth.uid()
  loop
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    values(new.company_id,v_attendee.user_id,'calendar_update',v_title,v_body,'event',new.id,'/cliente/cronograma',case when new.cancelled_at is not null then 'high' else 'normal' end,false);
  end loop;
  return new;
end;
$$;

drop trigger if exists events_movement_notifications on cali_workspace.events;
create trigger events_movement_notifications
after update of title,starts_at,ends_at,cancelled_at on cali_workspace.events
for each row execute function cali_workspace.notify_event_movement();
