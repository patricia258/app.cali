-- Autocontido: executar como cali_restore_admin, por socket, com cron desativado.
-- Identidades sintéticas; todas as inserções e alterações terminam em ROLLBACK.
begin;

do $isolated$
begin
  if current_user <> 'cali_restore_admin' or inet_server_addr() is not null
    or current_setting('cron.launch_active_jobs', true) is distinct from 'off'
  then raise exception 'Contrato de identidade exige PostgreSQL local isolado e cron desativado.'; end if;
end;
$isolated$;

create temporary table admin_identity_actors (
  kind text primary key,
  id uuid not null default gen_random_uuid(),
  email text not null,
  role text not null,
  session_id uuid not null default gen_random_uuid(),
  factor_id uuid not null default gen_random_uuid()
) on commit drop;

insert into admin_identity_actors(kind, email, role)
select kind, kind || '-' || gen_random_uuid()::text || '@example.test', role
from (values ('primary', 'admin'), ('other', 'admin'), ('client', 'client'), ('partner', 'partner')) actors(kind, role);

do $fixture$
declare
  actor record;
  company uuid := gen_random_uuid();
  proof uuid;
  terms_version text;
  terms_hash text;
  contract uuid := gen_random_uuid();
  contract_version timestamptz;
  review_version text;
begin
  select version, content_hash into strict terms_version, terms_hash
  from cali_v2_terms.publications where is_current;

  insert into cali_workspace.companies(id, legal_name, display_name, status, address_city, address_state, service_type)
  values(company, 'Contrato local de identidade', 'Contrato local de identidade', 'active', 'São Paulo', 'SP', 'CALI Partner');
  insert into auth.users(id, aud, role, email, email_confirmed_at, created_at, updated_at)
  select id, 'authenticated', 'authenticated', email, clock_timestamp(), clock_timestamp(), clock_timestamp()
  from admin_identity_actors;
  insert into cali_workspace.client_invites(company_id, email, full_name, active, platform_access)
  select company, email, 'Cliente sintético', false, true from admin_identity_actors where kind = 'client';
  insert into cali_workspace.profiles(id, company_id, email, full_name, role, active)
  select id, case when kind = 'client' then company end, email, 'Identidade sintética ' || kind, role, true
  from admin_identity_actors where kind <> 'client';
  insert into cali_workspace.staff_members(email, full_name, user_id, active)
  select email, 'Partner sintético', id, true from admin_identity_actors where kind = 'partner';

  insert into storage.objects(bucket_id, name)
  values('cali-workspace-private', company::text || '/account/admin-identity-contract.txt');
  insert into cali_workspace.account_documents(id, company_id, document_type, title, document_date, storage_path)
  values(contract, company, 'contract', 'Contrato sintético de identidade', current_date,
    company::text || '/account/admin-identity-contract.txt') returning updated_at into contract_version;

  for actor in select * from admin_identity_actors order by kind = 'client', kind loop
    if actor.kind = 'client' then
      -- A fixture respeita a liberação real; nenhum trigger/RLS é desativado.
      perform set_config('request.jwt.claims', current_setting('qa.admin_identity_primary'), true);
      review_version := cali_workspace.company_access_review_version(company);
      set local role authenticated;
      perform cali_workspace.release_company_access(company, gen_random_uuid(), contract, contract_version, review_version, true);
      reset role;
      insert into cali_workspace.profiles(id, company_id, email, full_name, role, active)
      values(actor.id, company, actor.email, 'Cliente sintético', 'client', true);
    end if;
    insert into auth.mfa_factors(id, user_id, factor_type, status, created_at, updated_at)
    values(actor.factor_id, actor.id, 'totp', 'verified', clock_timestamp(), clock_timestamp());
    proof := cali_session_guard.authorize_code(actor.id, clock_timestamp());
    if proof is null then raise exception 'Fixture % não recebeu autorização real de admissão.', actor.kind; end if;
    insert into auth.sessions(id, user_id, factor_id, aal, created_at, updated_at)
    values(actor.session_id, actor.id, actor.factor_id, 'aal2', clock_timestamp(), clock_timestamp());
    if not cali_workspace.admit_workspace_session_v2(proof, actor.session_id) then
      raise exception 'Fixture % não passou pela admissão real.', actor.kind;
    end if;
    insert into cali_workspace.terms_acceptances(user_id, version) values(actor.id, terms_version);
    if actor.kind <> 'partner' then
      insert into cali_v2_terms.confirmations(user_id, version, content_hash)
      values(actor.id, terms_version, terms_hash);
    end if;
    perform set_config('qa.admin_identity_' || actor.kind,
      jsonb_build_object('sub', actor.id, 'session_id', actor.session_id, 'email', actor.email,
        'role', 'authenticated', 'aal', 'aal2')::text, true);
  end loop;
end;
$fixture$;

