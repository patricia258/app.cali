begin;

create policy workspace_storage_requires_private_access_v2 on storage.objects
  as restrictive for all to authenticated
  using (
    bucket_id not in ('cali-workspace-private', 'workspace-assets', 'cali-forms', 'cali-profiles', 'cali-proposals')
    or (select cali_workspace.workspace_private_access_v2())
  )
  with check (
    bucket_id not in ('cali-workspace-private', 'workspace-assets', 'cali-forms', 'cali-profiles', 'cali-proposals')
    or (select cali_workspace.workspace_private_access_v2())
  );

alter policy cali_workspace_private_client_documents_select on storage.objects using (
  bucket_id = 'cali-workspace-private'
  and (
    (split_part(name, '/', 1) = 'documents' and split_part(name, '/', 2) = (select cali_workspace.current_company_id())::text)
    or (split_part(name, '/', 1) = (select cali_workspace.current_company_id())::text and split_part(name, '/', 2) = 'deliverables')
  )
  and exists (
    select 1 from cali_workspace.files f
    where f.storage_path = storage.objects.name
      and f.company_id = (select cali_workspace.current_company_id())
      and f.client_visible and f.status = 'published'
  )
  and storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info'])
);

alter policy cali_workspace_private_notice_covers_select on storage.objects using (
  bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) = 'notices'
  and exists (
    select 1 from cali_workspace.notices n
    where n.cover_path in (storage.objects.name, 'private:' || storage.objects.name)
      and cali_workspace.can_read_notice(n.id)
  )
);

alter policy "CALI admin reads proposal files" on storage.objects using (bucket_id = 'cali-proposals' and (select cali_workspace.is_admin()));
alter policy "CALI admin updates proposal files" on storage.objects using (bucket_id = 'cali-proposals' and (select cali_workspace.is_admin())) with check (bucket_id = 'cali-proposals' and (select cali_workspace.is_admin()));
alter policy "CALI admin uploads proposal files" on storage.objects with check (bucket_id = 'cali-proposals' and (select cali_workspace.is_admin()));

commit;
