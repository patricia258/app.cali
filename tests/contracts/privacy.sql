do $privacy$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  actor_a uuid := (current_setting('qa.claims_client_a')::jsonb->>'sub')::uuid;
  request_id uuid;
  exported jsonb;
  request_text constant text := 'QA pedido de acesso aos dados';
  answer_text constant text := 'QA resposta restrita ao solicitante';
begin
  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  request_id := cali_workspace.request_data_subject_right('access',request_text);
  if not exists(select 1 from cali_workspace.data_subject_requests r where r.id=request_id and r.user_id=actor_a
    and r.company_id=company_a and r.details=request_text and r.status='open') then
    raise exception 'Pedido não conservou autor, empresa ou situação inicial.';
  end if;
  exported := cali_workspace.export_my_data();
  if exported->'cadastro'->>'id' is distinct from actor_a::text or exported->'cadastro' ? 'signature_url'
    or not exists(select 1 from jsonb_array_elements(exported->'pedidos_de_privacidade') e where e->>'pedido'=request_text) then
    raise exception 'Exportação pessoal perdeu escopo, omissão da assinatura ou pedido.';
  end if;
  begin
    perform cali_workspace.admin_export_company_data(company_a,'Pessoa QA');
    raise exception 'Cliente usou exportação completa da empresa.';
  exception when raise_exception then
    if sqlerrm <> 'Somente a administração pode exportar os dados da empresa.' then raise; end if;
  end;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  if exists(select 1 from cali_workspace.data_subject_requests r where r.id=request_id)
    or exists(select 1 from jsonb_array_elements(cali_workspace.export_my_data()->'pedidos_de_privacidade') e where e->>'pedido'=request_text) then
    raise exception 'Cliente B leu pedido de privacidade de A.';
  end if;
  begin
    perform cali_workspace.admin_answer_data_subject_request(request_id,answer_text);
    raise exception 'Cliente B respondeu a pedido de privacidade de A.';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  perform cali_workspace.admin_answer_data_subject_request(request_id,answer_text);
  if not exists(select 1 from cali_workspace.notifications n where n.entity_id=request_id and n.notification_type='privacy_answer'
    and n.user_id=actor_a and n.email_required)
    or not exists(select 1 from cali_workspace.activity_log l where l.entity_id=request_id and l.event_type='privacy_request_answered') then
    raise exception 'Resposta não deixou trilha e notificação para o titular.';
  end if;
  exported := cali_workspace.admin_export_company_data(company_a,' Pessoa autorizada QA ');
  if exported->'company'->>'id' is distinct from company_a::text or exported->>'recipient' is distinct from 'Pessoa autorizada QA'
    or not exists(select 1 from jsonb_array_elements(exported->'data'->'data_subject_requests') e where e->>'id'=request_id::text)
    or exists(select 1 from jsonb_array_elements(exported->'data'->'profiles') e where e->>'company_id'<>company_a::text) then
    raise exception 'Exportação administrativa perdeu empresa, destinatário ou isolamento.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if not exists(select 1 from cali_workspace.data_subject_requests r where r.id=request_id and r.status='answered' and r.answer=answer_text) then
    raise exception 'Titular não recebeu a resposta registrada.';
  end if;
  reset role;
end;
$privacy$;
