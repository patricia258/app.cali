do $seed$
declare
  target_company uuid := gen_random_uuid();
  other_company constant uuid := 'ca110000-0000-4000-8000-000000000002';
  target_submission uuid := gen_random_uuid();
  other_submission uuid := gen_random_uuid();
  target_v1 uuid := gen_random_uuid();
  target_v2 uuid := gen_random_uuid();
  other_proposal uuid := gen_random_uuid();
  actor uuid;
  new_path text := target_submission::text || '/' || target_v2::text || '/new.pdf';
  shared_path text := target_submission::text || '/' || target_v2::text || '/shared.pdf';
  legacy_path text := 'legacy/' || target_v1::text || '.pdf';
begin
  actor := (current_setting('qa.claims_admin')::jsonb->>'sub')::uuid;
  insert into cali_workspace.companies(id,legal_name,display_name,status,closed_at)
  values(target_company,'QA empresa temporária','QA eliminação comercial','closed',clock_timestamp()-interval '3 days');
  insert into public.cali_submissions(id,protocol,service_slug,contact_name,contact_email)
  values(target_submission,'QA-'||target_submission::text,'cali-build','Cliente temporário','retencao-qa@example.test'),
    (other_submission,'QA-'||other_submission::text,'cali-build','Cliente B temporário','retencao-b-qa@example.test');
  insert into public.cali_proposals(id,submission_id,service_slug,version,package_code,pdf_path)
  values(target_v1,target_submission,'cali-build',1,'COMPLETO',legacy_path),
    (target_v2,target_submission,'cali-build',2,'COMPLETO',new_path),
    (other_proposal,other_submission,'cali-build',1,'COMPLETO',shared_path);
  insert into cali_session_guard.phase4_commercial_scope(company_id,submission_id,proposal_id)
  values(target_company,target_submission,target_v1),(other_company,other_submission,other_proposal);
  insert into cali_workspace.material_email_receipts(request_id,kind,entity_id,company_id,actor_id,content_hash,completed_at)
  values(gen_random_uuid(),'proposal',target_v2,null,actor,repeat('a',64),clock_timestamp());
  insert into storage.objects(bucket_id,name,version) values
    ('cali-proposals',legacy_path,'qa'),('cali-proposals',new_path,'qa'),('cali-proposals',shared_path,'qa');
  perform set_config('qa.retention_company',target_company::text,true), set_config('qa.retention_submission',target_submission::text,true),
    set_config('qa.retention_other_proposal',other_proposal::text,true), set_config('qa.retention_target_proposal',target_v2::text,true),
    set_config('qa.retention_legacy_path',legacy_path,true), set_config('qa.retention_new_path',new_path,true),
    set_config('qa.retention_shared_path',shared_path,true);
end;
$seed$;
set local role authenticated;
select set_config('request.jwt.claims',current_setting('qa.claims_admin'),true) is not null;
do $authorize$
declare
  company uuid := current_setting('qa.retention_company')::uuid;
  result jsonb;
begin
  if not cali_workspace.is_admin() then raise exception 'Fixture Admin sem AAL2.'; end if;
  result := cali_workspace.admin_preview_company_elimination(company);
  if (result->>'files')::int <> 2 then raise exception 'Prévia não inclui PDFs próprios ou expõe compartilhado.'; end if;
  result := cali_workspace.admin_begin_company_elimination(company,'QA eliminação comercial',true);
  if result->>'state'<>'queued' or (result->>'filesPending')::int<>2 then raise exception 'Manifesto comercial incorreto.'; end if;
  perform set_config('qa.retention_job',result->>'jobId',true);
end;
$authorize$;
reset role;
do $verify$
declare
  job uuid := current_setting('qa.retention_job')::uuid;
  lease uuid;
  result jsonb;
  new_path text := current_setting('qa.retention_new_path');
  legacy_path text := current_setting('qa.retention_legacy_path');
  shared_path text := current_setting('qa.retention_shared_path');
begin
  begin
    insert into storage.objects(bucket_id,name,version) values('cali-proposals',new_path||'-late','qa');
    raise exception 'Upload após manifesto não foi cercado.';
  exception when insufficient_privilege then null;
  end;
  lease := (cali_workspace.claim_company_elimination_job(job)->>'leaseId')::uuid;
  if (select array_agg(b.path order by b.path) from cali_workspace.company_elimination_batch(job,lease) b)
    is distinct from (select array_agg(x order by x) from unnest(array[new_path,legacy_path]) x) then
    raise exception 'Lote não contém os PDFs próprios exatos.';
  end if;
  -- These objects are uncommitted metadata fixtures. Simulate the Storage API response.
  perform set_config('storage.allow_delete_query','true',true);
  delete from storage.objects where bucket_id='cali-proposals' and name in (new_path,legacy_path);
  perform set_config('storage.allow_delete_query','false',true);
  if exists(select 1 from cali_workspace.company_elimination_batch(job,lease)) then raise exception 'Remoção não reconciliou.'; end if;
  result := cali_workspace.finalize_company_elimination_job(job,lease);
  if result->>'state' <> 'completed' or (result->'receipt'->>'files_removed')::int <> 2 then
    raise exception 'Recibo comercial incorreto.';
  end if;
  if exists(select 1 from public.cali_proposals p where p.submission_id=current_setting('qa.retention_submission')::uuid)
    or exists(select 1 from public.cali_submissions s where s.id=current_setting('qa.retention_submission')::uuid)
    or exists(select 1 from cali_workspace.material_email_receipts m where m.entity_id=current_setting('qa.retention_target_proposal')::uuid)
    or not exists(select 1 from public.cali_proposals p where p.id=current_setting('qa.retention_other_proposal')::uuid)
    or not exists(select 1 from storage.objects o where o.bucket_id='cali-proposals' and o.name=shared_path)
  then raise exception 'Versões, recibos ou arquivo compartilhado ficaram inconsistentes.'; end if;
end;
$verify$;
select 'PASS manifesto, cerca, reconciliacao, todas as versões próprias, recibos e PDF compartilhado preservado';
