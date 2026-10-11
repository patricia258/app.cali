-- 2026-10-11 · autorizado pela proprietária.
-- Lançamento mensal por empresa dos dados que o cadastro da equipe não tem:
-- ausências (absenteísmo), horas extras, banco de horas, quadro aprovado por área e pesquisa de clima / eNPS.
-- A administradora e o cliente da própria empresa podem ler e lançar.
create table if not exists cali_workspace.team_month_metrics (
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  reference_month date not null check (extract(day from reference_month) = 1),
  planned_hours numeric check (planned_hours is null or planned_hours >= 0),
  absence_medical_hours numeric check (absence_medical_hours is null or absence_medical_hours >= 0),
  absence_leave_hours numeric check (absence_leave_hours is null or absence_leave_hours >= 0),
  absence_unjustified_hours numeric check (absence_unjustified_hours is null or absence_unjustified_hours >= 0),
  absence_accident_hours numeric check (absence_accident_hours is null or absence_accident_hours >= 0),
  overtime_hours numeric check (overtime_hours is null or overtime_hours >= 0),
  hour_bank_balance numeric,
  approved_headcount jsonb not null default '{}'::jsonb check (jsonb_typeof(approved_headcount) = 'object'),
  enps_score smallint check (enps_score is null or enps_score between -100 and 100),
  climate_score numeric(3,1) check (climate_score is null or climate_score between 0 and 10),
  climate_participation numeric check (climate_participation is null or climate_participation between 0 and 100),
  notes text,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, reference_month)
);
alter table cali_workspace.team_month_metrics enable row level security;
drop policy if exists team_month_metrics_read on cali_workspace.team_month_metrics;
drop policy if exists team_month_metrics_insert on cali_workspace.team_month_metrics;
drop policy if exists team_month_metrics_update on cali_workspace.team_month_metrics;
create policy team_month_metrics_read on cali_workspace.team_month_metrics for select to authenticated using (cali_workspace.can_access_company(company_id));
create policy team_month_metrics_insert on cali_workspace.team_month_metrics for insert to authenticated with check (cali_workspace.can_access_company(company_id));
create policy team_month_metrics_update on cali_workspace.team_month_metrics for update to authenticated using (cali_workspace.can_access_company(company_id)) with check (cali_workspace.can_access_company(company_id));
grant select, insert, update on cali_workspace.team_month_metrics to authenticated;
drop trigger if exists team_month_metrics_touch on cali_workspace.team_month_metrics;
create trigger team_month_metrics_touch before update on cali_workspace.team_month_metrics for each row execute function cali_workspace.touch_updated_at();
