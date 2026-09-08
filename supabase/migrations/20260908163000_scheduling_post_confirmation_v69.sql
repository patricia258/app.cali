alter table cali_workspace.event_outcomes
  add column if not exists transcription_url text,
  add column if not exists transcription_note text;

create or replace function cali_workspace.normalize_scheduling_attendee_status_v69()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare v_source text;
begin
  if new.attendee_type = 'client' then
    select source_type into v_source from cali_workspace.events where id = new.event_id;
    if v_source = 'scheduling_request' then new.status := 'accepted'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists event_attendees_normalize_scheduling_v69 on cali_workspace.event_attendees;
create trigger event_attendees_normalize_scheduling_v69
before insert or update on cali_workspace.event_attendees
for each row execute function cali_workspace.normalize_scheduling_attendee_status_v69();

create or replace function cali_workspace.add_scheduling_organizer_attendee_v69()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare v_admin record;
begin
  if new.source_type <> 'scheduling_request' then return new; end if;
  select id,email,full_name into v_admin
  from cali_workspace.profiles
  where role='admin' and active and email is not null
  order by case when lower(email)='patricia@calirh.com' then 0 else 1 end, email
  limit 1;
  if found then
    insert into cali_workspace.event_attendees(event_id,company_id,user_id,name,email,attendee_type,status)
    values(new.id,new.company_id,v_admin.id,coalesce(v_admin.full_name,'CALI'),v_admin.email,'admin','accepted')
    on conflict(event_id,email) do update set name=excluded.name,user_id=excluded.user_id,attendee_type='admin',status='accepted';
  end if;
  return new;
end;
$$;

drop trigger if exists events_add_scheduling_organizer_v69 on cali_workspace.events;
create trigger events_add_scheduling_organizer_v69
after insert on cali_workspace.events
for each row execute function cali_workspace.add_scheduling_organizer_attendee_v69();

create or replace function cali_workspace.admin_save_event_transcription_v69(p_event_id uuid, p_url text default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, cali_workspace
as $$
declare v_event cali_workspace.events%rowtype;
begin
  if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode registrar a transcrição.'; end if;
  select * into v_event from cali_workspace.events where id=p_event_id;
  if not found or v_event.event_type <> 'meeting' then raise exception 'Reunião não encontrada.'; end if;
  if nullif(btrim(coalesce(p_url,'')),'') is not null and btrim(p_url) !~* '^https?://' then raise exception 'Informe um link válido para a transcrição.'; end if;
  insert into cali_workspace.event_outcomes(event_id,company_id,outcome,reason_category,justified,note,replacement_allowed,converted_to_virtual,marked_by,marked_at,transcription_url,transcription_note)
  values(v_event.id,v_event.company_id,'occurred',null,false,null,false,false,auth.uid(),now(),nullif(btrim(coalesce(p_url,'')),''),nullif(btrim(coalesce(p_note,'')),''))
  on conflict(event_id) do update set transcription_url=excluded.transcription_url,transcription_note=excluded.transcription_note,marked_by=auth.uid(),marked_at=now();
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_event.company_id,auth.uid(),'calendar_transcription_updated','event',v_event.id,jsonb_build_object('transcription_url',nullif(btrim(coalesce(p_url,'')),''),'transcription_note',nullif(btrim(coalesce(p_note,'')),'')));
  return jsonb_build_object('event_id',v_event.id,'transcription_url',nullif(btrim(coalesce(p_url,'')),''));
end;
$$;

create or replace function cali_workspace.prepare_scheduling_milestone_email_v69()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
begin
  if new.notification_type in ('scheduling_request','scheduling_response','scheduling_confirmed') then
    new.email_required := true;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_prepare_scheduling_milestone_email_v69 on cali_workspace.notifications;
create trigger notifications_prepare_scheduling_milestone_email_v69
before insert on cali_workspace.notifications
for each row execute function cali_workspace.prepare_scheduling_milestone_email_v69();

update cali_workspace.event_attendees ea
set status='accepted'
from cali_workspace.events e
where ea.event_id=e.id and e.source_type='scheduling_request' and ea.attendee_type='client' and ea.status<>'accepted';

insert into cali_workspace.event_attendees(event_id,company_id,user_id,name,email,attendee_type,status)
select e.id,e.company_id,p.id,coalesce(p.full_name,'CALI'),p.email,'admin','accepted'
from cali_workspace.events e
cross join lateral (
  select id,email,full_name from cali_workspace.profiles
  where role='admin' and active and email is not null
  order by case when lower(email)='patricia@calirh.com' then 0 else 1 end, email
  limit 1
) p
where e.source_type='scheduling_request'
on conflict(event_id,email) do update set name=excluded.name,user_id=excluded.user_id,attendee_type='admin',status='accepted';
