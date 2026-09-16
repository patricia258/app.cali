-- CALI Workspace · Inteligência de conta V12
-- Registros de contexto/reunião/ocorrência + snapshot executivo enriquecido.

create table if not exists cali_workspace.account_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid null references cali_workspace.projects(id) on delete set null,
  event_id uuid null references cali_workspace.events(id) on delete set null,
  cycle_id uuid null references cali_workspace.service_cycles(id) on delete set null,
  protocol text not null default cali_workspace.generate_protocol('REG'),
  record_type text not null default 'occurrence' check (record_type in (
    'meeting','occurrence','decision','request','people_movement','leadership',
    'risk','context_change','client_input','cali_perception','milestone','other'
  )),
  title text not null check (char_length(btrim(title)) between 2 and 180),
  occurred_at timestamptz not null default now(),
  visibility text not null default 'internal' check (visibility in ('internal','client')),
  source_actor text not null default 'admin' check (source_actor in ('admin','client','calendar','import')),
  participants jsonb not null default '[]'::jsonb check (jsonb_typeof(participants) = 'array'),
  summary text null,
  transcript text null,
  decisions jsonb not null default '[]'::jsonb check (jsonb_typeof(decisions) = 'array'),
  attention_points jsonb not null default '[]'::jsonb check (jsonb_typeof(attention_points) = 'array'),
  next_actions jsonb not null default '[]'::jsonb check (jsonb_typeof(next_actions) = 'array'),
  impact_level text not null default 'medium' check (impact_level in ('low','medium','high','critical')),
  include_in_report boolean not null default true,
  requires_action boolean not null default false,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_records_company_period_idx
  on cali_workspace.account_records(company_id, occurred_at desc);
create index if not exists account_records_event_idx
  on cali_workspace.account_records(event_id) where event_id is not null;
create index if not exists account_records_project_idx
  on cali_workspace.account_records(project_id) where project_id is not null;

alter table cali_workspace.account_records enable row level security;

drop policy if exists account_records_admin_all on cali_workspace.account_records;
create policy account_records_admin_all
  on cali_workspace.account_records
  for all
  to authenticated
  using (cali_workspace.is_admin())
  with check (cali_workspace.is_admin());

drop policy if exists account_records_client_select on cali_workspace.account_records;
create policy account_records_client_select
  on cali_workspace.account_records
  for select
  to authenticated
  using (
    company_id = cali_workspace.current_company_id()
    and visibility = 'client'
  );

drop policy if exists account_records_client_insert on cali_workspace.account_records;
create policy account_records_client_insert
  on cali_workspace.account_records
  for insert
  to authenticated
  with check (
    company_id = cali_workspace.current_company_id()
    and created_by = auth.uid()
    and source_actor = 'client'
    and visibility = 'client'
  );

grant select, insert, update, delete on cali_workspace.account_records to authenticated;
grant select, insert, update, delete on cali_workspace.account_records to service_role;

comment on table cali_workspace.account_records is
  'Memória operacional e consultiva da conta: reuniões, ocorrências, decisões, mudanças de contexto e percepções que alimentam relatórios.';

