-- Indicadores mensais da home do cliente: entregáveis e registros compartilhados.
-- A agregação fica no servidor para incluir avaliações de todos os usuários da conta
-- sem expor comentários ou avaliações individuais de outros usuários ao cliente.
create or replace function cali_workspace.get_client_home_work_metrics(
  p_period_start date,
  p_period_end date
)
returns jsonb
language plpgsql
stable security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_company_id uuid;
  v_scores jsonb;
  v_work jsonb;
  v_unlinked_hours integer;
begin
  select p.company_id into v_company_id
  from cali_workspace.profiles p
  where p.id = auth.uid() and p.active and p.role = 'client';
  if v_company_id is null then
    raise exception 'Acesso de cliente não autorizado.' using errcode = '42501';
  end if;
  if p_period_start is null or p_period_end is null or p_period_end < p_period_start
     or p_period_end > p_period_start + 31 then
    raise exception 'Período inválido.' using errcode = '22023';
  end if;

  with ratings as (
    select n.score::numeric score from cali_workspace.nps_responses n
    where n.company_id = v_company_id
      and (n.created_at at time zone 'America/Sao_Paulo')::date between p_period_start and p_period_end
    union all
    select f.score::numeric from cali_workspace.account_record_feedback f
    join cali_workspace.account_records r on r.id = f.record_id
    where f.company_id = v_company_id and r.company_id = v_company_id and r.visibility = 'client'
      and (f.created_at at time zone 'America/Sao_Paulo')::date between p_period_start and p_period_end
  )
  select jsonb_build_object('average', round(avg(score), 2), 'count', count(*)::integer)
  into v_scores from ratings;

  with worked as (
    select distinct h.deliverable_id, h.account_record_id
    from cali_workspace.hour_entries h
    where h.company_id = v_company_id and h.client_visible
      and h.work_date between p_period_start and p_period_end
      and cali_workspace.client_hours_enabled_for_period(h.company_id, h.work_date)
      and cali_workspace.hour_project_operational(h.project_id)
  ), units as (
    select d.id, d.status
    from cali_workspace.deliverables d
    where d.company_id = v_company_id and d.client_visible and d.status <> 'cancelled'
      and (d.created_at at time zone 'America/Sao_Paulo')::date <= p_period_end
      and (
        (d.created_at at time zone 'America/Sao_Paulo')::date between p_period_start and p_period_end
        or (d.updated_at at time zone 'America/Sao_Paulo')::date between p_period_start and p_period_end
        or (d.approved_at at time zone 'America/Sao_Paulo')::date between p_period_start and p_period_end
        or exists (select 1 from worked w where w.deliverable_id = d.id)
      )
    union all
    select r.id, case r.workflow_status
      when 'completed' then 'approved'
      when 'waiting_client' then 'client_review'
      when 'open' then 'not_started'
      else 'in_progress' end
    from cali_workspace.account_records r
    where r.company_id = v_company_id and r.visibility = 'client'
      and r.workflow_status is not null and r.workflow_status <> 'cancelled'
      and (r.created_at at time zone 'America/Sao_Paulo')::date <= p_period_end
      and (
        (r.created_at at time zone 'America/Sao_Paulo')::date between p_period_start and p_period_end
        or (r.updated_at at time zone 'America/Sao_Paulo')::date between p_period_start and p_period_end
        or (r.closed_at at time zone 'America/Sao_Paulo')::date between p_period_start and p_period_end
        or exists (select 1 from worked w where w.account_record_id = r.id)
      )
  )
  select jsonb_build_object(
    'total', count(*)::integer,
    'completed', count(*) filter (where status = 'approved')::integer,
    'notStarted', count(*) filter (where status = 'not_started')::integer,
    'inProgress', count(*) filter (where status in ('in_progress','standby','adjustment_requested','rebriefing'))::integer,
    'internalReview', count(*) filter (where status = 'internal_review')::integer,
    'withClient', count(*) filter (where status = 'client_review')::integer
  ) into v_work from units;

  select count(*)::integer into v_unlinked_hours
  from cali_workspace.hour_entries h
  where h.company_id = v_company_id and h.client_visible
    and h.work_date between p_period_start and p_period_end
    and cali_workspace.client_hours_enabled_for_period(h.company_id, h.work_date)
    and cali_workspace.hour_project_operational(h.project_id)
    and h.deliverable_id is null and h.account_record_id is null;

  return jsonb_build_object('ratings', v_scores, 'work', v_work,
                            'unlinkedHourEntries', v_unlinked_hours);
end;
$$;

revoke all on function cali_workspace.get_client_home_work_metrics(date,date) from public, anon;
grant execute on function cali_workspace.get_client_home_work_metrics(date,date) to authenticated;
