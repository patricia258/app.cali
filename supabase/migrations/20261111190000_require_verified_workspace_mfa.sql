begin;

-- A identidade e a allowlist continuam nos predicados de papel existentes.
-- Este helper protege operações privilegiadas após a confirmação do autenticador.
create or replace function cali_workspace.session_meets_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
    and exists (
      select 1
      from auth.sessions s
      where s.user_id = auth.uid()
        and s.id::text = (auth.jwt() ->> 'session_id')
        and (s.not_after is null or s.not_after > statement_timestamp())
    )
    and exists (
      select 1
      from auth.mfa_factors f
      where f.user_id = auth.uid()
        and f.factor_type = 'totp'
        and f.status = 'verified'
    );
$$;

revoke all on function cali_workspace.session_meets_mfa() from public, anon;
grant execute on function cali_workspace.session_meets_mfa() to authenticated, service_role;

commit;
