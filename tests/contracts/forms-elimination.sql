-- PublicFormPage uploads into <form UUID>/<file>; a slug is never an object owner.
do $seed$
declare
  company uuid := gen_random_uuid();
  neighbor constant uuid := 'ca110000-0000-4000-8000-000000000002';
  live_form uuid := gen_random_uuid();
  trash_form uuid := gen_random_uuid();
  other_form uuid := gen_random_uuid();
  scope jsonb;
begin
  insert into cali_workspace.companies(id,legal_name,display_name,status,closed_at)
  values(company,'QA empresa Forms','QA eliminação Forms','closed',clock_timestamp()-interval '3 days');
  -- Deliberate collision: the old slug matcher would delete the neighbor's file.
  insert into cali_workspace.forms(id,company_id,slug,title,status,questions)
  values(live_form,company,other_form::text,'QA Forms ativo','open','[]'),
    (trash_form,company,'qa-trash-'||trash_form::text,'QA Forms lixeira','open','[]'),
    (other_form,neighbor,'qa-neighbor-'||other_form::text,'QA Forms vizinho','open','[]');
  insert into cali_workspace.form_responses(form_id,answers,respondent_name)
  values(live_form,'{"answer":"QA"}','Pessoa QA');
  delete from cali_workspace.forms where id=trash_form;
  if not exists(select 1 from cali_workspace.forms_trash where form_id=trash_form) then
    raise exception 'Exclusão comum perdeu a cópia na lixeira.';
  end if;
  insert into storage.objects(bucket_id,name,version) values
    ('cali-forms',live_form::text||'/qa.pdf','qa'),
    ('cali-forms',trash_form::text||'/qa.pdf','qa'),
    ('cali-forms',other_form::text||'/qa.pdf','qa');
  scope := cali_workspace.company_elimination_scope(company);
  if not(scope->'formIds' ? live_form::text) or not(scope->'formIds' ? trash_form::text)
    or scope->'formIds' ? other_form::text
    or cali_workspace.elimination_scope_matches(scope,'cali-forms',other_form::text||'/qa.pdf')
    or cali_workspace.elimination_scope_matches(jsonb_build_object('formSlugs',jsonb_build_array(other_form)),
      'cali-forms',other_form::text||'/qa.pdf') then
    raise exception 'Forms confundiu slug com UUID ou aceitou manifesto sem identidade comprovável.';
  end if;
  perform set_config('qa.forms_elimination_company',company::text,true),
    set_config('qa.forms_elimination_live',live_form::text,true),
    set_config('qa.forms_elimination_trash',trash_form::text,true),
    set_config('qa.forms_elimination_neighbor',other_form::text,true);
end;
$seed$;
set local role authenticated;
select set_config('request.jwt.claims',current_setting('qa.claims_admin'),true) is not null;
do $authorize$
declare
  company uuid := current_setting('qa.forms_elimination_company')::uuid;
  result jsonb;
begin
  result := cali_workspace.admin_preview_company_elimination(company);
  if (result->>'files')::int<>2 then raise exception 'Prévia Forms deveria conter dois anexos próprios.'; end if;
  result := cali_workspace.admin_begin_company_elimination(company,'QA eliminação Forms',true);
  if result->>'state'<>'queued' or (result->>'filesPending')::int<>2 then
    raise exception 'Manifesto Forms não contém os UUIDs ativo e na lixeira.';
  end if;
  perform set_config('qa.forms_elimination_job',result->>'jobId',true);
end;
$authorize$;
reset role;
do $verify$
declare
  company uuid := current_setting('qa.forms_elimination_company')::uuid;
  job uuid := current_setting('qa.forms_elimination_job')::uuid;
  live_form uuid := current_setting('qa.forms_elimination_live')::uuid;
  trash_form uuid := current_setting('qa.forms_elimination_trash')::uuid;
  neighbor uuid := current_setting('qa.forms_elimination_neighbor')::uuid;
  lease uuid;
  result jsonb;
begin
  begin
    insert into storage.objects(bucket_id,name,version) values('cali-forms',live_form::text||'/late.pdf','qa');
    raise exception 'Upload tardio Forms não foi cercado.';
  exception when insufficient_privilege then null; end;
  begin
    update cali_workspace.forms set company_id='ca110000-0000-4000-8000-000000000002' where id=live_form;
    raise exception 'Formulário saiu do escopo depois de autorizado.';
  exception when insufficient_privilege then null; end;
  begin
    delete from cali_workspace.forms_trash where form_id=trash_form;
    raise exception 'Identidade da lixeira saiu do manifesto.';
  exception when insufficient_privilege then null; end;
  lease := (cali_workspace.claim_company_elimination_job(job)->>'leaseId')::uuid;
  begin
    update cali_workspace.company_elimination_jobs set scope=scope-'formIds' where id=job;
    perform 1 from cali_workspace.company_elimination_batch(job,lease);
    raise exception 'Worker consumiu manifesto legado sem IDs comprováveis.';
  exception when object_not_in_prerequisite_state then null; end;
  if (select array_agg(b.path order by b.path) from cali_workspace.company_elimination_batch(job,lease) b)
    is distinct from (select array_agg(x order by x) from unnest(array[live_form::text||'/qa.pdf',trash_form::text||'/qa.pdf']) x)
  then raise exception 'Lote Forms não contém exatamente os anexos próprios.'; end if;
  begin
    perform cali_workspace.finalize_company_elimination_job(job,lease);
    raise exception 'Finalização permitiu anexos ainda presentes.';
  exception when object_not_in_prerequisite_state then null; end;
  perform set_config('storage.allow_delete_query','true',true);
  delete from storage.objects where bucket_id='cali-forms'
    and split_part(name,'/',1) in (live_form::text,trash_form::text);
  perform set_config('storage.allow_delete_query','false',true);
  if exists(select 1 from cali_workspace.company_elimination_batch(job,lease)) then
    raise exception 'Storage Forms não reconciliou a remoção.';
  end if;
  result := cali_workspace.finalize_company_elimination_job(job,lease);
  if result->>'state'<>'completed' or (result->'receipt'->>'files_removed')::int<>2
    or exists(select 1 from cali_workspace.forms where company_id=company)
    or exists(select 1 from cali_workspace.forms_trash where form_id in (live_form,trash_form))
    or exists(select 1 from cali_workspace.form_responses where form_id in (live_form,trash_form))
    or not exists(select 1 from cali_workspace.forms where id=neighbor)
    or not exists(select 1 from storage.objects where bucket_id='cali-forms' and name=neighbor::text||'/qa.pdf') then
    raise exception 'Eliminação Forms deixou cópia pessoal ou afetou empresa vizinha.';
  end if;
  begin
    insert into storage.objects(bucket_id,name,version) values('cali-forms',live_form::text||'/after.pdf','qa');
    raise exception 'Retry recriou anexo após eliminação concluída.';
  exception when insufficient_privilege then null; end;
end;
$verify$;
select 'PASS Forms por UUID ativo/lixeira, slug divergente, cerca, finalização sem rearquivo e vizinho preservado';
