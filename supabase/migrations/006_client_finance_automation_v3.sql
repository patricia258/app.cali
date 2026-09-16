-- CALI Workspace · Clientes / financeiro / comunicação automática

alter table cali_workspace.client_invites
  add column if not exists birthday date;

alter table cali_workspace.companies
  add column if not exists late_fee_percent numeric(8,4) not null default 0,
  add column if not exists daily_interest_percent numeric(8,6) not null default 0,
  add column if not exists termination_penalty_type text not null default 'none',
  add column if not exists termination_penalty_value numeric(14,4) not null default 0,
  add column if not exists termination_payment_days smallint not null default 0,
  add column if not exists termination_payment_rule text not null default 'calendar_days',
  add column if not exists automation_enabled boolean not null default false,
  add column if not exists welcome_email_enabled boolean not null default true,
  add column if not exists due_reminder_enabled boolean not null default true,
  add column if not exists overdue_email_enabled boolean not null default true,
  add column if not exists overdue_email_after_days smallint not null default 1,
  add column if not exists extrajudicial_email_enabled boolean not null default false,
  add column if not exists extrajudicial_after_days smallint,
  add column if not exists birthday_email_enabled boolean not null default false,
  add column if not exists termination_email_enabled boolean not null default true,
  add column if not exists termination_signed_at date,
  add column if not exists termination_payment_due_at date,
  add column if not exists termination_penalty_amount numeric(14,2),
  add column if not exists termination_balance_snapshot numeric(14,2);

alter table cali_workspace.companies drop constraint if exists companies_termination_penalty_type_check;
alter table cali_workspace.companies add constraint companies_termination_penalty_type_check check (termination_penalty_type in ('none','remaining_balance_percent','contract_total_percent','fixed_amount','monthly_fee_multiple'));
alter table cali_workspace.companies drop constraint if exists companies_termination_payment_rule_check;
alter table cali_workspace.companies add constraint companies_termination_payment_rule_check check (termination_payment_rule in ('calendar_days','business_days'));
alter table cali_workspace.companies drop constraint if exists companies_finance_percent_check;
alter table cali_workspace.companies add constraint companies_finance_percent_check check (late_fee_percent >= 0 and daily_interest_percent >= 0 and termination_penalty_value >= 0);
alter table cali_workspace.companies drop constraint if exists companies_automation_days_check;
alter table cali_workspace.companies add constraint companies_automation_days_check check (termination_payment_days between 0 and 365 and overdue_email_after_days between 0 and 90 and (extrajudicial_after_days is null or extrajudicial_after_days between 0 and 365));

alter table cali_workspace.billing_records
  add column if not exists late_fee_amount numeric(14,2),
  add column if not exists interest_amount numeric(14,2),
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists overdue_notified_at timestamptz,
  add column if not exists extrajudicial_notified_at timestamptz;

create table if not exists cali_workspace.communication_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  subject_template text not null,
  body_template text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cali_workspace.communication_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  billing_record_id uuid references cali_workspace.billing_records(id) on delete set null,
  template_key text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  body_html text,
  status text not null default 'pending' check (status in ('pending','sending','sent','cancelled','error')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  provider_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communication_outbox_pending_idx on cali_workspace.communication_outbox(status, scheduled_for) where status = 'pending';
create index if not exists communication_outbox_company_idx on cali_workspace.communication_outbox(company_id, created_at desc);

insert into cali_workspace.communication_templates(template_key,name,subject_template,body_template)
values
('welcome','Boas-vindas','Bem-vindo(a) ao CALI Workspace · {{empresa}}','Olá, {{nome}}. A conta da {{empresa}} já está organizada no CALI Workspace. Por aqui você acompanha agenda, entregáveis, documentos e relatórios do trabalho com a CALI.'),
('due_reminder','Lembrete de vencimento','CALI RH · vencimento em {{data_vencimento}} · {{empresa}}','Olá, {{nome}}. Este é um lembrete do próximo vencimento da {{empresa}}, previsto para {{data_vencimento}}. O relatório do ciclo e os dados de pagamento acompanham esta comunicação.'),
('overdue','Pagamento em aberto','CALI RH · pagamento em aberto · {{empresa}}','Olá, {{nome}}. Até o momento não identificamos a baixa do pagamento com vencimento em {{data_vencimento}}. Caso o pagamento já tenha sido realizado, por favor desconsidere esta mensagem ou nos encaminhe o comprovante.'),
('extrajudicial','Notificação extrajudicial','CALI RH · notificação referente a pagamento em aberto · {{empresa}}','Olá, {{nome}}. Esta comunicação registra formalmente a pendência vinculada ao contrato da {{empresa}}. Os valores, encargos e prazo aplicáveis seguem os parâmetros contratuais cadastrados na conta.'),
('termination','Encerramento da relação contratual','CALI RH · encerramento contratual · {{empresa}}','Olá, {{nome}}. Registramos o encerramento contratual da {{empresa}} em {{data_distrato}}. Esta mensagem consolida as informações finais da conta e, quando aplicável, os valores e prazos previstos para encerramento.'),
('birthday','Feliz aniversário','Um carinho da CALI no seu dia','Olá, {{nome}}. Passando para desejar um feliz aniversário e um novo ciclo cheio de boas decisões, saúde e realizações. Um abraço, Patrícia · CALI RH.')
on conflict (template_key) do nothing;

alter table cali_workspace.communication_templates enable row level security;
alter table cali_workspace.communication_outbox enable row level security;

drop policy if exists communication_templates_admin_all on cali_workspace.communication_templates;
create policy communication_templates_admin_all on cali_workspace.communication_templates for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
drop policy if exists communication_outbox_admin_all on cali_workspace.communication_outbox;
create policy communication_outbox_admin_all on cali_workspace.communication_outbox for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());

grant select, insert, update, delete on cali_workspace.communication_templates to authenticated, service_role;
grant select, insert, update, delete on cali_workspace.communication_outbox to authenticated, service_role;
