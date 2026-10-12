-- 2026-10-11 · Quadro de Avisos (comunicados da CALI para as empresas clientes).
-- Autorizado pela proprietária na conversa ("show, manda bala!" em resposta ao plano que listava estas tabelas).
-- Tudo novo: nenhuma tabela existente é alterada. Só a administradora publica; o cliente lê os avisos da
-- própria empresa, registra a própria ciência e comenta.
create sequence if not exists cali_workspace.notice_protocol_seq;

create table if not exists cali_workspace.notices (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique default ('AV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('cali_workspace.notice_protocol_seq')::text, 4, '0')),
  category text not null default 'comunicado' check (category in ('feriado','atendimento','comunicado')),
  title text not null check (length(trim(title)) > 0),
  body text not null default '',
  notice_date date,
  time_label text,
  coverage text,
  cover_path text,
  audience text not null default 'all' check (audience in ('all','selected')),
  status text not null default 'published' check (status in ('published','archived')),
  created_by uuid default auth.uid(),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists cali_workspace.notice_targets (
  notice_id uuid not null references cali_workspace.notices(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  primary key (notice_id, company_id)
);
create table if not exists cali_workspace.notice_acknowledgements (
  notice_id uuid not null references cali_workspace.notices(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  company_id uuid references cali_workspace.companies(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);
create table if not exists cali_workspace.notice_comments (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references cali_workspace.notices(id) on delete cascade,
  company_id uuid references cali_workspace.companies(id) on delete cascade,
  author_user_id uuid not null default auth.uid(),
  author_role text not null check (author_role in ('admin','client')),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists notice_targets_company_idx on cali_workspace.notice_targets(company_id);
create index if not exists notice_comments_notice_idx on cali_workspace.notice_comments(notice_id, created_at);

alter table cali_workspace.notices enable row level security;
alter table cali_workspace.notice_targets enable row level security;
alter table cali_workspace.notice_acknowledgements enable row level security;
alter table cali_workspace.notice_comments enable row level security;

-- O cliente enxerga um aviso publicado quando ele é para todas as empresas ou a empresa dele está entre as escolhidas.
create or replace function cali_workspace.can_read_notice(p_notice_id uuid)
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace', 'auth' as $$
  select cali_workspace.is_admin() or exists (
    select 1 from cali_workspace.notices n
     where n.id = p_notice_id and n.status = 'published'
       and cali_workspace.current_company_id() is not null
       and (n.audience = 'all' or exists (select 1 from cali_workspace.notice_targets t where t.notice_id = n.id and t.company_id = cali_workspace.current_company_id()))
  );
$$;
revoke all on function cali_workspace.can_read_notice(uuid) from public;
grant execute on function cali_workspace.can_read_notice(uuid) to authenticated;

drop policy if exists notices_read on cali_workspace.notices;
drop policy if exists notices_admin_write on cali_workspace.notices;
create policy notices_read on cali_workspace.notices for select to authenticated using (cali_workspace.can_read_notice(id));
create policy notices_admin_write on cali_workspace.notices for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());

drop policy if exists notice_targets_read on cali_workspace.notice_targets;
drop policy if exists notice_targets_admin_write on cali_workspace.notice_targets;
create policy notice_targets_read on cali_workspace.notice_targets for select to authenticated using (cali_workspace.is_admin() or company_id = cali_workspace.current_company_id());
create policy notice_targets_admin_write on cali_workspace.notice_targets for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());

drop policy if exists notice_ack_read on cali_workspace.notice_acknowledgements;
drop policy if exists notice_ack_insert on cali_workspace.notice_acknowledgements;
drop policy if exists notice_ack_delete on cali_workspace.notice_acknowledgements;
create policy notice_ack_read on cali_workspace.notice_acknowledgements for select to authenticated using (cali_workspace.is_admin() or user_id = auth.uid());
create policy notice_ack_insert on cali_workspace.notice_acknowledgements for insert to authenticated with check (user_id = auth.uid() and company_id is not distinct from cali_workspace.current_company_id() and cali_workspace.can_read_notice(notice_id));
create policy notice_ack_delete on cali_workspace.notice_acknowledgements for delete to authenticated using (user_id = auth.uid());

drop policy if exists notice_comments_read on cali_workspace.notice_comments;
drop policy if exists notice_comments_insert on cali_workspace.notice_comments;
drop policy if exists notice_comments_admin_delete on cali_workspace.notice_comments;
create policy notice_comments_read on cali_workspace.notice_comments for select to authenticated using (cali_workspace.is_admin() or (company_id = cali_workspace.current_company_id() and cali_workspace.can_read_notice(notice_id)));
create policy notice_comments_insert on cali_workspace.notice_comments for insert to authenticated with check (
  author_user_id = auth.uid() and (
    (cali_workspace.is_admin() and author_role = 'admin')
    or (author_role = 'client' and company_id = cali_workspace.current_company_id() and cali_workspace.can_read_notice(notice_id))
  ));
create policy notice_comments_admin_delete on cali_workspace.notice_comments for delete to authenticated using (cali_workspace.is_admin());

grant select, insert, update, delete on cali_workspace.notices, cali_workspace.notice_targets to authenticated;
grant select, insert, delete on cali_workspace.notice_acknowledgements, cali_workspace.notice_comments to authenticated;
grant usage on sequence cali_workspace.notice_protocol_seq to authenticated;

drop trigger if exists notices_touch on cali_workspace.notices;
create trigger notices_touch before update on cali_workspace.notices for each row execute function cali_workspace.touch_updated_at();

-- Sino: avisa os usuários clientes ativos das empresas que recebem o comunicado (uma vez por aviso e usuário).
create or replace function cali_workspace.notify_notice(p_notice_id uuid)
returns integer language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace', 'auth' as $$
declare v cali_workspace.notices%rowtype; v_count integer;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso restrito ao administrador do Workspace' using errcode='42501'; end if;
  select * into v from cali_workspace.notices where id = p_notice_id and status = 'published';
  if not found then return 0; end if;
  insert into cali_workspace.notifications(company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url)
  select p.company_id, p.id, 'notice', v.title, left(v.body, 240), 'notice', v.id, '/cliente/avisos?aviso=' || v.id
    from cali_workspace.profiles p
   where p.role = 'client' and p.active and p.company_id is not null
     and (v.audience = 'all' or exists (select 1 from cali_workspace.notice_targets t where t.notice_id = v.id and t.company_id = p.company_id))
     and not exists (select 1 from cali_workspace.notifications n where n.entity_type = 'notice' and n.entity_id = v.id and n.user_id = p.id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function cali_workspace.notify_notice(uuid) from public;
grant execute on function cali_workspace.notify_notice(uuid) to authenticated;

-- Capas dos avisos: a administradora envia (política de admin já existente); qualquer usuário logado pode ver.
drop policy if exists cali_workspace_private_notice_covers_select on storage.objects;
create policy cali_workspace_private_notice_covers_select on storage.objects for select to authenticated
  using (bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) = 'notices');
