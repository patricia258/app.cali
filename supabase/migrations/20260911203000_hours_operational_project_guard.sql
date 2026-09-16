-- Only projects whose planning has been accepted can generate or expose hours.
create or replace function cali_workspace.hour_project_operational(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, cali_workspace
as $$
  select p_project_id is null or exists (
    select 1
    from cali_workspace.projects p
    where p.id = p_project_id
      and p.status <> 'cancelled'
      and (
        p.planning_status in ('approved', 'active', 'rebriefing', 'closed')
        or (p.planning_status is null and p.status = 'active')
      )
  );
$$;

create or replace function cali_workspace.assert_hour_context(
  p_company_id uuid,
  p_project_id uuid,
  p_deliverable_id uuid,
  p_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
begin
  if not cali_workspace.is_admin() then
    raise exception 'Apenas administradores podem registrar horas.' using errcode = '42501';
  end if;

  if not exists (select 1 from cali_workspace.companies c where c.id = p_company_id and c.status <> 'closed') then
    raise exception 'Cliente não encontrado ou inativo.' using errcode = '42501';
  end if;

  if p_project_id is not null and not cali_workspace.hour_project_operational(p_project_id) then
    raise exception 'O projeto ainda aguarda a aprovação do cliente e não aceita horas.' using errcode = '42501';
  end if;

  if p_project_id is not null and not exists (
    select 1 from cali_workspace.projects p
    where p.id = p_project_id and p.company_id = p_company_id and p.status <> 'cancelled'
  ) then
    raise exception 'Projeto não pertence ao cliente selecionado.' using errcode = '42501';
  end if;

  if p_deliverable_id is not null and not exists (
    select 1 from cali_workspace.deliverables d
    where d.id = p_deliverable_id and d.company_id = p_company_id
      and (p_project_id is null or d.project_id = p_project_id)
      and d.status not in ('approved', 'cancelled', 'closed')
  ) then
    raise exception 'Entregável inválido para o contexto selecionado.' using errcode = '42501';
  end if;

  if p_task_id is not null and not exists (
    select 1 from cali_workspace.deliverable_tasks t
    where t.id = p_task_id and t.company_id = p_company_id
      and (p_deliverable_id is null or t.deliverable_id = p_deliverable_id)
      and t.status not in ('done', 'cancelled', 'closed')
  ) then
    raise exception 'Subtarefa inválida para o contexto selecionado.' using errcode = '42501';
  end if;
end;
$$;

create or replace function cali_workspace.enforce_operational_hour_project()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
begin
  if new.project_id is not null and not cali_workspace.hour_project_operational(new.project_id) then
    raise exception 'O projeto ainda aguarda a aprovação do cliente e não aceita horas.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists hour_entries_operational_project_guard on cali_workspace.hour_entries;
create trigger hour_entries_operational_project_guard
before insert or update of project_id on cali_workspace.hour_entries
for each row execute function cali_workspace.enforce_operational_hour_project();

create or replace function cali_workspace.get_client_hours_summary(p_period_start date, p_period_end date)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_company_id uuid;
  v_contracted numeric := 0;
  v_consumed integer := 0;
begin
  v_company_id := cali_workspace.current_company_id();
  if v_company_id is null then
    raise exception 'Empresa vinculada não encontrada.' using errcode = '42501';
  end if;
  if not cali_workspace.client_hours_enabled_for_period(v_company_id, p_period_start) then
    return jsonb_build_object('visible', false);
  end if;
  select coalesce(sc.contracted_hours, c.monthly_hours_contracted, 0) into v_contracted
  from cali_workspace.companies c
  left join lateral (
    select s.contracted_hours from cali_workspace.service_cycles s
    where s.company_id = c.id
      and date_trunc('month', s.reference_month)::date = date_trunc('month', p_period_start)::date
    order by s.created_at desc limit 1
  ) sc on true
  where c.id = v_company_id;
  select coalesce(sum(h.minutes), 0)::integer into v_consumed
  from cali_workspace.hour_entries h
  where h.company_id = v_company_id and h.client_visible
    and h.work_date between p_period_start and p_period_end
    and cali_workspace.hour_project_operational(h.project_id);
  return jsonb_build_object(
    'visible', true, 'companyId', v_company_id,
    'contractedHours', coalesce(v_contracted, 0), 'consumedMinutes', v_consumed,
    'remainingMinutes', greatest(0, round(coalesce(v_contracted, 0) * 60)::integer - v_consumed),
    'overMinutes', greatest(0, v_consumed - round(coalesce(v_contracted, 0) * 60)::integer),
    'usagePercent', case when coalesce(v_contracted, 0) > 0 then round((v_consumed::numeric / (v_contracted * 60)) * 100, 1) else null end
  );
end;
$$;

drop policy if exists hours_client_select on cali_workspace.hour_entries;
create policy hours_client_select on cali_workspace.hour_entries
for select to authenticated
using (
  company_id = cali_workspace.current_company_id()
  and client_visible
  and cali_workspace.client_hours_enabled_for_period(company_id, work_date)
  and cali_workspace.hour_project_operational(project_id)
);
