begin;

-- O token de anexo legado usa encodeURIComponent; a versão antiga também aceitava o caminho literal.
create function cali_api_guard.conversation_attachment_matches(body text, path text, encoded_path text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1 from regexp_matches(body, '\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|([0-9]+)\]\]', 'g') as match
    where match[2] in (path, encoded_path)
  );
$$;

create function cali_api_guard.workspace_conversation_attachment_access(path text, operation text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(path, '/');
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  company uuid;
  subject_id uuid;
  uploader uuid;
  client_access boolean;
  partner_access boolean;
  encoded_path text;
  path_bytes bytea;
  attached boolean;
  published boolean := false;
begin
  if not cali_workspace.workspace_private_access_v2() then return false; end if;
  if cali_workspace.is_admin() then return true; end if;
  if cardinality(parts) <> 5 or parts[1] not in ('records', 'deliverable-chat')
    or parts[2] !~* uuid_pattern or parts[3] !~* uuid_pattern or parts[4] !~* uuid_pattern
    or parts[5] in ('', '.', '..')
  then return false; end if;

  company := parts[2]::uuid;
  subject_id := parts[3]::uuid;
  uploader := parts[4]::uuid;
  client_access := company is not distinct from cali_workspace.current_company_id();
  partner_access := cali_workspace.partner_can_access(company, case parts[1] when 'records' then 'records' else 'projects' end);
  if not (client_access or partner_access) then return false; end if;
  if operation in ('upload', 'delete') and uploader is distinct from auth.uid() then return false; end if;

  if parts[1] = 'records' then
    if not exists (
      select 1 from cali_workspace.account_records r
      where r.id = subject_id and r.company_id = company
        and (partner_access or r.visibility = 'client')
        and (operation <> 'upload' or (
          r.workflow_status is distinct from 'completed' and r.workflow_status is distinct from 'cancelled'
          and (partner_access or r.workflow_status is distinct from 'standby')
        ))
    ) then return false; end if;
  elsif not exists (
    select 1 from cali_workspace.deliverables d
    where d.id = subject_id and d.company_id = company
      and (partner_access or cali_workspace.client_can_view_deliverable(d.id))
  ) then
    return false;
  end if;
  if operation = 'upload' then return true; end if;

  path_bytes := convert_to(path, 'UTF8');
  select string_agg(
    case when chr(b.value) ~ '^[A-Za-z0-9.!~*''()_-]$' then chr(b.value)
      else '%' || upper(lpad(to_hex(b.value),2,'0')) end, '' order by n.position)
  into encoded_path
  from generate_series(0, octet_length(path_bytes) - 1) n(position)
  cross join lateral (select get_byte(path_bytes,n.position) as value) b;

  if parts[1] = 'records' then
    select exists (
      select 1 from cali_workspace.account_record_messages m
      where m.company_id = company and m.record_id = subject_id and m.deleted_at is null
        and (operation = 'delete' or partner_access or m.visibility = 'client')
        and (m.author_role = 'admin' or m.author_id = uploader)
        and cali_api_guard.conversation_attachment_matches(m.body, path, encoded_path)
    ) into attached;
  else
    select exists (
      select 1 from cali_workspace.comments m
      where m.company_id = company and m.target_type = 'deliverable' and m.target_id = subject_id
        and (operation = 'delete' or partner_access or m.client_visible)
        and (m.source_actor <> 'client' or m.author_user_id = uploader)
        and cali_api_guard.conversation_attachment_matches(m.body, path, encoded_path)
      union all
      select 1 from cali_workspace.task_messages m
      join cali_workspace.deliverable_tasks t
        on t.id = m.task_id and t.deliverable_id = m.deliverable_id and t.company_id = m.company_id
      where m.company_id = company and m.deliverable_id = subject_id
        and (operation = 'delete' or partner_access or (t.client_visible and m.client_visible))
        and (m.author_role <> 'client' or m.author_user_id = uploader)
        and cali_api_guard.conversation_attachment_matches(m.body, path, encoded_path)
    ) into attached;
    select exists (
      select 1 from cali_workspace.files f
      where f.company_id = company and f.deliverable_id = subject_id and f.storage_path = path
        and f.client_visible and f.status = 'published'
    ) into published;
  end if;

  if operation = 'delete' then return not (attached or published); end if;
  return operation = 'read' and (attached or published);
end;
$$;

alter function cali_api_guard.conversation_attachment_matches(text, text, text) owner to postgres;
alter function cali_api_guard.workspace_conversation_attachment_access(text, text) owner to postgres;
revoke all on function cali_api_guard.conversation_attachment_matches(text, text, text),
  cali_api_guard.workspace_conversation_attachment_access(text, text)
from public, anon, authenticated, service_role;
grant execute on function cali_api_guard.workspace_conversation_attachment_access(text, text) to authenticated;

-- Os termos vigentes já são exigidos pela política comum, inclusive no recibo Partner.
drop policy v2_hosted_current_terms_for_files on storage.objects;

create policy workspace_conversation_attachment_read_v2 on storage.objects
as restrictive for select to authenticated using (
  bucket_id <> 'cali-workspace-private' or split_part(name, '/', 1) not in ('records', 'deliverable-chat')
  or case
    when storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info'])
      then cali_api_guard.workspace_conversation_attachment_access(name, 'read')
    when storage.allow_any_operation(array['object.upload'])
      then cali_api_guard.workspace_conversation_attachment_access(name, 'upload')
    when storage.allow_any_operation(array['object.delete', 'object.delete_many'])
      then cali_api_guard.workspace_conversation_attachment_access(name, 'delete')
    else false
  end
);

create policy workspace_conversation_attachment_upload_v2 on storage.objects
as restrictive for insert to authenticated with check (
  bucket_id <> 'cali-workspace-private' or split_part(name, '/', 1) not in ('records', 'deliverable-chat')
  or cali_api_guard.workspace_conversation_attachment_access(name, 'upload')
);

create policy workspace_conversation_attachment_delete_v2 on storage.objects
as restrictive for delete to authenticated using (
  bucket_id <> 'cali-workspace-private' or split_part(name, '/', 1) not in ('records', 'deliverable-chat')
  or cali_api_guard.workspace_conversation_attachment_access(name, 'delete')
);

create policy workspace_conversation_attachment_delete_draft_v2 on storage.objects
for delete to authenticated using (
  bucket_id = 'cali-workspace-private' and split_part(name, '/', 1) in ('records', 'deliverable-chat')
  and cali_api_guard.workspace_conversation_attachment_access(name, 'delete')
);

commit;
