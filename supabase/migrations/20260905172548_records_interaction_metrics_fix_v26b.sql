-- CALI Workspace · V26B · métricas de ocorrências/solicitações sem multiplicação de linhas

drop view if exists cali_workspace.account_interaction_monthly_metrics;
drop view if exists cali_workspace.account_record_interaction_metrics;

create view cali_workspace.account_record_interaction_metrics as
select
  r.id as record_id,
  r.company_id,
  r.project_id,
  r.protocol,
  r.record_type,
  r.title,
  r.occurred_at,
  r.created_at,
  r.first_admin_opened_at,
  r.closed_at,
  r.workflow_status,
  coalesce(msg.message_count,0)::bigint as message_count,
  msg.first_admin_response_at,
  coalesce(hrs.total_work_minutes,0)::integer as total_work_minutes,
  coalesce(hrs.work_sessions,0)::bigint as work_sessions,
  case when msg.first_admin_response_at is null then null
       else round(extract(epoch from (msg.first_admin_response_at-r.created_at))/60.0,1) end as first_response_minutes
from cali_workspace.account_records r
left join lateral (
  select count(*) as message_count,
         min(m.created_at) filter (where m.author_role='admin') as first_admin_response_at
    from cali_workspace.account_record_messages m
   where m.record_id=r.id and m.deleted_at is null
) msg on true
left join lateral (
  select coalesce(sum(h.minutes),0)::integer as total_work_minutes,
         count(*) as work_sessions
    from cali_workspace.hour_entries h
   where h.account_record_id=r.id
) hrs on true
where r.workflow_status is not null
  and r.visibility='client';

create view cali_workspace.account_interaction_monthly_metrics as
select
  company_id,
  date_trunc('month',occurred_at)::date as reference_month,
  count(*)::integer as interactions_count,
  count(*) filter (where record_type='request')::integer as requests_count,
  count(*) filter (where record_type='occurrence')::integer as occurrences_count,
  count(*) filter (where workflow_status='completed')::integer as completed_count,
  coalesce(sum(total_work_minutes),0)::integer as total_work_minutes,
  coalesce(round(avg(total_work_minutes)::numeric,1),0) as average_work_minutes_per_interaction,
  coalesce(round(avg(first_response_minutes) filter (where first_response_minutes is not null)::numeric,1),0) as average_first_response_minutes
from cali_workspace.account_record_interaction_metrics
group by company_id,date_trunc('month',occurred_at)::date;

grant select on cali_workspace.account_record_interaction_metrics to authenticated;
grant select on cali_workspace.account_interaction_monthly_metrics to authenticated;
