-- Revisão de segurança de 15/10/2026, itens 1 e 2 (autorizados pela proprietária). Aplicada pelo painel com conferência
-- embutida; esta é a cópia de registro. Ver docs/SEGURANCA_REVISAO_2026-10-15.md.
-- 1) Nenhuma função do esquema cali_workspace pode ser chamada por quem não está logado; quem podia chamar logado
--    (authenticated) ou pelo servidor (service_role) recebeu a permissão de volta, explicitamente.
-- 2) Funções internas sem conferência de quem chama ficaram só para o próprio banco.
-- 3) protocol_counters com proteção por linha e sem acesso pelo navegador.
-- 4) Funções novas do esquema nascem sem acesso para quem não está logado.
do $$
declare v_fn record; v_auth boolean; v_service boolean;
begin
  for v_fn in select p.oid, p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'cali_workspace' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute') loop
    v_auth := has_function_privilege('authenticated', v_fn.oid, 'execute');
    v_service := has_function_privilege('service_role', v_fn.oid, 'execute');
    execute format('revoke execute on function %s from public, anon', v_fn.sig);
    if v_auth then execute format('grant execute on function %s to authenticated', v_fn.sig); end if;
    if v_service then execute format('grant execute on function %s to service_role', v_fn.sig); end if;
  end loop;
end $$;
revoke execute on function cali_workspace.dispatch_daily_chat_digest() from authenticated;
revoke execute on function cali_workspace.dispatch_document_validity_alerts_v1() from authenticated;
revoke execute on function cali_workspace.refresh_project_forecast(uuid) from authenticated;
revoke execute on function cali_workspace.refresh_project_workstream_ranges(uuid) from authenticated;
revoke execute on function cali_workspace.build_agenda_compliance_v66(uuid, date, date) from authenticated;
revoke execute on function cali_workspace.company_meeting_policy_v66(uuid) from authenticated;
revoke execute on function cali_workspace.resolve_meeting_entitlement_v66(uuid, text, timestamptz, uuid) from authenticated;
revoke execute on function cali_workspace.client_hours_enabled_for_period(uuid, date) from authenticated;
alter table cali_workspace.protocol_counters enable row level security;
revoke all on cali_workspace.protocol_counters from anon, authenticated;
alter default privileges in schema cali_workspace revoke execute on functions from public;
alter default privileges in schema cali_workspace grant execute on functions to authenticated, service_role;
