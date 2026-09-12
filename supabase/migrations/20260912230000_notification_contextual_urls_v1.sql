-- CALI Workspace · contextual notification shortcuts
create or replace function cali_workspace.normalize_notification_action_url_v1()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'cali_workspace'
as $$
begin
  if new.entity_id is not null and new.entity_type = 'deliverable' and coalesce(new.action_url, '') <> '' and position('deliverable=' in new.action_url) = 0 then
    new.action_url := new.action_url || case when position('?' in new.action_url) > 0 then '&' else '?' end || 'deliverable=' || new.entity_id::text;
  elsif new.entity_id is not null and new.entity_type = 'project' and coalesce(new.action_url, '') <> '' and position('project=' in new.action_url) = 0 then
    new.action_url := new.action_url || case when position('?' in new.action_url) > 0 then '&' else '?' end || 'project=' || new.entity_id::text;
  end if;
  return new;
end;
$$;
drop trigger if exists notifications_contextual_urls_v1 on cali_workspace.notifications;
create trigger notifications_contextual_urls_v1 before insert on cali_workspace.notifications for each row execute function cali_workspace.normalize_notification_action_url_v1();
update cali_workspace.notifications set action_url = action_url || case when position('?' in action_url) > 0 then '&' else '?' end || 'deliverable=' || entity_id::text where entity_type = 'deliverable' and entity_id is not null and coalesce(action_url, '') <> '' and position('deliverable=' in action_url) = 0;
update cali_workspace.notifications set action_url = action_url || case when position('?' in action_url) > 0 then '&' else '?' end || 'project=' || entity_id::text where entity_type = 'project' and entity_id is not null and coalesce(action_url, '') <> '' and position('project=' in action_url) = 0;
revoke all on function cali_workspace.normalize_notification_action_url_v1() from public;
grant execute on function cali_workspace.normalize_notification_action_url_v1() to authenticated;