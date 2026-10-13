-- Perfil Partner — anexar arquivo na conversa do entregável (decisão da proprietária em 2026-10-13: "vai direto").
-- Só acréscimo: uma política nova de ENVIO no armazenamento privado, restrita à pasta "<empresa>/deliverables/" das
-- empresas atribuídas ao Partner com o módulo Projetos, e uma função "partner_*" que registra o arquivo.
-- Nenhuma política ou função existente muda. O Partner não apaga nem substitui arquivos.
drop policy if exists cali_workspace_private_partner_deliverable_insert on storage.objects;
create policy cali_workspace_private_partner_deliverable_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cali-workspace-private' and split_part(name, '/', 2) = 'deliverables'
              and case when split_part(name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                       then cali_workspace.partner_can_access(split_part(name, '/', 1)::uuid, 'projects') else false end);

create or replace function cali_workspace.partner_attach_deliverable_file(p_deliverable_id uuid, p_storage_path text, p_filename text, p_file_type text, p_size bigint, p_client_visible boolean default true)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_row cali_workspace.deliverables%rowtype; v_id uuid;
begin
  select * into v_row from cali_workspace.deliverables where id = p_deliverable_id;
  if not found then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_row.company_id, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  if p_storage_path is null or position(v_row.company_id::text || '/deliverables/' || v_row.id::text || '/' in p_storage_path) <> 1 then raise exception 'Caminho do arquivo inválido.'; end if;
  if char_length(btrim(coalesce(p_filename, ''))) < 1 then raise exception 'Arquivo sem nome.'; end if;
  insert into cali_workspace.files (company_id, project_id, deliverable_id, title, category, storage_path, original_filename, file_type, file_size_bytes, client_visible, status, uploaded_by)
  values (v_row.company_id, v_row.project_id, v_row.id, left(btrim(p_filename), 200), 'deliverable', p_storage_path, left(btrim(p_filename), 200), p_file_type, p_size, coalesce(p_client_visible, true), 'published', auth.uid())
  returning id into v_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_row.company_id, auth.uid(), 'staff_file_attached', 'deliverable', v_row.id, jsonb_build_object('file_id', v_id, 'filename', left(btrim(p_filename), 200), 'client_visible', coalesce(p_client_visible, true)));
  return v_id;
end;
$$;
revoke all on function cali_workspace.partner_attach_deliverable_file(uuid, text, text, text, bigint, boolean) from public, anon;
grant execute on function cali_workspace.partner_attach_deliverable_file(uuid, text, text, text, bigint, boolean) to authenticated;
