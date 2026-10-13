-- Upgrade do entregável, fase 2: cada subtarefa com notas internas e conversa (com anexos) próprias.
-- Só acréscimo: duas tabelas novas e funções "partner_*". Nada existente é alterado.
-- Leitura do cliente NÃO é liberada aqui (fica para a fase 4, junto com a aprovação por subtarefa).

create table if not exists cali_workspace.task_notes (
  task_id uuid primary key references cali_workspace.deliverable_tasks(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  body text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table cali_workspace.task_notes enable row level security;
drop policy if exists task_notes_admin_all on cali_workspace.task_notes;
create policy task_notes_admin_all on cali_workspace.task_notes for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
grant select, insert, update, delete on cali_workspace.task_notes to authenticated;

create table if not exists cali_workspace.task_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references cali_workspace.deliverable_tasks(id) on delete cascade,
  deliverable_id uuid not null references cali_workspace.deliverables(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_role text not null check (author_role in ('admin', 'partner', 'client')),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  client_visible boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists task_messages_task_idx on cali_workspace.task_messages (task_id, created_at);
alter table cali_workspace.task_messages enable row level security;
drop policy if exists task_messages_admin_all on cali_workspace.task_messages;
create policy task_messages_admin_all on cali_workspace.task_messages for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
drop policy if exists task_messages_partner_read on cali_workspace.task_messages;
create policy task_messages_partner_read on cali_workspace.task_messages for select to authenticated using ((select cali_workspace.is_partner()) and cali_workspace.partner_can_access(company_id, 'projects'));
grant select, insert, update, delete on cali_workspace.task_messages to authenticated;

create or replace function cali_workspace.partner_task_company(p_task_id uuid)
returns uuid language plpgsql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid;
begin
  select company_id into v_company from cali_workspace.deliverable_tasks where id = p_task_id;
  if v_company is null then raise exception 'Subtarefa não encontrada.'; end if;
  if not cali_workspace.partner_can_access(v_company, 'projects') then raise exception 'Subtarefa não disponível para este acesso.' using errcode = '42501'; end if;
  return v_company;
end;
$$;

create or replace function cali_workspace.partner_get_task_notes(p_task_id uuid)
returns text language plpgsql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_body text;
begin
  perform cali_workspace.partner_task_company(p_task_id);
  select body into v_body from cali_workspace.task_notes where task_id = p_task_id;
  return v_body;
end;
$$;

create or replace function cali_workspace.partner_save_task_notes(p_task_id uuid, p_notes text)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid := cali_workspace.partner_task_company(p_task_id);
begin
  insert into cali_workspace.task_notes (task_id, company_id, body, updated_by, updated_at)
  values (p_task_id, v_company, nullif(left(coalesce(p_notes, ''), 8000), ''), auth.uid(), now())
  on conflict (task_id) do update set body = excluded.body, updated_by = excluded.updated_by, updated_at = now();
end;
$$;

create or replace function cali_workspace.partner_post_task_message(p_task_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid := cali_workspace.partner_task_company(p_task_id); v_deliverable uuid; v_title text; v_id uuid; v_name text;
begin
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'Escreva uma mensagem antes de enviar.'; end if;
  select deliverable_id, title into v_deliverable, v_title from cali_workspace.deliverable_tasks where id = p_task_id;
  insert into cali_workspace.task_messages (task_id, deliverable_id, company_id, author_user_id, author_role, body, client_visible)
  values (p_task_id, v_deliverable, v_company, auth.uid(), 'partner', left(btrim(p_body), 5000), false)
  returning id into v_id;
  select full_name into v_name from cali_workspace.staff_members where user_id = auth.uid();
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  select v_company, p.id, 'staff_task_message', coalesce(v_name, 'Equipe CALI') || ' escreveu na subtarefa “' || left(v_title, 80) || '”',
         left(regexp_replace(btrim(p_body), '\[\[arquivo\|[^\]]*\]\]', '(anexo)', 'g'), 400), 'deliverable', v_deliverable, '/admin/projetos?deliverable=' || v_deliverable::text, 'normal', false
    from cali_workspace.profiles p where p.role = 'admin' and p.active;
  return v_id;
end;
$$;

revoke all on function cali_workspace.partner_task_company(uuid) from public, anon;
revoke all on function cali_workspace.partner_get_task_notes(uuid) from public, anon;
revoke all on function cali_workspace.partner_save_task_notes(uuid, text) from public, anon;
revoke all on function cali_workspace.partner_post_task_message(uuid, text) from public, anon;
grant execute on function cali_workspace.partner_task_company(uuid) to authenticated;
grant execute on function cali_workspace.partner_get_task_notes(uuid) to authenticated;
grant execute on function cali_workspace.partner_save_task_notes(uuid, text) to authenticated;
grant execute on function cali_workspace.partner_post_task_message(uuid, text) to authenticated;
