-- Perfil Partner — três ajustes pedidos pela proprietária em 2026-10-13, depois do teste real:
-- 1) O cliente (e a administradora) precisam ver o NOME de quem escreveu quando foi a Equipe CALI: função nova que
--    devolve só nome e foto dos perfis Partner.
-- 2) Anexo do Partner na conversa do entregável no mesmo formato da administradora e do cliente (clicável): políticas
--    novas de ENVIO e LEITURA na pasta "deliverable-chat/<empresa>/" das empresas atribuídas a ele.
-- 3) Agenda: opção por evento "Equipe CALI pode ver". Coluna nova (padrão: pode ver) e a política de leitura do Partner
--    (criada por mim em 12/10) passa a respeitar essa opção.
-- Nada da administradora nem do cliente é alterado ou apagado.

create or replace function cali_workspace.staff_identities()
returns table (id uuid, full_name text, avatar_url text, avatar_position_x numeric, avatar_position_y numeric, avatar_zoom numeric)
language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select p.id, coalesce(nullif(btrim(s.full_name), ''), p.full_name), p.avatar_url, p.avatar_position_x::numeric, p.avatar_position_y::numeric, p.avatar_zoom::numeric
  from cali_workspace.profiles p
  left join cali_workspace.staff_members s on s.user_id = p.id
  where p.role = 'partner' and auth.uid() is not null;
$$;
revoke all on function cali_workspace.staff_identities() from public, anon;
grant execute on function cali_workspace.staff_identities() to authenticated;

drop policy if exists cali_workspace_private_partner_chat_insert on storage.objects;
create policy cali_workspace_private_partner_chat_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) = 'deliverable-chat'
              and case when split_part(name, '/', 2) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                       then cali_workspace.partner_can_access(split_part(name, '/', 2)::uuid, 'projects') else false end);
drop policy if exists cali_workspace_private_partner_chat_select on storage.objects;
create policy cali_workspace_private_partner_chat_select on storage.objects for select to authenticated
  using (bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) = 'deliverable-chat'
         and case when split_part(name, '/', 2) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                  then cali_workspace.partner_can_access(split_part(name, '/', 2)::uuid, 'projects') else false end);

alter table cali_workspace.events add column if not exists staff_visible boolean not null default true;
drop policy if exists events_partner_read on cali_workspace.events;
create policy events_partner_read on cali_workspace.events for select to authenticated
  using ((select cali_workspace.is_partner()) and staff_visible and cali_workspace.partner_can_access(company_id, 'calendar'));
