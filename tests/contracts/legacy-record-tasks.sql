do $legacy_records$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  company_b constant uuid := 'ca110000-0000-4000-8000-000000000002';
  actor_a uuid := (current_setting('qa.claims_client_a')::jsonb->>'sub')::uuid;
  record_a uuid := gen_random_uuid();
  record_b uuid := gen_random_uuid();
  unopened uuid := gen_random_uuid();
  internal_record uuid := gen_random_uuid();
  internal_message uuid;
  public_message uuid;
  client_message uuid;
  admin_message uuid;
  first_ids text[];
  cursor_at timestamptz;
  cursor_id text;
  receipt jsonb;
begin
  insert into cali_workspace.account_records(id,company_id,title,visibility,workflow_status,source_actor,created_by) values
    (record_a,company_a,'QA ocorrência A','client','open','client',actor_a),
    (record_b,company_b,'QA ocorrência B','client','open','admin',null),
    (unopened,company_a,'QA ocorrência não aberta','client','open','client',actor_a),
    (internal_record,company_a,'QA ocorrência interna','internal','open','admin',null);
  insert into cali_workspace.account_records(company_id,title,visibility,workflow_status,created_at)
  select company_a,'QA histórico '||g,'client','open',now()+g*interval '1 second' from generate_series(1,29) g;

  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_partner'),true);
  begin
    perform cali_workspace.partner_set_record_status(record_b,'in_progress');
    raise exception 'Partner alterou situação fora da atribuição.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform cali_workspace.partner_set_record_status(record_a,'completed');
    raise exception 'Partner encerrou ocorrência sem revisão.';
  exception when insufficient_privilege then null;
  end;
  if cali_workspace.partner_set_record_status(record_a,'in_progress')->>'workflow_status' is distinct from 'in_progress' then
    raise exception 'Partner não moveu ocorrência atribuída.';
  end if;
  internal_message := (cali_workspace.partner_post_record_message(record_a,'QA nota interna',true)->>'message_id')::uuid;
  public_message := (cali_workspace.partner_post_record_message(record_a,'QA retorno ao cliente',false)->>'message_id')::uuid;
  if cali_workspace.partner_request_record_close(record_a,'Conclusão para revisar') is null then
    raise exception 'Partner não encaminhou encerramento.';
  end if;
  begin
    perform cali_workspace.partner_request_record_close(record_a,'Conclusão para revisar');
    raise exception 'Partner duplicou encerramento pendente.';
  exception when raise_exception then
    if sqlerrm not like '%já está aguardando%' then raise; end if;
  end;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  begin
    perform cali_workspace.read_company_conversation_history(company_a);
    raise exception 'Empresa B abriu histórico de A.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform cali_workspace.toggle_account_record_message_reaction(public_message,'like');
    raise exception 'Cliente B reagiu à mensagem de A.';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if not exists(select 1 from cali_workspace.account_record_messages m where m.id=public_message)
    or exists(select 1 from cali_workspace.account_record_messages m where m.id=internal_message) then
    raise exception 'Nota interna visível ao Cliente ou retorno público ausente.';
  end if;
  client_message := (cali_workspace.post_account_record_message(record_a,'QA resposta do cliente',false)->>'message_id')::uuid;
  if client_message is null then
    raise exception 'Cliente perdeu o canal de resposta da própria ocorrência.';
  end if;
  begin
    perform cali_workspace.toggle_account_record_message_reaction(internal_message,'like');
    raise exception 'Cliente reagiu a nota interna.';
  exception when insufficient_privilege then null;
  end;
  receipt := cali_workspace.toggle_account_record_message_reaction(public_message,'like');
  if receipt->>'active' is distinct from 'true'
    or not exists(select 1 from cali_workspace.account_record_message_reactions r where r.message_id=public_message and r.user_id=actor_a and r.reaction='like') then
    raise exception 'Reação não preservou mensagem, autor e tipo.';
  end if;
  receipt := cali_workspace.toggle_account_record_message_reaction(public_message,'like');
  if receipt->>'active' is distinct from 'false'
    or exists(select 1 from cali_workspace.account_record_message_reactions r where r.message_id=public_message and r.user_id=actor_a) then
    raise exception 'Segundo toque não removeu a reação.';
  end if;
  begin
    perform cali_workspace.edit_account_record_message(client_message,'QA alteração pelo cliente');
    raise exception 'Cliente editou mensagem publicada.';
  exception when raise_exception then
    if sqlerrm <> 'Apenas a CALI pode editar mensagens.' then raise; end if;
  end;
  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  begin
    perform cali_workspace.edit_account_record_message(client_message,'QA alteração pela CALI');
    raise exception 'Admin sobrescreveu o registro original do Cliente.';
  exception when raise_exception then
    if sqlerrm not like 'Mensagens do cliente permanecem%' then raise; end if;
  end;
  admin_message := (cali_workspace.post_account_record_message(record_a,'QA retorno da CALI',false)->>'message_id')::uuid;
  perform cali_workspace.edit_account_record_message(admin_message,' QA retorno revisado pela CALI ');
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if not exists(select 1 from cali_workspace.account_record_messages m where m.id=admin_message
    and m.body='QA retorno revisado pela CALI' and m.edited_at is not null) then
    raise exception 'Cliente não viu texto editado e carimbo de edição.';
  end if;
  begin
    perform cali_workspace.client_delete_unopened_account_record(record_a);
    raise exception 'Cliente apagou ocorrência já aberta.';
  exception when check_violation then null;
  end;
  receipt := cali_workspace.client_delete_unopened_account_record(unopened);
  if receipt->>'deleted' is distinct from 'true'
    or exists(select 1 from cali_workspace.account_records r where r.id=unopened) then
    raise exception 'Cliente não removeu ocorrência própria ainda não aberta.';
  end if;
  select array_agg(h.id order by h.happened_at desc,h.id desc) into first_ids
  from cali_workspace.read_company_conversation_history(company_a,'record') h;
  if cardinality(first_ids) is distinct from 26 then raise exception 'Primeira página do histórico tem tamanho incorreto.'; end if;
  select h.happened_at,h.id into strict cursor_at,cursor_id
  from cali_workspace.read_company_conversation_history(company_a,'record') h where h.id=first_ids[26];
  if not exists(select 1 from cali_workspace.read_company_conversation_history(company_a,'record',cursor_at,cursor_id))
    or exists(select 1 from cali_workspace.read_company_conversation_history(company_a,'record',cursor_at,cursor_id) h
      where h.id=any(first_ids) or h.subject_id in (internal_record,record_b)) then
    raise exception 'Cursor do histórico duplicou itens ou vazou registro interno/estrangeiro.';
  end if;
  reset role;
