-- Upgrade do entregável — ajustes pedidos pela proprietária em 2026-10-13 depois de ver a fase 2:
-- * Notas viram REGISTROS (cada nota gravada com autor e hora), no entregável e na subtarefa: tabela `note_entries`.
--   As notas de campo único salvas antes (deliverable_notes / task_notes) são copiadas como primeiro registro.
-- * Subtarefa ganha complexidade e "entrega documental", como o entregável; situação selecionável (a fazer / em andamento / concluída).
-- Só acréscimo. `partner_create_task` (criada por mim neste mesmo dia) é recriada com dois parâmetros a mais.
alter table cali_workspace.deliverable_tasks add column if not exists complexity text;
alter table cali_workspace.deliverable_tasks add column if not exists is_document boolean not null default false;

create table if not exists cali_workspace.note_entries (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references cali_workspace.deliverables(id) on delete cascade,
  task_id uuid references cali_workspace.deliverable_tasks(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists note_entries_target_idx on cali_workspace.note_entries (deliverable_id, task_id, created_at desc);
alter table cali_workspace.note_entries enable row level security;
drop policy if exists note_entries_admin_all on cali_workspace.note_entries;
create policy note_entries_admin_all on cali_workspace.note_entries for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
drop policy if exists note_entries_partner_read on cali_workspace.note_entries;
create policy note_entries_partner_read on cali_workspace.note_entries for select to authenticated using ((select cali_workspace.is_partner()) and cali_workspace.partner_can_access(company_id, 'projects'));
grant select, insert, update, delete on cali_workspace.note_entries to authenticated;

insert into cali_workspace.note_entries (deliverable_id, task_id, company_id, author_user_id, author_name, body, created_at)
select n.deliverable_id, null, n.company_id, n.updated_by, coalesce(s.full_name, p.full_name), n.body, n.updated_at
  from cali_workspace.deliverable_notes n left join cali_workspace.staff_members s on s.user_id = n.updated_by left join cali_workspace.profiles p on p.id = n.updated_by
 where nullif(btrim(coalesce(n.body, '')), '') is not null
   and not exists (select 1 from cali_workspace.note_entries e where e.deliverable_id = n.deliverable_id and e.task_id is null and e.body = n.body);
insert into cali_workspace.note_entries (deliverable_id, task_id, company_id, author_user_id, author_name, body, created_at)
select t.deliverable_id, n.task_id, n.company_id, n.updated_by, coalesce(s.full_name, p.full_name), n.body, n.updated_at
  from cali_workspace.task_notes n join cali_workspace.deliverable_tasks t on t.id = n.task_id left join cali_workspace.staff_members s on s.user_id = n.updated_by left join cali_workspace.profiles p on p.id = n.updated_by
 where nullif(btrim(coalesce(n.body, '')), '') is not null
   and not exists (select 1 from cali_workspace.note_entries e where e.task_id = n.task_id and e.body = n.body);

create or replace function cali_workspace.partner_add_note(p_deliverable_id uuid, p_task_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid; v_id uuid; v_name text;
begin
  select company_id into v_company from cali_workspace.deliverables where id = p_deliverable_id;
  if v_company is null then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_company, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  if p_task_id is not null and not exists (select 1 from cali_workspace.deliverable_tasks where id = p_task_id and deliverable_id = p_deliverable_id) then raise exception 'Subtarefa não pertence a este entregável.'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'Escreva a nota antes de adicionar.'; end if;
  select full_name into v_name from cali_workspace.staff_members where user_id = auth.uid();
  insert into cali_workspace.note_entries (deliverable_id, task_id, company_id, author_user_id, author_name, body)
  values (p_deliverable_id, p_task_id, v_company, auth.uid(), coalesce(v_name, 'Equipe CALI'), left(btrim(p_body), 4000)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function cali_workspace.partner_set_task_status(p_task_id uuid, p_status text)
returns text language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
begin
  perform cali_workspace.partner_task_company(p_task_id);
  if p_status not in ('todo', 'doing', 'done') then raise exception 'Situação inválida.'; end if;
  update cali_workspace.deliverable_tasks set status = p_status, completed_at = case when p_status = 'done' then now() else null end where id = p_task_id;
  return p_status;
end;
$$;

drop function if exists cali_workspace.partner_create_task(uuid, text, text, timestamptz, integer, boolean);
create or replace function cali_workspace.partner_create_task(p_deliverable_id uuid, p_title text, p_description text default null, p_due_at timestamptz default null, p_estimated_minutes integer default 0, p_client_visible boolean default false, p_complexity text default null, p_is_document boolean default false)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_row cali_workspace.deliverables%rowtype; v_id uuid; v_order integer;
begin
  select * into v_row from cali_workspace.deliverables where id = p_deliverable_id;
  if not found then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_row.company_id, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  if v_row.status in ('approved', 'cancelled') then raise exception 'Este entregável está encerrado e não aceita novas subtarefas.'; end if;
  if char_length(btrim(coalesce(p_title, ''))) < 2 then raise exception 'Dê um título para a subtarefa.'; end if;
  if p_due_at is not null and v_row.due_at is not null and p_due_at::date > v_row.due_at::date then raise exception 'O prazo da subtarefa não pode passar do prazo do entregável (%).', to_char(v_row.due_at, 'DD/MM/YYYY'); end if;
  select coalesce(max(sort_order), 0) + 1 into v_order from cali_workspace.deliverable_tasks where deliverable_id = p_deliverable_id;
  insert into cali_workspace.deliverable_tasks (company_id, deliverable_id, title, description, status, due_at, client_visible, estimated_minutes, sort_order, complexity, is_document)
  values (v_row.company_id, v_row.id, left(btrim(p_title), 200), nullif(btrim(coalesce(p_description, '')), ''), 'todo', p_due_at, coalesce(p_client_visible, false), greatest(0, coalesce(p_estimated_minutes, 0)), v_order, nullif(btrim(coalesce(p_complexity, '')), ''), coalesce(p_is_document, false))
  returning id into v_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_row.company_id, auth.uid(), 'staff_task_created', 'deliverable', v_row.id, jsonb_build_object('task_id', v_id, 'title', left(btrim(p_title), 200)));
  return v_id;
end;
$$;

revoke all on function cali_workspace.partner_add_note(uuid, uuid, text) from public, anon;
revoke all on function cali_workspace.partner_set_task_status(uuid, text) from public, anon;
revoke all on function cali_workspace.partner_create_task(uuid, text, text, timestamptz, integer, boolean, text, boolean) from public, anon;
grant execute on function cali_workspace.partner_add_note(uuid, uuid, text) to authenticated;
grant execute on function cali_workspace.partner_set_task_status(uuid, text) to authenticated;
grant execute on function cali_workspace.partner_create_task(uuid, text, text, timestamptz, integer, boolean, text, boolean) to authenticated;
