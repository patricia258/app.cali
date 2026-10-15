-- Aceite dos termos de uso e da política de privacidade no primeiro acesso (LGPD).
-- Só registra: a tela de aceite fica desligada no app (TERMS_VERSION vazio em src/auth/TermsGate.tsx)
-- até o advogado aprovar os textos. Cada nova versão dos textos pede um novo aceite.
create table if not exists cali_workspace.terms_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null check (length(version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  user_agent text,
  primary key (user_id, version)
);
alter table cali_workspace.terms_acceptances enable row level security;
create policy terms_acceptances_own_select on cali_workspace.terms_acceptances for select to authenticated
  using (user_id = auth.uid() or cali_workspace.is_admin());
create policy terms_acceptances_own_insert on cali_workspace.terms_acceptances for insert to authenticated
  with check (user_id = auth.uid());
grant select, insert on cali_workspace.terms_acceptances to authenticated;
