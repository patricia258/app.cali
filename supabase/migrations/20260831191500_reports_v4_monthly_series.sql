-- CALI Workspace · Relatórios V4 · Série mensal para leitura evolutiva
-- Mantém o snapshot factual original e adiciona uma visão comparável mês a mês.

create or replace function cali_workspace.build_report_monthly_series(
  p_company_id uuid,
  p_period_start date,
  p_period_end date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_series jsonb;
begin
  if not cali_workspace.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  if p_company_id is null or p_period_start is null or p_period_end is null then
    raise exception 'Cliente e período são obrigatórios.' using errcode = '22004';
  end if;

  if p_period_end < p_period_start then
    raise exception 'O fim do período não pode ser anterior ao início.' using errcode = '22007';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'monthRef', to_char(m.month_start, 'YYYY-MM'),
      'start', m.month_start,
      'end', m.month_end,
      'consumedMinutes', (
        select coalesce(sum(h.minutes), 0)
        from cali_workspace.hour_entries h
        where h.company_id = p_company_id
          and h.work_date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'hourEntriesCount', (
        select count(*)
        from cali_workspace.hour_entries h
        where h.company_id = p_company_id
          and h.work_date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'approvedCount', (
        select count(*)
        from cali_workspace.deliverables d
        where d.company_id = p_company_id
          and d.approved_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'createdDeliverablesCount', (
        select count(*)
        from cali_workspace.deliverables d
        where d.company_id = p_company_id
          and d.created_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'completedTasksCount', (
        select count(*)
        from cali_workspace.deliverable_tasks t
        where t.company_id = p_company_id
          and t.completed_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'feedbackCount', (
        select count(*)
        from cali_workspace.nps_responses n
        where n.company_id = p_company_id
          and n.created_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'feedbackAverage', (
        select round(avg(n.score)::numeric, 2)
        from cali_workspace.nps_responses n
        where n.company_id = p_company_id
          and n.created_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'lowScoreCount', (
        select count(*)
        from cali_workspace.nps_responses n
        where n.company_id = p_company_id
          and n.created_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
          and n.score between 1 and 3
      ),
      'publishedDocumentsCount', (
        select count(*)
        from cali_workspace.files f
        where f.company_id = p_company_id
          and f.status = 'published'
          and f.published_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'eventsCount', (
        select count(*)
        from cali_workspace.events e
        where e.company_id = p_company_id
          and e.cancelled_at is null
          and e.starts_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'statusChangesCount', (
        select count(*)
        from cali_workspace.deliverable_status_history h
        where h.company_id = p_company_id
          and h.created_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'clientReviewEventsCount', (
        select count(*)
        from cali_workspace.deliverable_status_history h
        where h.company_id = p_company_id
          and h.to_status = 'client_review'
          and h.created_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'adjustmentEventsCount', (
        select count(*)
        from cali_workspace.deliverable_status_history h
        where h.company_id = p_company_id
          and h.to_status = 'adjustment_requested'
          and h.created_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      ),
      'rebriefingEventsCount', (
        select count(*)
        from cali_workspace.deliverable_status_history h
        where h.company_id = p_company_id
          and h.to_status = 'rebriefing'
          and h.created_at::date between greatest(m.month_start, p_period_start) and least(m.month_end, p_period_end)
      )
    ) order by m.month_start
  ), '[]'::jsonb)
  into v_series
  from (
    select
      gs::date as month_start,
      (gs + interval '1 month - 1 day')::date as month_end
    from generate_series(
      date_trunc('month', p_period_start::timestamp),
      date_trunc('month', p_period_end::timestamp),
      interval '1 month'
    ) gs
  ) m;

  return v_series;
end;
$$;

grant execute on function cali_workspace.build_report_monthly_series(uuid,date,date) to authenticated, service_role;

comment on function cali_workspace.build_report_monthly_series(uuid,date,date) is
  'Série mensal factual para Relatórios V4, usada principalmente na leitura evolutiva trimestral.';