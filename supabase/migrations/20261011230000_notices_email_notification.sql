-- 2026-10-11 · pedido da Patricia: o aviso também chega por e-mail, no padrão de e-mail do Workspace.
-- A notificação do aviso passa a nascer com email_required = true; o gatilho notifications_email_dispatch
-- (já existente) chama a função workspace-notification-email-hook, que envia o e-mail padrão com o botão
-- "Abrir no Workspace". Um e-mail por aviso e por usuário (a função não repete quem já foi avisado).
create or replace function cali_workspace.notify_notice(p_notice_id uuid)
returns integer language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace', 'auth' as $$
declare v cali_workspace.notices%rowtype; v_count integer;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso restrito ao administrador do Workspace' using errcode='42501'; end if;
  select * into v from cali_workspace.notices where id = p_notice_id and status = 'published';
  if not found then return 0; end if;
  insert into cali_workspace.notifications(company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, email_required)
  select p.company_id, p.id, 'notice', 'Novo aviso da CALI: ' || v.title, left(v.body, 400), 'notice', v.id, '/cliente/avisos?aviso=' || v.id, true
    from cali_workspace.profiles p
   where p.role = 'client' and p.active and p.company_id is not null
     and (v.audience = 'all' or exists (select 1 from cali_workspace.notice_targets t where t.notice_id = v.id and t.company_id = p.company_id))
     and not exists (select 1 from cali_workspace.notifications n where n.entity_type = 'notice' and n.entity_id = v.id and n.user_id = p.id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
