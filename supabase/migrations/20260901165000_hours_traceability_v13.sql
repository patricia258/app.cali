-- CALI Workspace · Horas V13
-- Preserva a origem do apontamento e permite transparência de consumo sem expor detalhes internos.

alter table cali_workspace.hour_entries
  add column if not exists source_type text not null default 'manual',
  add column if not exists started_at timestamptz null,
  add column if not exists ended_at timestamptz null,
  add column if not exists task_id uuid null references cali_workspace.deliverable_tasks(id) on delete set null,
  add column if not exists event_id uuid null references cali_workspace.events(id) on delete set null,
  add column if not exists internal_note text null;

alter table cali_workspace.hour_entries
  drop constraint if exists hour_entries_source_type_check;
alter table cali_workspace.hour_entries
  add constraint hour_entries_source_type_check
  check (source_type in ('timer','manual','calendar','interaction'));

create index if not exists hour_entries_task_idx
  on cali_workspace.hour_entries(task_id) where task_id is not null;
create index if not exists hour_entries_event_idx
  on cali_workspace.hour_entries(event_id) where event_id is not null;
create index if not exists hour_entries_company_date_idx
  on cali_workspace.hour_entries(company_id, work_date desc);

comment on column cali_workspace.hour_entries.source_type is 'Origem do apontamento: timer, manual, calendar ou interaction.';
comment on column cali_workspace.hour_entries.internal_note is 'Justificativa/observação interna não exibida ao cliente.';

create or replace function cali_workspace.resolve_cycle_for_hour_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
begin
  if new.cycle_id is null then
    select c.id into new.cycle_id
    from cali_workspace.service_cycles c
    where c.company_id = new.company_id
      and date_trunc('month', c.reference_month)::date = date_trunc('month', new.work_date)::date
    order by case when c.project_id is not distinct from new.project_id then 0 else 1 end,
             c.created_at desc
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists hour_entries_resolve_cycle on cali_workspace.hour_entries;
create trigger hour_entries_resolve_cycle
before insert or update of company_id, project_id, work_date, cycle_id
on cali_workspace.hour_entries
for each row execute function cali_workspace.resolve_cycle_for_hour_entry();

create or replace function cali_workspace.get_client_hours_summary(
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
  v_company_id uuid;
  v_show boolean;
  v_contracted numeric := 0;
  v_consumed integer := 0;
begin
  v_company_id := cali_workspace.current_company_id();
  if v_company_id is null then
    raise exception 'Empresa vinculada não encontrada.' using errcode = '42501';
  end if;

  select c.show_hours_to_client,
         coalesce(sc.contracted_hours, c.monthly_hours_contracted, 0)
    into v_show, v_contracted
  from cali_workspace.companies c
  left join lateral (
    select s.contracted_hours
    from cali_workspace.service_cycles s
    where s.company_id = c.id
      and date_trunc('month', s.reference_month)::date = date_trunc('month', p_period_start)::date
    order by s.created_at desc
    limit 1
  ) sc on true
  where c.id = v_company_id;

  if coalesce(v_show, false) is false then
    return jsonb_build_object('visible', false);
  end if;

  select coalesce(sum(h.minutes),0)::integer
    into v_consumed
  from cali_workspace.hour_entries h
  where h.company_id = v_company_id
    and h.work_date between p_period_start and p_period_end;

  return jsonb_build_object(
    'visible', true,
    'companyId', v_company_id,
    'contractedHours', coalesce(v_contracted,0),
    'consumedMinutes', v_consumed,
    'remainingMinutes', greatest(0, round(coalesce(v_contracted,0) * 60)::integer - v_consumed),
    'overMinutes', greatest(0, v_consumed - round(coalesce(v_contracted,0) * 60)::integer),
    'usagePercent', case when coalesce(v_contracted,0) > 0 then round((v_consumed::numeric / (v_contracted * 60)) * 100, 1) else null end
  );
end;
$$;

grant execute on function cali_workspace.get_client_hours_summary(date,date) to authenticated;
