-- CALI Workspace · Relatórios V62
-- Retirada segura de um fechamento já enviado quando o cliente ainda não abriu nem registrou ciência.

alter table cali_workspace.reports
  add column if not exists withdrawn_at timestamptz,
  add column if not exists withdrawn_by uuid references auth.users(id),
  add column if not exists withdrawn_reason text,
  add column if not exists withdrawn_from_status text;

create or replace function cali_workspace.withdraw_unopened_report_v62(
  p_report_id uuid,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'cali_workspace','public'
as $$
declare
  admin_profile cali_workspace.profiles;
  r cali_workspace.reports;
  has_open_event boolean := false;
  reason_text text := nullif(trim(coalesce(p_reason,'')), '');
begin
  select * into admin_profile
  from cali_workspace.profiles
  where id = auth.uid() and role = 'admin' and active = true;

  if admin_profile.id is null then
    raise exception 'admin_required';
  end if;

  select * into r
  from cali_workspace.reports
  where id = p_report_id
  for update;

  if r.id is null then
    raise exception 'report_not_found';
  end if;

  if r.status not in ('sent','published') then
    raise exception 'report_not_withdrawable';
  end if;

  select exists(
    select 1
    from cali_workspace.report_client_events e
    where e.report_id = r.id
      and e.event_type in ('opened','pdf_opened','acknowledged','drive_saved')
  ) into has_open_event;

  if coalesce(r.client_open_count,0) > 0
     or r.client_first_opened_at is not null
     or r.acknowledged_at is not null
     or has_open_event then
    raise exception 'report_already_seen';
  end if;

  update cali_workspace.reports
  set status = 'archived',
      withdrawn_at = now(),
      withdrawn_by = auth.uid(),
      withdrawn_reason = reason_text,
      withdrawn_from_status = r.status,
      updated_at = now()
  where id = r.id;

  delete from cali_workspace.notifications
  where entity_type = 'report'
    and entity_id = r.id;

  insert into cali_workspace.activity_log(
    company_id, actor_user_id, event_type, entity_type, entity_id, metadata
  ) values (
    r.company_id,
    auth.uid(),
    'report_withdrawn',
    'report',
    r.id,
    jsonb_build_object(
      'protocol', r.protocol,
      'version', r.version,
      'previous_status', r.status,
      'reason', reason_text,
      'email_already_sent', r.sent_at is not null,
      'sent_to', coalesce(to_jsonb(r.sent_to), '[]'::jsonb)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'report_id', r.id,
    'protocol', r.protocol,
    'status', 'archived',
    'withdrawn_at', now(),
    'email_recall_possible', false
  );
end;
$$;

grant execute on function cali_workspace.withdraw_unopened_report_v62(uuid,text) to authenticated;
