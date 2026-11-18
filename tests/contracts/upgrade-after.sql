-- Executar na mesma cópia descartável depois de todas as migrations da branch.
\set ON_ERROR_STOP on
begin;
create temporary table upgrade_results(check_name text primary key,passed boolean not null,detail text);

do $$
declare
  expected cali_upgrade_probe.expected_rows;
  actual jsonb;
begin
  for expected in select * from cali_upgrade_probe.expected_rows order by relation,row_id loop
    execute format('select to_jsonb(t) from %s t where id=$1',expected.relation) into actual using expected.row_id;
    insert into upgrade_results values(expected.relation || ':' || expected.row_id,
      actual is not null and not exists (
        select 1 from jsonb_each(expected.original - expected.ignored) field
        where actual->field.key is distinct from field.value
      ),
      case when actual is null then 'ID legado desapareceu' else 'Campos originais e vínculos preservados' end);
  end loop;
end $$;

insert into upgrade_results
select 'login:' || p.email,cali_workspace.workspace_login_eligible_v2(p.id),
  'Perfil ativo que o resolvedor da Edge legada admitia'
from cali_workspace.profiles p where p.id::text like 'a17e0000-%';

insert into upgrade_results
select 'record:closure-backfill',count(*)=1,'Encerramento legado mantém uma avaliação ligada ao evento'
from cali_workspace.account_record_feedback f join cali_workspace.account_record_closures c on c.id=f.closure_id
where f.id='a17e0000-0000-4000-8000-000000000821' and c.record_id=f.record_id and c.answered_at=f.created_at;
insert into upgrade_results
select 'delivery:first-feedback-backfill',count(*)=1,'Primeiro feedback legado associado à primeira revisão'
from cali_workspace.nps_responses where id='a17e0000-0000-4000-8000-000000000701' and delivery_review_revision=1;
insert into upgrade_results
select 'delivery:remaining-feedback-history',count(*)=1,'Outra resposta legada preservada no histórico'
from cali_workspace.nps_responses where id='a17e0000-0000-4000-8000-000000000702' and delivery_review_revision is null;
insert into upgrade_results
select 'delivery:private-correction-preserved',count(*)=1,'ID, autor, datas e texto originais da correção permanecem intactos'
from cali_upgrade_probe.expected_corrections e join cali_session_guard.phase4_delivery_corrections c on c.id=e.row_id
where to_jsonb(c) @> e.original;
insert into upgrade_results
select 'delivery:historical-correction-imported',count(*)=1,'Avaliação aprovada no piloto aparece na revisão 2 com autor/texto/data exatos'
from cali_session_guard.phase4_delivery_corrections c join cali_workspace.nps_responses n
  on n.deliverable_id=c.delivery_id and n.delivery_review_revision=c.review_revision
where c.delivery_id='a17e0000-0000-4000-8000-000000000601' and n.company_id=c.company_id
  and n.user_id=c.approved_by and n.created_at=c.approved_at and n.score=c.score
  and n.comment is not distinct from c.comment and n.delivery_review_requested_at is not distinct from c.released_at
  and c.review_revision=2;
insert into upgrade_results
select 'delivery:historical-followup-once',count(*)=1 and bool_and(f.response='correction:' || c.id),
  'Acompanhamento mantém ID correction:<id> e não duplica a avaliação importada'
from cali_session_guard.phase4_low_feedback('a17e0000-0000-4000-8000-000000000101') f
join cali_session_guard.phase4_delivery_corrections c on c.delivery_id='a17e0000-0000-4000-8000-000000000601'
where f.title='Entregável legado A';
insert into upgrade_results
select 'delivery:no-historical-notification',count(*)=(select count from cali_upgrade_probe.expected_notifications),
  'Importação de feedback histórico não emite movimento novo'
from cali_workspace.notifications where entity_type='nps_response';
insert into upgrade_results
select 'timer:overlap-recovery',count(*)=1,'Timer sobreposto mantém ID, intervalo e 3600 segundos recuperáveis'
from cali_workspace.work_timers where id='a17e0000-0000-4000-8000-000000001001'
  and status='stopped' and partner_recovery_reason='legacy_overlap' and partner_counted_seconds=3600
  and stopped_at=last_seen_at and minutes=60;
insert into upgrade_results
select 'timer:latest-preserved',count(*)=1,'Timer mais recente continua ativo'
from cali_workspace.work_timers where id='a17e0000-0000-4000-8000-000000001002' and status='active' and partner_managed;
insert into upgrade_results
select 'partner:assignment-preserved',count(*)=2,'Atribuições antigas da empresa A preservadas'
from cali_workspace.staff_company_assignments where staff_id in (
  'a17e0000-0000-4000-8000-000000000305','a17e0000-0000-4000-8000-000000000306')
  and company_id='a17e0000-0000-4000-8000-000000000101';
insert into upgrade_results
select 'partner:all-assignment-fields-preserved',count(*)=3,'Todas as atribuições preservam os dois IDs e a data original'
from cali_upgrade_probe.expected_assignments e join cali_workspace.staff_company_assignments a
  on a.staff_id=e.staff_id and a.company_id=e.company_id where to_jsonb(a) @> e.original;
insert into upgrade_results
select 'partner:external-assignment-absent',count(*)=0,'Partner sem vínculo com B continua sem atribuição externa'
from cali_workspace.staff_company_assignments
where staff_id='a17e0000-0000-4000-8000-000000000306' and company_id='a17e0000-0000-4000-8000-000000000102';

-- Sessão antiga de Cliente A mantém acesso de inicialização, antes de aceitar os novos termos.
select set_config('request.jwt.claims',jsonb_build_object('sub','a17e0000-0000-4000-8000-000000000001',
  'session_id','a17e0000-0000-4000-8000-000000000401','role','authenticated','aal','aal1')::text,true);
insert into upgrade_results values('session:ordinary-client-retained',cali_workspace.workspace_session_live_v2(),
  'JWT/sessão anterior ao upgrade continua vigente para Cliente elegível');
insert into upgrade_results values('session:terms-required',not cali_workspace.workspace_private_access_v2(),
  'Nova publicação exige novo aceite, preservando acesso de inicialização');

select check_name,passed,detail from upgrade_results order by passed,check_name;
do $$
declare
  failures integer;
  checks integer;
begin
  select count(*),count(*) filter(where not passed) into checks,failures from upgrade_results;
  if failures > 0 then
    raise exception 'FAIL upgrade: % incompatibilidades em % verificações. Reconcilie os casos antes do corte.',failures,checks;
  end if;
  raise notice 'PASS upgrade: % verificações.',checks;
end $$;
rollback;
