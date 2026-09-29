-- Consent to request an additional online meeting is distinct from accepting its later quote.
alter table cali_workspace.scheduling_requests
  add column if not exists online_extra_request_ack_name text,
  add column if not exists online_extra_request_ack_at timestamptz;

create or replace function cali_workspace.client_request_online_extra_v2(
  p_title text,p_purpose text,p_slots jsonb,p_ack_name text,p_acknowledged boolean)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,auth,cali_workspace as $$
declare v_result jsonb; v_id uuid; v_profile record;
begin
  select id,role,active into v_profile from cali_workspace.profiles where id=auth.uid();
  if not found or not v_profile.active or v_profile.role<>'client' then raise exception 'Acesso não autorizado.'; end if;
  if not coalesce(p_acknowledged,false) or length(btrim(coalesce(p_ack_name,'')))<5 or
     btrim(p_ack_name) !~ '^[^[:space:]]+([[:space:]]+[^[:space:]]+)+$' then
    raise exception 'Informe seu nome completo e confirme que leu as condições.';
  end if;
  v_result:=cali_workspace.client_request_online_extra_v1(p_title,p_purpose,p_slots);
  v_id:=(v_result->>'id')::uuid;
  update cali_workspace.scheduling_requests
     set online_extra_request_ack_name=btrim(p_ack_name), online_extra_request_ack_at=now()
   where id=v_id and requested_by=v_profile.id and online_extra_requested;
  if not found then raise exception 'Não foi possível registrar sua ciência.'; end if;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  select company_id,v_profile.id,'online_extra_conditions_acknowledged','scheduling_request',id,
         jsonb_build_object('name',btrim(p_ack_name),'acknowledged_at',online_extra_request_ack_at)
    from cali_workspace.scheduling_requests where id=v_id;
  return v_result;
end $$;
revoke all on function cali_workspace.client_request_online_extra_v2(text,text,jsonb,text,boolean) from public,anon;
grant execute on function cali_workspace.client_request_online_extra_v2(text,text,jsonb,text,boolean) to authenticated;
revoke execute on function cali_workspace.client_request_online_extra_v1(text,text,jsonb) from authenticated;