end;
$legacy_records$;

do $legacy_tasks$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  project_a uuid;
  deliverable uuid := gen_random_uuid();
  adjustable uuid := gen_random_uuid();
  task_to_approve uuid := gen_random_uuid();
  message uuid;
begin
  select p.id into strict project_a from cali_workspace.projects p where p.company_id=company_a
    and p.planning_status in ('approved','active','rebriefing') order by p.id limit 1;
  insert into cali_workspace.deliverables(id,company_id,project_id,title,status,client_visible,approval_requested_at)
  values(deliverable,company_a,project_a,'QA entregável com subtarefas','client_review',true,now());
  insert into cali_workspace.deliverable_tasks(id,company_id,deliverable_id,title,status,client_visible,adjustment_count) values
    (adjustable,company_a,deliverable,'QA subtarefa com ajuste','client_review',true,1),
    (task_to_approve,company_a,deliverable,'QA subtarefa para aprovar','client_review',true,0);
  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  begin
    perform cali_workspace.client_approve_task(task_to_approve);
    raise exception 'Cliente B aprovou subtarefa de A.';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  message := cali_workspace.client_post_task_message(adjustable,'QA comentário');
  if not exists(select 1 from cali_workspace.task_messages m where m.id=message and m.task_id=adjustable) then
    raise exception 'Comentário da subtarefa perdeu vínculo.';
  end if;
  perform cali_workspace.client_request_task_adjustment(adjustable,'Descrição do segundo ajuste QA');
  if not exists(select 1 from cali_workspace.deliverable_tasks t where t.id=adjustable and t.status='doing' and t.adjustment_count=2) then
    raise exception 'Segundo ajuste não atualizou o estado da subtarefa.';
  end if;
  reset role;
  -- Simulate the administrator making the adjusted task available for review again.
  update cali_workspace.deliverable_tasks t set status='client_review' where t.id=adjustable;
  set local role authenticated;
  begin
    perform cali_workspace.client_request_task_adjustment(adjustable,'Descrição do terceiro ajuste QA');
    raise exception 'Subtarefa aceitou mais de dois ajustes.';
  exception when raise_exception then
    if sqlerrm not like 'Os 2 ajustes%' then raise; end if;
  end;
  perform cali_workspace.client_approve_task(task_to_approve);
  if not exists(select 1 from cali_workspace.deliverable_tasks t where t.id=task_to_approve and t.status='approved' and t.completed_at is not null) then
    raise exception 'Aprovação não concluiu subtarefa própria.';
  end if;
  begin
    perform cali_workspace.client_post_task_message(task_to_approve,'QA comentário tardio');
    raise exception 'Subtarefa fechada recebeu nova mensagem.';
  exception when raise_exception then
    if sqlerrm not like '%já foi encerrada%' then raise; end if;
  end;
  reset role;
end;
$legacy_tasks$;
