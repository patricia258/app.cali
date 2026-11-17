begin;
set local lock_timeout = '5s';

create function cali_workspace.queue_partner_timer_email(p_outbox_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url text := cali_workspace.configured_workspace_hook('workspace-notification-email-hook');
  v_hook text;
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
  if v_hook is null or v_url is null then return; end if;
  perform net.http_post(url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),
    body := jsonb_build_object('outbox_id',p_outbox_id), timeout_milliseconds := 20000);
end;
$$;

create function cali_workspace.dispatch_partner_timer_email_on_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.template_key = 'partner_timer_presence_warning' and new.scheduled_for <= clock_timestamp() then
    perform cali_workspace.queue_partner_timer_email(new.id);
  end if;
  return new;
end;
$$;
create trigger dispatch_partner_timer_email
after insert on cali_workspace.communication_outbox
for each row execute function cali_workspace.dispatch_partner_timer_email_on_insert();

create function cali_workspace.retry_partner_timer_emails()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from cali_workspace.communication_outbox
    where template_key = 'partner_timer_presence_warning'
      and status in ('pending','error','sending') and scheduled_for <= now()
      and created_at >= now() - interval '23 hours' and updated_at < now() - interval '2 minutes'
    order by scheduled_for, id limit 50
  loop
    perform cali_workspace.queue_partner_timer_email(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function cali_workspace.queue_partner_timer_email(uuid),
  cali_workspace.dispatch_partner_timer_email_on_insert(), cali_workspace.retry_partner_timer_emails()
  from public, anon, authenticated;
grant execute on function cali_workspace.retry_partner_timer_emails() to service_role;

select cron.schedule('workspace-partner-timer-email-retry','*/5 * * * *','select cali_workspace.retry_partner_timer_emails()');
notify pgrst, 'reload schema';
commit;
