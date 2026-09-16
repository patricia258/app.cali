-- CALI Workspace · Ocorrências/Solicitações V22
-- Edição/exclusão administrativa de mensagens + reações persistentes e realtime.

create table if not exists cali_workspace.account_record_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references cali_workspace.account_record_messages(id) on delete cascade,
  record_id uuid not null references cali_workspace.account_records(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('ok','like','question','heart','smile')),
  created_at timestamptz not null default now(),
  unique(message_id,user_id,reaction)
);

create index if not exists account_record_message_reactions_message_idx
  on cali_workspace.account_record_message_reactions(message_id,created_at);
create index if not exists account_record_message_reactions_record_idx
  on cali_workspace.account_record_message_reactions(record_id,created_at);

alter table cali_workspace.account_record_message_reactions enable row level security;

drop policy if exists account_record_message_reactions_admin_all on cali_workspace.account_record_message_reactions;
create policy account_record_message_reactions_admin_all
  on cali_workspace.account_record_message_reactions for all to authenticated
  using (cali_workspace.is_admin())
  with check (cali_workspace.is_admin());

drop policy if exists account_record_message_reactions_client_select on cali_workspace.account_record_message_reactions;
create policy account_record_message_reactions_client_select
  on cali_workspace.account_record_message_reactions for select to authenticated
  using (
    company_id=cali_workspace.current_company_id()
    and exists (
      select 1
      from cali_workspace.account_record_messages m
      join cali_workspace.account_records r on r.id=m.record_id
      where m.id=message_id
        and m.deleted_at is null
        and m.visibility='client'
        and r.company_id=cali_workspace.current_company_id()
        and r.visibility='client'
    )
  );

drop policy if exists account_record_message_reactions_client_insert on cali_workspace.account_record_message_reactions;
create policy account_record_message_reactions_client_insert
  on cali_workspace.account_record_message_reactions for insert to authenticated
  with check (
    company_id=cali_workspace.current_company_id()
    and user_id=auth.uid()
    and exists (
      select 1
      from cali_workspace.account_record_messages m
      join cali_workspace.account_records r on r.id=m.record_id
      where m.id=message_id
        and m.record_id=record_id
        and m.deleted_at is null
        and m.visibility='client'
        and r.company_id=cali_workspace.current_company_id()
        and r.visibility='client'
    )
  );

drop policy if exists account_record_message_reactions_client_delete on cali_workspace.account_record_message_reactions;
create policy account_record_message_reactions_client_delete
  on cali_workspace.account_record_message_reactions for delete to authenticated
  using (
    company_id=cali_workspace.current_company_id()
    and user_id=auth.uid()
    and exists (
      select 1
      from cali_workspace.account_record_messages m
      join cali_workspace.account_records r on r.id=m.record_id
      where m.id=message_id
        and m.deleted_at is null
        and m.visibility='client'
        and r.company_id=cali_workspace.current_company_id()
        and r.visibility='client'
    )
  );

grant select,insert,delete on cali_workspace.account_record_message_reactions to authenticated;

create or replace function cali_workspace.edit_account_record_message(
  p_message_id uuid,
  p_body text
) returns jsonb
language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_message cali_workspace.account_record_messages%rowtype;
  v_record cali_workspace.account_records%rowtype;
  v_ids uuid[];
begin
  if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode editar mensagens.'; end if;
  if char_length(btrim(coalesce(p_body,'')))<1 or char_length(btrim(coalesce(p_body,'')))>6000 then
    raise exception 'A mensagem deve ter entre 1 e 6000 caracteres.';
  end if;

  select * into v_message from cali_workspace.account_record_messages where id=p_message_id and deleted_at is null;
  if not found then raise exception 'Mensagem não encontrada.'; end if;
  if v_message.author_role<>'admin' then raise exception 'Mensagens do cliente permanecem como registro original e não podem ser editadas.'; end if;

  select * into v_record from cali_workspace.account_records where id=v_message.record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;

  update cali_workspace.account_record_messages
     set body=btrim(p_body), edited_at=now()
   where id=p_message_id;

  update cali_workspace.account_records
     set last_activity_at=now(), updated_at=now()
   where id=v_record.id;

  if v_message.visibility='client' then
    v_ids:=cali_workspace.notify_workspace_movement(
      v_record.company_id,v_user_id,'client','record_message_edited',
      'Mensagem atualizada pela Patrícia',
      'Uma mensagem em “' || v_record.title || '” foi atualizada.',
      'account_record',v_record.id,'/cliente/registros?record=' || v_record.id::text,
      'normal',false
    );
  end if;

  return jsonb_build_object('message_id',p_message_id,'record_id',v_record.id,'edited_at',now(),'notification_ids',to_jsonb(coalesce(v_ids,'{}'::uuid[])));
end;
$$;

