do $legacy_feedback$
declare
  company_a uuid;
  client_a uuid := (current_setting('qa.claims_client_a')::jsonb->>'sub')::uuid;
  client_b uuid := (current_setting('qa.claims_client_b')::jsonb->>'sub')::uuid;
  admin_actor uuid := (current_setting('qa.claims_admin')::jsonb->>'sub')::uuid;
  delivery uuid := gen_random_uuid();
  correction bigint;
  copied_id uuid;
  conflicting_id uuid := gen_random_uuid();
  approved_time timestamptz := '2026-10-01T12:00:00Z';
  released_time timestamptz := '2026-09-30T12:00:00Z';
  notifications_before bigint;
  corrections_before jsonb;
  followups_before jsonb;
  second_result jsonb;
begin
  select p.company_id into strict company_a from cali_workspace.profiles p where p.id=client_a;
  insert into cali_workspace.deliverables(id,company_id,title,status,client_visible)
  values(delivery,company_a,'QA revisão aprovada no piloto','approved',true);
  insert into cali_session_guard.phase4_delivery_corrections (
    company_id,delivery_id,opened_by,opened_at,reason,approved_by,approved_at,score,comment,review_revision,released_at
  ) values
    (company_a,delivery,admin_actor,approved_time-interval '2 days','Correção antiga',client_a,approved_time,3,'  Avaliação histórica.  ',2,released_time)
  returning id into correction;
  insert into cali_session_guard.phase4_delivery_corrections (
    company_id,delivery_id,opened_by,opened_at,reason,approved_by,approved_at,score,comment,review_revision
  ) values
    (company_a,delivery,admin_actor,approved_time+interval '1 day','Sem data da liberação',client_a,approved_time+interval '2 days',4,null,3),
    (company_a,delivery,admin_actor,approved_time+interval '3 days','Autor ausente',null,approved_time+interval '4 days',5,'Preservar sem inferir autor',4),
    (company_a,delivery,admin_actor,approved_time+interval '5 days','Registro divergente',client_a,approved_time+interval '6 days',5,'Preservar ambas as fontes',5),
    (company_a,delivery,admin_actor,approved_time+interval '7 days','Sem aprovação',null,null,null,null,6),
    (company_a,delivery,admin_actor,approved_time+interval '8 days','Autor de outra empresa',client_b,approved_time+interval '9 days',5,'Vínculo divergente preservado',7);
  insert into cali_workspace.nps_responses(id,company_id,user_id,deliverable_id,score,comment,created_at,delivery_review_revision)
  values(conflicting_id,company_a,client_b,delivery,4,'Outra avaliação já gravada',approved_time,5);

  select count(*) into notifications_before from cali_workspace.notifications;
  select jsonb_agg(to_jsonb(c) order by c.id) into corrections_before
  from cali_session_guard.phase4_delivery_corrections c where c.delivery_id=delivery;
  select jsonb_agg(to_jsonb(f) order by f.source,f.response) into followups_before
  from cali_session_guard.phase4_low_feedback(company_a) f;

  execute format('alter table cali_workspace.nps_responses add constraint qa_reject_legacy_feedback check (deliverable_id <> %L::uuid or comment is distinct from %L) not valid',
    delivery, '  Avaliação histórica.  ');
  begin
    perform cali_session_guard.reconcile_legacy_delivery_feedback();
    raise exception 'Fixture deveria rejeitar a cópia para testar o rollback.';
  exception when check_violation then null;
  end;
  if (select count(*) from cali_workspace.nps_responses n where n.deliverable_id=delivery) <> 1
    or (select t.tgenabled from pg_catalog.pg_trigger t where t.tgrelid='cali_workspace.nps_responses'::regclass and t.tgname='nps_movement_notifications') <> 'O'
  then raise exception 'Falha parcial deixou feedback ou trigger alterado.'; end if;
  alter table cali_workspace.nps_responses drop constraint qa_reject_legacy_feedback;

  perform cali_session_guard.reconcile_legacy_delivery_feedback();
  select n.id into strict copied_id from cali_workspace.nps_responses n
  where n.deliverable_id=delivery and n.delivery_review_revision=2
    and n.company_id=company_a and n.user_id=client_a and n.score=3
    and n.comment='  Avaliação histórica.  ' and n.created_at=approved_time
    and n.delivery_review_requested_at=released_time;
  if not exists(select 1 from cali_workspace.nps_responses n where n.deliverable_id=delivery
      and n.delivery_review_revision=3 and n.delivery_review_requested_at is null
      and n.user_id=client_a and n.created_at=approved_time+interval '2 days')
    or exists(select 1 from cali_workspace.nps_responses n where n.deliverable_id=delivery and n.delivery_review_revision in (4,6,7))
    or not exists(select 1 from cali_workspace.nps_responses n where n.id=conflicting_id and n.user_id=client_b and n.score=4)
  then raise exception 'Backfill inferiu autor/liberação ou sobrescreveu uma revisão.'; end if;

  second_result := cali_session_guard.reconcile_legacy_delivery_feedback();
  if (second_result->>'inserted')::integer <> 0
    or (second_result->>'unresolved')::integer < 3
    or not exists(select 1 from cali_workspace.nps_responses n where n.id=copied_id)
    or (select count(*) from cali_workspace.nps_responses n where n.deliverable_id=delivery) <> 3
    or (select count(*) from cali_workspace.notifications) <> notifications_before
    or (select jsonb_agg(to_jsonb(c) order by c.id) from cali_session_guard.phase4_delivery_corrections c where c.delivery_id=delivery) is distinct from corrections_before
    or (select jsonb_agg(to_jsonb(f) order by f.source,f.response) from cali_session_guard.phase4_low_feedback(company_a) f) is distinct from followups_before
    or (select t.tgenabled from pg_catalog.pg_trigger t where t.tgrelid='cali_workspace.nps_responses'::regclass and t.tgname='nps_movement_notifications') <> 'O'
  then raise exception 'Reexecução alterou IDs, histórico, notificações ou trigger.'; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  if (select count(*) from cali_workspace.nps_responses n where n.deliverable_id=delivery) <> 2 then
    raise exception 'Cliente não recebeu suas avaliações legadas na projeção atual.';
  end if;
  begin
    perform cali_session_guard.reconcile_legacy_delivery_feedback();
    raise exception 'Backfill privado disponível ao papel da API.';
  exception when insufficient_privilege then null;
  end;
  reset role;
end;
$legacy_feedback$;
