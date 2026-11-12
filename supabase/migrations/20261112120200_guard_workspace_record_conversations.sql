begin;

-- As RPCs de conversa registram mensagem, situação e avisos na mesma transação.
drop policy account_record_messages_client_insert on cali_workspace.account_record_messages;
drop policy account_record_messages_partner_insert on cali_workspace.account_record_messages;
drop policy account_record_message_reactions_client_insert on cali_workspace.account_record_message_reactions;
drop policy account_record_message_reactions_client_delete on cali_workspace.account_record_message_reactions;

alter policy account_record_message_reactions_client_select
  on cali_workspace.account_record_message_reactions
  using (
    company_id = (select cali_workspace.current_company_id())
    and exists (
      select 1 from cali_workspace.account_record_messages m
      where m.id = account_record_message_reactions.message_id
        and m.record_id = account_record_message_reactions.record_id
        and m.company_id = account_record_message_reactions.company_id
        and m.deleted_at is null
        and m.visibility = 'client'
    )
  );

-- Preserva os efeitos de cada RPC em um schema privado e fecha a execução direta.
alter function cali_workspace.post_account_record_message(uuid, text, boolean) set schema cali_session_guard;
alter function cali_workspace.partner_post_record_message(uuid, text, boolean) set schema cali_session_guard;
alter function cali_workspace.toggle_account_record_message_reaction(uuid, text) set schema cali_session_guard;

revoke all on function cali_session_guard.post_account_record_message(uuid, text, boolean),
  cali_session_guard.partner_post_record_message(uuid, text, boolean),
  cali_session_guard.toggle_account_record_message_reaction(uuid, text)
  from public, anon, authenticated, service_role;

create function cali_session_guard.lock_record_conversation(record_id uuid, actor_role text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Serializa postagem com encerramento ou reabertura da mesma ocorrência.
  perform 1 from cali_workspace.account_records r
  where r.id = record_id and (
    (actor_role = 'admin' and cali_workspace.is_admin())
    or (r.visibility = 'client' and case actor_role
      when 'client' then r.company_id = cali_workspace.current_company_id()
      when 'partner' then cali_workspace.partner_can_access(r.company_id, 'records')
      else false
    end)
  )
  for no key update;

  if not found then
    raise exception using errcode = '42501', message = 'Registro indisponível para este acesso.';
  end if;
end;
$$;

revoke all on function cali_session_guard.lock_record_conversation(uuid, text)
  from public, anon, authenticated, service_role;

create function cali_workspace.post_account_record_message(
  p_record_id uuid, p_body text, p_internal boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
begin
  if not cali_workspace.workspace_private_access_v2() then
    raise exception using errcode = '42501', message = 'Acesso ao Workspace indisponível.';
  end if;

  select p.role into actor_role from cali_workspace.profiles p where p.id = auth.uid();
  if actor_role = 'partner' then
    return cali_workspace.partner_post_record_message(p_record_id, p_body, p_internal);
  end if;

  perform cali_session_guard.lock_record_conversation(p_record_id, actor_role);
  return cali_session_guard.post_account_record_message(p_record_id, p_body, p_internal);
end;
$$;

create function cali_workspace.partner_post_record_message(
  p_record_id uuid, p_body text, p_internal boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_partner() then
    raise exception using errcode = '42501', message = 'Acesso ao Workspace indisponível.';
  end if;

  perform cali_session_guard.lock_record_conversation(p_record_id, 'partner');
  return cali_session_guard.partner_post_record_message(p_record_id, p_body, p_internal);
end;
$$;

create function cali_workspace.toggle_account_record_message_reaction(p_message_id uuid, p_reaction text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
  record_id uuid;
begin
  if not cali_workspace.workspace_private_access_v2() then
    raise exception using errcode = '42501', message = 'Acesso ao Workspace indisponível.';
  end if;

  select p.role into actor_role from cali_workspace.profiles p where p.id = auth.uid();
  select m.record_id into record_id
  from cali_workspace.account_record_messages m
  join cali_workspace.account_records r on r.id = m.record_id and r.company_id = m.company_id
  where m.id = p_message_id and m.deleted_at is null
    and (actor_role = 'admin' or (actor_role = 'client' and m.visibility = 'client'));

  perform cali_session_guard.lock_record_conversation(record_id, actor_role);
  return cali_session_guard.toggle_account_record_message_reaction(p_message_id, p_reaction);
end;
$$;

alter function cali_session_guard.lock_record_conversation(uuid, text) owner to postgres;
alter function cali_workspace.post_account_record_message(uuid, text, boolean) owner to postgres;
alter function cali_workspace.partner_post_record_message(uuid, text, boolean) owner to postgres;
alter function cali_workspace.toggle_account_record_message_reaction(uuid, text) owner to postgres;
revoke all on function cali_workspace.post_account_record_message(uuid, text, boolean),
  cali_workspace.partner_post_record_message(uuid, text, boolean),
  cali_workspace.toggle_account_record_message_reaction(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function cali_workspace.post_account_record_message(uuid, text, boolean),
  cali_workspace.partner_post_record_message(uuid, text, boolean),
  cali_workspace.toggle_account_record_message_reaction(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
commit;
