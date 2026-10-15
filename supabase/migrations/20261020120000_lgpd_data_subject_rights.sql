-- LGPD, art. 18: direitos do titular dentro do app (revisão de 15/10/2026). Só acréscimo. Aplicada pelo painel; cópia de registro.
-- export_my_data(): a pessoa logada baixa os próprios dados. request_data_subject_right(): pedido de acesso/correção/exclusão/outro,
-- com registro, aviso no sino e e-mail para a administradora (prazo de resposta indicado: 15 dias).
create table if not exists cali_workspace.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references cali_workspace.companies(id) on delete set null,
  kind text not null check (kind in ('access', 'correction', 'deletion', 'other')),
  details text not null check (char_length(btrim(details)) between 5 and 2000),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  answer text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table cali_workspace.data_subject_requests enable row level security;
create policy data_subject_requests_admin_all on cali_workspace.data_subject_requests for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
create policy data_subject_requests_own_read on cali_workspace.data_subject_requests for select to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on cali_workspace.data_subject_requests to authenticated;
-- Funções export_my_data() (volatile) e request_data_subject_right(text, text): ver definição aplicada no banco
-- (migrações lgpd_data_subject_rights e lgpd_export_my_data_volatile de 15/10/2026).
-- Complemento (15/10/2026): admin_answer_data_subject_request(uuid, text) grava a resposta, fecha o pedido e avisa quem pediu;
-- o aviso do pedido para a administradora passou a apontar para /admin/auditoria. Definições aplicadas no banco
-- (migração lgpd_answer_data_subject_request).
