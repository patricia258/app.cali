-- CALI Workspace · Ocorrências/Solicitações V20
-- Realtime para conversas/notificações e anexos privados do cliente.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='cali_workspace' and tablename='account_record_messages'
  ) then
    alter publication supabase_realtime add table cali_workspace.account_record_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='cali_workspace' and tablename='account_records'
  ) then
    alter publication supabase_realtime add table cali_workspace.account_records;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='cali_workspace' and tablename='notifications'
  ) then
    alter publication supabase_realtime add table cali_workspace.notifications;
  end if;
end $$;

drop policy if exists cali_workspace_private_client_records_select on storage.objects;
create policy cali_workspace_private_client_records_select
on storage.objects for select to authenticated
using (
  bucket_id='cali-workspace-private'
  and split_part(name,'/',1)='records'
  and split_part(name,'/',2)=cali_workspace.current_company_id()::text
);

drop policy if exists cali_workspace_private_client_records_insert on storage.objects;
create policy cali_workspace_private_client_records_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='cali-workspace-private'
  and split_part(name,'/',1)='records'
  and split_part(name,'/',2)=cali_workspace.current_company_id()::text
  and split_part(name,'/',4)=auth.uid()::text
);

drop policy if exists cali_workspace_private_client_records_delete_own on storage.objects;
create policy cali_workspace_private_client_records_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id='cali-workspace-private'
  and split_part(name,'/',1)='records'
  and split_part(name,'/',2)=cali_workspace.current_company_id()::text
  and split_part(name,'/',4)=auth.uid()::text
);
