-- CALI Workspace · Relatórios V4 · Parte 2
-- Monta a fotografia factual do período diretamente do Workspace.
-- A função é administrativa e não publica nada sozinha.

create or replace function cali_workspace.build_report_source_snapshot(
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
  v_company cali_workspace.companies%rowtype;
  v_period_months integer;
  v_snapshot jsonb;
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

  select * into v_company
  from cali_workspace.companies
  where id = p_company_id;

  if not found then
    raise exception 'Cliente não encontrado.' using errcode = 'P0002';
  end if;

  v_period_months := (
    extract(year from age(date_trunc('month', p_period_end), date_trunc('month', p_period_start)))::int * 12
    + extract(month from age(date_trunc('month', p_period_end), date_trunc('month', p_period_start)))::int
    + 1
  );

  select jsonb_build_object(
    'generatedAt', now(),
    'companyId', v_company.id,
    'companyName', v_company.display_name,
    'period', jsonb_build_object(
      'start', p_period_start,
      'end', p_period_end,
      'months', v_period_months
    ),
    'contract', jsonb_build_object(
      'serviceType', v_company.service_type,
      'servicePlan', v_company.service_plan,
      'monthlyHours', coalesce(v_company.monthly_hours_contracted, 0),
      'contractedHoursPeriod', coalesce(v_company.monthly_hours_contracted, 0) * v_period_months,
      'startDate', v_company.start_date,
      'endDate', v_company.end_date,
      'autoRenew', v_company.auto_renew
    ),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'protocol', p.protocol,
        'name', p.name,
        'status', p.status,
        'planningStatus', p.planning_status,
        'startDate', p.start_date,
        'targetEndDate', p.target_end_date,
        'completedAt', p.completed_at
      ) order by coalesce(p.start_date, p.created_at::date), p.name)
      from cali_workspace.projects p
      where p.company_id = p_company_id
        and coalesce(p.start_date, p.created_at::date) <= p_period_end
        and coalesce(p.completed_at::date, p.target_end_date, p_period_end) >= p_period_start
    ), '[]'::jsonb),
    'deliverables', jsonb_build_object(
      'total', (select count(*) from cali_workspace.deliverables d where d.company_id = p_company_id and d.created_at::date <= p_period_end),
      'approvedCount', (select count(*) from cali_workspace.deliverables d where d.company_id = p_company_id and d.approved_at::date between p_period_start and p_period_end),
      'approved', coalesce((
        select jsonb_agg(jsonb_build_object('id', d.id, 'protocol', d.protocol, 'title', d.title, 'approvedAt', d.approved_at, 'projectId', d.project_id, 'workstream', d.workstream, 'complexity', d.complexity) order by d.approved_at)
        from cali_workspace.deliverables d
        where d.company_id = p_company_id and d.approved_at::date between p_period_start and p_period_end
      ), '[]'::jsonb),
      'createdCount', (select count(*) from cali_workspace.deliverables d where d.company_id = p_company_id and d.created_at::date between p_period_start and p_period_end),
      'inProgressCount', (select count(*) from cali_workspace.deliverables d where d.company_id = p_company_id and d.status in ('in_progress','internal_review')),
      'clientReviewCount', (select count(*) from cali_workspace.deliverables d where d.company_id = p_company_id and d.status = 'client_review'),
      'delayBusinessDays', coalesce((select sum(coalesce(d.client_delay_business_days,0)) from cali_workspace.deliverables d where d.company_id = p_company_id),0),
      'delayedCount', (select count(*) from cali_workspace.deliverables d where d.company_id = p_company_id and coalesce(d.client_delay_business_days,0) > 0),
      'adjustmentCount', coalesce((select sum(coalesce(d.adjustment_count,0)) from cali_workspace.deliverables d where d.company_id = p_company_id),0),
      'rebriefingCount', (select count(*) from cali_workspace.deliverables d where d.company_id = p_company_id and d.rebriefing_required),
      'statusChanges', coalesce((
        select jsonb_agg(jsonb_build_object(
          'deliverableId', h.deliverable_id,
          'title', d.title,
          'protocol', d.protocol,
          'from', h.from_status,
          'to', h.to_status,
          'note', h.note,
          'changedAt', h.created_at
        ) order by h.created_at)
        from cali_workspace.deliverable_status_history h
        join cali_workspace.deliverables d on d.id = h.deliverable_id
        where h.company_id = p_company_id
          and h.created_at::date between p_period_start and p_period_end
      ), '[]'::jsonb)
    ),
    'tasks', jsonb_build_object(
      'completedCount', (select count(*) from cali_workspace.deliverable_tasks t where t.company_id = p_company_id and t.completed_at::date between p_period_start and p_period_end),
      'createdCount', (select count(*) from cali_workspace.deliverable_tasks t where t.company_id = p_company_id and t.created_at::date between p_period_start and p_period_end),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', t.id,
          'protocol', t.protocol,
          'deliverableId', t.deliverable_id,
          'title', t.title,
          'status', t.status,
          'dueAt', t.due_at,
          'completedAt', t.completed_at,
          'estimatedMinutes', t.estimated_minutes
        ) order by coalesce(t.completed_at, t.created_at))
        from cali_workspace.deliverable_tasks t
        where t.company_id = p_company_id
          and (
            t.created_at::date between p_period_start and p_period_end
            or t.completed_at::date between p_period_start and p_period_end
            or t.due_at::date between p_period_start and p_period_end
          )
      ), '[]'::jsonb)
    ),
    'hours', jsonb_build_object(
      'contractedHours', coalesce(v_company.monthly_hours_contracted, 0) * v_period_months,
      'consumedMinutes', coalesce((select sum(h.minutes) from cali_workspace.hour_entries h where h.company_id = p_company_id and h.work_date between p_period_start and p_period_end), 0),
      'entriesCount', (select count(*) from cali_workspace.hour_entries h where h.company_id = p_company_id and h.work_date between p_period_start and p_period_end),
      'categories', coalesce((
        select jsonb_agg(jsonb_build_object('label', x.category, 'minutes', x.minutes) order by x.minutes desc)
        from (
          select coalesce(h.category, 'Sem categoria') as category, sum(h.minutes)::int as minutes
          from cali_workspace.hour_entries h
          where h.company_id = p_company_id and h.work_date between p_period_start and p_period_end
          group by coalesce(h.category, 'Sem categoria')
        ) x
      ), '[]'::jsonb),
      'entries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', h.id,
          'workDate', h.work_date,
          'minutes', h.minutes,
          'category', h.category,
          'description', h.description,
          'projectId', h.project_id,
          'deliverableId', h.deliverable_id
        ) order by h.work_date, h.created_at)
        from cali_workspace.hour_entries h
        where h.company_id = p_company_id and h.work_date between p_period_start and p_period_end
      ), '[]'::jsonb)
    ),
    'feedback', jsonb_build_object(
      'count', (select count(*) from cali_workspace.nps_responses n where n.company_id = p_company_id and n.created_at::date between p_period_start and p_period_end),
      'average', (select round(avg(n.score)::numeric, 2) from cali_workspace.nps_responses n where n.company_id = p_company_id and n.created_at::date between p_period_start and p_period_end),
      'lowScoreCount', (select count(*) from cali_workspace.nps_responses n where n.company_id = p_company_id and n.created_at::date between p_period_start and p_period_end and n.score between 1 and 3),
      'responses', coalesce((
        select jsonb_agg(jsonb_build_object('score', n.score, 'comment', n.comment, 'deliverableId', n.deliverable_id, 'createdAt', n.created_at) order by n.created_at)
        from cali_workspace.nps_responses n
        where n.company_id = p_company_id and n.created_at::date between p_period_start and p_period_end
      ), '[]'::jsonb)
    ),
    'events', jsonb_build_object(
      'count', (select count(*) from cali_workspace.events e where e.company_id = p_company_id and e.starts_at::date between p_period_start and p_period_end and e.cancelled_at is null),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('id', e.id, 'protocol', e.protocol, 'title', e.title, 'type', e.event_type, 'startsAt', e.starts_at, 'endsAt', e.ends_at, 'mode', e.mode) order by e.starts_at)
        from cali_workspace.events e
        where e.company_id = p_company_id and e.starts_at::date between p_period_start and p_period_end and e.cancelled_at is null
      ), '[]'::jsonb)
    ),
    'documents', jsonb_build_object(
      'publishedCount', (select count(*) from cali_workspace.files f where f.company_id = p_company_id and f.status = 'published' and f.published_at::date between p_period_start and p_period_end),
      'published', coalesce((
        select jsonb_agg(jsonb_build_object('id', f.id, 'protocol', f.protocol, 'title', f.title, 'category', f.category, 'kind', f.document_kind, 'publishedAt', f.published_at, 'deliverableId', f.deliverable_id) order by f.published_at)
        from cali_workspace.files f
        where f.company_id = p_company_id and f.status = 'published' and f.published_at::date between p_period_start and p_period_end
      ), '[]'::jsonb),
      'awaitingFinalCount', (select count(*) from cali_workspace.files f where f.company_id = p_company_id and f.workflow_stage = 'awaiting_final_file'),
      'readyToPublishCount', (select count(*) from cali_workspace.files f where f.company_id = p_company_id and f.workflow_stage = 'ready_to_publish')
    ),
    'conversations', jsonb_build_object(
      'commentCount', (select count(*) from cali_workspace.comments c where c.company_id = p_company_id and c.created_at::date between p_period_start and p_period_end),
      'comments', coalesce((
        select jsonb_agg(jsonb_build_object('targetType', c.target_type, 'targetId', c.target_id, 'body', c.body, 'clientVisible', c.client_visible, 'createdAt', c.created_at) order by c.created_at)
        from cali_workspace.comments c
        where c.company_id = p_company_id and c.created_at::date between p_period_start and p_period_end
      ), '[]'::jsonb)
    )
  ) into v_snapshot;

  return v_snapshot;
end;
$$;

grant execute on function cali_workspace.build_report_source_snapshot(uuid,date,date) to authenticated, service_role;

comment on function cali_workspace.build_report_source_snapshot(uuid,date,date) is
  'Monta a fotografia factual administrativa de um cliente/período para Relatórios V4.';
