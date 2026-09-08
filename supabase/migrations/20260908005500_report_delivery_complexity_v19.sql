-- CALI Workspace · Relatórios V19
-- O relatório executivo precisa exibir a complexidade MC1/MC2/MC3 do entregável
-- sem criar uma segunda fonte de verdade. A view continua derivando tudo de deliverables.

create or replace view cali_workspace.deliverable_delivery_performance
with (security_invoker=true)
as
select
  d.id as deliverable_id,
  d.company_id,
  d.project_id,
  d.protocol,
  d.title,
  d.status,
  d.workstream,
  d.complexity,
  coalesce(p.roadmap_start_date,p.start_date) as project_planned_start,
  case
    when coalesce(p.roadmap_start_date,p.start_date) is not null
     and d.roadmap_month_start is not null
    then (
      coalesce(p.roadmap_start_date,p.start_date)
      + ((d.roadmap_month_start-1)||' months')::interval
    )::date
    else null
  end as planned_start_date,
  d.started_at as actual_started_at,
  d.original_due_at,
  d.due_at as effective_due_at,
  d.work_closed_at,
  d.work_close_reason,
  d.approved_at,
  d.client_response_at,
  coalesce(d.approved_at,d.work_closed_at) as completion_at,
  case
    when coalesce(d.approved_at,d.work_closed_at) is null or d.due_at is null then 'open'
    when coalesce(d.approved_at,d.work_closed_at)::date < d.due_at::date then 'before_deadline'
    when coalesce(d.approved_at,d.work_closed_at)::date = d.due_at::date then 'on_time'
    else 'after_deadline'
  end as delivery_timing,
  case
    when coalesce(d.approved_at,d.work_closed_at) is null or d.due_at is null then null
    else cali_workspace.business_days_delta(
      d.due_at::date,
      coalesce(d.approved_at,d.work_closed_at)::date
    )
  end as business_days_from_deadline,
  case
    when d.started_at is null
      or coalesce(p.roadmap_start_date,p.start_date) is null
      or d.roadmap_month_start is null then 'unknown'
    when d.started_at::date < (
      coalesce(p.roadmap_start_date,p.start_date)
      + ((d.roadmap_month_start-1)||' months')::interval
    )::date then 'started_early'
    when d.started_at::date = (
      coalesce(p.roadmap_start_date,p.start_date)
      + ((d.roadmap_month_start-1)||' months')::interval
    )::date then 'started_on_time'
    else 'started_late'
  end as start_timing,
  case
    when d.original_due_at is null or coalesce(d.approved_at,d.work_closed_at) is null then null
    else cali_workspace.business_days_delta(
      d.original_due_at::date,
      coalesce(d.approved_at,d.work_closed_at)::date
    )
  end as business_days_from_original_deadline,
  coalesce((
    select sum(h.minutes)
    from cali_workspace.hour_entries h
    where h.deliverable_id=d.id
  ),0)::integer as total_minutes
from cali_workspace.deliverables d
left join cali_workspace.projects p on p.id=d.project_id;

grant select on cali_workspace.deliverable_delivery_performance to authenticated, service_role;
