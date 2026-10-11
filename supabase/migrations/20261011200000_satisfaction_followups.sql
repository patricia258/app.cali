-- 2026-10-11 · autorizado pela proprietária (concordou com a proposta apresentada na conversa).
-- Satisfação: registro, só para a administradora, de que uma avaliação baixa foi tratada, com tema e anotação.
-- Uma linha por avaliação (origem + id da resposta). Nada muda para o cliente; nenhuma tabela existente é alterada.
create table if not exists cali_workspace.satisfaction_followups (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('record','deliverable')),
  response_id text not null,
  company_id uuid references cali_workspace.companies(id) on delete cascade,
  theme text check (theme is null or theme in ('prazo','qualidade','comunicacao','atendimento','outro')),
  note text,
  handled_at timestamptz not null default now(),
  handled_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, response_id)
);
alter table cali_workspace.satisfaction_followups enable row level security;
drop policy if exists satisfaction_followups_admin on cali_workspace.satisfaction_followups;
create policy satisfaction_followups_admin on cali_workspace.satisfaction_followups for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
grant select, insert, update, delete on cali_workspace.satisfaction_followups to authenticated;
drop trigger if exists satisfaction_followups_touch on cali_workspace.satisfaction_followups;
create trigger satisfaction_followups_touch before update on cali_workspace.satisfaction_followups for each row execute function cali_workspace.touch_updated_at();
