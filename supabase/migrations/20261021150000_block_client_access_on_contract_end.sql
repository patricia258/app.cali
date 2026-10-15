-- Fim de contrato: o acesso do cliente é bloqueado no banco quando a empresa fica encerrada, bloqueada ou arquivada.
-- 1) Ao mudar o status da empresa para closed/blocked/archived, todos os perfis de cliente dela ficam inativos
--    (antes dependia só da tela, que ignorava falhas).
-- 2) Um perfil de cliente não pode ficar ativo enquanto a empresa estiver nesses status. Isso fecha a brecha do login
--    por código (workspace-access), que reativava o perfil a partir de um convite ainda ativo.
-- Reativar a empresa (active/paused) continua sendo feito pela tela, que reativa os perfis.
create or replace function cali_workspace.company_access_closed(p_company_id uuid)
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select exists (select 1 from cali_workspace.companies c where c.id = p_company_id and c.status in ('closed','blocked','archived'));
$$;
revoke all on function cali_workspace.company_access_closed(uuid) from public, anon, authenticated;

create or replace function cali_workspace.companies_cut_client_access()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
begin
  if new.status in ('closed','blocked','archived') and old.status is distinct from new.status then
    update cali_workspace.profiles set active = false where company_id = new.id and role = 'client' and active;
  end if;
  return new;
end $$;
revoke all on function cali_workspace.companies_cut_client_access() from public, anon, authenticated;
drop trigger if exists companies_cut_client_access on cali_workspace.companies;
create trigger companies_cut_client_access after update of status on cali_workspace.companies
  for each row execute function cali_workspace.companies_cut_client_access();

create or replace function cali_workspace.profiles_guard_closed_company()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
begin
  if new.role = 'client' and new.active and new.company_id is not null and cali_workspace.company_access_closed(new.company_id) then
    new.active := false;
  end if;
  return new;
end $$;
revoke all on function cali_workspace.profiles_guard_closed_company() from public, anon, authenticated;
drop trigger if exists profiles_guard_closed_company on cali_workspace.profiles;
create trigger profiles_guard_closed_company before insert or update on cali_workspace.profiles
  for each row execute function cali_workspace.profiles_guard_closed_company();
