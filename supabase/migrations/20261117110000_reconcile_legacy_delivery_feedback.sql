begin;

-- O piloto mantém o identificador correction:<id>, usado pelos acompanhamentos.
-- Quando as duas projeções representam a mesma avaliação, exponha a origem privada
-- uma vez só neste leitor. Avaliações divergentes continuam visíveis separadamente.
create or replace function cali_session_guard.phase4_low_feedback(p_company_id uuid)
returns table(source text, response text, title text, score integer, comment text, rated_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select 'record', f.id::text, r.title, f.score::integer, f.comment, f.created_at
  from cali_workspace.account_record_feedback f
  join cali_workspace.account_records r on r.id = f.record_id and r.company_id = f.company_id
  where f.company_id = p_company_id and f.score between 1 and 3
  union all
  select 'deliverable', f.id::text, d.title, f.score::integer, f.comment, f.created_at
  from cali_workspace.nps_responses f
  join cali_workspace.deliverables d on d.id = f.deliverable_id and d.company_id = f.company_id
  where f.company_id = p_company_id and f.score between 1 and 3 and not exists (
    select 1 from cali_session_guard.phase4_delivery_corrections c
    where c.company_id = f.company_id and c.delivery_id = f.deliverable_id
      and c.review_revision = f.delivery_review_revision and c.approved_by = f.user_id
      and c.approved_at = f.created_at and c.score = f.score
      and c.comment is not distinct from f.comment
  )
  union all
  select 'deliverable', 'correction:' || f.id, d.title, f.score, f.comment, f.approved_at
  from cali_session_guard.phase4_delivery_corrections f
  join cali_workspace.deliverables d on d.id = f.delivery_id and d.company_id = f.company_id
  where f.company_id = p_company_id and f.score between 1 and 3 and f.approved_at is not null;
$$;

-- O piloto guardava a avaliação das correções nesta tabela privada. O acervo do
-- Cliente e os totais por revisão leem nps_responses. Copie apenas vínculos provados.
create or replace function cali_session_guard.reconcile_legacy_delivery_feedback()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  trigger_mode "char";
  inserted_count integer;
  unresolved_count integer;
begin
  lock table cali_session_guard.phase4_delivery_corrections in share row exclusive mode;
  lock table cali_workspace.nps_responses in access exclusive mode;
  select t.tgenabled into strict trigger_mode
  from pg_catalog.pg_trigger t
  where t.tgrelid = 'cali_workspace.nps_responses'::regclass
    and t.tgname = 'nps_movement_notifications' and not t.tgisinternal;

  -- Reconciliar um feedback antigo não representa um novo movimento comercial.
  if trigger_mode <> 'D' then
    alter table cali_workspace.nps_responses disable trigger nps_movement_notifications;
  end if;

  insert into cali_workspace.nps_responses (
    company_id, user_id, deliverable_id, score, comment, created_at,
    delivery_review_revision, delivery_review_requested_at
  )
  select c.company_id, c.approved_by, c.delivery_id, c.score, c.comment, c.approved_at,
    c.review_revision, c.released_at
  from cali_session_guard.phase4_delivery_corrections c
  join cali_workspace.deliverables d on d.id = c.delivery_id and d.company_id = c.company_id
  join auth.users u on u.id = c.approved_by
  join cali_workspace.profiles p on p.id = c.approved_by and p.company_id = c.company_id and p.role = 'client'
  where c.approved_at is not null and c.review_revision > 1
    and c.score between 1 and 5
    and (c.score >= 4 or length(btrim(coalesce(c.comment, ''))) >= 3)
  on conflict (deliverable_id, delivery_review_revision)
    where delivery_review_revision is not null do nothing;
  get diagnostics inserted_count = row_count;

  if trigger_mode = 'O' then
    alter table cali_workspace.nps_responses enable trigger nps_movement_notifications;
  elsif trigger_mode = 'A' then
    alter table cali_workspace.nps_responses enable always trigger nps_movement_notifications;
  elsif trigger_mode = 'R' then
    alter table cali_workspace.nps_responses enable replica trigger nps_movement_notifications;
  end if;

  -- Dados incompletos ou divergentes ficam intactos no histórico privado.
  select count(*)::integer into unresolved_count
  from cali_session_guard.phase4_delivery_corrections c
  where c.approved_at is not null and not exists (
    select 1 from cali_workspace.nps_responses n
    where n.company_id = c.company_id and n.deliverable_id = c.delivery_id
      and n.delivery_review_revision = c.review_revision and n.user_id = c.approved_by
      and n.created_at = c.approved_at and n.score = c.score
      and n.comment is not distinct from c.comment
  );
  return jsonb_build_object('inserted', inserted_count, 'unresolved', unresolved_count);
end;
$$;

alter function cali_session_guard.reconcile_legacy_delivery_feedback() owner to postgres;
revoke all on function cali_session_guard.reconcile_legacy_delivery_feedback()
from public, anon, authenticated, service_role;

select cali_session_guard.reconcile_legacy_delivery_feedback();

commit;
