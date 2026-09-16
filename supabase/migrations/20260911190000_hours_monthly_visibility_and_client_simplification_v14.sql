create table if not exists cali_workspace.company_hours_visibility (
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  period_start date not null,
  enabled boolean not null,
  changed_at timestamptz not null default now(),
  changed_by uuid null references auth.users(id) on delete set null,
  primary key (company_id, period_start)
);

create index if not exists company_hours_visibility_period_idx
  on cali_workspace.company_hours_visibility(company_id, period_start desc);

alter table cali_workspace.company_hours_visibility enable row level security;

drop policy if exists company_hours_visibility_admin_all on cali_workspace.company_hours_visibility;
create policy company_hours_visibility_admin_all
  on cali_workspace.company_hours_visibility
  for all to authenticated
  using (cali_workspace.is_admin())
  with check (cali_workspace.is_admin());

create or replace function cali_workspace.client_hours_enabled_for_period(
  p_company_id uuid,
  p_period_start date
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_enabled boolean;
begin
  select v.enabled into v_enabled
  from cali_workspace.company_hours_visibility v
  where v.company_id = p_company_id
    and v.period_start <= date_trunc('month', p_period_start)::date
  order by v.period_start desc
  limit 1;

  if v_enabled is not null then return v_enabled; end if;

  select c.show_hours_to_client into v_enabled
  from cali_workspace.companies c
  where c.id = p_company_id;

  return coalesce(v_enabled, false);
end;
$$;

grant execute on function cali_workspace.client_hours_enabled_for_period(uuid,date) to authenticated;

drop policy if exists hours_client_select on cali_workspace.hour_entries;
create policy hours_client_select
  on cali_workspace.hour_entries
  for select to authenticated
  using (
    company_id = cali_workspace.current_company_id()
    and client_visible
    and cali_workspace.client_hours_enabled_for_period(company_id, date_trunc('month', work_date)::date)
  );

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
    select s.contracted_hours
    from cali_workspace.service_cycles s
    where s.company_id = c.id
      and date_trunc('month', s.reference_month)::date = date_trunc('month', p_period_start)::date
    order by s.created_at desc
    limit 1
  ) sc on true
  where c.id = v_company_id;

  select coalesce(sum(h.minutes), 0)::integer into v_consumed
  from cali_workspace.hour_entries h
  where h.company_id = v_company_id
    and h.client_visible
    and h.work_date between p_period_start and p_period_end;

  return jsonb_build_object(
    'visible', true,
    'companyId', v_company_id,
    'contractedHours', coalesce(v_contracted, 0),
    'consumedMinutes', v_consumed,
    'remainingMinutes', greatest(0, round(coalesce(v_contracted, 0) * 60)::integer - v_consumed),
    'overMinutes', greatest(0, v_consumed - round(coalesce(v_contracted, 0) * 60)::integer),
    'usagePercent', case when coalesce(v_contracted, 0) > 0 then round((v_consumed::numeric / (v_contracted * 60)) * 100, 1) else null end
  );
end;
$$;

grant execute on function cali_workspace.get_client_hours_summary(date,date) to authenticated;