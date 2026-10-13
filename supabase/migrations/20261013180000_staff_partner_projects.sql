-- Perfil Partner — PROJETOS na mesma tela da administradora (regras da proprietária em 2026-10-13).
-- Só acréscimo: funções "partner_*" novas. Nenhuma função ou política existente é alterada.
-- Regras: vê cronograma, entregáveis e histórico das empresas atribuídas; conversa com o cliente e nota interna; muda a
-- situação entre Não iniciado / Em andamento / Stand by / Revisão interna; NÃO envia ao cliente, NÃO aprova, NÃO cancela,
-- NÃO cria nem exclui — pede o envio à administradora; cronômetro próprio, cujo tempo vai para aprovação dela.

create or replace function cali_workspace.partner_change_deliverable_status(p_deliverable_id uuid, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid; v_current text;
begin
  if p_status not in ('not_started', 'in_progress', 'standby', 'internal_review') then raise exception 'Somente a Patricia pode enviar ao cliente, aprovar ou cancelar.' using errcode = '42501'; end if;
  select company_id, status into v_company, v_current from cali_workspace.deliverables where id = p_deliverable_id;
  if v_company is null then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_company, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  if v_current in ('approved', 'cancelled', 'client_review', 'rebriefing') then raise exception 'Este entregável está com o cliente ou encerrado. Só a Patricia pode alterar.'; end if;
  if p_status = 'standby' and length(trim(coalesce(p_note, ''))) < 3 then raise exception 'Informe o motivo do stand by.'; end if;
  perform set_config('cali_workspace.status_note', trim(coalesce(p_note, '')), true);
  update cali_workspace.deliverables set status = p_status, updated_at = now() where id = p_deliverable_id;
  return jsonb_build_object('deliverable_id', p_deliverable_id, 'from_status', v_current, 'to_status', p_status);
end;
$$;

-- "Enviar para aprovação da Patricia": o entregável vai para Revisão interna e entra na fila dela.
create or replace function cali_workspace.partner_request_deliverable_review(p_deliverable_id uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_row cali_workspace.deliverables%rowtype; v_id uuid;
begin
  select * into v_row from cali_workspace.deliverables where id = p_deliverable_id;
  if not found then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_row.company_id, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  if v_row.status in ('approved', 'cancelled', 'client_review', 'rebriefing') then raise exception 'Este entregável já está com o cliente ou encerrado.'; end if;
  if exists (select 1 from cali_workspace.staff_review_requests where kind = 'deliverable' and entity_id = p_deliverable_id and status = 'pending') then raise exception 'Este entregável já está aguardando a Patricia.'; end if;
  if v_row.status <> 'internal_review' then
    perform set_config('cali_workspace.status_note', 'Enviado para aprovação da Patricia', true);
    update cali_workspace.deliverables set status = 'internal_review', updated_at = now() where id = p_deliverable_id;
  end if;
  insert into cali_workspace.staff_review_requests (staff_user_id, company_id, kind, entity_id, title, note)
  values (auth.uid(), v_row.company_id, 'deliverable', v_row.id, left(coalesce(v_row.protocol || ' · ', '') || v_row.title, 200), nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function cali_workspace.partner_post_deliverable_comment(p_deliverable_id uuid, p_body text, p_client_visible boolean default true)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_row cali_workspace.deliverables%rowtype; v_id uuid; v_name text;
begin
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'Escreva uma mensagem antes de enviar.'; end if;
  select * into v_row from cali_workspace.deliverables where id = p_deliverable_id;
  if not found then raise exception 'Entregável não encontrado.'; end if;
  if not cali_workspace.partner_can_access(v_row.company_id, 'projects') then raise exception 'Entregável não disponível para este acesso.' using errcode = '42501'; end if;
  insert into cali_workspace.comments (company_id, target_type, target_id, author_user_id, body, client_visible, source_actor)
  values (v_row.company_id, 'deliverable', v_row.id, auth.uid(), left(btrim(p_body), 5000), coalesce(p_client_visible, true), 'admin')
  returning id into v_id;
  if not coalesce(p_client_visible, true) then
    select full_name into v_name from cali_workspace.staff_members where user_id = auth.uid();
    insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
    select v_row.company_id, p.id, 'staff_internal_note', 'Nota interna de ' || coalesce(v_name, 'Equipe CALI'), left('“' || v_row.title || '”: ' || btrim(p_body), 400), 'deliverable', v_row.id, '/admin/projetos?deliverable=' || v_row.id::text, 'normal', false
      from cali_workspace.profiles p where p.role = 'admin' and p.active;
  end if;
  return v_id;
end;
$$;

create or replace function cali_workspace.partner_start_deliverable_timer(p_deliverable_id uuid)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_row cali_workspace.deliverables%rowtype; v_id uuid;
begin
  select * into v_row from cali_workspace.deliverables where id = p_deliverable_id;
  if not found then raise exception 'Entregável não encontrado.'; end if;
  if not (cali_workspace.partner_can_access(v_row.company_id, 'projects') and cali_workspace.partner_can_access(v_row.company_id, 'hours')) then raise exception 'Você precisa dos módulos Projetos e Horas nesta empresa para usar o cronômetro.' using errcode = '42501'; end if;
  if v_row.status in ('approved', 'cancelled') then raise exception 'Este entregável está encerrado e não aceita novas horas.'; end if;
  if exists (select 1 from cali_workspace.work_timers where user_id = auth.uid() and company_id = v_row.company_id and status in ('active', 'paused')) then
    raise exception 'Você já tem um cronômetro ligado nesta empresa. Pare o atual antes de iniciar outro.';
  end if;
  insert into cali_workspace.work_timers (company_id, project_id, deliverable_id, cycle_id, user_id, category, description, note, client_visible, status)
  values (v_row.company_id, v_row.project_id, v_row.id, v_row.cycle_id, auth.uid(), 'Execução', coalesce(v_row.protocol || ' · ', '') || v_row.title, coalesce(v_row.protocol || ' · ', '') || v_row.title, false, 'active')
  returning id into v_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_row.company_id, auth.uid(), 'timer_started', 'work_timer', v_id, jsonb_build_object('project_id', v_row.project_id, 'deliverable_id', v_row.id, 'staff', true));
  return v_id;
end;
$$;

-- Etapas do entregável: o Partner marca como feita / não feita (não cria nem apaga).
create or replace function cali_workspace.partner_toggle_task(p_task_id uuid)
returns text language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_company uuid; v_status text; v_next text;
begin
  select company_id, status into v_company, v_status from cali_workspace.deliverable_tasks where id = p_task_id;
  if v_company is null then raise exception 'Etapa não encontrada.'; end if;
  if not cali_workspace.partner_can_access(v_company, 'projects') then raise exception 'Etapa não disponível para este acesso.' using errcode = '42501'; end if;
  v_next := case when v_status = 'done' then 'todo' else 'done' end;
  update cali_workspace.deliverable_tasks set status = v_next, completed_at = case when v_next = 'done' then now() else null end where id = p_task_id;
  return v_next;
end;
$$;

revoke all on function cali_workspace.partner_change_deliverable_status(uuid, text, text) from public, anon;
revoke all on function cali_workspace.partner_request_deliverable_review(uuid, text) from public, anon;
revoke all on function cali_workspace.partner_post_deliverable_comment(uuid, text, boolean) from public, anon;
revoke all on function cali_workspace.partner_start_deliverable_timer(uuid) from public, anon;
revoke all on function cali_workspace.partner_toggle_task(uuid) from public, anon;
grant execute on function cali_workspace.partner_change_deliverable_status(uuid, text, text) to authenticated;
grant execute on function cali_workspace.partner_request_deliverable_review(uuid, text) to authenticated;
grant execute on function cali_workspace.partner_post_deliverable_comment(uuid, text, boolean) to authenticated;
grant execute on function cali_workspace.partner_start_deliverable_timer(uuid) to authenticated;
grant execute on function cali_workspace.partner_toggle_task(uuid) to authenticated;
