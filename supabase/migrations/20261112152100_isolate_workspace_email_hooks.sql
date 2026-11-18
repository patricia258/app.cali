begin;
set local lock_timeout = '5s';

-- Hook endpoints are runtime configuration. A restored database has no destination by default.
create function cali_workspace.configured_workspace_hook(p_endpoint text)
returns text language sql stable set search_path = '' as $$
  select secret_value
  from cali_workspace.runtime_secrets
  where secret_key = 'edge_url_' || replace(p_endpoint,'-','_')
    and (secret_value = 'http://ingress:56431/functions/v1/' || p_endpoint
      or secret_value ~ ('^https://[a-z0-9]+[.]supabase[.]co/functions/v1/' || p_endpoint || '$'));
$$;
revoke all on function cali_workspace.configured_workspace_hook(text) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION cali_workspace.dispatch_admin_daily_summary(p_source text DEFAULT 'daily_cron'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'cali_workspace', 'public', 'net'
    AS $$
declare v_hook text; v_url text := cali_workspace.configured_workspace_hook('workspace-admin-daily-summary');
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
  if v_hook is null or v_url is null then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', v_hook),
    body := jsonb_build_object('source', coalesce(p_source, 'daily_cron'))
  );
end;
$$;

CREATE OR REPLACE FUNCTION cali_workspace.dispatch_daily_chat_digest() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'cali_workspace', 'public', 'net'
    AS $$
declare
  v_hook text; v_url text := cali_workspace.configured_workspace_hook('workspace-daily-chat-digest');
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key='notification_email_hook';
  if v_hook is null or v_url is null then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),
    body := jsonb_build_object('source','daily_cron')
  );
end;
$$;

CREATE OR REPLACE FUNCTION cali_workspace.dispatch_document_validity_alerts_v1() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'cali_workspace', 'public', 'net', 'pg_catalog'
    AS $$
declare v_hook text; v_url text := cali_workspace.configured_workspace_hook('workspace-notification-email-hook'); v_file record; v_profile record; v_notification uuid;
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key='notification_email_hook';
  for v_file in
    select f.id,f.company_id,f.title,f.valid_until,c.display_name
    from cali_workspace.files f join cali_workspace.companies c on c.id=f.company_id
    where f.status='published' and f.client_visible=true and f.valid_until is not null
      and f.valid_until between current_date and current_date + 60
  loop
    for v_profile in select p.id from cali_workspace.profiles p where p.company_id=v_file.company_id and p.role='client' and p.active=true
    loop
      if not exists (select 1 from cali_workspace.notifications n where n.user_id=v_profile.id and n.entity_type='file' and n.entity_id=v_file.id and n.notification_type='document_validity_review' and n.created_at::date=current_date) then
        insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
        values(v_file.company_id,v_profile.id,'document_validity_review','Revisão documental próxima','A validade de “'||v_file.title||'” se aproxima em '||to_char(v_file.valid_until,'DD/MM/YYYY')||'. Planeje a revisão para manter a documentação vigente e reduzir risco trabalhista e passivo em auditorias.','file',v_file.id,'/cliente/documentos','high',true)
        returning id into v_notification;
        if v_hook is not null and v_url is not null then perform net.http_post(url:=v_url,headers:=jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),body:=jsonb_build_object('notification_id',v_notification)); end if;
      end if;
    end loop;
  end loop;
end; $$;

CREATE OR REPLACE FUNCTION cali_workspace.dispatch_notification_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'cali_workspace', 'public', 'net'
    AS $$
declare
  v_hook text; v_url text := cali_workspace.configured_workspace_hook('workspace-notification-email-hook');
begin
  if not coalesce(new.email_required,false) or new.emailed_at is not null then return new; end if;
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key='notification_email_hook';
  if v_hook is null or v_url is null then return new; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),
    body := jsonb_build_object('notification_id',new.id)
  );
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION cali_workspace.dispatch_team_month_reminders_v1() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'cali_workspace', 'auth', 'net', 'public'
    AS $$
declare today_sp date:=(now() at time zone 'America/Sao_Paulo')::date;
        first_day date:=(date_trunc('month',now() at time zone 'America/Sao_Paulo')-interval '1 month')::date;
        reminder_month date:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
        due_day date; p record; v_note uuid; v_hook text; v_url text := cali_workspace.configured_workspace_hook('workspace-notification-email-hook'); sent integer:=0;
