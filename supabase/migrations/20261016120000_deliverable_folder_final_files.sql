-- Entrega em formato de pasta (decisões da proprietária em 2026-10-13): o entregável com subtarefas chega ao cliente como
-- pasta em Documentos; cada subtarefa tem o seu documento final. O Partner PROPÕE o arquivo final; só a administradora libera.
-- Só acréscimo: coluna files.task_id, uma política de leitura para o Partner e uma função "partner_*".
alter table cali_workspace.files add column if not exists task_id uuid references cali_workspace.deliverable_tasks(id) on delete set null;
create index if not exists files_task_idx on cali_workspace.files (task_id) where task_id is not null;

drop policy if exists files_partner_task_read on cali_workspace.files;
create policy files_partner_task_read on cali_workspace.files for select to authenticated
  using ((select cali_workspace.is_partner()) and deliverable_id is not null and cali_workspace.partner_can_access(company_id, 'projects'));

create or replace function cali_workspace.partner_propose_final_file(p_deliverable_id uuid, p_task_id uuid, p_storage_path text, p_filename text, p_file_type text, p_size bigint)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_row cali_workspace.deliverables%rowtype; v_title text; v_id uuid; v_name text;
begin
  select * into v_row from cali_workspace.deliverables where id = p_deliverable_id;
  if not found then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_row.company_id, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  if p_storage_path is null or position('deliverable-chat/' || v_row.company_id::text || '/' || v_row.id::text || '/' in p_storage_path) <> 1 then raise exception 'Caminho do arquivo inválido.'; end if;
  v_title := v_row.title;
  if p_task_id is not null then
    select title into v_title from cali_workspace.deliverable_tasks where id = p_task_id and deliverable_id = p_deliverable_id;
    if v_title is null then raise exception 'Subtarefa não pertence a este entregável.'; end if;
  end if;
  if exists (select 1 from cali_workspace.files where storage_path = p_storage_path and status <> 'archived') then raise exception 'Este arquivo já foi proposto como entrega final.'; end if;
  insert into cali_workspace.files (company_id, project_id, deliverable_id, task_id, title, category, storage_path, original_filename, file_type, file_size_bytes, client_visible, status, workflow_origin, uploaded_by)
  values (v_row.company_id, v_row.project_id, v_row.id, p_task_id, left(v_title, 200), 'deliverable', p_storage_path, left(btrim(coalesce(p_filename, 'arquivo')), 200), p_file_type, p_size, false, 'draft', 'deliverable', auth.uid())
  returning id into v_id;
  select full_name into v_name from cali_workspace.staff_members where user_id = auth.uid();
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  select v_row.company_id, p.id, 'staff_final_file', 'Entrega final para a sua liberação', left(coalesce(v_name, 'Equipe CALI') || ' propôs “' || coalesce(p_filename, 'arquivo') || '” como entrega final de “' || v_title || '”.', 400), 'deliverable', v_row.id, '/admin/projetos?deliverable=' || v_row.id::text, 'high', false
    from cali_workspace.profiles p where p.role = 'admin' and p.active;
  return v_id;
end;
$$;
revoke all on function cali_workspace.partner_propose_final_file(uuid, uuid, text, text, text, bigint) from public, anon;
grant execute on function cali_workspace.partner_propose_final_file(uuid, uuid, text, text, text, bigint) to authenticated;
