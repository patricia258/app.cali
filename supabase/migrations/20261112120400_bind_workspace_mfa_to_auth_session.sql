begin;

-- Um novo fator não concede AAL2 a um JWT de uma sessão anterior.
create or replace function cali_workspace.session_meets_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    and exists (
      select 1
      from auth.sessions s
      join auth.mfa_factors f on f.id = s.factor_id and f.user_id = s.user_id
      where s.user_id = (select auth.uid())
        and s.id::text = (select auth.jwt() ->> 'session_id')
        and s.aal = 'aal2'
        and (s.not_after is null or s.not_after > statement_timestamp())
        and f.factor_type = 'totp' and f.status = 'verified'
    );
$$;

notify pgrst, 'reload schema';
commit;
