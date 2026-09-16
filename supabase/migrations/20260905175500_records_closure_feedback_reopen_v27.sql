-- CALI Workspace · Registros/Solicitações V27
-- Encerramento real do chat para o cliente, solicitação de reabertura e avaliação 1–5.

create table if not exists cali_workspace.account_record_feedback (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references cali_workspace.account_records(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(record_id,user_id),
  constraint account_record_feedback_comment_check
    check (score >= 4 or length(btrim(coalesce(comment,''))) >= 3)
);

create index if not exists account_record_feedback_company_created_idx
  on cali_workspace.account_record_feedback(company_id,created_at desc);

alter table cali_workspace.account_record_feedback enable row level security;
drop policy if exists account_record_feedback_admin_select on cali_workspace.account_record_feedback;
create policy account_record_feedback_admin_select
  on cali_workspace.account_record_feedback for select to authenticated
  using (cali_workspace.is_admin());
drop policy if exists account_record_feedback_client_select on cali_workspace.account_record_feedback;
create policy account_record_feedback_client_select
  on cali_workspace.account_record_feedback for select to authenticated
  using (company_id=cali_workspace.current_company_id() and user_id=auth.uid());
grant select on cali_workspace.account_record_feedback to authenticated;

create table if not exists cali_workspace.account_record_reopen_requests (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references cali_workspace.account_records(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decision_note text
);

create unique index if not exists account_record_one_pending_reopen_idx
  on cali_workspace.account_record_reopen_requests(record_id)
  where status='pending';
create index if not exists account_record_reopen_company_requested_idx
  on cali_workspace.account_record_reopen_requests(company_id,requested_at desc);

alter table cali_workspace.account_record_reopen_requests enable row level security;
drop policy if exists account_record_reopen_admin_select on cali_workspace.account_record_reopen_requests;
create policy account_record_reopen_admin_select
  on cali_workspace.account_record_reopen_requests for select to authenticated
  using (cali_workspace.is_admin());
drop policy if exists account_record_reopen_client_select on cali_workspace.account_record_reopen_requests;
create policy account_record_reopen_client_select
  on cali_workspace.account_record_reopen_requests for select to authenticated
  using (company_id=cali_workspace.current_company_id() and requested_by=auth.uid());
grant select on cali_workspace.account_record_reopen_requests to authenticated;

create or replace function cali_workspace.submit_account_record_feedback(
  p_record_id uuid,
  p_score integer,
  p_comment text default null
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog,cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_profile cali_workspace.profiles%rowtype;
  v_record cali_workspace.account_records%rowtype;
  v_feedback_id uuid;
  v_comment text:=nullif(btrim(coalesce(p_comment,'')),'');
  v_notification_ids uuid[];
begin
  if v_user_id is null then raise exception 'Sessão não encontrada.'; end if;
  if p_score < 1 or p_score > 5 then raise exception 'A avaliação deve ser de 1 a 5.'; end if;
  if p_score <= 3 and length(btrim(coalesce(p_comment,''))) < 3 then
    raise exception 'Conte brevemente o motivo para avaliações de 1 a 3.';
  end if;

  select * into v_profile from cali_workspace.profiles where id=v_user_id and role='client' and active=true;
  if not found then raise exception 'Apenas o cliente pode registrar esta avaliação.'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if v_record.company_id is distinct from v_profile.company_id or v_record.visibility<>'client' then
    raise exception 'Solicitação não disponível para este acesso.';
  end if;
  if v_record.workflow_status<>'completed' then
    raise exception 'A avaliação fica disponível quando a solicitação é finalizada.';
  end if;

  insert into cali_workspace.account_record_feedback(record_id,company_id,user_id,score,comment)
  values(v_record.id,v_record.company_id,v_user_id,p_score,v_comment)
  on conflict (record_id,user_id) do update
    set score=excluded.score, comment=excluded.comment, created_at=now()
  returning id into v_feedback_id;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_record.company_id,v_user_id,'account_record_feedback','account_record',v_record.id,
    jsonb_build_object('score',p_score,'comment_provided',v_comment is not null));

  v_notification_ids:=cali_workspace.notify_workspace_movement(
    v_record.company_id,v_user_id,'admin','record_feedback','Avaliação recebida',
    'O cliente avaliou “' || v_record.title || '” com nota ' || p_score::text || ' de 5.',
    'account_record',v_record.id,'/admin/registros?record=' || v_record.id::text,
    case when p_score <= 3 then 'high' else 'normal' end,false
  );

  return jsonb_build_object('ok',true,'feedback_id',v_feedback_id,'record_id',v_record.id,'score',p_score,'notification_ids',to_jsonb(v_notification_ids));
end;
$$;

revoke all on function cali_workspace.submit_account_record_feedback(uuid,integer,text) from public,anon;
grant execute on function cali_workspace.submit_account_record_feedback(uuid,integer,text) to authenticated;

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
  if v_user_id is null then raise exception 'Sessão não encontrada.'; end if;
  select * into v_profile from cali_workspace.profiles where id=v_user_id and role='client' and active=true;
  if not found then raise exception 'Apenas o cliente pode solicitar reabertura.'; end if;
  select * into v_record from cali_workspace.account_records where id=p_record_id;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if v_record.company_id is distinct from v_profile.company_id or v_record.visibility<>'client' then
    raise exception 'Solicitação não disponível para este acesso.';
  end if;
  if v_record.workflow_status not in ('standby','completed','cancelled') then
    raise exception 'Esta solicitação já está aberta para conversa.';
  end if;
  if v_record.workflow_status='completed' and not exists (
    select 1 from cali_workspace.account_record_feedback f
    where f.record_id=v_record.id and f.user_id=v_user_id
  ) then
    raise exception 'Avalie esta solicitação antes de pedir a reabertura.';
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
    'Reabertura solicitada pelo cliente. O tempo já consumido permanece contabilizado e não retorna ao saldo de horas.',
    'client');

  update cali_workspace.account_records
     set requires_action=true,last_activity_at=now(),updated_at=now()
   where id=v_record.id;

  v_notification_ids:=cali_workspace.notify_workspace_movement(
    v_record.company_id,v_user_id,'admin','record_reopen_request','Solicitação de reabertura',
    'O cliente pediu a reabertura de “' || v_record.title || '”.',
    'account_record',v_record.id,'/admin/registros?record=' || v_record.id::text,'high',true
  );

  return jsonb_build_object('ok',true,'request_id',v_request_id,'record_id',v_record.id,'status','pending','notification_ids',to_jsonb(v_notification_ids));
end;
$$;

revoke all on function cali_workspace.request_account_record_reopen(uuid,text) from public,anon;
grant execute on function cali_workspace.request_account_record_reopen(uuid,text) to authenticated;

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
  if v_record.workflow_status='cancelled' then raise exception 'Esta conversa está cancelada. Solicite a reabertura para continuar.'; end if;
  if v_record.workflow_status='completed' then raise exception 'Esta conversa foi finalizada. Solicite a reabertura para continuar.'; end if;
  if v_profile.role='client' and v_record.workflow_status='standby' then
    raise exception 'Esta conversa está em stand by. Solicite a reabertura para continuar.';
  end if;

  insert into cali_workspace.account_record_messages(record_id,company_id,author_id,author_role,body,visibility)
  values(v_record.id,v_record.company_id,v_user_id,v_profile.role,btrim(p_body),case when p_internal then 'internal' else 'client' end)
  returning id into v_message_id;

  if p_internal then
    update cali_workspace.account_records set last_activity_at=now(),updated_at=now() where id=v_record.id;
    return jsonb_build_object('message_id',v_message_id,'record_id',v_record.id,'notification_ids','[]'::jsonb);
  end if;

  if v_profile.role='client' then
    v_status:=case when v_record.workflow_status='waiting_client' then 'in_progress' else coalesce(v_record.workflow_status,'open') end;
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

  if p_status='in_progress' and v_record.workflow_status in ('standby','completed','cancelled') then
    update cali_workspace.account_record_reopen_requests
       set status='approved',decided_at=now(),decided_by=v_user_id
     where record_id=p_record_id and status='pending';
  end if;

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
