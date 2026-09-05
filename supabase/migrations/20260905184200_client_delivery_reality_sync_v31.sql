-- CALI Workspace · Client delivery reality V31
-- Exposes only the signed-in client's own delivery feedback and enables realtime
-- for the operational tables that feed the client dashboard and deliverables page.

drop policy if exists nps_client_select_own on cali_workspace.nps_responses;
create policy nps_client_select_own
  on cali_workspace.nps_responses
  for select
  to authenticated
  using (
    company_id = cali_workspace.current_company_id()
    and user_id = auth.uid()
  );

do $$
declare
  v_table text;
  v_tables text[] := array[
    'companies',
    'projects',
    'deliverables',
    'deliverable_tasks',
    'deliverable_adjustments',
    'deliverable_status_history',
    'files',
    'hour_entries',
    'nps_responses',
    'events',
    'reports'
  ];
begin
  foreach v_table in array v_tables loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'cali_workspace'
        and c.relname = v_table
        and c.relkind in ('r','p')
    ) and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'cali_workspace'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table cali_workspace.%I', v_table);
    end if;
  end loop;
end $$;
