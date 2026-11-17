begin;
set local lock_timeout = '5s';

create table cali_workspace.account_record_closures (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references cali_workspace.account_records(id) on delete cascade,
  closed_at timestamptz not null,
  superseded_at timestamptz,
  answered_at timestamptz,
  closed_unanswered_at timestamptz,
  check (answered_at is null or closed_unanswered_at is null)
);
create unique index account_record_current_closure_idx
  on cali_workspace.account_record_closures(record_id) where superseded_at is null;
create index account_record_closure_history_idx
  on cali_workspace.account_record_closures(record_id, closed_at desc, id);
alter table cali_workspace.account_record_closures enable row level security;
revoke all on cali_workspace.account_record_closures from public, anon, authenticated;
grant select on cali_workspace.account_record_closures to authenticated;
create policy account_record_closure_visible on cali_workspace.account_record_closures
  for select to authenticated using (
    (select cali_workspace.workspace_private_access_v2()) and exists (
      select 1 from cali_workspace.account_records r
      where r.id = record_id and r.visibility = 'client'
    )
  );

alter table cali_workspace.account_record_feedback
  add column closure_id uuid references cali_workspace.account_record_closures(id) on delete cascade;
alter table cali_workspace.account_record_feedback
  drop constraint account_record_feedback_record_id_user_id_key;
create unique index account_record_feedback_per_closure_idx
  on cali_workspace.account_record_feedback(closure_id);
create unique index account_record_legacy_feedback_idx
  on cali_workspace.account_record_feedback(record_id, user_id) where closure_id is null;

-- Retain old responses verbatim and associate only the latest closure that can be established.
insert into cali_workspace.account_record_closures(record_id, closed_at)
select id, coalesce(closed_at, last_activity_at, updated_at)
from cali_workspace.account_records
where workflow_status = 'completed' and visibility = 'client';

with matches as (
  select distinct on (c.id) c.id as closure_id, f.id as feedback_id
  from cali_workspace.account_record_closures c
  join cali_workspace.account_record_feedback f
    on f.record_id = c.record_id and f.created_at >= c.closed_at
  order by c.id, f.created_at, f.id
)
update cali_workspace.account_record_feedback f set closure_id = m.closure_id
from matches m where m.feedback_id = f.id;

update cali_workspace.account_record_closures c set answered_at = f.created_at
from cali_workspace.account_record_feedback f where f.closure_id = c.id;

create or replace function cali_workspace.track_account_record_closure()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.workflow_status = 'completed' and new.visibility = 'client' then
    if tg_op = 'INSERT' or old.workflow_status is distinct from 'completed' or old.visibility is distinct from 'client' then
      insert into cali_workspace.account_record_closures(record_id, closed_at)
      values (new.id, coalesce(new.closed_at, clock_timestamp()))
      on conflict (record_id) where superseded_at is null do nothing;
    end if;
  else
    update cali_workspace.account_record_closures set superseded_at = clock_timestamp()
    where record_id = new.id and superseded_at is null;
  end if;
  return new;
end;
$$;
revoke all on function cali_workspace.track_account_record_closure() from public, anon, authenticated;
create trigger track_account_record_closure
after insert or update of workflow_status, visibility on cali_workspace.account_records
for each row execute function cali_workspace.track_account_record_closure();

-- REST clients may create conversations, with workflow transitions reserved for the CALI RPCs.
create policy account_record_client_initial_state on cali_workspace.account_records
  as restrictive for insert to authenticated with check (
    (select cali_workspace.is_admin()) or (
      (workflow_status is null or workflow_status = 'open')
      and closed_at is null and assigned_to is null
      and first_admin_opened_at is null and first_admin_opened_by is null
    )
  );

