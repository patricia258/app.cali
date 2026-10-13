-- Mapa de ação e reação entre administradora e cliente: avisos que faltavam.
-- Só acréscimo: quatro funções novas e quatro gatilhos novos. Nenhuma função ou gatilho existente muda.
-- Todo gatilho engole o próprio erro: um aviso que falha nunca impede a gravação principal.
-- 1) CALI registra uma dependência do cliente  -> cliente recebe aviso + e-mail.
-- 2) CALI reprograma o prazo de um entregável   -> cliente recebe aviso + e-mail com o novo prazo e a justificativa.
-- 3) Subtarefa passa a "Aguardando o cliente"   -> cliente recebe aviso + e-mail.
-- 4) Cliente confirma recebimento de documento  -> administradora recebe aviso (sem e-mail).

create or replace function cali_workspace.notify_client_dependency_created()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_title text; v_visible boolean;
begin
  select title, coalesce(client_visible, false) into v_title, v_visible from cali_workspace.deliverables where id = new.deliverable_id;
  if not coalesce(v_visible, false) then return new; end if;
  perform cali_workspace.notify_workspace_movement(new.company_id, auth.uid(), 'client', 'client_dependency', 'A CALI precisa de um retorno seu',
    left('“' || new.title || '” até ' || to_char(new.due_date, 'DD/MM/YYYY') || ', para a entrega “' || coalesce(v_title, '') || '”.', 420),
    'deliverable', new.deliverable_id, '/cliente/entregaveis', 'high', true);
  return new;
exception when others then return new;
end;
$$;
drop trigger if exists deliverable_client_dependencies_notify on cali_workspace.deliverable_client_dependencies;
create trigger deliverable_client_dependencies_notify after insert on cali_workspace.deliverable_client_dependencies
  for each row execute function cali_workspace.notify_client_dependency_created();

create or replace function cali_workspace.notify_due_revision_created()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_title text; v_visible boolean;
begin
  select title, coalesce(client_visible, false) into v_title, v_visible from cali_workspace.deliverables where id = new.deliverable_id;
  if not coalesce(v_visible, false) then return new; end if;
  perform cali_workspace.notify_workspace_movement(new.company_id, auth.uid(), 'client', 'deliverable_due_revision', 'Prazo reprogramado',
    left('“' || coalesce(v_title, 'Entrega') || '”: novo prazo ' || to_char(new.new_due at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || '. ' || new.reason, 420),
    'deliverable', new.deliverable_id, '/cliente/entregaveis', 'high', true);
  return new;
exception when others then return new;
end;
$$;
drop trigger if exists deliverable_due_revisions_notify on cali_workspace.deliverable_due_revisions;
create trigger deliverable_due_revisions_notify after insert on cali_workspace.deliverable_due_revisions
  for each row execute function cali_workspace.notify_due_revision_created();

create or replace function cali_workspace.notify_task_client_review()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
begin
  if new.status is not distinct from old.status or new.status <> 'client_review' or not coalesce(new.client_visible, false) then return new; end if;
  perform cali_workspace.notify_workspace_movement(new.company_id, auth.uid(), 'client', 'task_client_review', 'Uma parte da entrega aguarda a sua aprovação',
    left('“' || new.title || '” está pronta para você aprovar ou pedir ajuste.', 420),
    'deliverable', new.deliverable_id, '/cliente/entregaveis', 'high', true);
  return new;
exception when others then return new;
end;
$$;
drop trigger if exists deliverable_tasks_client_review_notify on cali_workspace.deliverable_tasks;
create trigger deliverable_tasks_client_review_notify after update of status on cali_workspace.deliverable_tasks
  for each row execute function cali_workspace.notify_task_client_review();

create or replace function cali_workspace.notify_document_acknowledged()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_title text;
begin
  if new.acknowledged_at is null or (tg_op = 'UPDATE' and old.acknowledged_at is not null) then return new; end if;
  select title into v_title from cali_workspace.files where id = new.file_id;
  perform cali_workspace.notify_workspace_movement(new.company_id, new.user_id, 'admin', 'document_acknowledged', 'Cliente confirmou o recebimento',
    left(coalesce(v_title, 'Documento'), 420), 'file', new.file_id, '/admin/documentos', 'normal', false);
  return new;
exception when others then return new;
end;
$$;
drop trigger if exists document_acknowledgements_notify on cali_workspace.document_acknowledgements;
create trigger document_acknowledgements_notify after insert or update of acknowledged_at on cali_workspace.document_acknowledgements
  for each row execute function cali_workspace.notify_document_acknowledged();

revoke all on function cali_workspace.notify_client_dependency_created() from public, anon, authenticated;
revoke all on function cali_workspace.notify_due_revision_created() from public, anon, authenticated;
revoke all on function cali_workspace.notify_task_client_review() from public, anon, authenticated;
revoke all on function cali_workspace.notify_document_acknowledged() from public, anon, authenticated;
