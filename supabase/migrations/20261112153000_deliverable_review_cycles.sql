begin;

alter table cali_workspace.deliverables
  add column review_revision integer not null default 1 check (review_revision > 0);
alter table cali_workspace.nps_responses
  add column delivery_review_revision integer check (delivery_review_revision > 0 and deliverable_id is not null),
  add column delivery_review_requested_at timestamptz;
alter table cali_session_guard.phase4_delivery_corrections
  add column review_revision integer check (review_revision > 1),
  add column released_at timestamptz,
  add foreign key (company_id) references cali_workspace.companies(id) on delete cascade not valid,
  add foreign key (delivery_id) references cali_workspace.deliverables(id) on delete cascade not valid;

with correction_order as (
  select c.id, row_number() over (partition by c.delivery_id order by c.opened_at, c.id)::integer + 1 as revision
  from cali_session_guard.phase4_delivery_corrections c
)
update cali_session_guard.phase4_delivery_corrections c set review_revision = o.revision
from correction_order o where o.id = c.id;
with latest as (
  select c.delivery_id, max(c.review_revision) as revision
  from cali_session_guard.phase4_delivery_corrections c group by c.delivery_id
)
update cali_workspace.deliverables d set review_revision = l.revision
from latest l where l.delivery_id = d.id;
update cali_session_guard.phase4_delivery_corrections c set released_at = d.approval_requested_at
from cali_workspace.deliverables d
where d.id = c.delivery_id and d.review_revision = c.review_revision
  and d.status in ('client_review', 'approved');

-- A primeira avaliação legada permanece associada ao primeiro ciclo. As demais ficam no histórico.
with initial_feedback as (
  select distinct on (n.deliverable_id) n.id
  from cali_workspace.nps_responses n where n.deliverable_id is not null
  order by n.deliverable_id, n.created_at, n.id
)
update cali_workspace.nps_responses n set delivery_review_revision = 1
from initial_feedback f where f.id = n.id;

drop index cali_workspace.nps_one_per_user_deliverable;
drop index cali_workspace.nps_one_response_per_deliverable_user_idx;
create unique index nps_legacy_response_per_deliverable_user_idx
  on cali_workspace.nps_responses(deliverable_id, user_id)
  where deliverable_id is not null and delivery_review_revision is null;
create unique index nps_response_per_deliverable_review_idx
  on cali_workspace.nps_responses(deliverable_id, delivery_review_revision)
  where delivery_review_revision is not null;
create unique index delivery_correction_review_revision_idx
  on cali_session_guard.phase4_delivery_corrections(delivery_id, review_revision);

-- A ordem projeto → entrega evita inversão com o piloto e com a atualização do cronograma.
create function cali_session_guard.lock_delivery_for_review(p_delivery uuid)
returns cali_workspace.deliverables
language plpgsql
set search_path = ''
as $$
declare
  target_project_id uuid;
  delivery cali_workspace.deliverables;
begin
  select d.project_id into target_project_id from cali_workspace.deliverables d where d.id = p_delivery;
  if not found then return null; end if;
  if target_project_id is not null then
    perform 1 from cali_workspace.projects p where p.id = target_project_id for no key update;
  end if;
  select d.* into delivery from cali_workspace.deliverables d
  where d.id = p_delivery and d.project_id is not distinct from target_project_id for update;
  return delivery;
end;
$$;

