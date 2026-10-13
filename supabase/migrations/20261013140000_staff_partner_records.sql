-- Perfil Partner — OCORRÊNCIAS na mesma tela da administradora (regras da proprietária em 2026-10-13).
-- Só acréscimo: funções "partner_*" novas. As funções da administradora (post_account_record_message, set_account_record_status,
-- start_account_record_timer, pause_work_timer...) NÃO são alteradas. Único ajuste em estrutura minha: um tipo a mais na fila.
-- Regras: conversa com o cliente e nota interna; pode Assumir / Aguardar cliente / Stand by / Retomar; NÃO finaliza, NÃO cancela,
-- NÃO reabre — pede o encerramento à administradora; cronômetro próprio, cujo tempo vai para aprovação dela.

alter table cali_workspace.staff_review_requests drop constraint if exists staff_review_requests_kind_check;
alter table cali_workspace.staff_review_requests add constraint staff_review_requests_kind_check check (kind in ('report', 'deliverable', 'document', 'notice', 'other', 'record_close'));

create or replace function cali_workspace.partner_post_record_message(p_record_id uuid, p_body text, p_internal boolean default false)
returns jsonb language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
declare v_user_id uuid := auth.uid(); v_record cali_workspace.account_records%rowtype; v_message_id uuid; v_ids uuid[]; v_name text;
begin
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'Escreva uma mensagem antes de enviar.'; end if;
  select * into v_record from cali_workspace.account_records where id = p_record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_record.company_id, 'records') or v_record.visibility <> 'client' then raise exception 'Registro não disponível para este acesso.' using errcode = '42501'; end if;
  if v_record.workflow_status in ('cancelled', 'completed') then raise exception 'Esta conversa está encerrada.'; end if;

  insert into cali_workspace.account_record_messages (record_id, company_id, author_id, author_role, body, visibility)
  values (v_record.id, v_record.company_id, v_user_id, 'admin', btrim(p_body), case when p_internal then 'internal' else 'client' end)
  returning id into v_message_id;

  if p_internal then
    update cali_workspace.account_records set last_activity_at = now(), updated_at = now() where id = v_record.id;
    select full_name into v_name from cali_workspace.staff_members where user_id = v_user_id;
    insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
    select v_record.company_id, p.id, 'staff_internal_note', 'Nota interna de ' || coalesce(v_name, 'Equipe CALI'), left('“' || v_record.title || '”: ' || btrim(p_body), 400), 'account_record', v_record.id, '/admin/registros?record=' || v_record.id::text, 'normal', false
      from cali_workspace.profiles p where p.role = 'admin' and p.active;
    return jsonb_build_object('message_id', v_message_id, 'record_id', v_record.id, 'workflow_status', v_record.workflow_status);
  end if;

  update cali_workspace.account_records
     set workflow_status = 'waiting_client', last_activity_at = now(), requires_action = false,
         first_admin_opened_at = coalesce(first_admin_opened_at, now()), updated_at = now()
   where id = v_record.id;
  v_ids := cali_workspace.notify_workspace_movement(v_record.company_id, v_user_id, 'client', 'record_message', 'Nova resposta da CALI',
    'A CALI respondeu em “' || v_record.title || '”.', 'account_record', v_record.id, '/cliente/registros?record=' || v_record.id::text, 'high', true);
  return jsonb_build_object('message_id', v_message_id, 'record_id', v_record.id, 'workflow_status', 'waiting_client');
end;
$$;

create or replace function cali_workspace.partner_set_record_status(p_record_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
declare v_record cali_workspace.account_records%rowtype; v_label text;
begin
  if p_status not in ('in_progress', 'waiting_client', 'standby') then raise exception 'Somente a Patricia pode finalizar, cancelar ou reabrir.' using errcode = '42501'; end if;
  select * into v_record from cali_workspace.account_records where id = p_record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_record.company_id, 'records') or v_record.visibility <> 'client' then raise exception 'Registro não disponível para este acesso.' using errcode = '42501'; end if;
  if v_record.workflow_status is null or v_record.workflow_status in ('completed', 'cancelled') then raise exception 'Esta ocorrência está encerrada. Só a Patricia pode reabrir.'; end if;

  update cali_workspace.account_records
     set workflow_status = p_status, requires_action = (p_status = 'in_progress'),
         first_admin_opened_at = coalesce(first_admin_opened_at, now()), last_activity_at = now(), updated_at = now()
   where id = p_record_id;
  v_label := case p_status when 'in_progress' then 'Em andamento' when 'waiting_client' then 'Aguardando cliente' else 'Stand by' end;
  perform cali_workspace.notify_workspace_movement(v_record.company_id, auth.uid(), 'client', 'record_status', 'Atualização na sua solicitação',
    '“' || v_record.title || '” agora está como ' || v_label || '.', 'account_record', v_record.id, '/cliente/registros?record=' || v_record.id::text, 'normal', false);
  return jsonb_build_object('record_id', v_record.id, 'workflow_status', p_status);
end;
$$;

