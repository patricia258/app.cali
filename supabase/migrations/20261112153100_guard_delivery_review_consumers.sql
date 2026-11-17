begin;

alter table cali_workspace.deliverable_adjustments
  add column delivery_review_revision integer check (delivery_review_revision > 0),
  add column delivery_review_requested_at timestamptz;

alter function cali_workspace.request_deliverable_adjustment(uuid, text, integer) set schema cali_session_guard;
revoke all on function cali_session_guard.request_deliverable_adjustment(uuid, text, integer)
from public, anon, authenticated, service_role;

create function cali_workspace.client_request_deliverable_adjustment_v2(
  p_deliverable_id uuid, p_review_revision integer, p_review_requested_at timestamptz,
  p_reason text, p_impact_business_days integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery cali_workspace.deliverables;
  previous cali_workspace.deliverable_adjustments;
  result jsonb;
  adjustment_reason text := btrim(coalesce(p_reason, ''));
  impact integer := coalesce(p_impact_business_days,0);
begin
  if not cali_workspace.workspace_private_access_v2() or cali_workspace.current_company_id() is null
    or not cali_workspace.client_can_view_deliverable(p_deliverable_id) then
    raise exception using errcode = '42501', message = 'Entregável indisponível para revisão.';
  end if;
  if length(adjustment_reason) not between 3 and 2000 or impact < 0 then
    raise exception using errcode = '22023', message = 'Informe um motivo de 3 a 2.000 caracteres.';
  end if;

  delivery := cali_session_guard.lock_delivery_for_review(p_deliverable_id);
  if delivery.id is null or not cali_workspace.client_can_view_deliverable(delivery.id) then
    raise exception using errcode = '42501', message = 'Entregável indisponível para revisão.';
  end if;
  if delivery.review_revision is distinct from p_review_revision
    or delivery.approval_requested_at is distinct from p_review_requested_at then
    raise exception using errcode = '40001', message = 'A revisão mudou. Atualize antes de pedir ajuste.';
  end if;
  if delivery.status = 'adjustment_requested' then
    select a.* into previous from cali_workspace.deliverable_adjustments a
    where a.deliverable_id = delivery.id and a.request_number = delivery.adjustment_count
      and a.requested_by = auth.uid() and a.reason = adjustment_reason and a.impact_business_days = impact
      and a.delivery_review_revision = p_review_revision
      and a.delivery_review_requested_at is not distinct from p_review_requested_at
    order by a.created_at desc, a.id desc limit 1;
    if found then
      return jsonb_build_object('adjustment_id',previous.id,'request_number',previous.request_number,
        'kind',previous.request_kind,'new_due_at',previous.new_due_at);
    end if;
  end if;
  if delivery.status <> 'client_review' then
    raise exception using errcode = '23514', message = 'O entregável não está aguardando validação.';
  end if;
  if delivery.review_revision > 1 and delivery.execution_status <> 'normal' then
    raise exception using errcode = '23514', message = 'O entregável está com a execução pausada.';
  end if;

  result := cali_session_guard.request_deliverable_adjustment(delivery.id,adjustment_reason,impact);
  update cali_workspace.deliverable_adjustments set delivery_review_revision = p_review_revision,
    delivery_review_requested_at = p_review_requested_at where id = (result->>'adjustment_id')::uuid;
  return result;
end;
$$;

create function cali_workspace.request_deliverable_adjustment(
  p_deliverable_id uuid, p_reason text, p_impact_business_days integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery cali_workspace.deliverables;
begin
  if not cali_workspace.workspace_private_access_v2() then
    raise exception using errcode = '42501', message = 'Entregável indisponível.';
  end if;
  if cali_workspace.is_admin() then
    delivery := cali_session_guard.lock_delivery_for_review(p_deliverable_id);
    if delivery.id is null or delivery.status in ('approved','cancelled') then
      raise exception using errcode = '23514', message = 'O entregável encerrado precisa ser reaberto antes de um ajuste.';
    end if;
    if delivery.review_revision > 1 and not delivery.client_visible then
      raise exception using errcode = '23514', message = 'Libere a revisão para validação antes de registrar ajuste.';
    end if;
    return cali_session_guard.request_deliverable_adjustment(delivery.id,p_reason,p_impact_business_days);
  end if;

  return cali_workspace.client_request_deliverable_adjustment_v2(
    p_deliverable_id,1,(select d.approval_requested_at from cali_workspace.deliverables d where d.id = p_deliverable_id),
    p_reason,p_impact_business_days
  );
end;
$$;

create or replace function cali_workspace.partner_change_deliverable_status(
  p_deliverable_id uuid, p_status text, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery cali_workspace.deliverables;
  note text := btrim(coalesce(p_note,''));
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_partner()
    or not exists (select 1 from cali_workspace.deliverables d where d.id = p_deliverable_id
      and cali_workspace.partner_can_access(d.company_id,'projects')) then
    raise exception using errcode = '42501', message = 'Entregável indisponível para este acesso.';
  end if;
  if p_status is null or p_status not in ('not_started','in_progress','standby','internal_review')
    or (p_status = 'standby' and length(note) < 3) then
    raise exception using errcode = '22023', message = 'Confira a situação e o motivo.';
  end if;
  delivery := cali_session_guard.lock_delivery_for_review(p_deliverable_id);
  if delivery.id is null or not cali_workspace.partner_can_access(delivery.company_id,'projects') then
    raise exception using errcode = '42501', message = 'Entregável indisponível para este acesso.';
  end if;
  if delivery.status in ('approved','cancelled','client_review','rebriefing') then
    raise exception using errcode = '23514', message = 'Apenas a administradora pode alterar a situação atual.';
  end if;
  if delivery.status is distinct from p_status then
    perform set_config('cali_workspace.status_note',note,true);
    update cali_workspace.deliverables set status = p_status,
      client_visible = case when review_revision > 1 then false else client_visible end
    where id = delivery.id;
  end if;
  return jsonb_build_object('deliverable_id',delivery.id,'from_status',delivery.status,'to_status',p_status);
end;
$$;

-- O endpoint piloto preserva escopo/controle de versão e reutiliza a transição comum.
do $pilot_delivery$
declare
  definition text := pg_get_functiondef('cali_workspace.v2_pilot_delivery_action(uuid,uuid,uuid,timestamptz,text,text,text,integer)'::regprocedure);
  approve_at integer := strpos(definition,$anchor$    when 'approve' then$anchor$);
  status_at integer := strpos(definition,$anchor$    when 'status' then$anchor$);
  release_anchor text := '        update cali_workspace.deliverables set client_visible=true where id=p_delivery_id;';
  reopen_at integer;
  reopen_end integer;
begin
  if approve_at = 0 or status_at <= approve_at or strpos(definition,release_anchor) = 0 then
    raise exception 'As transições do entregável piloto divergem do catálogo reconciliado.';
  end if;
  definition := substr(definition,1,approve_at-1) || $approval$
    when 'approve' then
      perform cali_workspace.client_approve_deliverable_review_v2(
        p_delivery_id,delivery.review_revision,delivery.approval_requested_at,p_score,p_note
      );
    when 'adjust' then
      perform cali_workspace.client_request_deliverable_adjustment_v2(
        p_delivery_id,delivery.review_revision,delivery.approval_requested_at,p_note,0
      );
$approval$ || substr(definition,status_at);
  definition := replace(definition,release_anchor || chr(10),'');
  reopen_at := strpos(definition,$anchor$    when 'reopen' then$anchor$);
  reopen_end := strpos(definition,$anchor$  end case;
  if pdf_document is not null and p_action in ('adjust','reopen') then$anchor$);
  if reopen_at = 0 or reopen_end <= reopen_at then
    raise exception 'A reabertura do entregável piloto diverge do catálogo reconciliado.';
  end if;
  definition := substr(definition,1,reopen_at-1) || $reopen$
    when 'reopen' then
      perform cali_workspace.reopen_deliverable_for_review_v2(p_delivery_id,delivery.review_revision,p_note);
$reopen$ || substr(definition,reopen_end);
  definition := replace(replace(replace(definition,
    '  correction bigint;' || chr(10),''),'  timer_id uuid;' || chr(10),''),'  approved_time timestamptz;' || chr(10),'');
  execute definition;
end;
$pilot_delivery$;

alter function cali_workspace.request_deliverable_adjustment(uuid, text, integer) owner to postgres;
alter function cali_workspace.client_request_deliverable_adjustment_v2(uuid, integer, timestamptz, text, integer) owner to postgres;
revoke all on function cali_workspace.request_deliverable_adjustment(uuid, text, integer),
  cali_workspace.client_request_deliverable_adjustment_v2(uuid, integer, timestamptz, text, integer)
from public, anon, authenticated, service_role;
grant execute on function cali_workspace.request_deliverable_adjustment(uuid, text, integer)
to authenticated, service_role;
grant execute on function cali_workspace.client_request_deliverable_adjustment_v2(uuid, integer, timestamptz, text, integer)
to authenticated;

notify pgrst, 'reload schema';
commit;