grant execute on function cali_workspace.edit_account_record_message(uuid,text) to authenticated;

create or replace function cali_workspace.delete_account_record_message(
  p_message_id uuid
) returns jsonb
language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_message cali_workspace.account_record_messages%rowtype;
  v_record cali_workspace.account_records%rowtype;
  v_ids uuid[];
begin
  if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode excluir mensagens.'; end if;

  select * into v_message from cali_workspace.account_record_messages where id=p_message_id and deleted_at is null;
  if not found then raise exception 'Mensagem não encontrada.'; end if;
  if v_message.author_role<>'admin' then raise exception 'Mensagens do cliente permanecem como registro original e não podem ser excluídas.'; end if;

  select * into v_record from cali_workspace.account_records where id=v_message.record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;

  update cali_workspace.account_record_messages set deleted_at=now() where id=p_message_id;
  update cali_workspace.account_records set last_activity_at=now(),updated_at=now() where id=v_record.id;

  if v_message.visibility='client' then
    v_ids:=cali_workspace.notify_workspace_movement(
      v_record.company_id,v_user_id,'client','record_message_deleted',
      'Mensagem removida pela CALI',
      'Uma mensagem em “' || v_record.title || '” foi removida do histórico visível.',
      'account_record',v_record.id,'/cliente/registros?record=' || v_record.id::text,
      'normal',false
    );
  end if;

  return jsonb_build_object('message_id',p_message_id,'record_id',v_record.id,'deleted',true,'notification_ids',to_jsonb(coalesce(v_ids,'{}'::uuid[])));
end;
$$;

grant execute on function cali_workspace.delete_account_record_message(uuid) to authenticated;

create or replace function cali_workspace.toggle_account_record_message_reaction(
  p_message_id uuid,
  p_reaction text
) returns jsonb
language plpgsql security definer
set search_path=cali_workspace,public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_profile cali_workspace.profiles%rowtype;
  v_message cali_workspace.account_record_messages%rowtype;
  v_record cali_workspace.account_records%rowtype;
  v_active boolean;
  v_target text;
  v_action_url text;
  v_ids uuid[];
begin
  if v_user_id is null then raise exception 'Sessão não encontrada.'; end if;
  if p_reaction not in ('ok','like','question','heart','smile') then raise exception 'Reação inválida.'; end if;

  select * into v_profile from cali_workspace.profiles where id=v_user_id and active=true;
  if not found then raise exception 'Perfil não disponível.'; end if;

  select * into v_message from cali_workspace.account_record_messages where id=p_message_id and deleted_at is null;
  if not found then raise exception 'Mensagem não encontrada.'; end if;

  select * into v_record from cali_workspace.account_records where id=v_message.record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;

  if v_profile.role='client' and (
    v_record.company_id is distinct from v_profile.company_id
    or v_record.visibility<>'client'
    or v_message.visibility<>'client'
  ) then raise exception 'Mensagem não disponível para este acesso.'; end if;
  if v_profile.role not in ('admin','client') then raise exception 'Perfil sem permissão para reagir.'; end if;

  if exists (
    select 1 from cali_workspace.account_record_message_reactions
    where message_id=p_message_id and user_id=v_user_id and reaction=p_reaction
  ) then
    delete from cali_workspace.account_record_message_reactions
    where message_id=p_message_id and user_id=v_user_id and reaction=p_reaction;
    v_active:=false;
  else
    insert into cali_workspace.account_record_message_reactions(message_id,record_id,company_id,user_id,reaction)
    values(p_message_id,v_record.id,v_record.company_id,v_user_id,p_reaction);
    v_active:=true;
  end if;

  if v_active and v_message.visibility='client' then
    if v_profile.role='client' then
      v_target:='admin';
      v_action_url:='/admin/registros?record=' || v_record.id::text;
    else
      v_target:='client';
      v_action_url:='/cliente/registros?record=' || v_record.id::text;
    end if;
    v_ids:=cali_workspace.notify_workspace_movement(
      v_record.company_id,v_user_id,v_target,'record_message_reaction',
      case when v_profile.role='client' then 'Cliente reagiu a uma mensagem' else 'Patrícia reagiu à sua mensagem' end,
      'Há uma nova reação em “' || v_record.title || '”.',
      'account_record',v_record.id,v_action_url,'low',false
    );
  end if;

  return jsonb_build_object('message_id',p_message_id,'reaction',p_reaction,'active',v_active,'notification_ids',to_jsonb(coalesce(v_ids,'{}'::uuid[])));
end;
$$;

grant execute on function cali_workspace.toggle_account_record_message_reaction(uuid,text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='cali_workspace'
      and tablename='account_record_message_reactions'
  ) then
    alter publication supabase_realtime add table cali_workspace.account_record_message_reactions;
  end if;
end $$;
