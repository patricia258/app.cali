-- CALI Workspace · Relatórios
-- Preserva os fatos usados na construção de cada fechamento executivo.
-- O snapshot impede que correções posteriores em horas, NPS ou entregáveis
-- alterem silenciosamente a memória histórica do relatório salvo.

alter table cali_workspace.reports
  add column if not exists source_snapshot jsonb not null default '{}'::jsonb;

alter table cali_workspace.reports
  drop constraint if exists reports_source_snapshot_check;

alter table cali_workspace.reports
  add constraint reports_source_snapshot_check
  check (jsonb_typeof(source_snapshot) = 'object');