-- O estado privado não pode ser publicado por uma atualização direta do formulário.
create function cali_session_guard.enforce_delivery_review_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.review_revision <> 1 then
      raise exception using errcode = '23514', message = 'A primeira revisão do entregável precisa iniciar em 1.';
    end if;
    return new;
  end if;

  if old.review_revision is distinct from new.review_revision or (old.status = 'approved' and new.status <> 'approved') then
    if old.status <> 'approved' or new.status <> 'internal_review' or new.client_visible
      or new.review_revision <> old.review_revision + 1
      or not exists (
        select 1 from cali_session_guard.phase4_delivery_corrections c
        where c.delivery_id = new.id and c.company_id = new.company_id and c.review_revision = new.review_revision
      )
    then
      raise exception using errcode = '23514', message = 'Use a reabertura com motivo para corrigir um entregável aprovado.';
    end if;
  end if;

  if new.review_revision > 1 and new.status not in ('client_review', 'adjustment_requested', 'approved') then
    if old.status is distinct from new.status then
      new.client_visible := false;
      new.approval_requested_at := null;
      update cali_session_guard.phase4_delivery_corrections set released_at = null
      where delivery_id = new.id and review_revision = new.review_revision and released_at is not null;
    elsif new.client_visible then
      raise exception using errcode = '23514', message = 'Use o envio para validação para liberar a revisão ao cliente.';
    end if;
  end if;
  if new.review_revision > 1 and (
    (new.status = 'client_review' and not new.client_visible)
    or (new.client_visible and new.status in ('client_review', 'adjustment_requested') and (
      new.approval_requested_at is null or not exists (
        select 1 from cali_session_guard.phase4_delivery_corrections c
        where c.delivery_id = new.id and c.company_id = new.company_id and c.review_revision = new.review_revision
          and c.released_at = new.approval_requested_at
      )
    ))
  ) then
    raise exception using errcode = '23514', message = 'Use o envio para validação para liberar a revisão ao cliente.';
  end if;

  if new.review_revision > 1 and new.status = 'approved' and old.status <> 'approved'
    and not exists (
      select 1 from cali_workspace.nps_responses n
      where n.deliverable_id = new.id and n.company_id = new.company_id and n.delivery_review_revision = new.review_revision
    )
  then
    raise exception using errcode = '23514', message = 'A revisão precisa da aprovação e avaliação do cliente.';
  end if;
  return new;
end;
$$;

create trigger deliverable_review_transition_v2
before insert or update of status, client_visible, review_revision, approval_requested_at on cali_workspace.deliverables
for each row execute function cali_session_guard.enforce_delivery_review_transition();

