-- The V2 contractual preview can leave billing_acknowledged_at empty. The
-- extra-visit RPC validates the signed acceptance before marking the request.
create or replace function cali_workspace.enforce_extra_visit_v1()
returns trigger language plpgsql security definer set search_path=pg_catalog,cali_workspace as $$
begin
  if not new.extra_visit then return new; end if;
  if tg_op='UPDATE' and old.extra_visit and
    (new.extra_visit_fee_cents, new.extra_visit_ack_name, new.extra_visit_terms_version)
    is distinct from (old.extra_visit_fee_cents, old.extra_visit_ack_name, old.extra_visit_terms_version) then
    raise exception 'As condições aceitas da visita não podem ser alteradas.';
  end if;
  new.meeting_entitlement := 'extra'; new.contract_session_number := null;
  new.billable_extra := true; new.urgency_fee_applies := false;
  if new.billing_acknowledged_at is null then
    new.billing_acknowledged_at := now(); new.billing_acknowledged_by := new.requested_by;
  end if;
  if new.status='client_review' and (tg_op='INSERT' or new.admin_proposed_slots is distinct from old.admin_proposed_slots) then
    perform cali_workspace.check_extra_visit_slots_v1(new.admin_proposed_slots,0);
  end if;
  if new.status='confirmed' and new.confirmed_event_id is null then raise exception 'A visita confirmada precisa de evento na agenda.'; end if;
  return new;
end $$;
