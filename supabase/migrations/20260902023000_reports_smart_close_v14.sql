-- Relatórios V14 — Fechamento Inteligente
-- Ciclo de vida do relatório, versionamento, alertas descartados e trilha de envio.

alter table cali_workspace.reports
  add column if not exists version integer not null default 1,
  add column if not exists revision_parent_id uuid null references cali_workspace.reports(id) on delete set null,
  add column if not exists review_started_at timestamptz null,
  add column if not exists approved_at timestamptz null,
  add column if not exists approved_by uuid null,
  add column if not exists sent_at timestamptz null,
  add column if not exists sent_by uuid null,
  add column if not exists sent_to jsonb not null default '[]'::jsonb,
  add column if not exists dismissed_alerts jsonb not null default '[]'::jsonb,
  add column if not exists internal_note text null,
  add column if not exists data_refreshed_at timestamptz null;

alter table cali_workspace.reports drop constraint if exists reports_status_check;
alter table cali_workspace.reports add constraint reports_status_check
  check (status = any (array['draft'::text,'review'::text,'approved'::text,'sent'::text,'published'::text,'archived'::text]));

alter table cali_workspace.reports drop constraint if exists reports_company_period_type_key;
create unique index if not exists reports_company_period_type_version_key
  on cali_workspace.reports(company_id, report_type, period_start, period_end, version);

alter table cali_workspace.reports drop constraint if exists reports_sent_to_check;
alter table cali_workspace.reports add constraint reports_sent_to_check check (jsonb_typeof(sent_to)='array');

alter table cali_workspace.reports drop constraint if exists reports_dismissed_alerts_check;
alter table cali_workspace.reports add constraint reports_dismissed_alerts_check check (jsonb_typeof(dismissed_alerts)='array');

create index if not exists reports_company_period_status_idx
  on cali_workspace.reports(company_id, period_start desc, status, version desc);
