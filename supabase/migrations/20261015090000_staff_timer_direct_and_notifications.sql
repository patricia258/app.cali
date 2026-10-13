-- Perfil Partner — ajustes pedidos pela proprietária em 2026-10-13, depois de testar:
-- 1) "O play com o timer rodando, eu não tenho que aprovar nada. O que eu tenho que aprovar são lançamentos manuais."
--    O cronômetro do Partner passa a gravar a sessão direto no extrato (como o da administradora); só lançamento manual
--    e interação externa continuam indo para aprovação.
-- 2) Um cronômetro rodou 10 horas sem pausar: a rotina de inatividade só agia depois do primeiro sinal de presença.
--    Agora, sem sinal nenhum, conta a partir do início do cronômetro.
-- 3) Avisos de decisão para o Partner dizem o que foi decidido e levam ao lugar certo.
-- Só altera funções criadas por mim para o Partner / cronômetro esquecido. Nada da administradora ou do cliente muda.

create or replace function cali_workspace.partner_stop_timer(p_timer_id uuid, p_description text default null)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace', 'auth' as $$
declare v_timer cali_workspace.work_timers%rowtype; v_end timestamptz := now(); v_seconds integer; v_minutes integer; v_entry uuid; v_name text; v_description text;
begin
  select * into v_timer from cali_workspace.work_timers where id = p_timer_id and user_id = auth.uid() for update;
  if not found then raise exception 'Cronômetro não encontrado.'; end if;
  if not cali_workspace.is_partner() then raise exception 'Acesso restrito à Equipe CALI.' using errcode = '42501'; end if;
  if v_timer.status not in ('active', 'paused') then raise exception 'Este cronômetro já foi encerrado.'; end if;
  v_seconds := greatest(0, extract(epoch from (coalesce(v_timer.paused_at, v_end) - v_timer.started_at))::integer - coalesce(v_timer.paused_seconds, 0));
  if v_seconds < 30 then
    update cali_workspace.work_timers set status = 'discarded', stopped_at = v_end, minutes = 0 where id = p_timer_id;
    return jsonb_build_object('discarded', true, 'seconds', v_seconds);
  end if;
  v_minutes := least(1440, greatest(1, ceil(v_seconds / 60.0)::integer));
  v_description := left(coalesce(nullif(btrim(coalesce(p_description, '')), ''), nullif(btrim(coalesce(v_timer.description, '')), ''), 'Atividade registrada por timer'), 500);
  select full_name into v_name from cali_workspace.staff_members where user_id = auth.uid();
  insert into cali_workspace.hour_entries (company_id, project_id, cycle_id, deliverable_id, task_id, account_record_id, work_date, minutes, description, category,
                                           client_visible, created_by, source_type, started_at, ended_at, internal_note)
  values (v_timer.company_id, v_timer.project_id, v_timer.cycle_id, v_timer.deliverable_id, v_timer.task_id, v_timer.account_record_id,
          (v_end at time zone 'America/Sao_Paulo')::date, v_minutes, v_description, coalesce(v_timer.category, 'Execução'),
          false, auth.uid(), 'timer', v_timer.started_at, v_end, 'Cronômetro de ' || coalesce(v_name, 'Equipe CALI') || ' (Equipe CALI)')
  returning id into v_entry;
  update cali_workspace.work_timers set status = 'stopped', stopped_at = v_end, minutes = v_minutes, paused_at = null where id = p_timer_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_timer.company_id, auth.uid(), 'timer_session_paused', 'work_timer', v_timer.id,
          jsonb_build_object('hour_entry_id', v_entry, 'minutes', v_minutes, 'staff', true, 'deliverable_id', v_timer.deliverable_id, 'task_id', v_timer.task_id, 'account_record_id', v_timer.account_record_id));
  return jsonb_build_object('discarded', false, 'minutes', v_minutes, 'hour_entry_id', v_entry);
end;
$$;

