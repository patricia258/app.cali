-- Perfil Partner — registro de entrada e saída (pedido da proprietária em 2026-10-13: "quero saber o horário que ele entrou, o horário que ele saiu").
-- Só acréscimo: uma função nova que grava no registro de atividades já existente. Nada existente muda.
create or replace function cali_workspace.staff_log_session(p_event text) returns void
language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace', 'auth' as $$
begin
  if not cali_workspace.is_partner() then return; end if;
  if p_event not in ('staff_session_started', 'staff_session_ended') then raise exception 'Evento inválido'; end if;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (null, auth.uid(), p_event, 'profile', auth.uid(), '{}'::jsonb);
end;
$$;
revoke all on function cali_workspace.staff_log_session(text) from public, anon;
grant execute on function cali_workspace.staff_log_session(text) to authenticated;