create or replace function cali_workspace.partner_request_record_close(p_record_id uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
declare v_record cali_workspace.account_records%rowtype; v_id uuid;
begin
  select * into v_record from cali_workspace.account_records where id = p_record_id;
  if not found then raise exception 'Registro não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_record.company_id, 'records') or v_record.visibility <> 'client' then raise exception 'Registro não disponível para este acesso.' using errcode = '42501'; end if;
  if v_record.workflow_status is null or v_record.workflow_status in ('completed', 'cancelled') then raise exception 'Esta ocorrência já está encerrada.'; end if;
  if exists (select 1 from cali_workspace.staff_review_requests where kind = 'record_close' and entity_id = p_record_id and status = 'pending') then raise exception 'O encerramento desta ocorrência já está aguardando a Patricia.'; end if;
  insert into cali_workspace.staff_review_requests (staff_user_id, company_id, kind, entity_id, title, note)
  values (auth.uid(), v_record.company_id, 'record_close', v_record.id, left(coalesce(v_record.protocol || ' · ', '') || v_record.title, 200), nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function cali_workspace.partner_start_record_timer(p_record_id uuid)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace', 'auth' as $$
declare v_record cali_workspace.account_records%rowtype; v_id uuid;
begin
  select * into v_record from cali_workspace.account_records where id = p_record_id;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if not (cali_workspace.partner_can_access(v_record.company_id, 'records') and cali_workspace.partner_can_access(v_record.company_id, 'hours')) or v_record.visibility <> 'client' then raise exception 'Você precisa dos módulos Ocorrências e Horas nesta empresa para usar o cronômetro.' using errcode = '42501'; end if;
  if v_record.workflow_status in ('completed', 'cancelled') then raise exception 'Esta solicitação já foi encerrada e não aceita novas horas.'; end if;
  if exists (select 1 from cali_workspace.work_timers where user_id = auth.uid() and company_id = v_record.company_id and status in ('active', 'paused')) then
    raise exception 'Você já tem um cronômetro ligado nesta empresa. Pare o atual antes de iniciar outro.';
  end if;
  insert into cali_workspace.work_timers (company_id, project_id, account_record_id, user_id, category, description, note, client_visible, status)
  values (v_record.company_id, v_record.project_id, v_record.id, auth.uid(), 'Ocorrências e solicitações', coalesce(v_record.protocol || ' · ', '') || v_record.title, coalesce(v_record.protocol || ' · ', '') || v_record.title, false, 'active')
  returning id into v_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_record.company_id, auth.uid(), 'account_record_timer_started', 'account_record', v_record.id, jsonb_build_object('timer_id', v_id, 'protocol', v_record.protocol, 'staff', true));
  return v_id;
end;
$$;

-- Parar o cronômetro do Partner: o tempo NÃO vira lançamento; vai para a fila de aprovação da administradora.
create or replace function cali_workspace.partner_stop_timer(p_timer_id uuid, p_description text default null)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace', 'auth' as $$
declare v_timer cali_workspace.work_timers%rowtype; v_seconds integer; v_minutes integer; v_submission uuid;
begin
  select * into v_timer from cali_workspace.work_timers where id = p_timer_id and user_id = auth.uid() for update;
  if not found then raise exception 'Cronômetro não encontrado.'; end if;
  if not cali_workspace.is_partner() then raise exception 'Acesso restrito à Equipe CALI.' using errcode = '42501'; end if;
  if v_timer.status not in ('active', 'paused') then raise exception 'Este cronômetro já foi encerrado.'; end if;
  v_seconds := greatest(0, extract(epoch from (coalesce(v_timer.paused_at, now()) - v_timer.started_at))::integer - coalesce(v_timer.paused_seconds, 0));
  if v_seconds < 30 then
    update cali_workspace.work_timers set status = 'discarded', stopped_at = now(), minutes = 0 where id = p_timer_id;
    return jsonb_build_object('discarded', true, 'seconds', v_seconds);
  end if;
  v_minutes := least(1440, greatest(1, round(v_seconds / 60.0)::integer));
  insert into cali_workspace.staff_hour_submissions (staff_user_id, company_id, project_id, deliverable_id, account_record_id, work_date, minutes, description, justification, category)
  values (auth.uid(), v_timer.company_id, v_timer.project_id, v_timer.deliverable_id, v_timer.account_record_id, (v_timer.started_at at time zone 'America/Sao_Paulo')::date, v_minutes,
          left(coalesce(nullif(btrim(coalesce(p_description, '')), ''), v_timer.description, 'Atuação com cronômetro'), 500),
          'Tempo medido no cronômetro, das ' || to_char(v_timer.started_at at time zone 'America/Sao_Paulo', 'HH24:MI') || ' às ' || to_char(now() at time zone 'America/Sao_Paulo', 'HH24:MI') || '.',
          coalesce(v_timer.category, 'Execução'))
  returning id into v_submission;
  update cali_workspace.work_timers set status = 'stopped', stopped_at = now(), minutes = v_minutes where id = p_timer_id;
  return jsonb_build_object('discarded', false, 'minutes', v_minutes, 'submission_id', v_submission);
end;
$$;

revoke all on function cali_workspace.partner_post_record_message(uuid, text, boolean) from public, anon;
revoke all on function cali_workspace.partner_set_record_status(uuid, text) from public, anon;
revoke all on function cali_workspace.partner_request_record_close(uuid, text) from public, anon;
revoke all on function cali_workspace.partner_start_record_timer(uuid) from public, anon;
revoke all on function cali_workspace.partner_stop_timer(uuid, text) from public, anon;
grant execute on function cali_workspace.partner_post_record_message(uuid, text, boolean) to authenticated;
grant execute on function cali_workspace.partner_set_record_status(uuid, text) to authenticated;
grant execute on function cali_workspace.partner_request_record_close(uuid, text) to authenticated;
grant execute on function cali_workspace.partner_start_record_timer(uuid) to authenticated;
grant execute on function cali_workspace.partner_stop_timer(uuid, text) to authenticated;
