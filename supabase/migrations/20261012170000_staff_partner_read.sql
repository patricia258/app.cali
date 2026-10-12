-- Perfil Partner — ETAPA 2 (leitura). Autorizado pela proprietária em 2026-10-12 ("pode seguir com a etapa 2").
-- Só ACRESCENTA políticas de leitura para o Partner, por empresa atribuída e módulo liberado. Nenhuma política existente muda.
-- Continua sem efeito prático até o login do Partner ser ligado (etapa 4).
-- Fora de propósito (sem política para o Partner): companies (tem valores de contrato — ele usa partner_companies()),
-- billing_records, extra_visit_expenses, scheduling_requests (taxas), nps_responses, satisfaction_followups, activity_log,
-- team_member_private, team_private_audit, client_invites, communication_*.

create or replace function cali_workspace.partner_has_module(target_module text) returns boolean
language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select exists (select 1 from cali_workspace.staff_members s join cali_workspace.profiles p on p.id = s.user_id and p.active and p.role = 'partner'
                 where s.user_id = auth.uid() and s.active and target_module = any (s.modules));
$$;
revoke all on function cali_workspace.partner_has_module(text) from public, anon;
grant execute on function cali_workspace.partner_has_module(text) to authenticated;

-- Empresas atribuídas, só com dados não sensíveis (sem valor de contrato, cobrança, multa ou observações de pagamento).
create or replace function cali_workspace.partner_companies()
returns table (id uuid, display_name text, legal_name text, logo_url text, logo_workspace_url text, status text, service_plan text, service_type text, segment text, monthly_hours_contracted numeric, start_date date, onsite_visits_included_per_month integer, meeting_sessions_included_per_month integer, protocol text)
language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select c.id, c.display_name, c.legal_name, c.logo_url, c.logo_workspace_url, c.status, c.service_plan, c.service_type, c.segment, c.monthly_hours_contracted, c.start_date, c.onsite_visits_included_per_month::integer, c.meeting_sessions_included_per_month::integer, c.protocol
  from cali_workspace.companies c
  where cali_workspace.partner_can_access(c.id);
$$;
revoke all on function cali_workspace.partner_companies() from public, anon;
grant execute on function cali_workspace.partner_companies() to authenticated;

do $$
declare item record;
begin
  for item in select * from (values
    ('account_records','records'),('account_record_messages','records'),('account_record_message_reactions','records'),('account_record_feedback','records'),('account_record_reopen_requests','records'),
    ('projects','projects'),('project_workstreams','projects'),('deliverables','projects'),('deliverable_tasks','projects'),('deliverable_dependencies','projects'),('deliverable_adjustments','projects'),('deliverable_status_history','projects'),('project_review_requests','projects'),('project_lifecycle_events','projects'),('comments','projects'),('comment_reactions','projects'),
    ('hour_entries','hours'),('service_cycles','hours'),('hour_alerts','hours'),
    ('events','calendar'),('event_attendees','calendar'),('event_outcomes','calendar'),('agenda_change_requests','calendar'),
    ('files','documents'),('document_acknowledgements','documents'),('account_documents','documents'),
    ('reports','reports'),
    ('notice_targets','notices'),('notice_acknowledgements','notices'),('notice_comments','notices'),('notice_reactions','notices'),
    ('team_members','team'),('team_months','team'),('team_month_snapshots','team'),('team_changes','team'),('team_month_metrics','team'),('team_month_reviews','team'),('team_vacancies','team'),
    ('company_fronts',null)
  ) as t(tbl, module) loop
    execute format('drop policy if exists %I on cali_workspace.%I', item.tbl || '_partner_read', item.tbl);
    execute format('create policy %I on cali_workspace.%I for select to authenticated using ((select cali_workspace.is_partner()) and cali_workspace.partner_can_access(company_id, %L))', item.tbl || '_partner_read', item.tbl, item.module);
  end loop;
end $$;

-- Cronômetro: só o próprio.
drop policy if exists work_timers_partner_read on cali_workspace.work_timers;
create policy work_timers_partner_read on cali_workspace.work_timers for select to authenticated using ((select cali_workspace.is_partner()) and user_id = (select auth.uid()) and cali_workspace.partner_can_access(company_id, 'hours'));

-- Comunicados: os gerais e os dirigidos a empresas atribuídas.
drop policy if exists notices_partner_read on cali_workspace.notices;
create policy notices_partner_read on cali_workspace.notices for select to authenticated using ((select cali_workspace.partner_has_module('notices')) and (audience = 'all' or exists (select 1 from cali_workspace.notice_targets t where t.notice_id = notices.id and cali_workspace.partner_can_access(t.company_id, 'notices'))));

-- Pessoas de contato das empresas atribuídas (nome, cargo, foto) para as telas mostrarem quem é quem.
drop policy if exists profiles_partner_read on cali_workspace.profiles;
create policy profiles_partner_read on cali_workspace.profiles for select to authenticated using ((select cali_workspace.is_partner()) and company_id is not null and cali_workspace.partner_can_access(company_id));
