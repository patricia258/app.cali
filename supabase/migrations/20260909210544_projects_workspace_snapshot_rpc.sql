create or replace function cali_workspace.get_admin_projects_workspace_snapshot()
returns jsonb
language sql
stable
set search_path to 'cali_workspace', 'public'
as $function$
  select jsonb_build_object(
    'companies', coalesce((select jsonb_agg(to_jsonb(c) order by c.display_name) from cali_workspace.companies c where c.status <> 'closed'), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from cali_workspace.projects p), '[]'::jsonb),
    'fronts', coalesce((select jsonb_agg(to_jsonb(f) order by f.sort_order) from cali_workspace.project_workstreams f), '[]'::jsonb),
    'deliverables', coalesce((select jsonb_agg(to_jsonb(d) order by d.sort_order) from cali_workspace.deliverables d), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order) from cali_workspace.deliverable_tasks t), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('deliverable_id', h.deliverable_id, 'minutes', h.minutes)) from cali_workspace.hour_entries h), '[]'::jsonb),
    'timers', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select wt.id, wt.deliverable_id, wt.started_at, wt.status
      from cali_workspace.work_timers wt
      where wt.status = 'active'
      order by wt.started_at desc
      limit 1
    ) x), '[]'::jsonb)
  );
$function$;
