create or replace function cali_workspace.acknowledge_report_v55(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'cali_workspace','public'
as $$
declare
  p cali_workspace.profiles;
  r cali_workspace.reports;
  v_ack_protocol text;
  v_snapshot jsonb;
  v_now timestamptz := now();
begin
  select * into p
  from cali_workspace.profiles
  where id=auth.uid() and role='client' and active=true;

  if p.id is null then raise exception 'client_profile_required'; end if;

  select * into r
  from cali_workspace.reports
  where id=p_report_id
    and company_id=p.company_id
    and status in('sent','published')
  for update;

  if r.id is null then raise exception 'report_not_available'; end if;

  if r.acknowledged_at is not null then
    return jsonb_build_object(
      'acknowledged_at',r.acknowledged_at,
      'acknowledgement_protocol',r.acknowledgement_protocol,
      'identity',r.acknowledgement_identity_snapshot
    );
  end if;

  v_ack_protocol := 'CALI-CIE-'
    || to_char(v_now at time zone 'America/Sao_Paulo','YYYYMMDD')
    || '-'
    || upper(substr(md5(random()::text||clock_timestamp()::text||p.id::text),1,6));

  v_snapshot := jsonb_build_object(
    'user_id',p.id,
    'full_name',p.full_name,
    'job_title',p.job_title,
    'avatar_url',p.avatar_url,
    'avatar_position_x',p.avatar_position_x,
    'avatar_position_y',p.avatar_position_y,
    'avatar_zoom',p.avatar_zoom,
    'signature_mode',coalesce(p.signature_mode,'generated'),
    'signature_url',p.signature_url,
    'signature_style',coalesce(p.signature_style,'executive'),
    'signed_at',v_now,
    'protocol',v_ack_protocol
  );

  update cali_workspace.reports
  set acknowledged_at=v_now,
      acknowledged_by=p.id,
      acknowledgement_protocol=v_ack_protocol,
      acknowledgement_identity_snapshot=v_snapshot
  where id=r.id;

  insert into cali_workspace.report_client_events(report_id,company_id,user_id,event_type,metadata)
  values(r.id,r.company_id,p.id,'acknowledged',jsonb_build_object('protocol',v_ack_protocol));

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(r.company_id,p.id,'report_acknowledged','report',r.id,jsonb_build_object('protocol',v_ack_protocol));

  return jsonb_build_object(
    'acknowledged_at',v_now,
    'acknowledgement_protocol',v_ack_protocol,
    'identity',v_snapshot
  );
end;
$$;

grant execute on function cali_workspace.acknowledge_report_v55(uuid) to authenticated;
