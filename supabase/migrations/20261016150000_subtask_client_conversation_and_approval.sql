-- Subtarefa com o cliente (decisão da proprietária: o cliente aprova por partes): conversa visível ao cliente e aprovação da subtarefa.
-- Só acréscimo, exceto partner_post_task_message (criada por mim) que ganha um parâmetro.
drop policy if exists task_messages_client_read on cali_workspace.task_messages;
create policy task_messages_client_read on cali_workspace.task_messages for select to authenticated
  using (company_id = (select cali_workspace.current_company_id()) and client_visible
         and exists (select 1 from cali_workspace.deliverable_tasks t where t.id = task_messages.task_id and t.client_visible));

create or replace function cali_workspace.client_visible_task(p_task_id uuid)
returns cali_workspace.deliverable_tasks language plpgsql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_task cali_workspace.deliverable_tasks%rowtype;
begin
  select * into v_task from cali_workspace.deliverable_tasks where id = p_task_id;
  if not found or v_task.company_id is distinct from cali_workspace.current_company_id() or not v_task.client_visible or not cali_workspace.client_can_view_deliverable(v_task.deliverable_id) then
    raise exception 'Subtarefa não disponível.' using errcode = '42501';
  end if;
  return v_task;
end;
$$;

create or replace function cali_workspace.client_post_task_message(p_task_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_task cali_workspace.deliverable_tasks%rowtype := cali_workspace.client_visible_task(p_task_id); v_id uuid;
begin
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'Escreva uma mensagem antes de enviar.'; end if;
  if v_task.status in ('approved', 'done', 'cancelled') then raise exception 'Esta subtarefa já foi encerrada.'; end if;
  insert into cali_workspace.task_messages (task_id, deliverable_id, company_id, author_user_id, author_role, body, client_visible)
  values (v_task.id, v_task.deliverable_id, v_task.company_id, auth.uid(), 'client', left(btrim(p_body), 5000), true) returning id into v_id;
  return v_id;
end;
$$;

create or replace function cali_workspace.client_approve_task(p_task_id uuid)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_task cali_workspace.deliverable_tasks%rowtype := cali_workspace.client_visible_task(p_task_id);
begin
  if v_task.status <> 'client_review' then raise exception 'Esta subtarefa não está aguardando a sua aprovação.'; end if;
  update cali_workspace.deliverable_tasks set status = 'approved', completed_at = now() where id = v_task.id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_task.company_id, auth.uid(), 'client_task_approved', 'deliverable', v_task.deliverable_id, jsonb_build_object('task_id', v_task.id, 'title', v_task.title));
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  select v_task.company_id, p.id, 'client_task_approved', 'Cliente aprovou uma subtarefa', left('“' || v_task.title || '” foi aprovada pelo cliente.', 400), 'deliverable', v_task.deliverable_id, '/admin/projetos?deliverable=' || v_task.deliverable_id::text, 'high', false
    from cali_workspace.profiles p where p.role = 'admin' and p.active;
end;
$$;

drop function if exists cali_workspace.partner_post_task_message(uuid, text);
create or replace function cali_workspace.partner_post_task_message(p_task_id uuid, p_body text, p_client_visible boolean default false)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid := cali_workspace.partner_task_company(p_task_id); v_task cali_workspace.deliverable_tasks%rowtype; v_id uuid; v_name text; v_visible boolean;
begin
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'Escreva uma mensagem antes de enviar.'; end if;
  select * into v_task from cali_workspace.deliverable_tasks where id = p_task_id;
  v_visible := coalesce(p_client_visible, false);
  if v_visible and not v_task.client_visible then raise exception 'Esta subtarefa não é visível para o cliente. Use o canal interno.'; end if;
  insert into cali_workspace.task_messages (task_id, deliverable_id, company_id, author_user_id, author_role, body, client_visible)
  values (p_task_id, v_task.deliverable_id, v_company, auth.uid(), 'partner', left(btrim(p_body), 5000), v_visible)
  returning id into v_id;
  if not v_visible then
    select full_name into v_name from cali_workspace.staff_members where user_id = auth.uid();
    insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
    select v_company, p.id, 'staff_task_message', coalesce(v_name, 'Equipe CALI') || ' escreveu na subtarefa “' || left(v_task.title, 80) || '”',
           left(regexp_replace(btrim(p_body), '\[\[arquivo\|[^\]]*\]\]', '(anexo)', 'g'), 400), 'deliverable', v_task.deliverable_id, '/admin/projetos?deliverable=' || v_task.deliverable_id::text, 'normal', false
      from cali_workspace.profiles p where p.role = 'admin' and p.active;
  end if;
  return v_id;
end;
$$;

-- Avisos da conversa com o cliente: mensagem da CALI avisa o cliente; mensagem do cliente avisa a administradora.
create or replace function cali_workspace.notify_task_message()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_title text;
begin
  if not new.client_visible then return new; end if;
  select title into v_title from cali_workspace.deliverable_tasks where id = new.task_id;
  if new.author_role = 'client' then
    insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
    select new.company_id, p.id, 'client_task_message', 'Cliente escreveu na subtarefa “' || left(coalesce(v_title, ''), 80) || '”',
           left(regexp_replace(new.body, '\[\[arquivo\|[^\]]*\]\]', '(anexo)', 'g'), 400), 'deliverable', new.deliverable_id, '/admin/projetos?deliverable=' || new.deliverable_id::text, 'high', false
      from cali_workspace.profiles p where p.role = 'admin' and p.active;
  else
    perform cali_workspace.notify_workspace_movement(new.company_id, new.author_user_id, 'client', 'task_message', 'Nova mensagem da CALI',
      'A CALI escreveu em “' || coalesce(v_title, 'uma subtarefa') || '”.', 'deliverable', new.deliverable_id, '/cliente/entregaveis?deliverable=' || new.deliverable_id::text, 'high', true);
  end if;
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists task_messages_notify on cali_workspace.task_messages;
create trigger task_messages_notify after insert on cali_workspace.task_messages for each row execute function cali_workspace.notify_task_message();

revoke all on function cali_workspace.client_visible_task(uuid) from public, anon, authenticated;
revoke all on function cali_workspace.client_post_task_message(uuid, text) from public, anon;
revoke all on function cali_workspace.client_approve_task(uuid) from public, anon;
revoke all on function cali_workspace.partner_post_task_message(uuid, text, boolean) from public, anon;
grant execute on function cali_workspace.client_post_task_message(uuid, text) to authenticated;
grant execute on function cali_workspace.client_approve_task(uuid) to authenticated;
grant execute on function cali_workspace.partner_post_task_message(uuid, text, boolean) to authenticated;
