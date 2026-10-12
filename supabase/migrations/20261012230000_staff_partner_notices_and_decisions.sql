-- Perfil Partner — comunicados diretos e retorno das decisões. Autorizado em 2026-10-12 ("pode aplicar tudo o que ainda falta").
-- Só acréscimo: duas funções novas e dois gatilhos nas tabelas das filas. Nenhuma função ou política existente muda.

-- 1) O Partner publica comunicado, apenas para empresas atribuídas a ele e com o módulo Avisos liberado.
--    O comunicado sai como "CALI · Assessoria" (igual aos da administradora); ela é avisada de cada publicação.
create or replace function cali_workspace.partner_publish_notice(p_category text, p_title text, p_body text, p_companies uuid[], p_date date default null, p_time text default null, p_coverage text default null)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace', 'auth' as $$
declare v_id uuid; v_company uuid; v_name text;
begin
  if not cali_workspace.partner_has_module('notices') then raise exception 'Você não tem o módulo Avisos liberado' using errcode = '42501'; end if;
  if p_companies is null or array_length(p_companies, 1) is null then raise exception 'Escolha pelo menos uma empresa'; end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null or nullif(btrim(coalesce(p_body, '')), '') is null then raise exception 'Título e mensagem são obrigatórios'; end if;
  if p_category not in ('feriado', 'atendimento', 'comunicado') then raise exception 'Categoria inválida'; end if;
  foreach v_company in array p_companies loop
    if not cali_workspace.partner_can_access(v_company, 'notices') then raise exception 'Empresa não atribuída a você' using errcode = '42501'; end if;
  end loop;
  insert into cali_workspace.notices (category, title, body, notice_date, time_label, coverage, audience, status, created_by)
  values (p_category, btrim(p_title), btrim(p_body), p_date, nullif(btrim(coalesce(p_time, '')), ''), nullif(btrim(coalesce(p_coverage, '')), ''), 'selected', 'published', auth.uid())
  returning id into v_id;
  insert into cali_workspace.notice_targets (notice_id, company_id) select v_id, c from unnest(p_companies) as c group by c;
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, email_required)
  select p.company_id, p.id, 'notice', 'Novo aviso da CALI: ' || btrim(p_title), left(btrim(p_body), 400), 'notice', v_id, '/cliente/avisos?aviso=' || v_id, true
    from cali_workspace.profiles p where p.role = 'client' and p.active and p.company_id = any (p_companies);
  select full_name into v_name from cali_workspace.staff_members where user_id = auth.uid();
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  select null, p.id, 'staff_notice_published', 'Comunicado publicado por ' || coalesce(v_name, 'Equipe CALI'), left(btrim(p_title), 400), 'notice', v_id, '/admin/avisos?aviso=' || v_id, 'normal', false
    from cali_workspace.profiles p where p.role = 'admin' and p.active;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (p_companies[1], auth.uid(), 'staff_notice_published', 'notice', v_id, jsonb_build_object('title', btrim(p_title), 'companies', array_length(p_companies, 1)));
  return v_id;
end;
$$;
revoke all on function cali_workspace.partner_publish_notice(text, text, text, uuid[], date, text, text) from public, anon;
grant execute on function cali_workspace.partner_publish_notice(text, text, text, uuid[], date, text, text) to authenticated;

-- 2) Quando a administradora decide (horas ou material), o Partner recebe o aviso.
create or replace function cali_workspace.notify_staff_decision() returns trigger
language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
declare v_title text; v_url text;
begin
  if new.status = old.status or new.status = 'pending' then return new; end if;
  if tg_table_name = 'staff_hour_submissions' then
    v_title := case when new.status = 'approved' then 'Horas aprovadas' else 'Horas recusadas' end; v_url := '/equipe/horas';
  else
    v_title := case when new.status = 'approved' then 'Material aprovado' else 'Material devolvido para ajuste' end; v_url := '/equipe/aprovacoes';
  end if;
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  values (new.company_id, new.staff_user_id, 'staff_decision', v_title, left(coalesce(new.decision_note, ''), 400), tg_table_name, new.id, v_url, 'normal', false);
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists staff_hours_notify_decision on cali_workspace.staff_hour_submissions;
create trigger staff_hours_notify_decision after update on cali_workspace.staff_hour_submissions for each row execute function cali_workspace.notify_staff_decision();
drop trigger if exists staff_reviews_notify_decision on cali_workspace.staff_review_requests;
create trigger staff_reviews_notify_decision after update on cali_workspace.staff_review_requests for each row execute function cali_workspace.notify_staff_decision();
