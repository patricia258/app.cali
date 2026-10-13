-- Upgrade do entregável, fase 1 (decisões da proprietária em 2026-10-13):
-- * Notas internas do entregável: tabela própria `deliverable_notes`, só administradora (o cliente lê `deliverables`,
--   por isso as notas NÃO ficam lá). O Partner lê e grava por função.
-- * O Partner cria subtarefa direto ("ele pode criar a subtarefa"), com a regra: o prazo da subtarefa não passa do
--   prazo do entregável.
-- Só acréscimo. (Uma coluna `deliverables.internal_notes`, criada e removida no mesmo dia, nunca foi usada.)
alter table cali_workspace.deliverables drop column if exists internal_notes;

create table if not exists cali_workspace.deliverable_notes (
  deliverable_id uuid primary key references cali_workspace.deliverables(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  body text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table cali_workspace.deliverable_notes enable row level security;
drop policy if exists deliverable_notes_admin_all on cali_workspace.deliverable_notes;
create policy deliverable_notes_admin_all on cali_workspace.deliverable_notes for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
grant select, insert, update, delete on cali_workspace.deliverable_notes to authenticated;

create or replace function cali_workspace.partner_get_deliverable_notes(p_deliverable_id uuid)
returns text language plpgsql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid; v_body text;
begin
  select company_id into v_company from cali_workspace.deliverables where id = p_deliverable_id;
  if v_company is null then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_company, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  select body into v_body from cali_workspace.deliverable_notes where deliverable_id = p_deliverable_id;
  return v_body;
end;
$$;

create or replace function cali_workspace.partner_save_deliverable_notes(p_deliverable_id uuid, p_notes text)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid;
begin
  select company_id into v_company from cali_workspace.deliverables where id = p_deliverable_id;
  if v_company is null then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_company, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  insert into cali_workspace.deliverable_notes (deliverable_id, company_id, body, updated_by, updated_at)
  values (p_deliverable_id, v_company, nullif(left(coalesce(p_notes, ''), 8000), ''), auth.uid(), now())
  on conflict (deliverable_id) do update set body = excluded.body, updated_by = excluded.updated_by, updated_at = now();
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_company, auth.uid(), 'deliverable_notes_saved', 'deliverable', p_deliverable_id, jsonb_build_object('staff', true));
end;
$$;

create or replace function cali_workspace.partner_create_task(p_deliverable_id uuid, p_title text, p_description text default null, p_due_at timestamptz default null, p_estimated_minutes integer default 0, p_client_visible boolean default false)
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
  insert into cali_workspace.deliverable_tasks (company_id, deliverable_id, title, description, status, due_at, client_visible, estimated_minutes, sort_order)
  values (v_row.company_id, v_row.id, left(btrim(p_title), 200), nullif(btrim(coalesce(p_description, '')), ''), 'todo', p_due_at, coalesce(p_client_visible, false), greatest(0, coalesce(p_estimated_minutes, 0)), v_order)
  returning id into v_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_row.company_id, auth.uid(), 'staff_task_created', 'deliverable', v_row.id, jsonb_build_object('task_id', v_id, 'title', left(btrim(p_title), 200)));
  return v_id;
end;
$$;

revoke all on function cali_workspace.partner_get_deliverable_notes(uuid) from public, anon;
revoke all on function cali_workspace.partner_save_deliverable_notes(uuid, text) from public, anon;
revoke all on function cali_workspace.partner_create_task(uuid, text, text, timestamptz, integer, boolean) from public, anon;
grant execute on function cali_workspace.partner_get_deliverable_notes(uuid) to authenticated;
grant execute on function cali_workspace.partner_save_deliverable_notes(uuid, text) to authenticated;
grant execute on function cali_workspace.partner_create_task(uuid, text, text, timestamptz, integer, boolean) to authenticated;
