do $seed$
declare
  report uuid := gen_random_uuid();
  submission uuid := gen_random_uuid();
  proposal uuid := gen_random_uuid();
  direct_proposal uuid := gen_random_uuid();
  company uuid := 'ca110000-0000-4000-8000-000000000001';
begin
  insert into cali_workspace.reports(id,company_id,title,reference_month,period_start,period_end,status)
  values(report,company,'Relatório sintético','2025-01-01','2025-01-01','2025-01-31','review');
  insert into public.cali_submissions(id,protocol,service_slug,contact_name,contact_email)
  values(submission,'QA-' || submission,'cali-build','Contato QA','revisao-qa@example.test');
  insert into public.cali_proposals(id,submission_id,service_slug,version,package_code)
  values(proposal,submission,'cali-build',1,'COMPLETO'),(direct_proposal,submission,'cali-build',2,'COMPLETO');
  perform set_config('qa.review_report',report::text,true),
    set_config('qa.review_proposal',proposal::text,true),
    set_config('qa.review_direct',direct_proposal::text,true);
end;
$seed$;
set local role authenticated;
select set_config('request.jwt.claims',current_setting('qa.claims_admin'),true) is not null;
do $assign$
declare
  company uuid := 'ca110000-0000-4000-8000-000000000001';
  partner uuid := (current_setting('qa.claims_partner')::jsonb->>'sub')::uuid;
  report uuid := current_setting('qa.review_report')::uuid;
  proposal uuid := current_setting('qa.review_proposal')::uuid;
begin
  perform set_config('qa.review_report_id',cali_workspace.assign_partner_material_review('report',report,company,partner)::text,true),
    set_config('qa.review_proposal_id',cali_workspace.assign_partner_material_review('proposal',proposal,company,partner)::text,true);
end;
$assign$;
select set_config('request.jwt.claims',current_setting('qa.claims_partner'),true) is not null;
do $submit$
begin
  perform cali_workspace.submit_partner_material_review(current_setting('qa.review_report_id')::uuid,1,'Resumo preparado para revisão.');
  perform cali_workspace.submit_partner_material_review(current_setting('qa.review_proposal_id')::uuid,1,'Proposta preparada para revisão.');
end;
$submit$;
select set_config('request.jwt.claims',current_setting('qa.claims_admin'),true) is not null;
do $review$
declare
  report uuid := current_setting('qa.review_report')::uuid;
  proposal uuid := current_setting('qa.review_proposal')::uuid;
begin
  begin
    update cali_workspace.reports set status='approved' where id=report;
    raise exception 'Relatório passou pela aprovação com revisão pendente.';
  exception when object_not_in_prerequisite_state then
    if sqlerrm <> 'Conclua a revisão do Partner antes de aprovar ou enviar.' then raise; end if;
  end;
  begin
    update public.cali_proposals set status='aprovada' where id=proposal;
    raise exception 'Proposta passou pela aprovação com revisão pendente.';
  exception when object_not_in_prerequisite_state then
    if sqlerrm <> 'Conclua a revisão do Partner antes de aprovar ou enviar.' then raise; end if;
  end;
  update public.cali_proposals set status='aprovada' where id=current_setting('qa.review_direct')::uuid;
  if not found then raise exception 'Proposta de autoria Admin não foi aprovada.'; end if;
end;
$review$;
reset role;

set local role service_role;
do $pending$
begin
  perform cali_workspace.reserve_material_email(
    gen_random_uuid(),'proposal',current_setting('qa.review_proposal')::uuid,
    (current_setting('qa.claims_admin')::jsonb->>'sub')::uuid,repeat('a',64),null,1);
  raise exception 'Reserva aceitou revisão pendente.';
exception when object_not_in_prerequisite_state then
  if sqlerrm <> 'Conclua a revisão do Partner antes de aprovar ou enviar.' then raise; end if;
end;
$pending$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('qa.claims_admin'),true) is not null;
do $accept$
begin
  perform cali_workspace.decide_partner_material_review(current_setting('qa.review_report_id')::uuid,1,true,null);
  perform cali_workspace.decide_partner_material_review(current_setting('qa.review_proposal_id')::uuid,1,true,null);
  update cali_workspace.reports set status='approved' where id=current_setting('qa.review_report')::uuid;
  if not found then raise exception 'Relatório não foi aprovado depois do aceite.'; end if;
  update public.cali_proposals set status='aprovada' where id=current_setting('qa.review_proposal')::uuid;
  if not found then raise exception 'Proposta não foi aprovada depois do aceite.'; end if;
end;
$accept$;
reset role;
select 'PASS autoria Admin, envio pendente negado e aprovação depois da decisão Partner';
