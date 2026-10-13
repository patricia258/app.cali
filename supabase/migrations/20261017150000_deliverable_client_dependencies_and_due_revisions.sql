-- Regra oficial de complexidade, itens 4 a 6: dependências do cliente no entregável, atraso por pendência do cliente
-- e histórico das revisões de prazo com justificativa.
-- Só acréscimo: duas tabelas novas e duas funções "partner_*". Nada existente é alterado.
-- O cliente LÊ as dependências e o histórico do prazo dos entregáveis que já enxerga; nunca escreve.
-- A Equipe CALI registra dependência e recebimento; só a administradora reprograma prazo.

create table if not exists cali_workspace.deliverable_client_dependencies (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references cali_workspace.deliverables(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'received', 'cancelled')),
  received_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists deliverable_client_dependencies_deliverable_idx on cali_workspace.deliverable_client_dependencies (deliverable_id, due_date);
alter table cali_workspace.deliverable_client_dependencies enable row level security;
drop policy if exists deliverable_client_dependencies_admin_all on cali_workspace.deliverable_client_dependencies;
create policy deliverable_client_dependencies_admin_all on cali_workspace.deliverable_client_dependencies for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
drop policy if exists deliverable_client_dependencies_client_select on cali_workspace.deliverable_client_dependencies;
create policy deliverable_client_dependencies_client_select on cali_workspace.deliverable_client_dependencies for select to authenticated using (company_id = cali_workspace.current_company_id() and status <> 'cancelled' and cali_workspace.client_can_view_deliverable(deliverable_id));
drop policy if exists deliverable_client_dependencies_partner_read on cali_workspace.deliverable_client_dependencies;
create policy deliverable_client_dependencies_partner_read on cali_workspace.deliverable_client_dependencies for select to authenticated using ((select cali_workspace.is_partner()) and cali_workspace.partner_can_access(company_id, 'projects'));
grant select, insert, update, delete on cali_workspace.deliverable_client_dependencies to authenticated;

create table if not exists cali_workspace.deliverable_due_revisions (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references cali_workspace.deliverables(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  previous_due timestamptz,
  new_due timestamptz not null,
  cause text not null default 'other' check (cause in ('client_dependency', 'scope', 'internal', 'other')),
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists deliverable_due_revisions_deliverable_idx on cali_workspace.deliverable_due_revisions (deliverable_id, created_at);
alter table cali_workspace.deliverable_due_revisions enable row level security;
drop policy if exists deliverable_due_revisions_admin_all on cali_workspace.deliverable_due_revisions;
create policy deliverable_due_revisions_admin_all on cali_workspace.deliverable_due_revisions for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
drop policy if exists deliverable_due_revisions_client_select on cali_workspace.deliverable_due_revisions;
create policy deliverable_due_revisions_client_select on cali_workspace.deliverable_due_revisions for select to authenticated using (company_id = cali_workspace.current_company_id() and cali_workspace.client_can_view_deliverable(deliverable_id));
drop policy if exists deliverable_due_revisions_partner_read on cali_workspace.deliverable_due_revisions;
create policy deliverable_due_revisions_partner_read on cali_workspace.deliverable_due_revisions for select to authenticated using ((select cali_workspace.is_partner()) and cali_workspace.partner_can_access(company_id, 'projects'));
grant select, insert, update, delete on cali_workspace.deliverable_due_revisions to authenticated;

create or replace function cali_workspace.partner_add_dependency(p_deliverable_id uuid, p_title text, p_due_date date)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid; v_id uuid;
begin
  select company_id into v_company from cali_workspace.deliverables where id = p_deliverable_id;
  if v_company is null then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_company, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_title, ''))) < 1 then raise exception 'Descreva o que o cliente precisa enviar.'; end if;
  if p_due_date is null then raise exception 'Informe até quando o cliente precisa enviar.'; end if;
  insert into cali_workspace.deliverable_client_dependencies (deliverable_id, company_id, title, due_date, created_by)
  values (p_deliverable_id, v_company, left(btrim(p_title), 200), p_due_date, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function cali_workspace.partner_receive_dependency(p_dependency_id uuid)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid;
begin
  select company_id into v_company from cali_workspace.deliverable_client_dependencies where id = p_dependency_id;
  if v_company is null then raise exception 'Dependência não encontrada.'; end if;
  if not cali_workspace.partner_can_access(v_company, 'projects') then raise exception 'Dependência não disponível para este acesso.' using errcode = '42501'; end if;
  update cali_workspace.deliverable_client_dependencies set status = 'received', received_at = now() where id = p_dependency_id and status = 'pending';
end;
$$;

revoke all on function cali_workspace.partner_add_dependency(uuid, text, date) from public, anon;
revoke all on function cali_workspace.partner_receive_dependency(uuid) from public, anon;
grant execute on function cali_workspace.partner_add_dependency(uuid, text, date) to authenticated;
grant execute on function cali_workspace.partner_receive_dependency(uuid) to authenticated;
