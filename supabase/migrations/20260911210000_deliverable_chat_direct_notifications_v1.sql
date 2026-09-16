-- CALI Workspace · direct deliverable conversation notifications
-- A message notification carries the exact deliverable URL so the bell is a shortcut.

create or replace function cali_workspace.notify_deliverable_comment_direct_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_source text := coalesce(new.source_actor, 'system');
  v_title text;
  v_url text;
  v_deliverable_title text;
begin
  if new.target_type <> 'deliverable' or not coalesce(new.client_visible, false) then
    return new;
  end if;

  select title into v_deliverable_title
  from cali_workspace.deliverables
  where id = new.target_id;

  if v_source = 'client' then
    v_title := 'Mensagem do cliente' || case when v_deliverable_title is null then '' else ' · ' || left(v_deliverable_title, 120) end;
    v_url := '/admin/projetos?deliverable=' || new.target_id::text;
    perform cali_workspace.notify_workspace_movement(
      new.company_id, new.author_user_id, 'admin', 'deliverable_message', v_title,
      'Nova mensagem em um entregável. Clique para abrir a conversa.', 'deliverable', new.target_id, v_url, 'normal', false
    );
  elsif v_source = 'admin' then
    v_title := 'Mensagem da CALI' || case when v_deliverable_title is null then '' else ' · ' || left(v_deliverable_title, 120) end;
    v_url := '/cliente/entregaveis?deliverable=' || new.target_id::text;
    perform cali_workspace.notify_workspace_movement(
      new.company_id, new.author_user_id, 'client', 'deliverable_message', v_title,
      'Nova mensagem da CALI em um entregável. Clique para abrir a conversa.', 'deliverable', new.target_id, v_url, 'normal', false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists comments_deliverable_direct_notification_v1 on cali_workspace.comments;
create trigger comments_deliverable_direct_notification_v1
after insert on cali_workspace.comments
for each row execute function cali_workspace.notify_deliverable_comment_direct_v1();

revoke all on function cali_workspace.notify_deliverable_comment_direct_v1() from public;
grant execute on function cali_workspace.notify_deliverable_comment_direct_v1() to authenticated;
