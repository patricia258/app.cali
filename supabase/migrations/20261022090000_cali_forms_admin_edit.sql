-- CALI Forms (22/10, aplicada como cali_forms_admin_edit_responses): a administradora completa respostas recebidas por
-- fora (texto e anexos) sem refazer o formulário. A política de update de form_responses (só administradora) já existe.
grant update (answers, respondent_name, respondent_email) on cali_workspace.form_responses to authenticated;
create policy cali_forms_admin_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'cali-forms' and cali_workspace.is_admin());
