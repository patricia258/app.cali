-- Decisão da proprietária em 2026-10-13: mensagem de conversa NÃO gera e-mail, em nenhum sentido. Fica só o aviso no sino.
-- Só acréscimo: um gatilho novo, antes da gravação do aviso, que desliga o e-mail dos avisos de conversa.
-- Nenhuma função existente é alterada; para voltar atrás basta remover este gatilho.
create or replace function cali_workspace.notifications_chat_without_email()
returns trigger language plpgsql set search_path to 'pg_catalog', 'cali_workspace' as $$
begin
  if new.notification_type in ('record_message', 'record_message_edited', 'record_message_reaction', 'task_message', 'client_task_message', 'staff_task_message', 'deliverable_message', 'comment', 'client_message') then
    new.email_required := false;
  end if;
  return new;
end;
$$;
drop trigger if exists notifications_chat_without_email on cali_workspace.notifications;
create trigger notifications_chat_without_email before insert on cali_workspace.notifications
  for each row execute function cali_workspace.notifications_chat_without_email();
revoke all on function cali_workspace.notifications_chat_without_email() from public, anon, authenticated;

-- Lembrete automático de dependência do cliente em atraso: no primeiro dia de atraso e depois a cada 3 dias,
-- o cliente recebe aviso + e-mail e a administradora recebe aviso no sino. Roda todo dia às 08h05 (Brasília).
alter table cali_workspace.deliverable_client_dependencies add column if not exists last_reminded_at timestamptz;

create or replace function cali_workspace.dispatch_dependency_reminders()
returns integer language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_row record; v_days integer; v_count integer := 0; v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  for v_row in
    select d.id, d.company_id, d.deliverable_id, d.title, d.due_date, e.title as deliverable_title
      from cali_workspace.deliverable_client_dependencies d
      join cali_workspace.deliverables e on e.id = d.deliverable_id
     where d.status = 'pending' and d.due_date < v_today and coalesce(e.client_visible, false)
       and e.status not in ('approved', 'cancelled')
       and (d.last_reminded_at is null or d.last_reminded_at < now() - interval '3 days')
  loop
    v_days := v_today - v_row.due_date;
    perform cali_workspace.notify_workspace_movement(v_row.company_id, null, 'client', 'client_dependency_overdue', 'Pendência em atraso',
      left('“' || v_row.title || '” venceu há ' || v_days || case when v_days = 1 then ' dia' else ' dias' end || '. A entrega “' || v_row.deliverable_title || '” aguarda este retorno e o prazo pode ser adiado.', 420),
      'deliverable', v_row.deliverable_id, '/cliente/entregaveis', 'high', true);
    perform cali_workspace.notify_workspace_movement(v_row.company_id, null, 'admin', 'client_dependency_overdue', 'Pendência do cliente em atraso',
      left('“' || v_row.title || '” (' || v_row.deliverable_title || ') está ' || v_days || case when v_days = 1 then ' dia' else ' dias' end || ' atrasada. Avalie reprogramar o prazo.', 420),
      'deliverable', v_row.deliverable_id, '/admin/projetos', 'high', false);
    update cali_workspace.deliverable_client_dependencies set last_reminded_at = now() where id = v_row.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function cali_workspace.dispatch_dependency_reminders() from public, anon, authenticated;
select cron.schedule('workspace-dependency-reminders', '5 11 * * *', $cron$select cali_workspace.dispatch_dependency_reminders();$cron$);
