do $seed$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  fixture_record uuid := gen_random_uuid();
  fixture_delivery uuid := gen_random_uuid();
  fixture_project uuid;
  fixture_file uuid := gen_random_uuid();
  initial_review timestamptz := clock_timestamp()-interval '1 hour';
begin
  select p.id into strict fixture_project from cali_workspace.projects p
  where p.company_id=company_a and p.planning_status in ('approved','active','rebriefing') order by p.id limit 1;
  insert into cali_workspace.account_records(id,company_id,title,visibility,workflow_status)
  values(fixture_record,company_a,'QA avaliação por encerramento','client','completed');
  insert into cali_workspace.deliverables(id,company_id,project_id,title,status,client_visible,approval_requested_at)
  values(fixture_delivery,company_a,fixture_project,'QA aprovação por revisão','client_review',true,initial_review);
  insert into cali_workspace.files(id,company_id,deliverable_id,title,status,client_visible,storage_path)
  values(fixture_file,company_a,fixture_delivery,'QA arquivo','published',true,'documents/'||company_a::text||'/'||fixture_file::text||'.pdf');
  perform set_config('qa.feedback_record',fixture_record::text,true), set_config('qa.feedback_delivery',fixture_delivery::text,true),
    set_config('qa.feedback_file',fixture_file::text,true), set_config('qa.feedback_initial_review',initial_review::text,true);
end;
$seed$;

set local role authenticated;
do $feedback$
declare
  fixture_record uuid := current_setting('qa.feedback_record')::uuid;
  fixture_delivery uuid := current_setting('qa.feedback_delivery')::uuid;
  first_closure uuid;
  second_closure uuid;
  new_review timestamptz;
  response jsonb;
begin
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  select c.id into strict first_closure from cali_workspace.account_record_closures c where c.record_id=fixture_record;
  response := cali_workspace.submit_account_record_closure_feedback(fixture_record,first_closure,5,null);
  if response->>'closure_id' is distinct from first_closure::text
    or cali_workspace.submit_account_record_closure_feedback(fixture_record,first_closure,5,null)->>'already_answered' <> 'true'
  then raise exception 'Retry de avaliação duplicou o encerramento.'; end if;
  perform cali_workspace.client_approve_deliverable_with_feedback(fixture_delivery,5,'Primeira avaliação.');

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  perform cali_workspace.set_account_record_status(fixture_record,'in_progress');
  perform cali_workspace.set_account_record_status(fixture_record,'completed');
  select c.id into strict second_closure from cali_workspace.account_record_closures c
  where c.record_id=fixture_record and c.superseded_at is null;
  if second_closure=first_closure then raise exception 'Reabertura reutilizou a avaliação antiga.'; end if;
  response := cali_workspace.reopen_deliverable_for_review_v2(fixture_delivery,1,'Corrigir para nova validação.');
  if response->>'review_revision' <> '2'
    or cali_workspace.reopen_deliverable_for_review_v2(fixture_delivery,1,'Corrigir para nova validação.')->>'already_reopened' <> 'true'
  then raise exception 'Reabertura de entregável não foi idempotente.'; end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if exists(select 1 from cali_workspace.deliverables d where d.id=fixture_delivery)
    or exists(select 1 from cali_workspace.files f where f.id=current_setting('qa.feedback_file')::uuid)
  then raise exception 'Revisão interna expôs entregável ou arquivo.'; end if;
  perform cali_workspace.submit_account_record_closure_feedback(fixture_record,second_closure,4,null);

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  perform cali_workspace.change_deliverable_review_status_v2(fixture_delivery,2,'client_review','Liberação de QA');
  select d.approval_requested_at into strict new_review from cali_workspace.deliverables d
  where d.id=fixture_delivery and d.client_visible;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  begin
    perform cali_workspace.client_approve_deliverable_review_v2(fixture_delivery,2,new_review,5,null);
    raise exception 'Cliente B aprovou entregável de A.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform cali_workspace.submit_account_record_closure_feedback(fixture_record,second_closure,5,null);
    raise exception 'Cliente B avaliou ocorrência de A.';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  begin
    perform cali_workspace.client_approve_deliverable_with_feedback(fixture_delivery,5,null);
    raise exception 'Contrato legado aprovou nova revisão sem versão.';
  exception when serialization_failure then null;
  end;
  perform cali_workspace.client_approve_deliverable_review_v2(fixture_delivery,2,new_review,4,'Segunda avaliação.');
  if (select array_agg(n.score order by n.delivery_review_revision)
      from cali_workspace.nps_responses n where n.deliverable_id=fixture_delivery) is distinct from array[5,4]::smallint[]
    or (select count(*) from cali_workspace.account_record_feedback f where f.record_id=fixture_record) <> 2
  then raise exception 'Histórico de duas avaliações não foi preservado.'; end if;
end;
$feedback$;
reset role;
