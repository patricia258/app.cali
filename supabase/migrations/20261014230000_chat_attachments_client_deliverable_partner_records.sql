-- Anexos nas conversas (pedido da proprietária em 2026-10-13: cliente, administradora e Equipe CALI precisam enviar e abrir).
-- Achado na conferência: o cliente não tinha permissão de ENVIAR nem de ABRIR anexos na conversa do entregável
-- (pasta "deliverable-chat/"), e o Partner não tinha nas ocorrências (pasta "records/"). Só acréscimo: 4 políticas novas.
drop policy if exists cali_workspace_private_client_chat_insert on storage.objects;
create policy cali_workspace_private_client_chat_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) = 'deliverable-chat'
              and split_part(name, '/', 2) = (cali_workspace.current_company_id())::text
              and split_part(name, '/', 4) = (auth.uid())::text);
drop policy if exists cali_workspace_private_client_chat_select on storage.objects;
create policy cali_workspace_private_client_chat_select on storage.objects for select to authenticated
  using (bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) = 'deliverable-chat'
         and split_part(name, '/', 2) = (cali_workspace.current_company_id())::text);

drop policy if exists cali_workspace_private_partner_records_insert on storage.objects;
create policy cali_workspace_private_partner_records_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) = 'records'
              and split_part(name, '/', 4) = (auth.uid())::text
              and case when split_part(name, '/', 2) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                       then cali_workspace.partner_can_access(split_part(name, '/', 2)::uuid, 'records') else false end);
drop policy if exists cali_workspace_private_partner_records_select on storage.objects;
create policy cali_workspace_private_partner_records_select on storage.objects for select to authenticated
  using (bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) = 'records'
         and case when split_part(name, '/', 2) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                  then cali_workspace.partner_can_access(split_part(name, '/', 2)::uuid, 'records') else false end);
