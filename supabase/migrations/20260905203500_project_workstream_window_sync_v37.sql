-- CALI Workspace · a janela da frente nasce dos entregáveis, não de um palpite inicial.

create or replace function cali_workspace.refresh_project_workstream_ranges(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog','cali_workspace'
as $$
declare
  v_updated integer := 0;
begin
  if p_project_id is null then return 0; end if;

  with ranges as (
    select
      w.id,
      min(d.roadmap_month_start) filter (where d.status <> 'cancelled') as month_start,
      max(coalesce(d.roadmap_month_end,d.roadmap_month_start)) filter (where d.status <> 'cancelled') as month_end
    from cali_workspace.project_workstreams w
    left join cali_workspace.deliverables d
      on d.project_id = w.project_id
     and (
       d.workstream_id = w.id
       or (d.workstream_id is null and lower(trim(coalesce(d.workstream,''))) = lower(trim(w.name)))
     )
    where w.project_id = p_project_id
      and w.status <> 'cancelled'
    group by w.id
  )
  update cali_workspace.project_workstreams w
     set roadmap_month_start = r.month_start,
         roadmap_month_end = r.month_end,
         updated_at = now()
    from ranges r
   where w.id = r.id
     and (w.roadmap_month_start is distinct from r.month_start or w.roadmap_month_end is distinct from r.month_end);

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

grant execute on function cali_workspace.refresh_project_workstream_ranges(uuid) to authenticated;

create or replace function cali_workspace.sync_workstream_ranges_from_deliverable_v37()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','cali_workspace'
as $$
begin
  if tg_op = 'DELETE' then
    perform cali_workspace.refresh_project_workstream_ranges(old.project_id);
    return old;
  end if;
  perform cali_workspace.refresh_project_workstream_ranges(new.project_id);
  if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id then
    perform cali_workspace.refresh_project_workstream_ranges(old.project_id);
  end if;
  return new;
end;
$$;

drop trigger if exists deliverables_refresh_workstream_ranges_v37 on cali_workspace.deliverables;
create trigger deliverables_refresh_workstream_ranges_v37
after insert or delete or update of roadmap_month_start,roadmap_month_end,status,project_id,workstream_id,workstream
on cali_workspace.deliverables
for each row execute function cali_workspace.sync_workstream_ranges_from_deliverable_v37();

create or replace function cali_workspace.clear_empty_workstream_window_v37()
returns trigger
language plpgsql
set search_path to 'pg_catalog','cali_workspace'
as $$
begin
  if new.status = 'planned' and not exists (
    select 1 from cali_workspace.deliverables d
    where d.project_id = new.project_id
      and d.status <> 'cancelled'
      and (d.workstream_id = new.id or (d.workstream_id is null and lower(trim(coalesce(d.workstream,''))) = lower(trim(new.name))))
  ) then
    new.roadmap_month_start := null;
    new.roadmap_month_end := null;
  end if;
  return new;
end;
$$;

drop trigger if exists project_workstreams_clear_empty_window_v37 on cali_workspace.project_workstreams;
create trigger project_workstreams_clear_empty_window_v37
before insert or update of name,status
on cali_workspace.project_workstreams
for each row execute function cali_workspace.clear_empty_workstream_window_v37();

do $$
declare r record;
begin
  for r in select id from cali_workspace.projects loop
    perform cali_workspace.refresh_project_workstream_ranges(r.id);
  end loop;
end $$;
