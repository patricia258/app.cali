-- CALI Forms (21/10, aplicada como cali_forms_response_followup): acompanhamento das respostas pela administradora —
-- "entrei em contato" (data) e nota interna. Quem responde nunca vê nem altera esses campos.
alter table cali_workspace.form_responses add column if not exists contacted_at timestamptz;
alter table cali_workspace.form_responses add column if not exists admin_note text check (admin_note is null or length(admin_note) <= 2000);
create policy form_responses_admin_update on cali_workspace.form_responses for update to authenticated
  using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
grant update (contacted_at, admin_note) on cali_workspace.form_responses to authenticated;
