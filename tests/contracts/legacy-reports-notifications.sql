do $legacy_reports$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  company_b constant uuid := 'ca110000-0000-4000-8000-000000000002';
  client_a uuid := (current_setting('qa.claims_client_a')::jsonb->>'sub')::uuid;
  client_b uuid := (current_setting('qa.claims_client_b')::jsonb->>'sub')::uuid;
  opened_report uuid := gen_random_uuid();
  unread_report uuid := gen_random_uuid();
  own_notice uuid := gen_random_uuid();
  foreign_notice uuid := gen_random_uuid();
  withdrawal_notice uuid := gen_random_uuid();
  question_id uuid;
  revision_id uuid;
  acknowledgement jsonb;
  opened jsonb;
  withdrawal jsonb;
begin
  insert into cali_workspace.reports(id,company_id,title,reference_month,period_start,period_end,status,sent_at) values
    (opened_report,company_a,'QA relatório aberto','2013-01-01','2013-01-01','2013-01-31','sent',now()),
    (unread_report,company_a,'QA relatório não aberto','2013-02-01','2013-02-01','2013-02-28','published',now());
  insert into cali_workspace.notifications(id,company_id,user_id,notification_type,title,entity_type,entity_id) values
    (own_notice,company_a,client_a,'qa_notice','Notificação A','report',opened_report),
    (foreign_notice,company_b,client_b,'qa_notice','Notificação B',null,null),
    (withdrawal_notice,company_a,client_a,'report_available','Notificação relatório não aberto','report',unread_report);

  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  begin
    perform cali_workspace.acknowledge_report_v55(opened_report);
    raise exception 'Cliente B registrou ciência no relatório A.';
  exception when raise_exception then
    if sqlerrm <> 'report_not_available' then raise; end if;
  end;
  begin
    perform cali_workspace.record_report_client_event_v55(opened_report,'opened');
    raise exception 'Cliente B registrou leitura no relatório A.';
  exception when raise_exception then
    if sqlerrm <> 'report_not_available' then raise; end if;
  end;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  begin
    perform cali_workspace.client_submit_report_question_v61(opened_report,'Dúvida QA');
    raise exception 'Dúvida aceita antes de abrir o relatório.';
  exception when raise_exception then
    if sqlerrm not like 'Abra o relatório%' then raise; end if;
  end;
  opened := cali_workspace.record_report_client_event_v55(opened_report,'opened');
  if opened->>'open_count' is distinct from '1'
    or cali_workspace.record_report_client_event_v55(opened_report,'opened')->>'open_count' is distinct from '1'
    or cali_workspace.record_report_client_event_v55(opened_report,'pdf_opened')->>'pdf_count' is distinct from '1' then
    raise exception 'Contagem de leitura ou PDF divergiu em retry.';
  end if;
  acknowledgement := cali_workspace.acknowledge_report_v55(opened_report);
  if acknowledgement->>'acknowledgement_protocol' not like 'CALI-CIE-%'
    or acknowledgement->'identity'->>'user_id' is distinct from client_a::text
    or cali_workspace.acknowledge_report_v55(opened_report) is distinct from acknowledgement then
    raise exception 'Ciência perdeu identidade, protocolo ou recibo idempotente.';
  end if;
  question_id := (cali_workspace.client_submit_report_question_v61(opened_report,'Dúvida QA')->>'record_id')::uuid;
  if not exists(select 1 from cali_workspace.account_records r where r.id=question_id and r.company_id=company_a and r.created_by=client_a) then
    raise exception 'Dúvida não abriu ocorrência na própria empresa.';
  end if;
  perform cali_workspace.mark_notification_read(own_notice);
  perform cali_workspace.mark_notification_read(foreign_notice);
  perform cali_workspace.mark_all_notifications_read();
  if not exists(select 1 from cali_workspace.notifications n where n.id=own_notice and n.read_at is not null)
    or exists(select 1 from cali_workspace.notifications n where n.id=foreign_notice) then
    raise exception 'Marcação de notificações divergiu do escopo próprio.';
  end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  if not exists(select 1 from cali_workspace.notifications n where n.id=foreign_notice and n.read_at is null) then
    raise exception 'Marcar todas em A atingiu notificação de B.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  begin
    perform cali_workspace.withdraw_unopened_report_v62(opened_report,'Teste QA');
    raise exception 'Retirada legada aceitou relatório já lido.';
  exception when raise_exception then
    if sqlerrm <> 'report_already_seen' then raise; end if;
  end;
  withdrawal := cali_workspace.withdraw_unopened_report_v62(unread_report,'Teste QA');
  if withdrawal->>'status' is distinct from 'archived'
    or exists(select 1 from cali_workspace.notifications n where n.id=withdrawal_notice) then
    raise exception 'Retirada legada preservou a publicação ou sua notificação.';
  end if;
  revision_id := cali_workspace.revise_delivered_report(opened_report,'Correção QA',true);
  if cali_workspace.revise_delivered_report(opened_report,'Correção QA',true) is distinct from revision_id
    or not exists(select 1 from cali_workspace.reports r where r.id=revision_id and r.status='review' and r.version=2
      and r.revision_parent_id=opened_report and r.acknowledged_at is null) then
    raise exception 'Correção perdeu revisão, idempotência ou nova ciência.';
  end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if exists(select 1 from cali_workspace.reports r where r.id in (unread_report,opened_report,revision_id)) then
    raise exception 'Cliente leu versão retirada ou ainda em revisão.';
  end if;
  reset role;
end;
$legacy_reports$;