create or replace function cali_workspace.build_report_intelligence_snapshot(
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
  v_base jsonb;
  v_extra jsonb;
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

  v_base := cali_workspace.build_report_source_snapshot(p_company_id, p_period_start, p_period_end);

  select jsonb_build_object(
    'records', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'protocol', r.protocol,
        'type', r.record_type,
        'title', r.title,
        'occurredAt', r.occurred_at,
        'visibility', r.visibility,
        'sourceActor', r.source_actor,
        'participants', r.participants,
        'summary', r.summary,
        'transcript', r.transcript,
        'decisions', r.decisions,
        'attentionPoints', r.attention_points,
        'nextActions', r.next_actions,
        'impactLevel', r.impact_level,
        'includeInReport', r.include_in_report,
        'requiresAction', r.requires_action,
        'projectId', r.project_id,
        'eventId', r.event_id,
        'cycleId', r.cycle_id
      ) order by r.occurred_at)
      from cali_workspace.account_records r
      where r.company_id = p_company_id
        and r.occurred_at::date between p_period_start and p_period_end
    ), '[]'::jsonb),

    'workstreams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.id,
        'protocol', w.protocol,
        'projectId', w.project_id,
        'projectName', p.name,
        'name', w.name,
        'objective', w.objective,
        'status', w.status,
        'roadmapMonthStart', w.roadmap_month_start,
        'roadmapMonthEnd', w.roadmap_month_end
      ) order by p.name, w.sort_order, w.name)
      from cali_workspace.project_workstreams w
      join cali_workspace.projects p on p.id = w.project_id
      where w.company_id = p_company_id
        and w.status <> 'cancelled'
        and coalesce(p.start_date, p.created_at::date) <= p_period_end
        and coalesce(p.completed_at::date, p.target_end_date, p_period_end) >= p_period_start
    ), '[]'::jsonb),

    'cycleContext', coalesce((
      select jsonb_build_object(
        'id', c.id,
        'protocol', c.protocol,
        'projectId', c.project_id,
        'projectName', p.name,
        'referenceMonth', c.reference_month,
        'contractedHours', c.contracted_hours,
        'status', c.status,
        'executiveNote', c.executive_note
      )
      from cali_workspace.service_cycles c
      left join cali_workspace.projects p on p.id = c.project_id
      where c.company_id = p_company_id
        and c.reference_month between date_trunc('month', p_period_start)::date and date_trunc('month', p_period_end)::date
      order by c.reference_month desc
      limit 1
    ), 'null'::jsonb),

    'dependencies', jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(dep.item order by dep.sort_at nulls last)
        from (
          select
            d.client_response_due_at as sort_at,
            jsonb_build_object(
              'kind','client_validation',
              'title',d.title,
              'protocol',d.protocol,
              'responsible','client',
              'status',d.status,
              'openedAt',d.approval_requested_at,
              'dueAt',d.client_response_due_at,
              'delayBusinessDays',coalesce(d.client_delay_business_days,0),
              'impactBusinessDays',coalesce(d.client_delay_business_days,0),
              'detail',case when coalesce(d.client_delay_business_days,0) > 0
                then 'Validação do cliente com impacto de prazo acumulado.'
                else 'Validação do cliente necessária para continuidade do fluxo.' end
            ) as item
          from cali_workspace.deliverables d
          where d.company_id = p_company_id and d.status = 'client_review'

          union all

          select
            pr.response_due_at as sort_at,
            jsonb_build_object(
              'kind','project_review',
              'title',p.name,
              'protocol',pr.protocol,
              'responsible','client',
              'status',pr.status,
              'openedAt',pr.requested_at,
              'dueAt',pr.response_due_at,
              'delayBusinessDays',coalesce(pr.delay_business_days,0),
              'impactBusinessDays',coalesce(pr.downstream_shift_business_days,0),
              'detail',coalesce(pr.response_note,'Revisão do cronograma/projeto aguardando retorno do cliente.')
            ) as item
          from cali_workspace.project_review_requests pr
          join cali_workspace.projects p on p.id = pr.project_id
          where pr.company_id = p_company_id and pr.status = 'pending'

          union all

          select
            a.created_at as sort_at,
            jsonb_build_object(
              'kind',a.request_kind,
              'title',d.title,
              'protocol',a.protocol,
              'responsible','shared',
              'status',a.status,
              'openedAt',a.created_at,
              'dueAt',a.new_due_at,
              'delayBusinessDays',coalesce(a.impact_business_days,0),
              'impactBusinessDays',coalesce(a.impact_business_days,0),
              'detail',a.reason
            ) as item
          from cali_workspace.deliverable_adjustments a
          join cali_workspace.deliverables d on d.id = a.deliverable_id
          where a.company_id = p_company_id and a.status in ('open','accepted')

          union all

          select
            blocker.due_at as sort_at,
            jsonb_build_object(
              'kind','deliverable_dependency',
              'title',d.title,
              'protocol',d.protocol,
              'responsible','flow',
              'status',d.status,
              'openedAt',rel.created_at,
              'dueAt',blocker.due_at,
              'delayBusinessDays',0,
              'impactBusinessDays',0,
              'detail',format('Depende da conclusão de %s.', blocker.title),
              'dependsOnTitle',blocker.title,
              'dependsOnProtocol',blocker.protocol
            ) as item
          from cali_workspace.deliverable_dependencies rel
          join cali_workspace.deliverables d on d.id = rel.deliverable_id
          join cali_workspace.deliverables blocker on blocker.id = rel.depends_on_deliverable_id
          where rel.company_id = p_company_id
            and blocker.status not in ('approved','cancelled')
        ) dep
      ), '[]'::jsonb)
    ),

    'previousReports', coalesce((
      select jsonb_agg(x.item order by x.period_start)
      from (
        select
          r.period_start,
          jsonb_build_object(
            'id', r.id,
            'protocol', r.protocol,
            'periodStart', r.period_start,
            'periodEnd', r.period_end,
            'status', r.status,
            'contractedHours', coalesce(r.contracted_hours_snapshot, nullif((r.hours_summary->>'contracted_hours')::numeric,0)),
            'consumedMinutes', coalesce((r.hours_summary->>'consumed_minutes')::numeric, (r.source_snapshot->'hours'->>'consumedMinutes')::numeric, 0),
            'feedbackAverage', case
              when jsonb_typeof(r.source_snapshot->'feedback') = 'object' then (r.source_snapshot->'feedback'->>'average')::numeric
              else null end
          ) as item
        from cali_workspace.reports r
        where r.company_id = p_company_id
          and r.report_type = 'monthly'
          and r.status = 'published'
          and r.period_start < p_period_start
        order by r.period_start desc
        limit 6
      ) x
    ), '[]'::jsonb)
  ) into v_extra;

  return v_base || v_extra;
end;
$$;

grant execute on function cali_workspace.build_report_intelligence_snapshot(uuid,date,date) to authenticated, service_role;

comment on function cali_workspace.build_report_intelligence_snapshot(uuid,date,date) is
  'Snapshot executivo enriquecido com registros, frentes, dependências explícitas e histórico para Relatórios V12.';