begin
  select d::date into due_day from generate_series(reminder_month,reminder_month+interval '14 days',interval '1 day') d
  where cali_workspace.is_business_day(d::date) order by d limit 1 offset 2;
  if today_sp<>due_day then return 0; end if;
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key='notification_email_hook';
  for p in select pr.id,pr.company_id from cali_workspace.profiles pr join cali_workspace.companies c on c.id=pr.company_id
           where pr.role='client' and pr.is_primary and pr.active and c.status='active' and
                 not exists(select 1 from cali_workspace.team_month_reviews tm where tm.company_id=c.id and tm.reference_month=first_day)
  loop
    insert into cali_workspace.team_month_reminders(company_id,reference_month,user_id) values(p.company_id,first_day,p.id)
    on conflict do nothing;
    if found then
      insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,action_url,relevance,email_required)
      values(p.company_id,p.id,'team_month_update','Hora de atualizar a equipe','Houve admissões, desligamentos, mudanças de posição ou vagas neste mês? Confira a equipe e confirme a atualização.','team_month','/cliente/equipe?mes='||to_char(first_day,'YYYY-MM'),'normal',true)
      returning id into v_note;
      update cali_workspace.team_month_reminders set notification_id=v_note where company_id=p.company_id and reference_month=first_day and user_id=p.id;
      if v_hook is not null and v_url is not null then
        perform net.http_post(url:=v_url,
          headers:=jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),body:=jsonb_build_object('notification_id',v_note));
      end if;
      sent:=sent+1;
    end if;
  end loop;
  return sent;
end; $$;

CREATE OR REPLACE FUNCTION cali_workspace.notify_meeting_transcription_v1() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'cali_workspace', 'net'
    AS $$
declare v_event record; v_client record; v_notification uuid; v_hook text; v_url text := cali_workspace.configured_workspace_hook('workspace-notification-email-hook');
begin
  if new.outcome<>'occurred' or (nullif(btrim(coalesce(new.transcription_url,'')),'') is null and new.transcription_attachment_path is null) then return new; end if;
  if tg_op='UPDATE' and new.transcription_url is not distinct from old.transcription_url
    and new.transcription_attachment_path is not distinct from old.transcription_attachment_path then return new; end if;
  select id,company_id,title,starts_at into v_event from cali_workspace.events
    where id=new.event_id and event_type='meeting' and visibility='client' and company_id is not null;
  if not found then return new; end if;
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key='notification_email_hook';
  for v_client in select id from cali_workspace.profiles where company_id=v_event.company_id and role='client' and active loop
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    values(v_event.company_id,v_client.id,'meeting_transcription','Transcrição da reunião disponível',
      'O registro de “'||v_event.title||'” ('||to_char(v_event.starts_at at time zone 'America/Sao_Paulo','DD/MM/YYYY')||') está disponível para conferência no histórico de reuniões.',
      'event',v_event.id,'/cliente/cronograma','normal',true) returning id into v_notification;
    if v_hook is not null and v_url is not null then
      perform net.http_post(url:=v_url,
        headers:=jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),body:=jsonb_build_object('notification_id',v_notification));
    end if;
  end loop;
  return new;
end $$;

CREATE OR REPLACE FUNCTION cali_workspace.profile_post_invite_email(p_body jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'cali_workspace'
    AS $$
declare v_hook text; v_url text := cali_workspace.configured_workspace_hook('cali-profile-invites');
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
  if v_hook is null or v_url is null then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', v_hook),
    body := p_body);
end $$;

create or replace function private.notificar_nova_resposta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text := cali_workspace.configured_workspace_hook('notificar-mapa');
  v_key text;
begin
  select secret_value into v_key from cali_workspace.runtime_secrets where secret_key = 'mapa_notification_bearer';
  if v_url is not null and v_key is not null then
    perform net.http_post(url := v_url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_key),
      body := jsonb_build_object('record',row_to_json(new)),timeout_milliseconds := 10000);
  end if;
  return new;
end;
$$;

select cron.schedule('workspace-admin-daily-summary','0 22 * * *','select cali_workspace.dispatch_admin_daily_summary();');
do $jobs$
declare
  digest_job bigint;
begin
  select jobid into digest_job from cron.job where jobname='workspace-daily-chat-digest';
  if found then perform cron.unschedule(digest_job); end if;
end;
$jobs$;

notify pgrst, 'reload schema';
commit;
