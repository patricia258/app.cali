-- CALI Workspace · Gestão de Conta 360º

alter table cali_workspace.companies
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_neighborhood text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists has_branches boolean not null default false,
  add column if not exists branches jsonb not null default '[]'::jsonb,
  add column if not exists auto_renew boolean not null default false,
  add column if not exists billing_due_rule text not null default 'fixed_day',
  add column if not exists billing_lead_days smallint not null default 3,
  add column if not exists contract_penalty_enabled boolean not null default false,
  add column if not exists contract_penalty_text text,
  add column if not exists paused_at timestamptz,
  add column if not exists paused_reason text,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_reason text,
  add column if not exists archived_at timestamptz;

alter table cali_workspace.companies drop constraint if exists companies_status_check;
alter table cali_workspace.companies add constraint companies_status_check check (status in ('active','paused','closed','archived'));

alter table cali_workspace.companies
  drop constraint if exists companies_branches_array_check,
  drop constraint if exists companies_billing_due_rule_check,
  drop constraint if exists companies_billing_lead_days_check;

alter table cali_workspace.companies
  add constraint companies_branches_array_check check (jsonb_typeof(branches) = 'array'),
  add constraint companies_billing_due_rule_check check (billing_due_rule in ('fixed_day','first_business_day','last_business_day','custom')),
  add constraint companies_billing_lead_days_check check (billing_lead_days between 0 and 30);

alter table cali_workspace.client_invites
  add column if not exists job_title text,
  add column if not exists phone text,
  add column if not exists whatsapp text;

alter table cali_workspace.account_documents
  add column if not exists extraction_status text not null default 'not_requested',
  add column if not exists extracted_metadata jsonb not null default '{}'::jsonb,
  add column if not exists extracted_at timestamptz;

alter table cali_workspace.account_documents
  drop constraint if exists account_documents_extraction_status_check,
  drop constraint if exists account_documents_extracted_metadata_check;

alter table cali_workspace.account_documents
  add constraint account_documents_extraction_status_check check (extraction_status in ('not_requested','pending','processing','completed','review_required','error')),
  add constraint account_documents_extracted_metadata_check check (jsonb_typeof(extracted_metadata) = 'object');

create index if not exists companies_status_created_idx on cali_workspace.companies(status, created_at desc);
create index if not exists companies_closed_at_idx on cali_workspace.companies(closed_at desc) where closed_at is not null;