create or replace function cali_workspace.submit_account_record_closure_feedback(
  p_record_id uuid, p_closure_id uuid, p_score integer, p_comment text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_company uuid := cali_workspace.current_company_id();
  v_comment text := nullif(btrim(p_comment), '');
  v_closure cali_workspace.account_record_closures%rowtype;
  v_feedback cali_workspace.account_record_feedback%rowtype;
  v_title text;
  v_ids uuid[];
begin
  if cali_workspace.workspace_private_access_v2() is not true or v_company is null
    or not exists (select 1 from cali_workspace.profiles p where p.id = v_user and p.role = 'client') then
    raise exception using errcode = '42501', message = 'Avaliação indisponível para este acesso.';
  end if;
  if p_score is null or p_score not between 1 and 5
    or (p_score <= 3 and coalesce(length(v_comment), 0) < 3)
    or length(v_comment) > 2000 then
    raise exception using errcode = '22023', message = 'Informe uma nota válida e um comentário de até 2.000 caracteres.';
  end if;

  -- Serialize with the status transition. A stale tab cannot answer a later closure.
  select r.title into v_title from cali_workspace.account_records r
  where r.id = p_record_id and r.company_id = v_company and r.visibility = 'client' for update;
  if not found then raise exception using errcode = '42501', message = 'Ocorrência indisponível.'; end if;

  select * into v_closure from cali_workspace.account_record_closures c
  where c.record_id = p_record_id
    and (
      (p_closure_id is not null and c.id = p_closure_id)
      or (p_closure_id is null and c.superseded_at is null and not exists (
        select 1 from cali_workspace.account_record_closures previous
        where previous.record_id = c.record_id and previous.superseded_at is not null
      ))
    );
  if found and v_closure.answered_at is not null then
    select * into v_feedback from cali_workspace.account_record_feedback f where f.closure_id = v_closure.id;
    return jsonb_build_object('ok',true,'feedback_id',v_feedback.id,'record_id',p_record_id,
      'closure_id',v_closure.id,'score',case when v_feedback.user_id = v_user then v_feedback.score end,
      'already_answered',true,'notification_ids','[]'::jsonb);
  end if;
  if v_closure.id is null or v_closure.superseded_at is not null or v_closure.closed_unanswered_at is not null then
    raise exception using errcode = '40001', message = 'A avaliação mudou. Atualize a ocorrência.';
  end if;

  insert into cali_workspace.account_record_feedback(record_id,company_id,user_id,score,comment,closure_id)
  values (p_record_id,v_company,v_user,p_score,v_comment,v_closure.id) returning * into v_feedback;
  update cali_workspace.account_record_closures set answered_at = v_feedback.created_at where id = v_closure.id;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values (v_company,v_user,'account_record_feedback','account_record',p_record_id,
    jsonb_build_object('closure_id',v_closure.id,'score',p_score,'comment_provided',v_comment is not null));
  v_ids := cali_workspace.notify_workspace_movement(
    v_company,v_user,'admin','record_feedback','Nova avaliação · ' || p_score::text || '/5',
    'O cliente avaliou “' || v_title || '” com nota ' || p_score::text || ' de 5.',
    'account_record',p_record_id,'/admin/registros?record=' || p_record_id::text,
    case when p_score <= 3 then 'high' else 'normal' end,true
  );

  return jsonb_build_object('ok',true,'feedback_id',v_feedback.id,'record_id',p_record_id,
    'closure_id',v_closure.id,'score',p_score,'comment',v_comment,'notification_ids',to_jsonb(v_ids));
end;
$$;

-- Preserve the legacy initial closure. Later closures require an explicit id.
create or replace function cali_workspace.submit_account_record_feedback(
  p_record_id uuid, p_score integer, p_comment text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select cali_workspace.submit_account_record_closure_feedback(p_record_id,null,p_score,p_comment);
$$;

revoke all on function cali_workspace.submit_account_record_closure_feedback(uuid,uuid,integer,text) from public, anon;
grant execute on function cali_workspace.submit_account_record_closure_feedback(uuid,uuid,integer,text) to authenticated;

create or replace function cali_workspace.request_account_record_reopen(
  p_record_id uuid,
  p_reason text default null
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog,cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_profile cali_workspace.profiles%rowtype;
  v_record cali_workspace.account_records%rowtype;
  v_request_id uuid;
  v_existing uuid;
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
  v_notification_ids uuid[];
begin
  if not cali_workspace.workspace_private_access_v2() then raise exception using errcode='42501', message='Sessão inválida.'; end if;
  if length(btrim(coalesce(p_reason,''))) < 3 then
    raise exception 'Explique brevemente por que você precisa reabrir esta solicitação.';
  end if;
  select * into v_profile from cali_workspace.profiles where id=v_user_id and role='client' and active=true;
  if not found then raise exception 'Apenas o cliente pode solicitar reabertura.'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if v_record.company_id is distinct from v_profile.company_id or v_record.visibility<>'client' then
    raise exception 'Solicitação não disponível para este acesso.';
  end if;
  if v_record.workflow_status is null or v_record.workflow_status not in ('standby','completed','cancelled') then
    raise exception 'Esta solicitação já está aberta para conversa.';
  end if;
  select id into v_existing
  from cali_workspace.account_record_reopen_requests
  where record_id=v_record.id and status='pending'
  order by requested_at desc limit 1;
  if v_existing is not null then
    return jsonb_build_object('ok',true,'request_id',v_existing,'record_id',v_record.id,'status','pending','already_pending',true);
  end if;

  insert into cali_workspace.account_record_reopen_requests(record_id,company_id,requested_by,reason)
  values(v_record.id,v_record.company_id,v_user_id,v_reason)
  returning id into v_request_id;

  insert into cali_workspace.account_record_messages(record_id,company_id,author_id,author_role,body,visibility)
  values(v_record.id,v_record.company_id,null,'system',
    'Reabertura solicitada pelo cliente. Motivo: ' || v_reason || ' O tempo já consumido permanece contabilizado e não retorna ao saldo de horas.',
    'client');

  update cali_workspace.account_records
     set requires_action=true,last_activity_at=now(),updated_at=now()
   where id=v_record.id;

  v_notification_ids:=cali_workspace.notify_workspace_movement(
    v_record.company_id,v_user_id,'admin','record_reopen_request','Solicitação de reabertura',
    'O cliente pediu a reabertura de “' || v_record.title || '”. Motivo: “' || v_reason || '”.',
    'account_record',v_record.id,'/admin/registros?record=' || v_record.id::text,'high',true
  );

  return jsonb_build_object('ok',true,'request_id',v_request_id,'record_id',v_record.id,'status','pending','reason',v_reason,'notification_ids',to_jsonb(v_notification_ids));
end;
$$;

revoke all on function cali_workspace.request_account_record_reopen(uuid,text) from public,anon;
grant execute on function cali_workspace.request_account_record_reopen(uuid,text) to authenticated;

create or replace function cali_workspace.close_account_record_feedback_request(p_closure_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if cali_workspace.workspace_private_access_v2() is not true or cali_workspace.is_admin() is not true then
    raise exception using errcode = '42501', message = 'Operação indisponível.';
  end if;
  perform 1 from cali_workspace.account_records r
  join cali_workspace.account_record_closures c on c.record_id = r.id
  where c.id = p_closure_id and r.visibility = 'client' for update of r;
  if not found then raise exception using errcode = '42501', message = 'Avaliação indisponível.'; end if;
  if exists (select 1 from cali_workspace.account_record_closures c where c.id = p_closure_id and c.closed_unanswered_at is not null) then
    return;
  end if;
  update cali_workspace.account_record_closures set closed_unanswered_at = clock_timestamp()
  where id = p_closure_id and answered_at is null and superseded_at is null;
  if not found then raise exception using errcode = '40001', message = 'A avaliação mudou. Atualize a lista.'; end if;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  select r.company_id,auth.uid(),'satisfaction_closed_unanswered','account_record',r.id,
    jsonb_build_object('closure_id',p_closure_id)
  from cali_workspace.account_record_closures c join cali_workspace.account_records r on r.id = c.record_id
  where c.id = p_closure_id;
end;
$$;
revoke all on function cali_workspace.close_account_record_feedback_request(uuid) from public, anon;
grant execute on function cali_workspace.close_account_record_feedback_request(uuid) to authenticated;

CREATE OR REPLACE FUNCTION cali_workspace.get_admin_satisfaction_responses_v39() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'cali_workspace', 'public'
    AS $$
declare
  v_rows jsonb;
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_admin() then
    raise exception 'Apenas a CALI pode acessar este painel.';
  end if;

  with feedback as (
    select f.id,f.company_id,f.user_id,f.score::integer as score,f.comment,f.created_at,coalesce(rc.closed_at,f.created_at) as cohort_at,
           'record'::text as source_type,f.record_id as entity_id,r.protocol,r.title,
           c.display_name as company_name,c.logo_workspace_url,c.logo_url,
           p.full_name as responder_name,p.avatar_url as responder_avatar
      from cali_workspace.account_record_feedback f
      join cali_workspace.account_records r on r.id=f.record_id
      left join cali_workspace.account_record_closures rc on rc.id=f.closure_id
      join cali_workspace.companies c on c.id=f.company_id
      left join cali_workspace.profiles p on p.id=f.user_id
    union all
    select n.id,n.company_id,n.user_id,n.score::integer,n.comment,n.created_at,n.created_at,
           'deliverable'::text,n.deliverable_id,d.protocol,d.title,
           c.display_name,c.logo_workspace_url,c.logo_url,
           p.full_name,p.avatar_url
      from cali_workspace.nps_responses n
      left join cali_workspace.deliverables d on d.id=n.deliverable_id
      join cali_workspace.companies c on c.id=n.company_id
      left join cali_workspace.profiles p on p.id=n.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,
    'companyId',company_id,
    'company',company_name,
    'companyLogoWorkspace',logo_workspace_url,
    'companyLogoOriginal',logo_url,
    'responderName',responder_name,
    'responderAvatar',responder_avatar,
    'score',score,
    'comment',comment,
    'createdAt',created_at,
    'cohortAt',cohort_at,
    'sourceType',source_type,
    'entityId',entity_id,
    'protocol',protocol,
    'title',title
  ) order by created_at desc),'[]'::jsonb)
    into v_rows
    from feedback;

  return v_rows;
end;
$$;

notify pgrst, 'reload schema';
commit;
