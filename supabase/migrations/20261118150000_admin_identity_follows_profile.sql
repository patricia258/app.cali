begin;
set local lock_timeout = '5s';

-- O papel administrativo pertence à identidade, não ao endereço usado para entrar.
-- A troca de e-mail continua invalidando as sessões pelo trigger do perfil.
create or replace function cali_workspace.is_admin()
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog', 'auth', 'cali_workspace'
as $$
  select cali_workspace.session_meets_mfa()
    and cali_session_guard.session_is_live()
    and exists (
      select 1
      from cali_workspace.profiles p
      join auth.users u on u.id = p.id
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.active
        and u.deleted_at is null
        and lower(btrim(p.email)) = lower(btrim(u.email))
        and lower(btrim(p.email)) = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    );
$$;

notify pgrst, 'reload schema';
commit;
