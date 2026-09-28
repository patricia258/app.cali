-- The client can return two new four-hour options after an admin counterproposal.
create or replace function cali_workspace.client_counter_extra_visit_v1(p_request_id uuid,p_slots jsonb,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_req record; v_admin record;
begin
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and extra_visit for update;
  if not found or v_req.status<>'client_review' or not exists
    (select 1 from cali_workspace.profiles where id=auth.uid() and active and role='client' and company_id=v_req.company_id) then
    raise exception 'A contraproposta não está disponível para este acesso.';
  end if;
  perform cali_workspace.check_extra_visit_slots_v1(p_slots,48);
  update cali_workspace.scheduling_requests set requested_slots=p_slots,admin_proposed_slots='[]'::jsonb,
    status='submitted',client_note=nullif(btrim(coalesce(p_note,'')),''),reschedule_count=coalesce(reschedule_count,0)+1
    where id=p_request_id;
  for v_admin in select id from cali_workspace.profiles where role='admin' and active loop
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    values(v_req.company_id,v_admin.id,'scheduling_request','Novas opções de visita extra',
      'O cliente sugeriu duas novas datas para a visita.','scheduling_request',p_request_id,'/admin/calendario','high',false);
  end loop;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'scheduling_request_counterproposed','scheduling_request',p_request_id,
    jsonb_build_object('requested_slots',p_slots,'note',p_note));
  return jsonb_build_object('status','submitted');
end $$;
grant execute on function cali_workspace.client_counter_extra_visit_v1(uuid,jsonb,text) to authenticated;
