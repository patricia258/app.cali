-- CALI Workspace · Calendário V5
-- Repara eventos manuais inválidos e impede término anterior ao início.

update cali_workspace.events
set ends_at = starts_at + interval '1 hour',
    sync_status = case when sync_status = 'error' then 'pending' else sync_status end,
    updated_at = now()
where starts_at is not null
  and (ends_at is null or ends_at <= starts_at)
  and coalesce(all_day, false) = false;

alter table cali_workspace.events
  add constraint events_end_after_start_check
  check (ends_at is null or starts_at is null or ends_at > starts_at);
