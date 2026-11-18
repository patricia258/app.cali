set local role authenticated;
do $onboarding$
declare
  company uuid := gen_random_uuid();
  first_token uuid := gen_random_uuid();
  next_token uuid := gen_random_uuid();
  first_expiration timestamptz;
  next_expiration timestamptz;
  contact constant text := 'onboarding-contract-qa@example.test';
  review jsonb;
begin
  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  if cali_workspace.create_company_draft(company,'QA pré-cadastro',null,'Consultoria') is distinct from company then
    raise exception 'Pré-cadastro não criou a ficha solicitada.';
  end if;
  first_expiration := cali_workspace.issue_company_pre_registration(company,first_token);
  if first_expiration < clock_timestamp()+interval '6 days 23 hours'
    or cali_workspace.issue_company_pre_registration(company,first_token) is distinct from first_expiration then
    raise exception 'Prazo ou retry do primeiro link mudou.';
  end if;
  next_expiration := cali_workspace.issue_company_pre_registration(company,next_token);
  if next_expiration < first_expiration then raise exception 'Novo link herdou expiração anterior.'; end if;

  set local role anon;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  if public.cali_read_company_pre_registration(first_token) is distinct from 'missing'
    or public.cali_read_company_pre_registration(next_token) is distinct from 'open' then
    raise exception 'Reemissão não invalidou o token anterior.';
  end if;
  begin
    perform public.cali_submit_company_pre_registration(first_token,'QA pré-cadastro','QA LTDA','São Paulo','SP','Contato QA',contact);
    raise exception 'Envio aceito com link invalidado.';
  exception when insufficient_privilege then null;
  end;
  if public.cali_submit_company_pre_registration(next_token,'QA pré-cadastro','QA LTDA','São Paulo','SP','Contato QA',contact)
    is distinct from 'submitted' then raise exception 'Novo link não recebeu pré-cadastro.'; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  update cali_workspace.companies set legal_name='QA LTDA',address_city='São Paulo',address_state='SP' where id=company;
  perform cali_workspace.save_company_access_draft(company,jsonb_build_array(jsonb_build_object(
    'name','Contato QA','email',contact,'primary_contact',true,'requested',true
  )),array[]::uuid[]);
  review := cali_workspace.read_company_onboarding(company);
  if (review->>'pendingAccesses')::integer is distinct from 1 or (review->>'activeAccesses')::integer is distinct from 0 then
    raise exception 'Pré-cadastro liberou o convite automaticamente.';
  end if;
  begin
    perform cali_workspace.release_company_access(company,gen_random_uuid(),gen_random_uuid(),clock_timestamp(),review->>'reviewVersion',false);
    raise exception 'Acesso liberado sem confirmação de assinatura e adesão.';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform cali_workspace.release_company_access(company,gen_random_uuid(),gen_random_uuid(),clock_timestamp(),review->>'reviewVersion',true);
    raise exception 'Acesso liberado sem documento de contrato.';
  exception when serialization_failure then
    if sqlerrm not like '%contrato%' then raise; end if;
  end;
  review := cali_workspace.read_company_onboarding(company);
  if (review->>'pendingAccesses')::integer is distinct from 1 or (review->>'activeAccesses')::integer is distinct from 0 then
    raise exception 'Tentativa sem contrato alterou o estado do convite.';
  end if;
end;
$onboarding$;
