-- Perfil Partner — ver o logo das empresas atribuídas (pedido da proprietária em 2026-10-12: "ele tem que ver a imagem, logo da empresa").
-- Só acréscimo: uma política nova de LEITURA no armazenamento privado, restrita à pasta "<empresa>/brand/" das empresas
-- atribuídas ao Partner. Nenhuma política existente muda.
drop policy if exists cali_workspace_private_partner_brand_select on storage.objects;
create policy cali_workspace_private_partner_brand_select on storage.objects for select to authenticated
  using (bucket_id = 'cali-workspace-private' and split_part(name, '/', 2) = 'brand'
         and case when split_part(name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                  then cali_workspace.partner_can_access(split_part(name, '/', 1)::uuid) else false end);
