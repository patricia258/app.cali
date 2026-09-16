-- CALI Workspace · Documentos
-- Mantém o Storage privado e permite que o cliente leia somente:
-- 1) documentos formais em documents/{company_id}/...
-- 2) anexos de entregáveis da própria empresa em {company_id}/deliverables/...
-- Nenhuma permissão de escrita é ampliada.

drop policy if exists cali_workspace_private_client_documents_select on storage.objects;

create policy cali_workspace_private_client_documents_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cali-workspace-private'
  and (
    (
      split_part(name, '/', 1) = 'documents'
      and split_part(name, '/', 2) = cali_workspace.current_company_id()::text
    )
    or
    (
      split_part(name, '/', 1) = cali_workspace.current_company_id()::text
      and split_part(name, '/', 2) = 'deliverables'
    )
  )
);
