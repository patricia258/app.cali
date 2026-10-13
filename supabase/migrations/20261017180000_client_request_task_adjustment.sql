-- Pedido de ajuste formal do cliente na subtarefa que está "Aguardando você".
-- Só acréscimo: uma função nova. A subtarefa volta para "Em andamento", o pedido fica gravado na conversa da subtarefa
-- (visível ao cliente), no histórico e vira aviso para a administradora.
create or replace function cali_workspace.client_request_task_adjustment(p_task_id uuid, p_body text)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_task cali_workspace.deliverable_tasks%rowtype := cali_workspace.client_visible_task(p_task_id); v_text text := left(btrim(coalesce(p_body, '')), 4000);
begin
  if v_task.status <> 'client_review' then raise exception 'Esta subtarefa não está aguardando a sua aprovação.'; end if;
  if char_length(v_text) < 10 then raise exception 'Descreva o ajuste com um pouco mais de detalhe.'; end if;
  update cali_workspace.deliverable_tasks set status = 'doing' where id = v_task.id;
  insert into cali_workspace.task_messages (task_id, deliverable_id, company_id, author_user_id, author_role, body, client_visible)
  values (v_task.id, v_task.deliverable_id, v_task.company_id, auth.uid(), 'client', 'Pedido de ajuste: ' || v_text, true);
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_task.company_id, auth.uid(), 'client_task_adjustment_requested', 'deliverable', v_task.deliverable_id, jsonb_build_object('task_id', v_task.id, 'title', v_task.title, 'request', left(v_text, 500)));
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  select v_task.company_id, p.id, 'client_task_adjustment_requested', 'Cliente pediu ajuste em uma subtarefa', left('“' || v_task.title || '”: ' || v_text, 400), 'deliverable', v_task.deliverable_id, '/admin/projetos?deliverable=' || v_task.deliverable_id::text, 'high', false
    from cali_workspace.profiles p where p.role = 'admin' and p.active;
end;
$$;
revoke all on function cali_workspace.client_request_task_adjustment(uuid, text) from public, anon;
grant execute on function cali_workspace.client_request_task_adjustment(uuid, text) to authenticated;
