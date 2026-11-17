do $seed$
declare
  response uuid := gen_random_uuid();
  actor uuid := (current_setting('qa.claims_admin')::jsonb->>'sub')::uuid;
  company uuid := 'ca110000-0000-4000-8000-000000000001';
  first_pdf text := response || '/1/' || repeat('a',64) || '.pdf';
  other_pdf text := response || '/1/' || repeat('b',64) || '.pdf';
begin
  insert into public.mapa_respostas(id,protocolo,c_nome,c_empresa,c_email,c_whatsapp,lgpd_aceite)
  values(response,'QA-MAPA-' || response,'Contato QA','Empresa QA','mapa-qa@example.test','00000000000',true);
  insert into cali_session_guard.phase4_mapa_scope(record_id,company_id,operator_id,expires_at)
  values(response,company,actor,now() + interval '1 day');
  insert into storage.objects(bucket_id,name,version)
  values ('cali-mapa-delivery',first_pdf,'qa'), ('cali-mapa-delivery',other_pdf,'qa');
  perform set_config('qa.mapa_id',response::text,true), set_config('qa.mapa_path',first_pdf,true), set_config('qa.mapa_other_path',other_pdf,true);
  if not cali_workspace.elimination_scope_matches(cali_workspace.company_elimination_scope(company),'cali-mapa-delivery',first_pdf)
    or cali_workspace.elimination_scope_matches(cali_workspace.company_elimination_scope('ca110000-0000-4000-8000-000000000002'),'cali-mapa-delivery',first_pdf) then
    raise exception 'O PDF deve aparecer só no escopo da empresa vinculada.';
  end if;
end;
$seed$;
set local role authenticated;
select set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true) is not null;
do $deny$
begin
  perform cali_workspace.read_mapa_delivery_state(current_setting('qa.mapa_id')::uuid);
  raise exception 'Cliente leu a devolutiva administrativa.';
exception when insufficient_privilege then null;
end;
$deny$;
select set_config('request.jwt.claims',current_setting('qa.claims_admin'),true) is not null;
do $authorize$
begin
  if cali_workspace.read_mapa_delivery_state(current_setting('qa.mapa_id')::uuid)->>'revision' <> '1' then
    raise exception 'Resposta legada precisa iniciar na revisão 1.';
  end if;
  begin
    perform cali_workspace.register_mapa_delivery_pdf(current_setting('qa.mapa_id')::uuid,1,current_setting('qa.mapa_path'));
    raise exception 'Admin gravou PDF oficial sem usar o worker.';
  exception when insufficient_privilege then null;
  end;
end;
$authorize$;
reset role;

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true) is not null;
do $reserve$
declare
  response uuid := current_setting('qa.mapa_id')::uuid;
  actor uuid := (current_setting('qa.claims_admin')::jsonb->>'sub')::uuid;
  path text := current_setting('qa.mapa_path');
  request_id uuid := gen_random_uuid();
  receipt_id uuid;
  receipt jsonb;
begin
  begin
    perform cali_workspace.reserve_material_email(request_id,'mapa',response,actor,repeat('c',64),null,1);
    raise exception 'Envio foi reservado sem PDF oficial.';
  exception when serialization_failure then null;
  end;
  perform cali_workspace.register_mapa_delivery_pdf(response,1,path);
  perform cali_workspace.register_mapa_delivery_pdf(response,1,path);
  begin
    perform cali_workspace.register_mapa_delivery_pdf(response,1,current_setting('qa.mapa_other_path'));
    raise exception 'PDF oficial foi substituído na mesma revisão.';
  exception when serialization_failure then null;
  end;

  if cali_workspace.read_mapa_delivery_state(response)->>'pdf_path' <> path then
    raise exception 'Worker recebeu PDF divergente.';
  end if;
  receipt := cali_workspace.reserve_material_email(request_id,'mapa',response,actor,repeat('c',64),null,1);
  receipt_id := (receipt->>'id')::uuid;
  begin
    perform cali_workspace.complete_material_email(receipt_id,'qa-provider',array['outro@example.test'],path,1);
    raise exception 'Recibo aceitou destinatário fora da resposta.';
  exception when serialization_failure then null;
  end;
  perform set_config('qa.mapa_receipt',receipt_id::text,true), set_config('qa.mapa_request',request_id::text,true);
end;
$reserve$;
reset role;

do $pending$
begin
  update public.mapa_respostas set observacoes = '{"parecer":"Revisão em andamento"}'
  where id = current_setting('qa.mapa_id')::uuid;
  raise exception 'Edição mudou versão enquanto o envio estava reservado.';
exception when serialization_failure then null;
end;
$pending$;

set local role service_role;
do $complete$
declare
  response uuid := current_setting('qa.mapa_id')::uuid;
  request_id uuid := current_setting('qa.mapa_request')::uuid;
  receipt uuid := current_setting('qa.mapa_receipt')::uuid;
  actor uuid := (current_setting('qa.claims_admin')::jsonb->>'sub')::uuid;
  path text := current_setting('qa.mapa_path');
  retry jsonb;
begin
  perform cali_workspace.complete_material_email(receipt,'qa-provider',array['mapa-qa@example.test'],path,1);
  perform cali_workspace.complete_material_email(receipt,'qa-provider',array['mapa-qa@example.test'],path,1);
  retry := cali_workspace.reserve_material_email(request_id,'mapa',response,actor,repeat('c',64),null,1);
  if retry->>'provider_id' <> 'qa-provider' or (retry->>'id')::uuid <> receipt then
    raise exception 'Retry não reutilizou o recibo.';
  end if;
end;
$complete$;
reset role;

do $revision$
declare
  response uuid := current_setting('qa.mapa_id')::uuid;
  path text := current_setting('qa.mapa_path');
  receipt cali_workspace.material_email_receipts%rowtype;
begin
  select * into strict receipt from cali_workspace.material_email_receipts where id = current_setting('qa.mapa_receipt')::uuid;
  if receipt.material_version <> 1 or receipt.official_pdf_path <> path
    or (select count(*) from cali_workspace.activity_log where entity_id = response and event_type = 'mapa_report_sent') <> 1 then
    raise exception 'Histórico da revisão ou da entrega inconsistente.';
  end if;
  update public.mapa_respostas set observacoes = '{"parecer":"Revisão nova"}' where id = response;
  if (select delivery_revision from public.mapa_respostas where id = response) <> 2
    or not exists (select 1 from cali_workspace.mapa_delivery_pdfs where response_id = response and revision = 1 and pdf_path = path) then
    raise exception 'Revisão anterior não foi preservada.';
  end if;
  begin
    perform cali_workspace.register_mapa_delivery_pdf(response,1,path);
    raise exception 'Revisão obsoleta foi aceita.';
  exception when serialization_failure then null;
  end;
end;
$revision$;
select 'PASS PDF oficial, escopo, versão obsoleta, destinatário, retry e histórico do Mapa';
