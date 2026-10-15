-- 1) Efeito colateral da revisão de segurança: a regra hours_client_select usa client_hours_enabled_for_period;
--    a permissão de usuário logado voltou (quem não está logado continua sem acesso).
grant execute on function cali_workspace.client_hours_enabled_for_period(uuid, date) to authenticated;
-- 2) Erro antigo no cadastro de cliente: create_client_account gravava o histórico na coluna "action", que não existe;
--    a coluna correta é event_type. Corrigido no banco trocando só essa linha da função (migração
--    fix_create_client_account_activity_column de 15/10/2026).
