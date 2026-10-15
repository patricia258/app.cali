-- Verificação em duas etapas (autorizada pela proprietária em 15/10/2026), garantida também no banco:
-- depois que a administradora ou um Partner cadastra o aplicativo autenticador, os poderes de administradora/Partner
-- só valem numa sessão que passou pelo segundo fator (aal2). Sem fator cadastrado, nada muda (primeiro acesso = cadastro).
-- Recuperação (celular perdido): apagar o fator da pessoa em auth.mfa_factors; ela cadastra de novo no próximo acesso.
create or replace function cali_workspace.session_meets_mfa()
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified');
$$;
revoke all on function cali_workspace.session_meets_mfa() from public, anon;
grant execute on function cali_workspace.session_meets_mfa() to authenticated, service_role;

create or replace function cali_workspace.is_admin()
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'patricia@calirh.com' and cali_workspace.session_meets_mfa();
$$;

create or replace function cali_workspace.is_partner()
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select exists (select 1 from cali_workspace.profiles p join cali_workspace.staff_members s on s.user_id = p.id
                 where p.id = auth.uid() and p.active and p.role = 'partner' and s.active)
     and cali_workspace.session_meets_mfa();
$$;
