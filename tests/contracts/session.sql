set local role authenticated;
do $sessions$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  company_b constant uuid := 'ca110000-0000-4000-8000-000000000002';
begin
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a2'),true);
  if not cali_workspace.workspace_session_live_v2() or cali_workspace.workspace_private_access_v2()
    or not exists(select 1 from cali_workspace.profiles p where p.id=auth.uid())
    or exists(select 1 from cali_workspace.companies c where c.id=company_a)
  then raise exception 'Bootstrap de termos expôs operação privada.'; end if;

  perform cali_workspace.v2_accept_terms(current_setting('qa.terms_version'),current_setting('qa.terms_hash'));
  if not cali_workspace.workspace_private_access_v2() or not exists(select 1 from cali_workspace.companies c where c.id=company_a)
    or exists(select 1 from cali_workspace.companies c where c.id=company_b)
  then raise exception 'Aceite atual ou isolamento A/B divergiu.'; end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_partner'),true);
  if cali_workspace.current_company_id() is not null or cali_workspace.can_access_company(company_b) is not false
    or not cali_workspace.partner_can_access(company_a,'records') or cali_workspace.partner_can_access(company_b,'records')
  then raise exception 'Partner herdou acesso de Cliente ou de empresa não atribuída.'; end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.session_meets_mfa() then
    raise exception 'Admin AAL2 verificado não entrou.';
  end if;
end;
$sessions$;

reset role;
update auth.sessions set factor_id=null
where id=(current_setting('qa.claims_admin')::jsonb->>'session_id')::uuid;
update cali_workspace.profiles set active=false
where id=(current_setting('qa.claims_client_a')::jsonb->>'sub')::uuid;
update cali_workspace.profiles set active=true
where id=(current_setting('qa.claims_client_a')::jsonb->>'sub')::uuid;

set local role authenticated;
do $cut$
begin
  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  if cali_workspace.session_meets_mfa() or cali_workspace.workspace_private_access_v2() then
    raise exception 'JWT herdou MFA de fator não vinculado à sua sessão.';
  end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if cali_workspace.workspace_session_live_v2() or exists(select 1 from cali_workspace.companies) then
    raise exception 'Reativação reabriu o JWT revogado.';
  end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  if not cali_workspace.workspace_private_access_v2() or
    (select array_agg(c.id) from cali_workspace.companies c)
      is distinct from array['ca110000-0000-4000-8000-000000000002']::uuid[]
  then raise exception 'Corte de A interrompeu B.'; end if;
end;
$cut$;
reset role;
