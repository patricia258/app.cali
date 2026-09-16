-- CALI Workspace · Agenda V72
-- Defesa contra rajadas de notificações idênticas vindas de sincronizações externas.

create index if not exists notifications_calendar_entity_recent_idx
  on cali_workspace.notifications(user_id, notification_type, entity_id, created_at desc);

create or replace function cali_workspace.prevent_duplicate_calendar_notification_v72()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
begin
  if new.notification_type = 'calendar_attendee_response' then
    -- "Pendente" representa ausência de resposta, não uma nova resposta do convidado.
    if lower(coalesce(new.body,'')) like '%deixou pendente%'
       or lower(coalesce(new.body,'')) like '%permanece sem resposta%' then
      return null;
    end if;

    if exists (
      select 1
      from cali_workspace.notifications n
      where n.user_id = new.user_id
        and n.notification_type = new.notification_type
        and n.entity_id is not distinct from new.entity_id
        and n.body = new.body
        and n.created_at >= now() - interval '10 minutes'
    ) then
      return null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_dedupe_calendar_v72 on cali_workspace.notifications;
create trigger notifications_dedupe_calendar_v72
before insert on cali_workspace.notifications
for each row execute function cali_workspace.prevent_duplicate_calendar_notification_v72();

comment on function cali_workspace.prevent_duplicate_calendar_notification_v72() is
  'Impede notificações repetidas de RSVP e descarta falso movimento de status pendente vindo da sincronização Google.';
