begin;
set local lock_timeout = '5s';

create function cali_workspace.revise_delivered_report(
  p_report_id uuid,p_reason text,p_request_acknowledgement boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r cali_workspace.reports%rowtype;
  v_reason text := nullif(btrim(p_reason),'');
  v_version integer;
  v_revision uuid;
begin
  if cali_workspace.workspace_private_access_v2() is not true or cali_workspace.is_admin() is not true then
    raise exception using errcode='42501',message='Correção restrita à administradora.';
  end if;
  if coalesce(length(v_reason),0) not between 3 and 500 or p_request_acknowledgement is null then
    raise exception using errcode='22023',message='Informe o motivo e confirme se o cliente deve registrar nova ciência.';
  end if;

  select * into r from cali_workspace.reports where id=p_report_id for update;
  if not found then raise exception using errcode='42501',message='Relatório indisponível.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('report:mail:'||r.id::text,0));
  select d.id into v_revision from cali_workspace.reports d
  where d.revision_parent_id=r.id and d.source_snapshot->>'correction_reason'=v_reason
    and d.source_snapshot->>'correction_acknowledgement' = p_request_acknowledgement::text
  order by d.version desc limit 1;
  if found and r.status = 'archived' then return v_revision; end if;

  if r.status not in ('sent','published') or exists (
    select 1 from cali_workspace.material_email_receipts m
    where m.kind='report' and m.entity_id=r.id and m.completed_at is null and m.rejected_at is null
  ) then raise exception using errcode='40001',message='Relatório indisponível para correção agora.'; end if;

  select coalesce(max(version),r.version)+1 into v_version
  from cali_workspace.reports
  where company_id=r.company_id and report_type=r.report_type and period_start=r.period_start and period_end=r.period_end;

  update cali_workspace.reports set status='archived',withdrawn_at=now(),withdrawn_by=auth.uid(),
    withdrawn_reason=v_reason,withdrawn_from_status=r.status where id=r.id;
  delete from cali_workspace.notifications where entity_type='report' and entity_id=r.id and notification_type='report_available';

  insert into cali_workspace.reports(
    company_id,cycle_id,title,reference_month,status,executive_summary,movements,decisions,risks,next_steps,
    hours_summary,source_snapshot,report_type,period_start,period_end,service_type_snapshot,service_plan_snapshot,
    contracted_hours_snapshot,version,revision_parent_id,review_started_at,dismissed_alerts,internal_note,data_refreshed_at,
    acknowledged_at,acknowledged_by,acknowledgement_protocol,acknowledgement_identity_snapshot
  ) values (
    r.company_id,r.cycle_id,r.title,r.reference_month,'review',r.executive_summary,r.movements,r.decisions,r.risks,r.next_steps,
    r.hours_summary,coalesce(r.source_snapshot,'{}'::jsonb) || jsonb_build_object(
      'workflow_mode','official','correction_of',r.id,'correction_reason',v_reason,
      'correction_acknowledgement',p_request_acknowledgement,'correction_started_at',now()
    ),r.report_type,r.period_start,r.period_end,r.service_type_snapshot,r.service_plan_snapshot,r.contracted_hours_snapshot,
    v_version,r.id,now(),r.dismissed_alerts,r.internal_note,r.data_refreshed_at,
    case when not p_request_acknowledgement then r.acknowledged_at end,
    case when not p_request_acknowledgement then r.acknowledged_by end,
    case when not p_request_acknowledgement then r.acknowledgement_protocol end,
    case when not p_request_acknowledgement then r.acknowledgement_identity_snapshot end
  ) returning id into v_revision;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values (r.company_id,auth.uid(),'report_withdrawn_for_correction','report',r.id,
    jsonb_build_object('reason',v_reason,'revision_id',v_revision,'version',v_version,'request_acknowledgement',p_request_acknowledgement));
  return v_revision;
end;
$$;

revoke all on function cali_workspace.revise_delivered_report(uuid,text,boolean) from public,anon;
grant execute on function cali_workspace.revise_delivered_report(uuid,text,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
