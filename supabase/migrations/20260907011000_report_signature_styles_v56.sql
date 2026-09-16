alter table cali_workspace.profiles
  add column if not exists signature_style text not null default 'classic';

alter table cali_workspace.profiles drop constraint if exists profiles_signature_style_check;
alter table cali_workspace.profiles
  add constraint profiles_signature_style_check
  check (signature_style in ('classic','fluid','delicate','formal'));

create or replace function cali_workspace.update_my_profile_v56(
  p_full_name text,
  p_job_title text default null,
  p_phone text default null,
  p_avatar_url text default null,
  p_whatsapp text default null,
  p_linkedin_url text default null,
  p_instagram_url text default null,
  p_avatar_position_x numeric default 50,
  p_avatar_position_y numeric default 50,
  p_avatar_zoom numeric default 1,
  p_signature_mode text default 'generated',
  p_signature_url text default null,
  p_signature_style text default 'classic'
) returns cali_workspace.profiles
language plpgsql security definer set search_path to 'cali_workspace','public' as $$
declare updated_profile cali_workspace.profiles;
begin
  update cali_workspace.profiles set
    full_name=nullif(trim(p_full_name),''),
    job_title=nullif(trim(coalesce(p_job_title,'')),''),
    phone=nullif(trim(coalesce(p_phone,'')),''),
    avatar_url=nullif(trim(coalesce(p_avatar_url,'')),''),
    whatsapp=nullif(trim(coalesce(p_whatsapp,'')),''),
    linkedin_url=nullif(trim(coalesce(p_linkedin_url,'')),''),
    instagram_url=nullif(trim(coalesce(p_instagram_url,'')),''),
    avatar_position_x=greatest(0,least(100,coalesce(p_avatar_position_x,50))),
    avatar_position_y=greatest(0,least(100,coalesce(p_avatar_position_y,50))),
    avatar_zoom=greatest(1,least(3,coalesce(p_avatar_zoom,1))),
    signature_mode=case when p_signature_mode='uploaded' then 'uploaded' else 'generated' end,
    signature_url=nullif(trim(coalesce(p_signature_url,'')),''),
    signature_style=case when p_signature_style in ('classic','fluid','delicate','formal') then p_signature_style else 'classic' end,
    updated_at=now()
  where id=auth.uid()
  returning * into updated_profile;
  if updated_profile.id is null then raise exception 'profile_not_found'; end if;
  return updated_profile;
end;$$;
grant execute on function cali_workspace.update_my_profile_v56(text,text,text,text,text,text,text,numeric,numeric,numeric,text,text,text) to authenticated;

create or replace function cali_workspace.capture_report_approval_identity_v55() returns trigger
language plpgsql security definer set search_path to 'cali_workspace','public' as $$
declare p cali_workspace.profiles;
begin
  if new.status='approved' and old.status is distinct from 'approved' and new.approval_identity_snapshot is null then
    select * into p from cali_workspace.profiles where id=auth.uid();
    if p.id is not null then
      new.approval_identity_snapshot=jsonb_build_object(
        'user_id',p.id,'full_name',p.full_name,'job_title',p.job_title,
        'avatar_url',p.avatar_url,'avatar_position_x',p.avatar_position_x,'avatar_position_y',p.avatar_position_y,'avatar_zoom',p.avatar_zoom,
        'signature_mode',coalesce(p.signature_mode,'generated'),'signature_url',p.signature_url,'signature_style',coalesce(p.signature_style,'classic'),
        'signed_at',coalesce(new.approved_at,now())
      );
    end if;
  end if;
  return new;
end;$$;

create or replace function cali_workspace.acknowledge_report_v55(p_report_id uuid) returns jsonb
language plpgsql security definer set search_path to 'cali_workspace','public' as $$
declare p cali_workspace.profiles;r cali_workspace.reports;protocol text;snap jsonb;now_ts timestamptz:=now();
begin
  select * into p from cali_workspace.profiles where id=auth.uid() and role='client' and active=true;
  if p.id is null then raise exception 'client_profile_required'; end if;
  select * into r from cali_workspace.reports where id=p_report_id and company_id=p.company_id and status in('sent','published') for update;
  if r.id is null then raise exception 'report_not_available'; end if;
  if r.acknowledged_at is not null then
    return jsonb_build_object('acknowledged_at',r.acknowledged_at,'acknowledgement_protocol',r.acknowledgement_protocol,'identity',r.acknowledgement_identity_snapshot);
  end if;
  protocol:='CALI-CIE-'||to_char(now_ts at time zone 'America/Sao_Paulo','YYYYMMDD')||'-'||upper(substr(md5(random()::text||clock_timestamp()::text||p.id::text),1,6));
  snap:=jsonb_build_object(
    'user_id',p.id,'full_name',p.full_name,'job_title',p.job_title,
    'avatar_url',p.avatar_url,'avatar_position_x',p.avatar_position_x,'avatar_position_y',p.avatar_position_y,'avatar_zoom',p.avatar_zoom,
    'signature_mode',coalesce(p.signature_mode,'generated'),'signature_url',p.signature_url,'signature_style',coalesce(p.signature_style,'classic'),
    'signed_at',now_ts,'protocol',protocol
  );
  update cali_workspace.reports set acknowledged_at=now_ts,acknowledged_by=p.id,acknowledgement_protocol=protocol,acknowledgement_identity_snapshot=snap where id=r.id;
  insert into cali_workspace.report_client_events(report_id,company_id,user_id,event_type,metadata) values(r.id,r.company_id,p.id,'acknowledged',jsonb_build_object('protocol',protocol));
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata) values(r.company_id,p.id,'report_acknowledged','report',r.id,jsonb_build_object('protocol',protocol));
  return jsonb_build_object('acknowledged_at',now_ts,'acknowledgement_protocol',protocol,'identity',snap);
end;$$;
grant execute on function cali_workspace.acknowledge_report_v55(uuid) to authenticated;

update cali_workspace.reports
set approval_identity_snapshot=approval_identity_snapshot||jsonb_build_object('signature_style','classic')
where approval_identity_snapshot is not null and not (approval_identity_snapshot ? 'signature_style');

update cali_workspace.reports
set acknowledgement_identity_snapshot=acknowledgement_identity_snapshot||jsonb_build_object('signature_style','classic')
where acknowledgement_identity_snapshot is not null and not (acknowledgement_identity_snapshot ? 'signature_style');
