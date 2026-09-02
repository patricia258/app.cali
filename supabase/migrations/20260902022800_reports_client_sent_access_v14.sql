-- Relatórios V14 — acesso do cliente às versões efetivamente enviadas.
-- Mantém compatibilidade com relatórios legados em status published.

drop policy if exists reports_client_select on cali_workspace.reports;

create policy reports_client_select
on cali_workspace.reports
for select
to authenticated
using (
  company_id = cali_workspace.current_company_id()
  and status in ('sent','published')
);
