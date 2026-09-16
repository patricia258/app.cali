-- CALI Workspace · Relatórios V4 · Parte 1
-- Estrutura-base do relatório: natureza, período real e fotografia contratual.
-- Mantém reference_month para compatibilidade com o V3 enquanto a interface é evoluída.

alter table cali_workspace.reports
  add column if not exists report_type text not null default 'monthly',
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists service_type_snapshot text,
  add column if not exists service_plan_snapshot text,
  add column if not exists contracted_hours_snapshot numeric(10,2),
  add column if not exists generated_at timestamptz not null default now();

-- Compatibilidade com relatórios V3: cada reference_month antigo vira um período mensal completo.
update cali_workspace.reports
set
  period_start = coalesce(period_start, date_trunc('month', reference_month)::date),
  period_end = coalesce(period_end, (date_trunc('month', reference_month) + interval '1 month - 1 day')::date)
where period_start is null or period_end is null;

-- Fotografia do contrato no momento da evolução do modelo.
update cali_workspace.reports r
set
  service_type_snapshot = coalesce(r.service_type_snapshot, c.service_type),
  service_plan_snapshot = coalesce(r.service_plan_snapshot, c.service_plan),
  contracted_hours_snapshot = coalesce(r.contracted_hours_snapshot, c.monthly_hours_contracted)
from cali_workspace.companies c
where c.id = r.company_id;

alter table cali_workspace.reports
  alter column period_start set not null,
  alter column period_end set not null;

alter table cali_workspace.reports
  drop constraint if exists reports_report_type_check;

alter table cali_workspace.reports
  add constraint reports_report_type_check
  check (report_type in ('monthly','quarterly'));

alter table cali_workspace.reports
  drop constraint if exists reports_period_check;

alter table cali_workspace.reports
  add constraint reports_period_check
  check (period_end >= period_start);

-- O V3 permitia somente 1 relatório por empresa/mês. O V4 permite, por exemplo,
-- um mensal e um trimestral convivendo no mesmo cliente sem conflito.
alter table cali_workspace.reports
  drop constraint if exists reports_company_id_reference_month_key;

alter table cali_workspace.reports
  drop constraint if exists reports_company_period_type_key;

alter table cali_workspace.reports
  add constraint reports_company_period_type_key
  unique (company_id, report_type, period_start, period_end);

create index if not exists reports_company_period_idx
  on cali_workspace.reports(company_id, period_start desc, period_end desc);

comment on column cali_workspace.reports.report_type is 'Natureza do relatório: monthly ou quarterly.';
comment on column cali_workspace.reports.period_start is 'Primeiro dia efetivamente apurado pelo relatório.';
comment on column cali_workspace.reports.period_end is 'Último dia efetivamente apurado pelo relatório.';
comment on column cali_workspace.reports.service_type_snapshot is 'Serviço contratado congelado no relatório.';
comment on column cali_workspace.reports.service_plan_snapshot is 'Pacote/plano contratado congelado no relatório, ex.: CALI Partner ou CALI Full.';
comment on column cali_workspace.reports.contracted_hours_snapshot is 'Horas contratadas consideradas no período no momento da geração.';
comment on column cali_workspace.reports.generated_at is 'Data de geração inicial do relatório.';
