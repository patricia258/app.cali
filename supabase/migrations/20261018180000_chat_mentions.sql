-- Menção com @ nas conversas (decisão da proprietária em 2026-10-13): quem é mencionado recebe aviso destacado no sino
-- E e-mail. É a única mensagem de conversa que gera e-mail.
-- Só acréscimo: três funções e três gatilhos novos. Nenhuma função ou gatilho existente muda.
-- A menção é o texto "@Nome Completo" dentro da mensagem; o banco reconhece o nome entre as pessoas daquela conversa.
-- Todo gatilho engole o próprio erro: uma menção que falha nunca impede a mensagem de ser gravada.

-- Quem pode ser mencionado por quem está logado (alimenta a lista que aparece ao digitar @).
create or replace function cali_workspace.mention_candidates()
returns table (id uuid, full_name text, label text)
language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  with me as (select p.id, p.role, p.company_id from cali_workspace.profiles p where p.id = auth.uid() and p.active),
  mine as (select a.company_id from cali_workspace.staff_members s join cali_workspace.staff_company_assignments a on a.staff_id = s.id where s.user_id = auth.uid() and s.active)
  select p.id, btrim(p.full_name), 'CALI'::text from cali_workspace.profiles p, me
   where p.role = 'admin' and p.active and p.id <> me.id and coalesce(btrim(p.full_name), '') <> ''
  union
  select s.user_id, btrim(s.full_name), 'Equipe CALI'::text from cali_workspace.staff_members s, me
   where s.active and s.user_id is not null and s.user_id <> me.id and coalesce(btrim(s.full_name), '') <> ''
     and (me.role in ('admin', 'partner') or exists (select 1 from cali_workspace.staff_company_assignments a where a.staff_id = s.id and a.company_id = me.company_id))
  union
  select p.id, btrim(p.full_name), c.display_name from cali_workspace.profiles p join cali_workspace.companies c on c.id = p.company_id, me
   where p.role = 'client' and p.active and p.id <> me.id and coalesce(btrim(p.full_name), '') <> ''
     and (me.role = 'admin' or (me.role = 'client' and p.company_id = me.company_id) or (me.role = 'partner' and p.company_id in (select company_id from mine)));
$$;
revoke all on function cali_workspace.mention_candidates() from public, anon;
grant execute on function cali_workspace.mention_candidates() to authenticated;

-- Avisa cada pessoa da conversa cujo nome aparece depois de um @ na mensagem.
create or replace function cali_workspace.notify_chat_mentions(p_company_id uuid, p_author_id uuid, p_body text, p_client_visible boolean, p_entity_type text, p_entity_id uuid, p_context text, p_admin_url text, p_client_url text, p_staff_url text)
returns integer language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_person record; v_author text; v_count integer := 0; v_text text := regexp_replace(coalesce(p_body, ''), '\[\[arquivo\|[^\]]*\]\]', '(anexo)', 'g');
begin
  if position('@' in v_text) = 0 then return 0; end if;
  select coalesce((select btrim(s.full_name) from cali_workspace.staff_members s where s.user_id = p_author_id), (select btrim(p.full_name) from cali_workspace.profiles p where p.id = p_author_id), 'Alguém') into v_author;
  for v_person in
    select p.id, btrim(p.full_name) as full_name, 'admin'::text as kind from cali_workspace.profiles p where p.role = 'admin' and p.active
    union
    select s.user_id, btrim(s.full_name), 'partner' from cali_workspace.staff_members s join cali_workspace.staff_company_assignments a on a.staff_id = s.id
     where s.active and s.user_id is not null and a.company_id = p_company_id
    union
    select p.id, btrim(p.full_name), 'client' from cali_workspace.profiles p where p.role = 'client' and p.active and p.company_id = p_company_id and coalesce(p_client_visible, false)
  loop
    if v_person.id is distinct from p_author_id and char_length(coalesce(v_person.full_name, '')) >= 2 and position(lower('@' || v_person.full_name) in lower(v_text)) > 0 then
      insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
      values (p_company_id, v_person.id, 'chat_mention', v_author || ' mencionou você', left(coalesce(nullif(p_context, '') || ': ', '') || v_text, 420), p_entity_type, p_entity_id,
              case v_person.kind when 'admin' then p_admin_url when 'partner' then p_staff_url else p_client_url end, 'critical', true);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function cali_workspace.notify_chat_mentions(uuid, uuid, text, boolean, text, uuid, text, text, text, text) from public, anon, authenticated;

create or replace function cali_workspace.chat_mentions_trigger()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_title text;
begin
  if tg_table_name = 'account_record_messages' then
    if new.deleted_at is not null then return new; end if;
    select title into v_title from cali_workspace.account_records where id = new.record_id;
    perform cali_workspace.notify_chat_mentions(new.company_id, new.author_id, new.body, new.visibility = 'client', 'account_record', new.record_id, v_title,
      '/admin/registros?record=' || new.record_id::text, '/cliente/registros?record=' || new.record_id::text, '/equipe/ocorrencias');
  elsif tg_table_name = 'comments' then
    if new.target_type <> 'deliverable' then return new; end if;
    select title into v_title from cali_workspace.deliverables where id = new.target_id;
    perform cali_workspace.notify_chat_mentions(new.company_id, new.author_user_id, new.body, coalesce(new.client_visible, false), 'deliverable', new.target_id, v_title,
      '/admin/projetos?deliverable=' || new.target_id::text, '/cliente/entregaveis?deliverable=' || new.target_id::text, '/equipe/projetos');
  elsif tg_table_name = 'task_messages' then
    select title into v_title from cali_workspace.deliverable_tasks where id = new.task_id;
    perform cali_workspace.notify_chat_mentions(new.company_id, new.author_user_id, new.body, coalesce(new.client_visible, false), 'deliverable', new.deliverable_id, v_title,
      '/admin/projetos?deliverable=' || new.deliverable_id::text, '/cliente/entregaveis?deliverable=' || new.deliverable_id::text, '/equipe/projetos');
  end if;
  return new;
exception when others then return new;
end;
$$;
revoke all on function cali_workspace.chat_mentions_trigger() from public, anon, authenticated;

drop trigger if exists account_record_messages_mentions on cali_workspace.account_record_messages;
create trigger account_record_messages_mentions after insert on cali_workspace.account_record_messages for each row execute function cali_workspace.chat_mentions_trigger();
drop trigger if exists comments_mentions on cali_workspace.comments;
create trigger comments_mentions after insert on cali_workspace.comments for each row execute function cali_workspace.chat_mentions_trigger();
drop trigger if exists task_messages_mentions on cali_workspace.task_messages;
create trigger task_messages_mentions after insert on cali_workspace.task_messages for each row execute function cali_workspace.chat_mentions_trigger();
