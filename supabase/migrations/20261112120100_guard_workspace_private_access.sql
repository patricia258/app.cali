begin;

create function cali_workspace.workspace_terms_access_v2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cali_session_guard.session_is_live() and exists (
    select 1 from cali_workspace.profiles p
    where p.id = (select auth.uid()) and case p.role
      when 'admin' then cali_workspace.is_admin()
      when 'partner' then cali_workspace.is_partner()
      when 'client' then true
      else false
    end
  );
$$;

create function cali_workspace.workspace_private_access_v2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cali_workspace.workspace_terms_access_v2() and exists (
    select 1
    from cali_workspace.profiles p
    join cali_v2_terms.publications t on t.is_current
    where p.id = (select auth.uid()) and case when p.role = 'partner' then exists (
      -- Partner ainda usa o recibo versionado legado.
      select 1 from cali_workspace.terms_acceptances a
      where a.user_id = p.id and a.version = t.version
    ) else exists (
      select 1 from cali_v2_terms.confirmations a
      where a.user_id = p.id and a.version = t.version and a.content_hash = t.content_hash
    ) end
  );
$$;

alter function cali_workspace.workspace_terms_access_v2() owner to postgres;
alter function cali_workspace.workspace_private_access_v2() owner to postgres;
revoke all on function cali_workspace.workspace_terms_access_v2(),
  cali_workspace.workspace_private_access_v2() from public, anon, authenticated, service_role;
grant execute on function cali_workspace.workspace_terms_access_v2(),
  cali_workspace.workspace_private_access_v2() to authenticated;

-- Inicialização da sessão lê apenas o próprio perfil antes do aceite/MFA.
create policy workspace_profiles_access_v2
  on cali_workspace.profiles as restrictive for all to authenticated
  using (
    (select cali_workspace.workspace_session_live_v2())
    and (id = (select auth.uid()) or (select cali_workspace.workspace_private_access_v2()))
  )
  with check ((select cali_workspace.workspace_private_access_v2()));

-- O aceite precisa ser possível com sessão vigente antes de liberar a operação privada.
create policy workspace_terms_acceptances_access_v2
  on cali_workspace.terms_acceptances as restrictive for all to authenticated
  using (
    (select cali_workspace.workspace_terms_access_v2())
    and (user_id = (select auth.uid()) or (select cali_workspace.workspace_private_access_v2()))
  )
  with check ((select cali_workspace.workspace_terms_access_v2()));

-- Reforça as políticas existentes sem conceder privilégios ou mudar o escopo por empresa.
do $workspace_policies$
declare
  relation record;
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'cali_workspace' and c.relkind in ('r', 'p') and not c.relrowsecurity
  ) then
    raise exception 'Há tabelas no Workspace sem RLS. Reconciliar o catálogo antes da migração.';
  end if;

  for relation in
    select n.nspname, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'cali_workspace' and c.relkind in ('r', 'p')
      and c.relname not in ('profiles', 'terms_acceptances')
    order by c.relname
  loop
    execute format(
      'create policy workspace_private_access_v2 on %I.%I as restrictive for all to authenticated
       using ((select cali_workspace.workspace_private_access_v2()))
       with check ((select cali_workspace.workspace_private_access_v2()))',
      relation.nspname, relation.relname
    );
  end loop;
end;
$workspace_policies$;

-- Estas views eram as únicas do Workspace executadas como owner no catálogo de referência.
alter view cali_workspace.account_record_interaction_metrics set (security_invoker = true);
alter view cali_workspace.account_interaction_monthly_metrics set (security_invoker = true);

-- PostgREST executa o pre-request no papel e schema selecionados pelo request.
-- A guarda também protege RPCs SECURITY DEFINER e preserva as rotas públicas.
create schema cali_api_guard authorization postgres;
revoke all on schema cali_api_guard from public;
grant usage on schema cali_api_guard to anon, authenticated, service_role;

create function cali_api_guard.workspace_pre_request_v2()
returns void
language plpgsql
security invoker
as $$
declare
  path text := pg_catalog.current_setting('request.path', true);
  method text := pg_catalog.current_setting('request.method', true);
begin
  if current_user <> 'authenticated' or pg_catalog.current_schema() is distinct from 'cali_workspace' then
    return;
  end if;

  if (path = '/profiles' and method in ('GET', 'HEAD'))
    or (path = '/terms_acceptances' and method in ('GET', 'HEAD', 'POST'))
    or path in ('/rpc/v2_read_terms_state', '/rpc/v2_accept_terms', '/rpc/workspace_session_live_v2')
  then
    if cali_workspace.workspace_session_live_v2() then return; end if;
  elsif cali_workspace.workspace_private_access_v2() then
    return;
  end if;

  raise exception using errcode = '42501', message = 'Acesso ao Workspace indisponível.';
end;
$$;

alter function cali_api_guard.workspace_pre_request_v2() owner to postgres;
revoke all on function cali_api_guard.workspace_pre_request_v2() from public, anon, authenticated, service_role;
grant execute on function cali_api_guard.workspace_pre_request_v2() to anon, authenticated, service_role;

do $rest_guard$
begin
  if exists (
    select 1
    from pg_db_role_setting s
    cross join lateral unnest(s.setconfig) setting
    where s.setrole in (0, 'authenticator'::regrole::oid)
      and s.setdatabase in (0, (select oid from pg_database where datname = current_database()))
      and (setting like 'pgrst.db_pre_request=%' or setting like 'pgrst.pre_request=%')
  ) then
    raise exception 'Já existe pre-request para a Data API. Reconciliar antes de trocar o guard.';
  end if;

  alter role authenticator set pgrst.db_pre_request = 'cali_api_guard.workspace_pre_request_v2';
end;
$rest_guard$;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
commit;
