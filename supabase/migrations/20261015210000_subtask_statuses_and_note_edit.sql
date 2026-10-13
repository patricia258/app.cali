-- Subtarefa com as mesmas situações do entregável (pedido da proprietária em 2026-10-13). Amplia a lista de valores aceitos
-- em deliverable_tasks.status (os antigos continuam valendo). Notas: editar e excluir (administradora qualquer nota; Partner só as dele).
-- Regra dela: o Partner não conclui nem envia ao cliente — manda para "Revisão da Patricia".
alter table cali_workspace.deliverable_tasks drop constraint if exists deliverable_tasks_status_check;
alter table cali_workspace.deliverable_tasks add constraint deliverable_tasks_status_check
  check (status = any (array['todo','doing','done','cancelled','standby','internal_review','client_review','approved']));

create or replace function cali_workspace.partner_set_task_status(p_task_id uuid, p_status text)
returns text language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid := cali_workspace.partner_task_company(p_task_id); v_row cali_workspace.deliverable_tasks%rowtype; v_name text;
begin
  if p_status not in ('todo', 'doing', 'standby', 'internal_review') then raise exception 'Somente a Patricia pode enviar ao cliente, aprovar ou concluir.' using errcode = '42501'; end if;
  select * into v_row from cali_workspace.deliverable_tasks where id = p_task_id;
  if v_row.status in ('client_review', 'approved', 'done', 'cancelled') then raise exception 'Esta subtarefa está com o cliente ou encerrada. Só a Patricia pode alterar.'; end if;
  update cali_workspace.deliverable_tasks set status = p_status, completed_at = null where id = p_task_id;
  if p_status = 'internal_review' and v_row.status <> 'internal_review' then
    select full_name into v_name from cali_workspace.staff_members where user_id = auth.uid();
    insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
    select v_company, p.id, 'staff_task_review', 'Subtarefa para a sua revisão', left(coalesce(v_name, 'Equipe CALI') || ' enviou “' || v_row.title || '” para revisão.', 400), 'deliverable', v_row.deliverable_id, '/admin/projetos?deliverable=' || v_row.deliverable_id::text, 'high', false
      from cali_workspace.profiles p where p.role = 'admin' and p.active;
  end if;
  return p_status;
end;
$$;

create or replace function cali_workspace.partner_edit_note(p_note_id uuid, p_body text)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
begin
  if not cali_workspace.is_partner() then raise exception 'Acesso restrito à Equipe CALI.' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'A nota não pode ficar vazia.'; end if;
  update cali_workspace.note_entries set body = left(btrim(p_body), 4000) where id = p_note_id and author_user_id = auth.uid();
  if not found then raise exception 'Você só pode editar as suas próprias notas.'; end if;
end;
$$;

create or replace function cali_workspace.partner_delete_note(p_note_id uuid)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
begin
  if not cali_workspace.is_partner() then raise exception 'Acesso restrito à Equipe CALI.' using errcode = '42501'; end if;
  delete from cali_workspace.note_entries where id = p_note_id and author_user_id = auth.uid();
  if not found then raise exception 'Você só pode excluir as suas próprias notas.'; end if;
end;
$$;

revoke all on function cali_workspace.partner_edit_note(uuid, text) from public, anon;
revoke all on function cali_workspace.partner_delete_note(uuid) from public, anon;
grant execute on function cali_workspace.partner_edit_note(uuid, text) to authenticated;
grant execute on function cali_workspace.partner_delete_note(uuid) to authenticated;
