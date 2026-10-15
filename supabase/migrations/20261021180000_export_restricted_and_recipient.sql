-- Checklist jurídico-técnico (15/10/2026), item Exportação:
-- 1) dados restritos de colaboradores (remuneração, revisão salarial, gênero, "tem filhos?") saem separados em
--    "dados_restritos", com aviso de que só podem ir a representante autorizado da empresa;
-- 2) a exportação registra quem pediu (auth.uid) e para quem será entregue (p_recipient), no activity_log.
-- Substitui a versão de 15/10 (mesmo dia, ainda sem uso real), que tinha só p_company_id.
drop function if exists cali_workspace.admin_export_company_data(uuid);
create or replace function cali_workspace.admin_export_company_data(p_company_id uuid, p_recipient text)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare
  result jsonb;
  data jsonb := '{}'::jsonb;
  restricted jsonb;
  rows jsonb;
  table_name text;
  tables text[] := array['account_documents','account_record_feedback','account_record_message_reactions','account_record_messages',
    'account_record_reopen_requests','account_records','activity_log','agenda_change_requests','billing_records','capacity_events',
    'capacity_pauses','capacity_reviews','comments','company_fronts','data_subject_requests','deliverable_adjustments',
    'deliverable_client_dependencies','deliverable_due_revisions','deliverable_status_history','deliverable_tasks','deliverables',
    'document_acknowledgements','event_attendees','event_outcomes','events','extra_visit_expenses','extra_visit_request_attachments',
    'files','hour_entries','nps_responses','profiles','project_lifecycle_events','project_review_requests','project_workstreams',
    'projects','report_client_events','reports','satisfaction_followups','scheduling_requests','service_cycles','task_messages',
    'team_changes','team_members','team_month_metrics','team_month_snapshots','team_months','team_vacancies','team_vacancy_events'];
begin
  if not cali_workspace.is_admin() then raise exception 'Somente a administração pode exportar os dados da empresa.'; end if;
  if length(trim(coalesce(p_recipient, ''))) < 3 then raise exception 'Informe para quem os dados serão entregues.'; end if;
  select to_jsonb(c) into result from cali_workspace.companies c where c.id = p_company_id;
  if result is null then raise exception 'Empresa não encontrada.'; end if;
  foreach table_name in array tables loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from cali_workspace.%I t where t.company_id = $1', table_name) into rows using p_company_id;
    data := data || jsonb_build_object(table_name, rows);
  end loop;
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into restricted from cali_workspace.team_member_private p where p.company_id = p_company_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (p_company_id, auth.uid(), 'company_data_exported', 'company', p_company_id,
    jsonb_build_object('recipient', left(trim(p_recipient), 200), 'tables', array_length(tables, 1), 'restricted_rows', jsonb_array_length(restricted)));
  return jsonb_build_object('exported_at', now(), 'recipient', trim(p_recipient), 'company', result, 'data', data,
    'dados_restritos', jsonb_build_object(
      'aviso', 'Dados restritos de colaboradores (remuneração, data de revisão salarial, gênero e "tem filhos?"). Entregar somente a representante autorizado da empresa.',
      'team_member_private', restricted));
end $$;
revoke all on function cali_workspace.admin_export_company_data(uuid, text) from public, anon;
grant execute on function cali_workspace.admin_export_company_data(uuid, text) to authenticated;
