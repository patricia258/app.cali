-- Regra da proprietária (2026-10-14): a subtarefa tem limite de 2 pedidos de ajuste; o entregável segue com 3 (já era o padrão).
-- Acréscimo: coluna nova de contagem na subtarefa. A função alterada (client_request_task_adjustment) foi criada nesta mesma frente.
alter table cali_workspace.deliverable_tasks add column if not exists adjustment_count integer not null default 0;

create or replace function cali_workspace.client_request_task_adjustment(p_task_id uuid, p_body text)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_task cali_workspace.deliverable_tasks%rowtype := cali_workspace.client_visible_task(p_task_id); v_text text := left(btrim(coalesce(p_body, '')), 4000); v_next integer;
begin
  if v_task.status <> 'client_review' then raise exception 'Esta subtarefa não está aguardando a sua aprovação.'; end if;
  if coalesce(v_task.adjustment_count, 0) >= 2 then raise exception 'Os 2 ajustes desta parte já foram usados. Fale com a CALI pela conversa.'; end if;
  if char_length(v_text) < 10 then raise exception 'Descreva o ajuste com um pouco mais de detalhe.'; end if;
  v_next := coalesce(v_task.adjustment_count, 0) + 1;
  update cali_workspace.deliverable_tasks set status = 'doing', adjustment_count = v_next where id = v_task.id;
  insert into cali_workspace.task_messages (task_id, deliverable_id, company_id, author_user_id, author_role, body, client_visible)
  values (v_task.id, v_task.deliverable_id, v_task.company_id, auth.uid(), 'client', 'Pedido de ajuste ' || v_next || '/2: ' || v_text, true);
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_task.company_id, auth.uid(), 'client_task_adjustment_requested', 'deliverable', v_task.deliverable_id, jsonb_build_object('task_id', v_task.id, 'title', v_task.title, 'request', left(v_text, 500), 'number', v_next));
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  select v_task.company_id, p.id, 'client_task_adjustment_requested', 'Cliente pediu ajuste em uma subtarefa (' || v_next || '/2)', left('“' || v_task.title || '”: ' || v_text, 400), 'deliverable', v_task.deliverable_id, '/admin/projetos?deliverable=' || v_task.deliverable_id::text, 'high', false
    from cali_workspace.profiles p where p.role = 'admin' and p.active;
end;
$$;
revoke all on function cali_workspace.client_request_task_adjustment(uuid, text) from public, anon;
grant execute on function cali_workspace.client_request_task_adjustment(uuid, text) to authenticated;
