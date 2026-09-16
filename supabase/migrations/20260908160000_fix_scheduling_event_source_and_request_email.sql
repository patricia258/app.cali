alter table cali_workspace.events
  drop constraint if exists events_source_type_check;

alter table cali_workspace.events
  add constraint events_source_type_check
  check (source_type = any (array[
    'manual'::text,
    'deliverable'::text,
    'project'::text,
    'google'::text,
    'scheduling_request'::text
  ]));

create or replace function cali_workspace.prepare_scheduling_request_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_req cali_workspace.scheduling_requests%rowtype;
  v_company_name text;
  v_kind text;
  v_slot1 text;
  v_slot2 text;
  v_urgency text;
begin
  if new.notification_type <> 'scheduling_request' then
    return new;
  end if;

  new.email_required := true;

  if new.entity_type = 'scheduling_request' and new.entity_id is not null then
    select * into v_req
    from cali_workspace.scheduling_requests
    where id = new.entity_id;

    if found then
      select display_name into v_company_name
      from cali_workspace.companies
      where id = v_req.company_id;

      v_kind := case
        when v_req.request_mode = 'in_person' then 'visita presencial'
        else 'reunião online'
      end;

      v_urgency := case coalesce(v_req.urgency_level, 'regular')
        when 'urgent' then 'urgente'
        when 'priority' then 'prioridade'
        else 'sem urgência'
      end;

      if jsonb_array_length(coalesce(v_req.requested_slots, '[]'::jsonb)) > 0 then
        v_slot1 := to_char(
          ((v_req.requested_slots->0->>'startsAt')::timestamptz at time zone 'America/Sao_Paulo'),
          'DD/MM/YYYY "às" HH24:MI'
        );
      end if;

      if jsonb_array_length(coalesce(v_req.requested_slots, '[]'::jsonb)) > 1 then
        v_slot2 := to_char(
          ((v_req.requested_slots->1->>'startsAt')::timestamptz at time zone 'America/Sao_Paulo'),
          'DD/MM/YYYY "às" HH24:MI'
        );
      end if;

      new.title := case
        when v_req.request_mode = 'in_person' then 'Nova solicitação de visita presencial'
        else 'Nova solicitação de reunião'
      end;

      new.body := coalesce(v_company_name, 'Cliente') || ' solicitou ' || v_kind ||
        case when nullif(btrim(v_req.title), '') is not null then ': ' || btrim(v_req.title) else '' end ||
        case when v_slot1 is not null then '. Opção 1: ' || v_slot1 else '' end ||
        case when v_slot2 is not null then '. Opção 2: ' || v_slot2 else '' end ||
        '. Urgência: ' || v_urgency || '. Abra a Agenda para analisar e responder.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_prepare_scheduling_request on cali_workspace.notifications;
create trigger notifications_prepare_scheduling_request
before insert on cali_workspace.notifications
for each row
execute function cali_workspace.prepare_scheduling_request_notification();
