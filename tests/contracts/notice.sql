set local role authenticated;
do $notice$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  company_b constant uuid := 'ca110000-0000-4000-8000-000000000002';
  notice_title text := 'QA revisão aviso '||gen_random_uuid();
  legacy_title text := 'QA revisão legado '||gen_random_uuid();
  request_id uuid := gen_random_uuid();
  review_id uuid;
  legacy_review_id uuid;
  published_id uuid;
begin
  perform set_config('request.jwt.claims',current_setting('qa.claims_partner'),true);
  begin
    insert into cali_workspace.notices(category,title,body,audience,status,created_by)
    values('comunicado',notice_title,'Comunicado sintético','all','published',auth.uid());
    raise exception 'Partner publicou por INSERT direto.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform cali_workspace.submit_partner_notice_review(gen_random_uuid(),null,null,
      'comunicado',notice_title,'Comunicado sintético',array[company_b],null);
    raise exception 'Partner direcionou aviso para empresa fora da atribuição.';
  exception when insufficient_privilege then null;
  end;

  review_id := cali_workspace.submit_partner_notice_review(request_id,null,null,
    'comunicado',notice_title,'Comunicado sintético',array[company_a],null);
  if cali_workspace.submit_partner_notice_review(request_id,null,null,
    'comunicado',notice_title,'Comunicado sintético',array[company_a],null) is distinct from review_id then
    raise exception 'Retry de aviso criou outra revisão.';
  end if;
  begin
    perform cali_workspace.submit_partner_notice_review(request_id,null,null,
      'comunicado',notice_title,'Outro conteúdo',array[company_a],null);
    raise exception 'Mesmo identificador aceitou conteúdo diferente.';
  exception when serialization_failure then null;
  end;
  legacy_review_id := cali_workspace.partner_publish_notice('comunicado',legacy_title,'Comunicado sintético',array[company_a]);
  if (select count(*) from cali_workspace.partner_notice_reviews r where r.id in (review_id,legacy_review_id)
    and r.status='pending' and r.notice_id is null) <> 2 then
    raise exception 'Aviso novo ou legado não entrou em revisão interna.';
  end if;
  begin
    perform cali_workspace.review_partner_notice(review_id,1,true);
    raise exception 'Partner aprovou o próprio aviso.';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if exists(select 1 from cali_workspace.partner_notice_reviews r where r.id in (review_id,legacy_review_id))
    or exists(select 1 from cali_workspace.notices n where n.title in (notice_title,legacy_title)) then
    raise exception 'Cliente viu aviso pendente de revisão.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  if exists(select 1 from cali_workspace.notices n where n.title in (notice_title,legacy_title)) then
    raise exception 'Revisão interna já tinha linha de publicação.';
  end if;
  published_id := cali_workspace.review_partner_notice(review_id,1,true);
  if published_id is null or cali_workspace.review_partner_notice(review_id,1,true) is distinct from published_id then
    raise exception 'Aprovação de aviso não foi idempotente.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if not exists(select 1 from cali_workspace.notices n where n.id=published_id and n.status='published') then
    raise exception 'Empresa destinatária não viu aviso aprovado.';
  end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  if exists(select 1 from cali_workspace.notices n where n.id=published_id) then
    raise exception 'Empresa fora da revisão viu aviso aprovado.';
  end if;
end;
$notice$;