set local role authenticated;
do $before$
declare scenario record;
begin
  for scenario in select * from (values ('primary', true), ('other', true), ('client', false), ('partner', false)) cases(kind, expected) loop
    perform set_config('request.jwt.claims', current_setting('qa.admin_identity_' || scenario.kind), true);
    if not cali_workspace.workspace_session_live_v2() or not cali_workspace.session_meets_mfa() then
      raise exception 'Pré-condições reais de sessão/MFA ausentes para %.', scenario.kind;
    end if;
    if cali_workspace.is_admin() is distinct from scenario.expected then
      raise exception 'Papel administrativo divergente antes da troca: %.', scenario.kind;
    end if;
  end loop;
  perform set_config('request.jwt.claims', current_setting('qa.admin_identity_primary'), true);
  if not cali_workspace.workspace_private_access_v2() then raise exception 'Admin antes da troca sem acesso privado.'; end if;
  perform set_config('request.jwt.claims', jsonb_set(current_setting('qa.admin_identity_primary')::jsonb, '{aal}', '"aal1"')::text, true);
  if cali_workspace.is_admin() then raise exception 'AAL1 foi aceito como Admin.'; end if;
  perform set_config('request.jwt.claims', jsonb_set(current_setting('qa.admin_identity_primary')::jsonb, '{email}', '"divergente@example.test"')::text, true);
  if cali_workspace.is_admin() then raise exception 'JWT com e-mail divergente foi aceito como Admin.'; end if;
end;
$before$;

do $no_escalation$
declare actor text; affected integer; rejected boolean;
begin
  foreach actor in array array['client', 'partner'] loop
    perform set_config('request.jwt.claims', current_setting('qa.admin_identity_' || actor), true);
    if not cali_workspace.workspace_private_access_v2() then
      raise exception 'Controle positivo sem acesso privado: %.', actor;
    end if;
    rejected := false;
    begin
      update cali_workspace.profiles set role = 'admin', active = true where id = auth.uid();
      get diagnostics affected = row_count;
      if affected <> 0 then raise exception 'Escalada administrativa por UPDATE direto: %.', actor; end if;
    exception when insufficient_privilege then rejected := true;
    end;
    if cali_workspace.is_admin() then raise exception 'Ator foi promovido após tentativa de UPDATE: %.', actor; end if;
    rejected := false;
    begin
      perform cali_workspace.v2_update_own_profile('{"role":"client","active":true}'::jsonb, '{"role":"admin","active":true}'::jsonb);
    exception when invalid_parameter_value or insufficient_privilege then rejected := true;
    end;
    if not rejected then raise exception 'RPC própria aceitou role/active: %.', actor; end if;
  end loop;
end;
$no_escalation$;
reset role;

