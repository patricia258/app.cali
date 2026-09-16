create or replace function cali_workspace.normalize_scheduling_attendee_status_v69()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare v_source text;
begin
  if new.attendee_type in ('client','admin') then
    select source_type into v_source from cali_workspace.events where id = new.event_id;
    if v_source = 'scheduling_request' then new.status := 'accepted'; end if;
  end if;
  return new;
end;
$$;

update cali_workspace.event_attendees ea
set status='accepted'
from cali_workspace.events e
where ea.event_id=e.id and e.source_type='scheduling_request' and ea.attendee_type in ('client','admin') and ea.status<>'accepted';
