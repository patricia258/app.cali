-- A company may propose an occupied Google slot for CALI to evaluate, but it
-- cannot submit the same pending slot twice. Serialize concurrent submissions.
create or replace function cali_workspace.prevent_duplicate_pending_scheduling_v1()
returns trigger language plpgsql security definer
set search_path = pg_catalog, cali_workspace as $$
declare proposed jsonb;
begin
  if new.status not in ('submitted','client_review','reschedule_review') then return new; end if;
  if tg_op='UPDATE' and new.requested_slots is not distinct from old.requested_slots then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.company_id::text, 0));
  for proposed in select value from jsonb_array_elements(new.requested_slots) loop
    if exists (
      select 1 from cali_workspace.scheduling_requests existing
      cross join lateral jsonb_array_elements(existing.requested_slots) as other(slot)
      where existing.company_id = new.company_id
        and existing.id <> new.id
        and existing.status in ('submitted','client_review','reschedule_review')
        and (other.slot->>'startsAt')::timestamptz < (proposed->>'endsAt')::timestamptz
        and (other.slot->>'endsAt')::timestamptz > (proposed->>'startsAt')::timestamptz
    ) then
      raise exception 'Sua empresa já enviou um pedido para esse horário. Acompanhe o pedido existente na agenda.';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists prevent_duplicate_pending_scheduling_v1 on cali_workspace.scheduling_requests;
create trigger prevent_duplicate_pending_scheduling_v1
before insert or update of requested_slots on cali_workspace.scheduling_requests
for each row execute function cali_workspace.prevent_duplicate_pending_scheduling_v1();
