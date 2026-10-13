-- Perfil Partner — HORAS na mesma tela da administradora (regras da proprietária em 2026-10-13).
-- Só acréscimo: duas funções "partner_*" novas. Nenhuma função ou política existente é alterada.
-- Regras: vê o consumo de cada empresa atribuída (só o total) e os lançamentos DELE; cronômetro, lançamento manual e
-- interação externa vão para aprovação; pode editar um lançamento dele enquanto aguarda aprovação, com motivo (auditoria);
-- não exclui.

create or replace function cali_workspace.partner_start_timer(p_company_id uuid, p_project_id uuid default null, p_deliverable_id uuid default null, p_task_id uuid default null, p_category text default 'Execução', p_description text default null)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_id uuid; v_cycle uuid;
begin
  if not cali_workspace.partner_can_access(p_company_id, 'hours') then raise exception 'Você precisa do módulo Horas nesta empresa para usar o cronômetro.' using errcode = '42501'; end if;
  if p_deliverable_id is not null and not exists (select 1 from cali_workspace.deliverables d where d.id = p_deliverable_id and d.company_id = p_company_id and d.status not in ('approved', 'cancelled')) then raise exception 'Entregável indisponível para novas horas.'; end if;
  if p_project_id is not null and not exists (select 1 from cali_workspace.projects p where p.id = p_project_id and p.company_id = p_company_id) then raise exception 'Projeto não pertence a esta empresa.'; end if;
  if exists (select 1 from cali_workspace.work_timers where user_id = auth.uid() and company_id = p_company_id and status in ('active', 'paused')) then
    raise exception 'Você já tem um cronômetro ligado nesta empresa. Pare o atual antes de iniciar outro.';
  end if;
  if p_deliverable_id is not null then select d.cycle_id into v_cycle from cali_workspace.deliverables d where d.id = p_deliverable_id; end if;
  insert into cali_workspace.work_timers (company_id, project_id, deliverable_id, task_id, cycle_id, user_id, category, description, note, client_visible, status, last_seen_at)
  values (p_company_id, p_project_id, p_deliverable_id, p_task_id, v_cycle, auth.uid(), coalesce(nullif(btrim(coalesce(p_category, '')), ''), 'Execução'),
          nullif(btrim(coalesce(p_description, '')), ''), nullif(btrim(coalesce(p_description, '')), ''), false, 'active', now())
  returning id into v_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (p_company_id, auth.uid(), 'timer_started', 'work_timer', v_id, jsonb_build_object('project_id', p_project_id, 'deliverable_id', p_deliverable_id, 'task_id', p_task_id, 'staff', true));
  return v_id;
end;
$$;

create or replace function cali_workspace.partner_edit_hour_submission(p_id uuid, p_work_date date, p_minutes integer, p_description text, p_reason text)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_row cali_workspace.staff_hour_submissions%rowtype;
begin
  select * into v_row from cali_workspace.staff_hour_submissions where id = p_id and staff_user_id = auth.uid() for update;
  if not found then raise exception 'Lançamento não encontrado.'; end if;
  if not cali_workspace.is_partner() then raise exception 'Acesso restrito à Equipe CALI.' using errcode = '42501'; end if;
  if v_row.status <> 'pending' then raise exception 'Este lançamento já foi decidido pela Patricia e não pode mais ser editado. Fale com ela.'; end if;
  if p_minutes is null or p_minutes <= 0 or p_minutes > 1440 then raise exception 'Informe uma duração entre 1 minuto e 24 horas.'; end if;
  if char_length(btrim(coalesce(p_description, ''))) < 3 then raise exception 'Descreva o que foi feito.'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then raise exception 'Explique o motivo da edição.'; end if;
  update cali_workspace.staff_hour_submissions
     set work_date = coalesce(p_work_date, work_date), minutes = p_minutes, description = left(btrim(p_description), 500),
         justification = left(justification || ' | Editado: de ' || v_row.minutes || ' para ' || p_minutes || ' min. Motivo: ' || btrim(p_reason), 1500)
   where id = p_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_row.company_id, auth.uid(), 'staff_hours_edited', 'staff_hour_submission', v_row.id, jsonb_build_object('from_minutes', v_row.minutes, 'minutes', p_minutes, 'reason', btrim(p_reason)));
end;
$$;

revoke all on function cali_workspace.partner_start_timer(uuid, uuid, uuid, uuid, text, text) from public, anon;
revoke all on function cali_workspace.partner_edit_hour_submission(uuid, date, integer, text, text) from public, anon;
grant execute on function cali_workspace.partner_start_timer(uuid, uuid, uuid, uuid, text, text) to authenticated;
grant execute on function cali_workspace.partner_edit_hour_submission(uuid, date, integer, text, text) to authenticated;
