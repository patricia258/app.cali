-- Cronômetro esquecido (pedido da proprietária em 2026-10-13/14, depois de um timer dela rodar 16h37–23h32 sem aviso).
-- Regra: enquanto a pessoa usa o Workspace, o navegador avisa "estou aqui" a cada poucos minutos. Se o cronômetro fica
-- 30 minutos sem esse sinal (aba fechada, computador dormindo, pessoa ausente), o sistema PAUSA sozinho, contando o tempo
-- só até o último sinal, e avisa por sino e e-mail. Vale para a administradora e para a Equipe CALI (Partner).
-- Segurança: só age em cronômetros que já receberam pelo menos um sinal (last_seen_at preenchido). Uma versão do site
-- que ainda não envia o sinal nunca tem cronômetro pausado por esta rotina.
-- Mudanças: 1 coluna nova em work_timers (nula por padrão), 2 funções novas e 1 rotina agendada. Nada existente é alterado.

alter table cali_workspace.work_timers add column if not exists last_seen_at timestamptz;

create or replace function cali_workspace.touch_my_timers() returns integer
language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_count integer;
begin
  update cali_workspace.work_timers set last_seen_at = now() where user_id = auth.uid() and status = 'active';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function cali_workspace.touch_my_timers() from public, anon;
grant execute on function cali_workspace.touch_my_timers() to authenticated;

create or replace function cali_workspace.close_stale_timers(p_idle interval default interval '30 minutes') returns integer
language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare t record; v_role text; v_name text; v_minutes integer; v_seconds integer; v_count integer := 0; v_from text; v_to text; v_body text;
begin
  for t in select * from cali_workspace.work_timers where status = 'active' and last_seen_at is not null and last_seen_at < now() - p_idle for update skip locked loop
    select role, full_name into v_role, v_name from cali_workspace.profiles where id = t.user_id;
    v_from := to_char(t.started_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI');
    v_to := to_char(t.last_seen_at at time zone 'America/Sao_Paulo', 'HH24:MI');
    if v_role = 'partner' then
      v_seconds := greatest(0, extract(epoch from (t.last_seen_at - t.started_at))::integer - coalesce(t.paused_seconds, 0));
      if v_seconds < 30 then
        update cali_workspace.work_timers set status = 'discarded', stopped_at = t.last_seen_at, minutes = 0 where id = t.id;
      else
        v_minutes := least(1440, greatest(1, round(v_seconds / 60.0)::integer));
        insert into cali_workspace.staff_hour_submissions (staff_user_id, company_id, project_id, deliverable_id, account_record_id, work_date, minutes, description, justification, category)
        values (t.user_id, t.company_id, t.project_id, t.deliverable_id, t.account_record_id, (t.started_at at time zone 'America/Sao_Paulo')::date, v_minutes,
                left(coalesce(t.description, 'Atuação com cronômetro'), 500),
                'Cronômetro pausado automaticamente por inatividade. Contado de ' || v_from || ' até ' || v_to || ' (último momento com atividade na tela).',
                coalesce(t.category, 'Execução'));
        update cali_workspace.work_timers set status = 'stopped', stopped_at = t.last_seen_at, minutes = v_minutes where id = t.id;
      end if;
    else
      perform cali_workspace.close_timer_session_at(t.id, t.last_seen_at, 'timer_auto_paused_inactivity', t.user_id);
    end if;
    v_body := 'O cronômetro de “' || coalesce(t.description, 'atuação') || '” ficou 30 minutos sem atividade na tela e foi pausado sozinho. O tempo foi contado de ' || v_from || ' até ' || v_to || '. Se o horário real foi outro, corrija em Horas.';
    insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
    values (t.company_id, t.user_id, 'timer_auto_paused', 'Cronômetro pausado por inatividade', left(v_body, 400), 'work_timer', t.id, case when v_role = 'partner' then '/equipe/horas' else '/admin/horas' end, 'high', true);
    if v_role = 'partner' then
      insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
      select t.company_id, p.id, 'timer_auto_paused', 'Cronômetro de ' || coalesce(v_name, 'Equipe CALI') || ' pausado por inatividade', left(v_body, 400), 'work_timer', t.id, '/admin/equipe-cali', 'high', true
        from cali_workspace.profiles p where p.role = 'admin' and p.active;
    end if;
    insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
    values (t.company_id, t.user_id, 'timer_auto_paused_inactivity', 'work_timer', t.id, jsonb_build_object('started_at', t.started_at, 'counted_until', t.last_seen_at, 'staff', v_role = 'partner'));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function cali_workspace.close_stale_timers(interval) from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'workspace-timer-inactivity-guard';
select cron.schedule('workspace-timer-inactivity-guard', '*/10 * * * *', $$select cali_workspace.close_stale_timers();$$);
