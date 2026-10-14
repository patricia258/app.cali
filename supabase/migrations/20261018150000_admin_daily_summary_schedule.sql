-- Resumo diário da administradora, por e-mail, às 19h de Brasília (22h UTC). Só acréscimo: função e rotina novas.
create or replace function cali_workspace.dispatch_admin_daily_summary()
returns void language plpgsql security definer set search_path to 'cali_workspace', 'public', 'net' as $$
declare v_hook text;
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
  if v_hook is null then return; end if;
  perform net.http_post(
    url := 'https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/workspace-admin-daily-summary',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', v_hook),
    body := jsonb_build_object('source', 'daily_cron')
  );
end;
$$;
revoke all on function cali_workspace.dispatch_admin_daily_summary() from public, anon, authenticated;
select cron.schedule('workspace-admin-daily-summary', '0 22 * * *', $cron$select cali_workspace.dispatch_admin_daily_summary();$cron$);

-- O resumo das 08h de conversas não lidas (workspace-daily-chat-digest) fica PAUSADO: com a regra nova de "conversa não gera
-- e-mail", ele passaria a mandar e-mail diário de conversa para clientes, o que antes não acontecia na prática.
-- Para religar: select cron.schedule('workspace-daily-chat-digest', '0 11 * * *', 'select cali_workspace.dispatch_daily_chat_digest();');
select cron.unschedule('workspace-daily-chat-digest');
