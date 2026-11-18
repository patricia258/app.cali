do $retention$
declare
  company_a uuid := gen_random_uuid();
  company_b uuid := gen_random_uuid();
  neighbor constant uuid := 'ca110000-0000-4000-8000-000000000002';
  owned uuid := gen_random_uuid();
  shared uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  actor uuid := (current_setting('qa.claims_admin')::jsonb->>'sub')::uuid;
  pending uuid := gen_random_uuid();
  own_first text := owned::text||'/1/'||repeat('a',64)||'.pdf';
  own_second text := owned::text||'/2/'||repeat('b',64)||'.pdf';
  shared_path text := shared::text||'/1/'||repeat('c',64)||'.pdf';
  neighbor_path text := outsider::text||'/1/'||repeat('d',64)||'.pdf';
  job_a jsonb;
  job_b jsonb;
  job_a_id uuid;
  job_b_id uuid;
  lease_a uuid;
  lease_b uuid;
begin
  insert into cali_workspace.companies(id,legal_name,display_name,status,closed_at) values
    (company_a,'QA Mapa A','QA Mapa A','closed',clock_timestamp()-interval '3 days'),
    (company_b,'QA Mapa B','QA Mapa B','closed',clock_timestamp()-interval '3 days');
  insert into public.mapa_respostas(id,protocolo,c_nome,c_empresa,c_email,c_whatsapp,lgpd_aceite)
  select id,'QA-MAPA-'||id::text,'Contato sintético','Empresa sintética','mapa-qa@example.test','0000000000',true
  from unnest(array[owned,shared,outsider]) id;
  insert into cali_session_guard.phase4_mapa_scope(record_id,company_id,operator_id,expires_at) values
    (owned,company_a,actor,clock_timestamp()+interval '1 day'),
    (shared,company_b,actor,clock_timestamp()+interval '1 day'),
    (outsider,neighbor,actor,clock_timestamp()+interval '1 day');
  insert into cali_workspace.material_email_receipts(id,request_id,kind,entity_id,company_id,actor_id,content_hash,completed_at) values
    (pending,gen_random_uuid(),'mapa',owned,company_a,actor,repeat('a',64),null),
    (gen_random_uuid(),gen_random_uuid(),'mapa',shared,company_a,actor,repeat('b',64),clock_timestamp());
  insert into storage.objects(bucket_id,name,version) values
    ('cali-mapa-delivery',own_first,'qa'),('cali-mapa-delivery',own_second,'qa'),
    ('cali-mapa-delivery',shared_path,'qa'),('cali-mapa-delivery',neighbor_path,'qa');
  insert into cali_workspace.mapa_delivery_pdfs(response_id,revision,pdf_path) values
    (owned,1,own_first),(owned,2,own_second),(shared,1,shared_path),(outsider,1,neighbor_path);

  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  begin
    perform cali_workspace.admin_begin_company_elimination(company_a,'QA Mapa A',true);
    raise exception 'Iniciou eliminação durante entrega pendente do Mapa.';
  exception when object_not_in_prerequisite_state then
    if sqlerrm not like '%envios pendentes%' then raise; end if;
  end;
  reset role;
  update cali_workspace.material_email_receipts set completed_at=clock_timestamp() where id=pending;
  set local role authenticated;
  job_a := cali_workspace.admin_begin_company_elimination(company_a,'QA Mapa A',true);
  job_b := cali_workspace.admin_begin_company_elimination(company_b,'QA Mapa B',true);
  reset role;
  if job_a->>'filesPending' <> '2' or job_b->>'filesPending' <> '0' then
    raise exception 'Manifesto não separou revisões próprias e resposta compartilhada.';
  end if;
  job_a_id := (job_a->>'jobId')::uuid;
  job_b_id := (job_b->>'jobId')::uuid;
  lease_a := (cali_workspace.claim_company_elimination_job(job_a_id)->>'leaseId')::uuid;
  lease_b := (cali_workspace.claim_company_elimination_job(job_b_id)->>'leaseId')::uuid;

  begin
    update cali_session_guard.phase4_mapa_scope set company_id=neighbor where record_id=owned;
    raise exception 'Vínculo próprio mudou de empresa após claim.';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from cali_session_guard.phase4_mapa_scope where record_id=shared;
    raise exception 'Vínculo compartilhado removido após claim.';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into cali_workspace.material_email_receipts(request_id,kind,entity_id,company_id,actor_id,content_hash)
    values(gen_random_uuid(),'mapa',owned,neighbor,actor,repeat('c',64));
    raise exception 'Reserva recriou vínculo em outra empresa após claim.';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects(bucket_id,name,version)
    values('cali-mapa-delivery',owned::text||'/3/'||repeat('e',64)||'.pdf','qa');
    raise exception 'Upload de nova revisão após claim não foi cercado.';
  exception when insufficient_privilege then null;
  end;
  update cali_session_guard.phase4_mapa_scope set expires_at=clock_timestamp()+interval '2 days' where record_id=outsider;

  if (select array_agg(b.path order by b.path) from cali_workspace.company_elimination_batch(job_a_id,lease_a) b)
      is distinct from array[own_first,own_second]
    or exists (select 1 from cali_workspace.company_elimination_batch(job_b_id,lease_b)) then
    raise exception 'Lote incluiu caminho compartilhado ou da empresa vizinha.';
  end if;
  -- These rows are uncommitted metadata fixtures. Simulate deletion by Storage.
  perform set_config('storage.allow_delete_query','true',true);
  delete from storage.objects where bucket_id='cali-mapa-delivery' and name in (own_first,own_second);
  perform set_config('storage.allow_delete_query','false',true);
  if exists (select 1 from cali_workspace.company_elimination_batch(job_a_id,lease_a))
    or cali_workspace.finalize_company_elimination_job(job_a_id,lease_a)->>'state' <> 'completed' then
    raise exception 'Primeira eliminação não concluiu.';
  end if;
  if exists (select 1 from public.mapa_respostas where id=owned)
    or not exists (select 1 from public.mapa_respostas where id=shared)
    or not exists (select 1 from storage.objects where bucket_id='cali-mapa-delivery' and name=shared_path) then
    raise exception 'Expurgo de A removeu resposta compartilhada ou manteve resposta própria.';
  end if;
  if (select array_agg(b.path) from cali_workspace.company_elimination_batch(job_b_id,lease_b) b)
    is distinct from array[shared_path] then
    raise exception 'Segundo lote não reconciliou resposta agora exclusiva de B.';
  end if;
  perform set_config('storage.allow_delete_query','true',true);
  delete from storage.objects where bucket_id='cali-mapa-delivery' and name=shared_path;
  perform set_config('storage.allow_delete_query','false',true);
  if exists (select 1 from cali_workspace.company_elimination_batch(job_b_id,lease_b))
    or cali_workspace.finalize_company_elimination_job(job_b_id,lease_b)->>'state' <> 'completed' then
    raise exception 'Segunda eliminação não concluiu.';
  end if;
  if exists (select 1 from public.mapa_respostas where id=shared)
    or not exists (select 1 from public.mapa_respostas where id=outsider)
    or not exists (select 1 from storage.objects where bucket_id='cali-mapa-delivery' and name=neighbor_path) then
    raise exception 'Reconciliação final removeu a empresa vizinha ou deixou a resposta de B.';
  end if;
  begin
    insert into storage.objects(bucket_id,name,version) values('cali-mapa-delivery',own_first,'qa');
    raise exception 'Upload tardio recriou arquivo da empresa já eliminada.';
  exception when insufficient_privilege then null;
  end;
end;
$retention$;
