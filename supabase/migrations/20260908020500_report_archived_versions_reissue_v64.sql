-- CALI Workspace · Relatórios V64
-- Um relatório arquivado/retirado não deve bloquear nova emissão da mesma competência.
-- A unicidade de versão continua valendo entre registros ativos.

drop index if exists cali_workspace.reports_company_period_type_version_key;

create unique index reports_company_period_type_version_key
on cali_workspace.reports(company_id,report_type,period_start,period_end,version)
where status <> 'archived';
