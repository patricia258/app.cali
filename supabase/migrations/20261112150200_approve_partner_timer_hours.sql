begin;

-- Preserva o fluxo de aprovação manual e sua forma de retorno.
alter function cali_workspace.admin_decide_staff_hours(uuid, boolean, text) set schema cali_session_guard;
revoke all on function cali_session_guard.admin_decide_staff_hours(uuid, boolean, text)
  from public, anon, authenticated, service_role;

create function cali_workspace.admin_decide_staff_hours(
  p_submission_id uuid, p_approve boolean, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission cali_workspace.staff_hour_submissions;
  note text := nullif(btrim(p_note), '');
  decision text := case when p_approve then 'approved' else 'rejected' end;
  hour_entry_id uuid;
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_admin() then
    raise exception using errcode = '42501', message = 'Acesso restrito à administradora.';
  end if;
  if p_approve is null then
    raise exception using errcode = '22023', message = 'Informe a decisão.';
  end if;

  select s.* into submission from cali_workspace.staff_hour_submissions s
  where s.id = p_submission_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Lançamento não encontrado.';
  end if;
  if submission.timer_source_id is null then
    perform cali_session_guard.admin_decide_staff_hours(p_submission_id,p_approve,p_note);
    return;
  end if;
  if submission.status = decision and submission.decision_note is not distinct from note then return; end if;
  if submission.status <> 'pending' then
    raise exception using errcode = '23514', message = 'Este lançamento já foi decidido.';
  end if;
  if not p_approve and note is null then
    raise exception using errcode = '22023', message = 'Informe o motivo da recusa.';
  end if;

  if p_approve then
    insert into cali_workspace.hour_entries (
      company_id,project_id,cycle_id,deliverable_id,task_id,account_record_id,work_date,
      minutes,description,category,client_visible,created_by,source_type,started_at,ended_at,internal_note
    ) values (
      submission.company_id,submission.project_id,submission.timer_cycle_id,submission.deliverable_id,
      submission.timer_task_id,submission.account_record_id,submission.work_date,submission.minutes,
      submission.description,submission.category,false,submission.staff_user_id,'timer',
      submission.timer_started_at,submission.timer_ended_at,left('Justificativa: ' || submission.justification,1500)
    )
    returning id into hour_entry_id;
  end if;
  update cali_workspace.staff_hour_submissions set status = decision, decided_by = auth.uid(),
    decided_at = clock_timestamp(), decision_note = note, approved_hour_entry_id = hour_entry_id
  where id = submission.id;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(submission.company_id,auth.uid(),'staff_hours_' || decision,'staff_hour_submission',submission.id,
    jsonb_build_object('minutes',submission.minutes,'reason',note,'staff_user_id',submission.staff_user_id,
      'timer_id',submission.timer_source_id,'hour_entry_id',hour_entry_id));
end;
$$;

alter function cali_workspace.admin_decide_staff_hours(uuid, boolean, text) owner to postgres;
revoke all on function cali_workspace.admin_decide_staff_hours(uuid, boolean, text)
  from public, anon, authenticated, service_role;
grant execute on function cali_workspace.admin_decide_staff_hours(uuid, boolean, text) to authenticated, service_role;

-- Edições do legado mantêm seus efeitos. Um lançamento já aprovado exige ação da Admin.
do $partner_hour_edit$
declare
  definition text := pg_get_functiondef('cali_workspace.partner_edit_hour_entry(uuid,timestamptz,timestamptz,text,text)'::regprocedure);
  anchor text := '  if p_started_at is null or p_ended_at is null';
begin
  if strpos(definition,anchor) = 0 then
    raise exception 'A rotina de edição de horas diverge do catálogo reconciliado.';
  end if;
  execute replace(definition,anchor,$guard$
  if not cali_workspace.workspace_private_access_v2()
    or not cali_workspace.partner_can_access(v_row.company_id,'hours')
    or exists (select 1 from cali_workspace.staff_hour_submissions s where s.approved_hour_entry_id = v_row.id)
  then
    raise exception using errcode='42501',message='Este lançamento só pode ser corrigido pela administradora.';
  end if;
  if p_started_at is null or p_ended_at is null$guard$);
end;
$partner_hour_edit$;

notify pgrst, 'reload schema';
commit;
