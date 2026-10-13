-- Equipe CALI (Partner) abre os documentos das empresas atribuídas a ela com o módulo Documentos.
-- Só acréscimo: uma política nova de LEITURA na pasta "documents/<empresa>/". Nada existente muda; sem envio nem exclusão.
drop policy if exists cali_workspace_private_partner_documents_select on storage.objects;
create policy cali_workspace_private_partner_documents_select on storage.objects for select to authenticated
  using (bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) = 'documents'
         and case when split_part(name, '/', 2) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                  then cali_workspace.partner_can_access(split_part(name, '/', 2)::uuid, 'documents') else false end);