create function cali_workspace.reopen_deliverable_for_review_v2(
  p_deliverable_id uuid, p_review_revision integer, p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery cali_workspace.deliverables;
  reopen_reason text := btrim(coalesce(p_reason, ''));
  next_revision integer;
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_admin() then
    raise exception using errcode = '42501', message = 'Apenas a administradora pode reabrir o entregável.';
  end if;
  if p_review_revision is null or p_review_revision < 1 or length(reopen_reason) not between 3 and 2000 then
    raise exception using errcode = '22023', message = 'Informe um motivo de 3 a 2.000 caracteres.';
  end if;

  delivery := cali_session_guard.lock_delivery_for_review(p_deliverable_id);
  if delivery.id is null then raise exception using errcode = '42501', message = 'Entregável indisponível.'; end if;
  next_revision := p_review_revision + 1;

  if delivery.review_revision = next_revision and exists (
    select 1 from cali_session_guard.phase4_delivery_corrections c
    where c.delivery_id = delivery.id and c.review_revision = next_revision and c.opened_by = auth.uid() and c.reason = reopen_reason
  ) then
    return jsonb_build_object('deliverable_id',delivery.id,'review_revision',next_revision,'already_reopened',true,
      'status',delivery.status,'client_visible',delivery.client_visible);
  end if;
  if delivery.review_revision <> p_review_revision or delivery.status <> 'approved' or delivery.execution_status <> 'normal' then
    raise exception using errcode = '40001', message = 'O entregável mudou. Atualize antes de reabrir.';
  end if;

  insert into cali_session_guard.phase4_delivery_corrections (
    company_id,delivery_id,opened_by,reason,previous_approved_at,review_revision
  ) values (
    delivery.company_id,delivery.id,auth.uid(),reopen_reason,delivery.approved_at,next_revision
  );
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(delivery.company_id,auth.uid(),'deliverable_reopened','deliverable',delivery.id,
    jsonb_build_object('reason',reopen_reason,'review_revision',next_revision,'previous_approval',delivery.approved_at,
      'previous_review_requested',delivery.approval_requested_at,'previous_client_response',delivery.client_response_at,
      'previous_work_closed_at',delivery.work_closed_at));

  perform set_config('cali_workspace.status_note','Entregável reaberto para correção.',true);
  update cali_workspace.deliverables set
    status = 'internal_review', client_visible = false, review_revision = next_revision,
    approved_at = null, approval_requested_at = null, client_response_at = null, client_response_due_at = null,
    locked_at = null, work_closed_at = null, work_close_reason = null, work_closed_by = null
  where id = delivery.id;

  -- A atualização visível do projeto invalida a lista de quem estava com a entrega aberta.
  update cali_workspace.projects set updated_at = clock_timestamp() where id = delivery.project_id;

  return jsonb_build_object('deliverable_id',delivery.id,'review_revision',next_revision,'already_reopened',false,
    'status','internal_review','client_visible',false);
end;
$$;

create or replace function cali_workspace.change_deliverable_status(
  p_deliverable_id uuid, p_status text, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery cali_workspace.deliverables;
  changed_at timestamptz;
  response_due_at timestamptz;
  note text := btrim(coalesce(p_note, ''));
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_admin() then
    raise exception using errcode = '42501', message = 'Apenas a administradora pode alterar a situação.';
  end if;
  if p_status is null or p_status not in ('not_started','in_progress','standby','internal_review','client_review','rebriefing','approved','cancelled')
    or (p_status in ('standby','rebriefing','cancelled') and length(note) < 3) then
    raise exception using errcode = '22023', message = 'Confira a situação e o motivo.';
  end if;
  delivery := cali_session_guard.lock_delivery_for_review(p_deliverable_id);
  if delivery.id is null then raise exception using errcode = '42501', message = 'Entregável indisponível.'; end if;

  if delivery.status = p_status then
    return jsonb_build_object('deliverable_id',delivery.id,'from_status',delivery.status,'to_status',p_status,'changed_at',delivery.updated_at);
  end if;
  if delivery.status = 'approved' or (delivery.review_revision > 1 and p_status = 'approved') then
    raise exception using errcode = '23514', message = 'A revisão exige reabertura com motivo e aprovação do cliente.';
  end if;

  changed_at := clock_timestamp();
  if p_status = 'client_review' and delivery.review_revision > 1 then
    if delivery.execution_status <> 'normal' then
      raise exception using errcode = '23514', message = 'Retome o entregável antes de liberar a revisão.';
    end if;
    response_due_at := (
      cali_workspace.add_business_days((changed_at at time zone 'America/Sao_Paulo')::date,
        coalesce((select p.client_response_business_days from cali_workspace.projects p where p.id = delivery.project_id),3))
      + (changed_at at time zone 'America/Sao_Paulo')::time
    ) at time zone 'America/Sao_Paulo';
    update cali_session_guard.phase4_delivery_corrections
    set released_at = changed_at where delivery_id = delivery.id and review_revision = delivery.review_revision;
  end if;
  perform set_config('cali_workspace.status_note',note,true);
  update cali_workspace.deliverables set
    status = p_status,
    client_visible = case
      when p_status = 'client_review' then true
      when review_revision > 1 then false
      else client_visible end,
    approval_requested_at = case when p_status = 'client_review' then changed_at else approval_requested_at end,
    client_response_due_at = coalesce(response_due_at,client_response_due_at),
    approved_at = case when p_status = 'approved' then changed_at else approved_at end,
    locked_at = case when p_status = 'approved' then changed_at else locked_at end,
    cancelled_at = case when p_status = 'cancelled' then changed_at else cancelled_at end,
    cancellation_reason = case when p_status = 'cancelled' then note else cancellation_reason end
  where id = delivery.id;

  if p_status = 'rebriefing' and delivery.project_id is not null then
    update cali_workspace.projects set planning_status = 'rebriefing', updated_at = now() where id = delivery.project_id;
  elsif delivery.review_revision > 1 and delivery.client_visible and p_status <> 'client_review' then
    update cali_workspace.projects set updated_at = clock_timestamp() where id = delivery.project_id;
  end if;
  return jsonb_build_object('deliverable_id',delivery.id,'from_status',delivery.status,'to_status',p_status,'changed_at',changed_at);
end;
$$;

create function cali_workspace.change_deliverable_review_status_v2(
  p_deliverable_id uuid, p_review_revision integer, p_status text, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery cali_workspace.deliverables;
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_admin() then
    raise exception using errcode = '42501', message = 'Apenas a administradora pode alterar a situação.';
  end if;
  delivery := cali_session_guard.lock_delivery_for_review(p_deliverable_id);
  if delivery.id is null then raise exception using errcode = '42501', message = 'Entregável indisponível.'; end if;
  if delivery.review_revision is distinct from p_review_revision then
    raise exception using errcode = '40001', message = 'A revisão mudou. Atualize antes de alterar a situação.';
  end if;
  return cali_workspace.change_deliverable_status(delivery.id,p_status,p_note);
end;
$$;

create function cali_workspace.client_approve_deliverable_review_v2(
  p_deliverable_id uuid, p_review_revision integer, p_review_requested_at timestamptz,
  p_score integer, p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery cali_workspace.deliverables;
  feedback cali_workspace.nps_responses;
  company uuid := cali_workspace.current_company_id();
  approval_time timestamptz;
  feedback_comment text := nullif(btrim(p_comment), '');
  timer_id uuid;
begin
  if not cali_workspace.workspace_private_access_v2() or company is null
    or not cali_workspace.client_can_view_deliverable(p_deliverable_id) then
    raise exception using errcode = '42501', message = 'Entregável indisponível para revisão.';
  end if;
  if p_score is null or p_score not between 1 and 5 or length(feedback_comment) > 2000
    or (p_score <= 3 and coalesce(length(feedback_comment),0) < 3) then
    raise exception using errcode = '22023', message = 'Informe uma nota válida e um comentário de até 2.000 caracteres.';
  end if;
  delivery := cali_session_guard.lock_delivery_for_review(p_deliverable_id);
  if delivery.id is null or delivery.company_id <> company
    or not cali_workspace.client_can_view_deliverable(delivery.id) then
    raise exception using errcode = '42501', message = 'Entregável indisponível para revisão.';
  end if;
  if delivery.review_revision is distinct from p_review_revision
    or delivery.approval_requested_at is distinct from p_review_requested_at then
    raise exception using errcode = '40001', message = 'A revisão mudou. Atualize antes de aprovar.';
  end if;

  select n.* into feedback from cali_workspace.nps_responses n
  where n.deliverable_id = delivery.id and n.delivery_review_revision = p_review_revision;
  if delivery.status = 'approved' and feedback.id is not null then
    if feedback.user_id = auth.uid() and (feedback.score <> p_score or feedback.comment is distinct from feedback_comment) then
      raise exception using errcode = '23514', message = 'Esta revisão já tem uma avaliação registrada.';
    end if;
    return jsonb_build_object('ok',true,'deliverable_id',delivery.id,'review_revision',p_review_revision,
      'score',case when feedback.user_id = auth.uid() then feedback.score end,'approved_at',delivery.approved_at,'already_approved',true);
  end if;
  if delivery.status <> 'client_review' then
    raise exception using errcode = '23514', message = 'O entregável não está aguardando validação.';
  end if;
  if delivery.review_revision > 1 and delivery.execution_status <> 'normal' then
    raise exception using errcode = '23514', message = 'O entregável está com a execução pausada.';
  end if;

  approval_time := clock_timestamp();
  for timer_id in
    select t.id from cali_workspace.work_timers t
    where t.deliverable_id = delivery.id and t.status in ('active','paused') order by t.id for update
  loop
    perform cali_workspace.close_timer_session_at(timer_id,approval_time,'timer_closed_by_client_approval',auth.uid());
  end loop;

  insert into cali_workspace.nps_responses (
    company_id,user_id,deliverable_id,score,comment,delivery_review_revision,delivery_review_requested_at
  ) values (company,auth.uid(),delivery.id,p_score,feedback_comment,p_review_revision,p_review_requested_at);

  update cali_session_guard.phase4_delivery_corrections set
    approved_by = auth.uid(), approved_at = approval_time, score = p_score,
    comment = feedback_comment
  where delivery_id = delivery.id and review_revision = p_review_revision;

  perform set_config('cali_workspace.status_note','',true);
  update cali_workspace.deliverables set
    status = 'approved', client_response_at = approval_time, approved_at = approval_time,
    work_closed_at = coalesce(work_closed_at,approval_time),
    work_close_reason = coalesce(work_close_reason,'client_approval'), locked_at = approval_time
  where id = delivery.id;
  update cali_workspace.deliverable_tasks set status = 'done', completed_at = coalesce(completed_at,approval_time),
    work_closed_at = coalesce(work_closed_at,approval_time), work_close_reason = coalesce(work_close_reason,'client_approval')
  where deliverable_id = delivery.id and status <> 'cancelled';

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(company,auth.uid(),'deliverable_client_approved','deliverable',delivery.id,
    jsonb_build_object('review_revision',p_review_revision,'score',p_score,'comment_provided',feedback_comment is not null,'approved_at',approval_time));
  return jsonb_build_object('ok',true,'deliverable_id',delivery.id,'review_revision',p_review_revision,
    'score',p_score,'approved_at',approval_time,'already_approved',false);
end;
$$;

create or replace function cali_workspace.client_approve_deliverable_with_feedback(
  p_deliverable_id uuid, p_score integer, p_comment text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select cali_workspace.client_approve_deliverable_review_v2(
    p_deliverable_id,1,(select d.approval_requested_at from cali_workspace.deliverables d where d.id = p_deliverable_id),p_score,p_comment
  );
$$;

create function cali_workspace.read_deliverable_review_history_v2(p_deliverable_id uuid)
returns table (
  review_revision integer, opened_at timestamptz, reason text, approved_at timestamptz, score integer, comment text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_admin() then
    raise exception using errcode = '42501', message = 'Histórico de correção indisponível.';
  end if;
  return query
    select * from (
      select c.review_revision,c.opened_at,c.reason,c.approved_at,c.score,c.comment
      from cali_session_guard.phase4_delivery_corrections c where c.delivery_id = p_deliverable_id
      union all
      select 1,null::timestamptz,null::text,n.created_at,n.score::integer,n.comment
      from cali_workspace.nps_responses n where n.deliverable_id = p_deliverable_id and n.delivery_review_revision = 1
    ) as feedback_history order by feedback_history.review_revision desc;
end;
$$;

alter function cali_session_guard.lock_delivery_for_review(uuid) owner to postgres;
alter function cali_session_guard.enforce_delivery_review_transition() owner to postgres;
alter function cali_workspace.reopen_deliverable_for_review_v2(uuid, integer, text) owner to postgres;
alter function cali_workspace.change_deliverable_review_status_v2(uuid, integer, text, text) owner to postgres;
alter function cali_workspace.client_approve_deliverable_review_v2(uuid, integer, timestamptz, integer, text) owner to postgres;
alter function cali_workspace.read_deliverable_review_history_v2(uuid) owner to postgres;
revoke all on function cali_session_guard.lock_delivery_for_review(uuid), cali_session_guard.enforce_delivery_review_transition(),
  cali_workspace.reopen_deliverable_for_review_v2(uuid, integer, text),
  cali_workspace.change_deliverable_review_status_v2(uuid, integer, text, text),
  cali_workspace.client_approve_deliverable_review_v2(uuid, integer, timestamptz, integer, text),
  cali_workspace.read_deliverable_review_history_v2(uuid)
from public, anon, authenticated, service_role;
grant execute on function cali_workspace.reopen_deliverable_for_review_v2(uuid, integer, text),
  cali_workspace.change_deliverable_review_status_v2(uuid, integer, text, text),
  cali_workspace.client_approve_deliverable_review_v2(uuid, integer, timestamptz, integer, text),
  cali_workspace.read_deliverable_review_history_v2(uuid)
to authenticated;

notify pgrst, 'reload schema';
commit;
