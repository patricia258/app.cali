do $project_schedule$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  company_b constant uuid := 'ca110000-0000-4000-8000-000000000002';
  project_a uuid := gen_random_uuid();
  project_b uuid;
  workstream uuid := gen_random_uuid();
  deliverable_a uuid := gen_random_uuid();
  deliverable_b uuid := gen_random_uuid();
  dependency uuid;
  planned_start date := current_date+10;
  due timestamptz := now()+interval '20 days';
  first_received_at timestamptz;
  approval jsonb;
begin
  select p.id into strict project_b from cali_workspace.projects p where p.company_id=company_b and p.protocol='QA-PRJ-B';
  insert into cali_workspace.projects(id,company_id,name,status,planning_status,start_date)
  values(project_a,company_a,'QA planejamento','planned','draft',planned_start);
  insert into cali_workspace.project_workstreams(id,company_id,project_id,name)
  values(workstream,company_a,project_a,'QA frente planejada');
  insert into cali_workspace.deliverables(id,company_id,project_id,title,client_visible,due_at)
  values(deliverable_b,company_b,project_b,'QA entregável de outra empresa',true,due);

  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if exists(select 1 from cali_workspace.projects p where p.id=project_a) then
    raise exception 'Cronograma em rascunho ficou visível ao Cliente.';
  end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  begin
    update cali_workspace.projects set planning_status='client_review' where id=project_a;
    raise exception 'Projeto sem entregáveis foi publicado.';
  exception when raise_exception then
    if sqlerrm <> 'Inclua pelo menos um entregável antes de enviar o cronograma.' then raise; end if;
  end;
  insert into cali_workspace.deliverables(id,company_id,project_id,workstream_id,title,client_visible,due_at)
  values(deliverable_a,company_a,project_a,workstream,'QA entregável da frente',true,due);
  update cali_workspace.projects set planning_status='client_review' where id=project_a;
  if (select count(*) from cali_workspace.project_review_requests r where r.project_id=project_a and r.status='pending') <> 1 then
    raise exception 'Envio para aprovação não abriu a revisão.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  begin
    perform cali_workspace.client_approve_project_schedule(project_a);
    raise exception 'Empresa B aprovou o cronograma da empresa A.';
  exception when raise_exception then
    if sqlerrm <> 'Cronograma indisponível para aprovação.' then raise; end if;
  end;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  approval := cali_workspace.client_approve_project_schedule(project_a);
  if approval->>'business_day_shift' is distinct from '0' or approval->>'start_date' is distinct from planned_start::text
    or not exists(select 1 from cali_workspace.projects p where p.id=project_a and p.planning_status='active'
      and p.start_date=planned_start and p.client_approved_at is not null)
    or not exists(select 1 from cali_workspace.project_workstreams w where w.id=workstream and w.status='active')
    or not exists(select 1 from cali_workspace.deliverables d where d.id=deliverable_a and d.due_at=due) then
    raise exception 'A aprovação não ativou a frente ou alterou as datas planejadas.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_partner'),true);
  begin
    perform cali_workspace.partner_add_dependency(deliverable_b,'Arquivo fora da atribuição',current_date+5);
    raise exception 'Partner criou dependência fora da atribuição.';
  exception when insufficient_privilege then null;
  end;
  dependency := cali_workspace.partner_add_dependency(deliverable_a,'  Arquivo da empresa  ',current_date+5);
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if not exists(select 1 from cali_workspace.deliverable_client_dependencies d where d.id=dependency
    and d.status='pending' and d.title='Arquivo da empresa' and d.due_date=current_date+5) then
    raise exception 'Cliente não viu dependência do próprio entregável.';
  end if;
  begin
    perform cali_workspace.partner_receive_dependency(dependency);
    raise exception 'Cliente marcou a própria dependência como recebida.';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  if exists(select 1 from cali_workspace.deliverable_client_dependencies d where d.id=dependency) then
    raise exception 'Empresa B viu a dependência de A.';
  end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_partner'),true);
  perform cali_workspace.partner_receive_dependency(dependency);
  select d.received_at into strict first_received_at from cali_workspace.deliverable_client_dependencies d where d.id=dependency;
  perform cali_workspace.partner_receive_dependency(dependency);
  if first_received_at is null or not exists(select 1 from cali_workspace.deliverable_client_dependencies d where d.id=dependency
    and d.status='received' and d.received_at=first_received_at) then
    raise exception 'Recebimento da dependência perdeu o estado original no retry.';
  end if;
  reset role;
end;
$project_schedule$;