do $no_escalation_new_login$
declare actor record; proof uuid; new_session uuid;
begin
  for actor in select * from admin_identity_actors where kind in ('client', 'partner') loop
    if (select role from cali_workspace.profiles where id = actor.id) is distinct from actor.role then
      raise exception 'Papel persistido mudou após tentativa de escalada: %.', actor.kind;
    end if;
    proof := cali_session_guard.authorize_code(actor.id, clock_timestamp());
    new_session := gen_random_uuid();
    insert into auth.sessions(id, user_id, factor_id, aal, created_at, updated_at)
    values(new_session, actor.id, actor.factor_id, 'aal2', clock_timestamp(), clock_timestamp());
    if proof is null or not cali_workspace.admit_workspace_session_v2(proof, new_session) then
      raise exception 'Controle de novo login não admitiu %.', actor.kind;
    end if;
    perform set_config('request.jwt.claims', jsonb_build_object('sub', actor.id, 'session_id', new_session,
      'email', actor.email, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    set local role authenticated;
    if not cali_workspace.workspace_session_live_v2() or not cali_workspace.session_meets_mfa() or cali_workspace.is_admin() then
      raise exception 'Novo login após tentativa de escalada não manteve papel: %.', actor.kind;
    end if;
    reset role;
  end loop;
end;
$no_escalation_new_login$;

do $email_change$
declare
  actor admin_identity_actors;
  new_email text := 'changed-' || gen_random_uuid()::text || '@example.test';
  new_session uuid := gen_random_uuid();
  proof uuid;
  factor_before jsonb;
  other_before jsonb;
begin
  select * into strict actor from admin_identity_actors where kind = 'primary';
  select to_jsonb(f) into strict factor_before from auth.mfa_factors f where id = actor.factor_id;
  select to_jsonb(p) into strict other_before from cali_workspace.profiles p
  where p.id = (select id from admin_identity_actors where kind = 'other');
  perform set_config('qa.admin_identity_factor_before', factor_before::text, true);
  perform set_config('qa.admin_identity_other_before', other_before::text, true);

  update auth.users set email = new_email, updated_at = clock_timestamp() where id = actor.id;
  update cali_workspace.profiles set email = new_email where id = actor.id;
  if not exists (select 1 from cali_session_guard.profile_cutoffs where user_id = actor.id) then
    raise exception 'Troca de e-mail não acionou o trigger real de revogação.';
  end if;
  if not cali_workspace.workspace_login_eligible_v2(actor.id) then
    raise exception 'Mesmo UUID perdeu elegibilidade após troca de e-mail.';
  end if;

  perform set_config('qa.admin_identity_old_session_new_email',
    jsonb_set(current_setting('qa.admin_identity_primary')::jsonb, '{email}', to_jsonb(new_email))::text, true);
  insert into auth.sessions(id, user_id, factor_id, aal, created_at, updated_at)
  values(new_session, actor.id, actor.factor_id, 'aal2', clock_timestamp(), clock_timestamp());
  perform set_config('qa.admin_identity_new_unadmitted',
    jsonb_build_object('sub', actor.id, 'session_id', new_session, 'email', new_email, 'role', 'authenticated', 'aal', 'aal2')::text, true);
end;
$email_change$;

set local role authenticated;
do $revocation$
declare scenario text;
begin
  foreach scenario in array array['primary', 'old_session_new_email', 'new_unadmitted'] loop
    perform set_config('request.jwt.claims', current_setting('qa.admin_identity_' || scenario), true);
    if cali_workspace.workspace_session_live_v2() or cali_workspace.is_admin() or cali_workspace.workspace_private_access_v2() then
      raise exception 'Sessão antiga ou ainda sem admissão recebeu acesso: %.', scenario;
    end if;
  end loop;
  perform set_config('request.jwt.claims', current_setting('qa.admin_identity_other'), true);
  if not cali_workspace.is_admin() or not cali_workspace.workspace_private_access_v2() then
    raise exception 'Troca de e-mail de outro ator interrompeu a segunda Admin.';
  end if;
end;
$revocation$;
reset role;

do $new_login$
declare actor admin_identity_actors; proof uuid; admitted_session uuid := gen_random_uuid(); new_email text;
begin
  select * into strict actor from admin_identity_actors where kind = 'primary';
  select email into strict new_email from auth.users where id = actor.id;
  proof := cali_session_guard.authorize_code(actor.id, clock_timestamp());
  if proof is null then raise exception 'Login novo após o corte não recebeu autorização.'; end if;
  insert into auth.sessions(id, user_id, factor_id, aal, created_at, updated_at)
  values(admitted_session, actor.id, actor.factor_id, 'aal2', clock_timestamp(), clock_timestamp());
  if not cali_workspace.admit_workspace_session_v2(proof, admitted_session) then
    raise exception 'Login novo após o corte não foi admitido.';
  end if;
  perform set_config('qa.admin_identity_after',
    jsonb_build_object('sub', actor.id, 'session_id', admitted_session, 'email', new_email, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  if (select to_jsonb(f) from auth.mfa_factors f where id = actor.factor_id)
    is distinct from current_setting('qa.admin_identity_factor_before')::jsonb then
    raise exception 'UUID ou conteúdo do fator TOTP foi alterado.';
  end if;
  if (select to_jsonb(p) from cali_workspace.profiles p where p.id = (select id from admin_identity_actors where kind = 'other'))
    is distinct from current_setting('qa.admin_identity_other_before')::jsonb then
    raise exception 'Perfil da segunda Admin foi alterado.';
  end if;
end;
$new_login$;

set local role authenticated;
do $after$
begin
  perform set_config('request.jwt.claims', current_setting('qa.admin_identity_after'), true);
  if not cali_workspace.is_admin() or not cali_workspace.workspace_private_access_v2() then
    raise exception 'Admin com novo e-mail, mesmo UUID/TOTP e login admitido perdeu acesso.';
  end if;
end;
$after$;
reset role;

update auth.sessions set factor_id = null
where id = (current_setting('qa.admin_identity_after')::jsonb ->> 'session_id')::uuid;
set local role authenticated;
do $missing_factor$
begin
  perform set_config('request.jwt.claims', current_setting('qa.admin_identity_after'), true);
  if cali_workspace.session_meets_mfa() or cali_workspace.is_admin() then
    raise exception 'Sessão AAL2 sem fator vinculado recebeu acesso administrativo.';
  end if;
end;
$missing_factor$;
reset role;

update auth.sessions set factor_id = (select factor_id from admin_identity_actors where kind = 'primary')
where id = (current_setting('qa.admin_identity_after')::jsonb ->> 'session_id')::uuid;
update cali_workspace.profiles set active = false where id = (select id from admin_identity_actors where kind = 'primary');
set local role authenticated;
do $inactive$
begin
  perform set_config('request.jwt.claims', current_setting('qa.admin_identity_after'), true);
  if cali_workspace.is_admin() or cali_workspace.workspace_private_access_v2() then
    raise exception 'Perfil inativo recebeu acesso administrativo.';
  end if;
  perform set_config('request.jwt.claims', current_setting('qa.admin_identity_other'), true);
  if not cali_workspace.is_admin() then raise exception 'Inativação do primeiro ator interrompeu a segunda Admin.'; end if;
end;
$inactive$;
reset role;

select jsonb_build_object('contract', 'admin-identity', 'passed', true,
  'syntheticActors', 4, 'realGuards', true, 'sameUuidAndTotp', true, 'rollback', true);
rollback;
