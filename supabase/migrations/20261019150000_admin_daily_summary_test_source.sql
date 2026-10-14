-- O disparo do resumo diário aceita dizer a origem, para um envio manual de teste não ocupar o lugar do envio automático das 19h.
drop function if exists cali_workspace.dispatch_admin_daily_summary();
create or replace function cali_workspace.dispatch_admin_daily_summary(p_source text default 'daily_cron')
returns void language plpgsql security definer set search_path to 'cali_workspace', 'public', 'net' as $$
declare v_hook text;
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
  if v_hook is null then return; end if;
  perform net.http_post(
    url := 'https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/workspace-admin-daily-summary',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', v_hook),
    body := jsonb_build_object('source', coalesce(p_source, 'daily_cron'))
  );
end;
$$;
revoke all on function cali_workspace.dispatch_admin_daily_summary(text) from public, anon, authenticated;