create or replace function cali_workspace.close_stale_timers(p_idle interval default interval '30 minutes') returns integer
language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare t record; v_role text; v_name text; v_minutes integer; v_seconds integer; v_count integer := 0; v_from text; v_to text; v_body text; v_until timestamptz;
begin
  for t in select * from cali_workspace.work_timers where status = 'active' and coalesce(last_seen_at, started_at) < now() - p_idle for update skip locked loop
    v_until := coalesce(t.last_seen_at, t.started_at + interval '1 minute');
    select role, full_name into v_role, v_name from cali_workspace.profiles where id = t.user_id;
    v_from := to_char(t.started_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI');
    v_to := to_char(v_until at time zone 'America/Sao_Paulo', 'HH24:MI');
    if v_role = 'partner' then
      v_seconds := greatest(0, extract(epoch from (v_until - t.started_at))::integer - coalesce(t.paused_seconds, 0));
      if v_seconds < 30 then
        update cali_workspace.work_timers set status = 'discarded', stopped_at = v_until, minutes = 0 where id = t.id;
      else
        v_minutes := least(1440, greatest(1, ceil(v_seconds / 60.0)::integer));
        insert into cali_workspace.hour_entries (company_id, project_id, cycle_id, deliverable_id, task_id, account_record_id, work_date, minutes, description, category,
                                                 client_visible, created_by, source_type, started_at, ended_at, internal_note)
        values (t.company_id, t.project_id, t.cycle_id, t.deliverable_id, t.task_id, t.account_record_id, (v_until at time zone 'America/Sao_Paulo')::date, v_minutes,
                left(coalesce(nullif(btrim(coalesce(t.description, '')), ''), 'Atividade registrada por timer'), 500), coalesce(t.category, 'Execução'),
                false, t.user_id, 'timer', t.started_at, v_until, 'Cronômetro de ' || coalesce(v_name, 'Equipe CALI') || ' (Equipe CALI), pausado automaticamente por inatividade');
        update cali_workspace.work_timers set status = 'stopped', stopped_at = v_until, minutes = v_minutes where id = t.id;
      end if;
    else
      perform cali_workspace.close_timer_session_at(t.id, v_until, 'timer_auto_paused_inactivity', t.user_id);
    end if;
    v_body := 'O cronômetro de “' || coalesce(t.description, 'atuação') || '” ficou 30 minutos sem atividade na tela e foi pausado sozinho. O tempo foi contado de ' || v_from || ' até ' || v_to || '. Se o horário real foi outro, corrija em Horas.';
    insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
    values (t.company_id, t.user_id, 'timer_auto_paused', 'Cronômetro pausado por inatividade', left(v_body, 400), 'work_timer', t.id, case when v_role = 'partner' then '/equipe/horas' else '/admin/horas' end, 'high', true);
    if v_role = 'partner' then
      insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
      select t.company_id, p.id, 'timer_auto_paused', 'Cronômetro de ' || coalesce(v_name, 'Equipe CALI') || ' pausado por inatividade', left(v_body, 400), 'work_timer', t.id, '/admin/horas', 'high', true
        from cali_workspace.profiles p where p.role = 'admin' and p.active;
    end if;
    insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
    values (t.company_id, t.user_id, 'timer_auto_paused_inactivity', 'work_timer', t.id, jsonb_build_object('started_at', t.started_at, 'counted_until', v_until, 'staff', v_role = 'partner'));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function cali_workspace.close_stale_timers(interval) from public, anon, authenticated;

create or replace function cali_workspace.notify_staff_decision()
returns trigger language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
declare v_title text; v_url text; v_row jsonb := to_jsonb(new); v_kind text; v_what text; v_ok boolean := new.status = 'approved';
begin
  if new.status = old.status or new.status = 'pending' then return new; end if;
  if tg_table_name = 'staff_hour_submissions' then
    v_what := (floor((v_row->>'minutes')::int / 60))::text || 'h' || lpad(((v_row->>'minutes')::int % 60)::text, 2, '0') || ' · ' || coalesce(v_row->>'description', '');
    v_title := case when v_ok then 'Lançamento de horas aprovado' else 'Lançamento de horas recusado' end; v_url := '/equipe/horas';
  else
    v_kind := coalesce(v_row->>'kind', 'other'); v_what := coalesce(v_row->>'title', '');
    v_title := case v_kind
      when 'change' then case when v_ok then 'Pedido aprovado' else 'Pedido recusado' end
      when 'deliverable' then case when v_ok then 'Entregável aprovado e enviado ao cliente' else 'Entregável devolvido para ajuste' end
      when 'record_close' then case when v_ok then 'Encerramento da ocorrência aprovado' else 'Encerramento da ocorrência recusado' end
      when 'notice' then case when v_ok then 'Comunicado aprovado' else 'Comunicado devolvido' end
      else case when v_ok then 'Material aprovado' else 'Material devolvido para ajuste' end end;
    v_url := case when v_kind in ('change', 'deliverable') then '/equipe/projetos' when v_kind = 'record_close' then '/equipe/ocorrencias' when v_kind = 'notice' then '/equipe/avisos' else '/equipe/aprovacoes' end;
    if v_kind = 'change' and coalesce(v_row->'payload'->>'action', '') like 'event_%' then v_url := '/equipe/calendario'; end if;
  end if;
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  values (new.company_id, new.staff_user_id, 'staff_decision', v_title,
          left(v_what || case when nullif(btrim(coalesce(new.decision_note, '')), '') is not null then ' — ' || new.decision_note else '' end, 400), tg_table_name, new.id, v_url, 'normal', false);
  return new;
exception when others then
  return new;
end;
$$;

-- 4) O Partner edita uma sessão de cronômetro dele (início e fim), sempre com motivo; fica na Auditoria e avisa a administradora.
create or replace function cali_workspace.partner_edit_hour_entry(p_id uuid, p_started_at timestamptz, p_ended_at timestamptz, p_description text, p_reason text)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_row cali_workspace.hour_entries%rowtype; v_minutes integer; v_name text;
begin
  if not cali_workspace.is_partner() then raise exception 'Acesso restrito à Equipe CALI.' using errcode = '42501'; end if;
  select * into v_row from cali_workspace.hour_entries where id = p_id and created_by = auth.uid() for update;
  if not found then raise exception 'Lançamento não encontrado.'; end if;
  if p_started_at is null or p_ended_at is null or p_ended_at <= p_started_at then raise exception 'Informe início e fim, com o fim depois do início.'; end if;
  if p_ended_at > now() + interval '5 minutes' then raise exception 'O fim não pode estar no futuro.'; end if;
  v_minutes := ceil(extract(epoch from (p_ended_at - p_started_at)) / 60.0)::integer;
  if v_minutes < 1 or v_minutes > 1440 then raise exception 'A duração precisa ficar entre 1 minuto e 24 horas.'; end if;
  if char_length(btrim(coalesce(p_description, ''))) < 3 then raise exception 'Descreva o que foi feito.'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then raise exception 'Explique o motivo da edição.'; end if;
  update cali_workspace.hour_entries
     set started_at = p_started_at, ended_at = p_ended_at, minutes = v_minutes, work_date = (p_ended_at at time zone 'America/Sao_Paulo')::date,
         description = left(btrim(p_description), 500),
         internal_note = left(coalesce(internal_note, '') || ' | Editado: de ' || v_row.minutes || ' para ' || v_minutes || ' min. Motivo: ' || btrim(p_reason), 1500)
   where id = p_id;
  select full_name into v_name from cali_workspace.staff_members where user_id = auth.uid();
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_row.company_id, auth.uid(), 'staff_hours_edited', 'hour_entry', v_row.id, jsonb_build_object('from_minutes', v_row.minutes, 'minutes', v_minutes, 'reason', btrim(p_reason), 'from_started_at', v_row.started_at, 'from_ended_at', v_row.ended_at));
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  select v_row.company_id, p.id, 'staff_hours_edited', coalesce(v_name, 'Equipe CALI') || ' editou um lançamento de horas',
         left('De ' || v_row.minutes || ' para ' || v_minutes || ' min · ' || btrim(p_reason), 400), 'hour_entry', v_row.id, '/admin/horas', 'normal', false
    from cali_workspace.profiles p where p.role = 'admin' and p.active;
end;
$$;
revoke all on function cali_workspace.partner_edit_hour_entry(uuid, timestamptz, timestamptz, text, text) from public, anon;
grant execute on function cali_workspace.partner_edit_hour_entry(uuid, timestamptz, timestamptz, text, text) to authenticated;
