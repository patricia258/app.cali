-- Run inside a transaction in the isolated QA stack. Actors and receipts are synthetic.
do $fixture$
declare
  actor record;
  fixture text;
  auth_session uuid;
  factor uuid;
  proof uuid;
  terms_version text;
  terms_hash text;
begin
  if inet_server_addr() is not null or current_setting('cron.launch_active_jobs') <> 'off'
    or (select count(*) from auth.users) <> 5
    or (select count(*) from auth.users where email like '%@example.test') <> 5
  then raise exception 'Stack QA isolada com cinco identidades sintéticas esperada.'; end if;

  select version,content_hash into strict terms_version,terms_hash
  from cali_v2_terms.publications where is_current;
  perform set_config('qa.terms_version',terms_version,true), set_config('qa.terms_hash',terms_hash,true);

  for actor in select id,email from auth.users loop
    fixture := case actor.email
      when 'admin-qa@example.test' then 'admin'
      when 'partner-a@example.test' then 'partner'
      when 'cliente-a@example.test' then 'client_a'
      when 'cliente-a2@example.test' then 'client_a2'
      when 'cliente-b@example.test' then 'client_b'
      else null end;
    if fixture is null then raise exception 'Identidade sintética desconhecida.'; end if;

    if fixture = 'partner' and current_setting('qa.contract',true) = 'material-review' then
      update cali_workspace.staff_members
      set modules = array(select distinct unnest(modules || array['reports','proposals']))
      where user_id = actor.id;
    end if;

    auth_session := gen_random_uuid();
    factor := null;
    if fixture in ('admin','partner') then
      factor := gen_random_uuid();
      insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
      values(factor,actor.id,'totp','verified',clock_timestamp(),clock_timestamp());
    end if;
    proof := cali_session_guard.authorize_code(actor.id,clock_timestamp());
    if proof is null then raise exception 'Fixture % sem acesso elegível.',fixture; end if;
    insert into auth.sessions(id,user_id,factor_id,aal,created_at,updated_at)
    values(auth_session,actor.id,factor,(case when factor is null then 'aal1' else 'aal2' end)::auth.aal_level,
      clock_timestamp(),clock_timestamp());
    if not cali_workspace.admit_workspace_session_v2(proof,auth_session) then
      raise exception 'Fixture % sem admissão.',fixture;
    end if;
    perform set_config('qa.claims_' || fixture,
      jsonb_build_object('sub',actor.id,'session_id',auth_session,'email',actor.email,'role','authenticated',
        'aal',case when factor is null then 'aal1' else 'aal2' end)::text,true);

    if fixture = 'partner' then
      insert into cali_workspace.terms_acceptances(user_id,version)
      values(actor.id,terms_version) on conflict do nothing;
    elsif fixture = 'client_a2' then
      delete from cali_v2_terms.confirmations c where c.user_id=actor.id and c.version=terms_version;
    else
      insert into cali_v2_terms.confirmations(user_id,version,content_hash)
      values(actor.id,terms_version,terms_hash) on conflict do nothing;
    end if;
  end loop;
end;
$fixture$;
