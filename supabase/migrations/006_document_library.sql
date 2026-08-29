-- CALI Workspace · Biblioteca de documentos
-- Amplia arquivos para preservar capa/versão/publicação/ciência e comentários,
-- mantendo tudo no schema isolado cali_workspace.

alter table cali_workspace.files
  add column if not exists file_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists original_filename text,
  add column if not exists status text not null default 'published',
  add column if not exists requires_acknowledgement boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists source_type text not null default 'workspace',
  add column if not exists revision_of_id uuid references cali_workspace.files(id) on delete set null;

alter table cali_workspace.files drop constraint if exists files_category_check;
alter table cali_workspace.files add constraint files_category_check check (
  category in ('policy','manual','flow','guide','report','onboarding','deliverable','schedule','contract','reference','other')
);

alter table cali_workspace.files drop constraint if exists files_status_check;
alter table cali_workspace.files add constraint files_status_check check (status in ('draft','published','archived'));

alter table cali_workspace.files drop constraint if exists files_source_type_check;
alter table cali_workspace.files add constraint files_source_type_check check (source_type in ('workspace','google_drive','external'));

alter table cali_workspace.comments drop constraint if exists comments_target_type_check;
alter table cali_workspace.comments add constraint comments_target_type_check check (
  target_type in ('deliverable','report','event','project','file')
);

create table if not exists cali_workspace.document_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  file_id uuid not null references cali_workspace.files(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'viewed' check (status in ('viewed','acknowledged')),
  viewed_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (file_id, user_id)
);

create index if not exists files_company_status_created_idx on cali_workspace.files(company_id, status, created_at desc);
create index if not exists files_revision_idx on cali_workspace.files(revision_of_id) where revision_of_id is not null;
create index if not exists document_ack_company_idx on cali_workspace.document_acknowledgements(company_id, acknowledged_at desc);
create index if not exists document_ack_file_idx on cali_workspace.document_acknowledgements(file_id, acknowledged_at desc);

alter table cali_workspace.document_acknowledgements enable row level security;
grant select, insert, update, delete on cali_workspace.document_acknowledgements to authenticated, service_role;

create policy document_ack_admin_all on cali_workspace.document_acknowledgements
for all to authenticated
using (cali_workspace.is_admin())
with check (cali_workspace.is_admin());

create policy document_ack_client_select on cali_workspace.document_acknowledgements
for select to authenticated
using (company_id = cali_workspace.current_company_id() and user_id = auth.uid());

create policy document_ack_client_insert on cali_workspace.document_acknowledgements
for insert to authenticated
with check (company_id = cali_workspace.current_company_id() and user_id = auth.uid());

create policy document_ack_client_update on cali_workspace.document_acknowledgements
for update to authenticated
using (company_id = cali_workspace.current_company_id() and user_id = auth.uid())
with check (company_id = cali_workspace.current_company_id() and user_id = auth.uid());

create policy comments_client_insert_file on cali_workspace.comments
for insert to authenticated
with check (
  company_id = cali_workspace.current_company_id()
  and author_user_id = auth.uid()
  and client_visible
  and target_type = 'file'
);

create policy drive_connections_client_select on cali_workspace.drive_connections
for select to authenticated
using (company_id = cali_workspace.current_company_id() and owner_type = 'client');

create policy file_sync_jobs_client_insert on cali_workspace.file_sync_jobs
for insert to authenticated
with check (
  company_id = cali_workspace.current_company_id()
  and requested_by = auth.uid()
  and exists (
    select 1 from cali_workspace.drive_connections dc
    where dc.id = connection_id
      and dc.company_id = cali_workspace.current_company_id()
      and dc.owner_type = 'client'
      and dc.status = 'connected'
  )
);

-- O bucket continua privado. Clientes só podem ler objetos de documentos da
-- própria empresa, seguindo o padrão documents/{company_id}/arquivo.
create policy cali_workspace_private_client_documents_select
on storage.objects for select to authenticated
using (
  bucket_id = 'cali-workspace-private'
  and split_part(name, '/', 1) = 'documents'
  and split_part(name, '/', 2) = cali_workspace.current_company_id()::text
);
