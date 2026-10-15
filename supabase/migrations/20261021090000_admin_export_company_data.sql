-- Fim de contrato (LGPD): a administradora baixa todos os dados de uma empresa para entregar ao cliente.
-- Fica de fora o que é interno da CALI ou segredo de integração: anotações internas (deliverable_notes, task_notes, note_entries),
-- credenciais/conexões (Google, Drive), fila de e-mails, notificações e controles da equipe CALI (staff_*).
-- Cada exportação fica registrada no histórico (activity_log: company_data_exported).
create or replace function cali_workspace.admin_export_company_data(p_company_id uuid)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare
  result jsonb;
  data jsonb := '{}'::jsonb;
  rows jsonb;
  table_name text;
  tables text[] := array['account_documents','account_record_feedback','account_record_message_reactions','account_record_messages',
    'account_record_reopen_requests','account_records','activity_log','agenda_change_requests','billing_records','capacity_events',
    'capacity_pauses','capacity_reviews','comments','company_fronts','data_subject_requests','deliverable_adjustments',
    'deliverable_client_dependencies','deliverable_due_revisions','deliverable_status_history','deliverable_tasks','deliverables',
    'document_acknowledgements','event_attendees','event_outcomes','events','extra_visit_expenses','extra_visit_request_attachments',
    'files','hour_entries','nps_responses','profiles','project_lifecycle_events','project_review_requests','project_workstreams',
    'projects','report_client_events','reports','satisfaction_followups','scheduling_requests','service_cycles','task_messages',
    'team_changes','team_member_private','team_members','team_month_metrics','team_month_snapshots','team_months','team_vacancies',
    'team_vacancy_events'];
begin
  if not cali_workspace.is_admin() then raise exception 'Somente a administração pode exportar os dados da empresa.'; end if;
  select to_jsonb(c) into result from cali_workspace.companies c where c.id = p_company_id;
  if result is null then raise exception 'Empresa não encontrada.'; end if;
  foreach table_name in array tables loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from cali_workspace.%I t where t.company_id = $1', table_name) into rows using p_company_id;
    data := data || jsonb_build_object(table_name, rows);
  end loop;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (p_company_id, auth.uid(), 'company_data_exported', 'company', p_company_id, jsonb_build_object('tables', array_length(tables, 1)));
  return jsonb_build_object('exported_at', now(), 'company', result, 'data', data);
end $$;
revoke all on function cali_workspace.admin_export_company_data(uuid) from public, anon;
grant execute on function cali_workspace.admin_export_company_data(uuid) to authenticated;
