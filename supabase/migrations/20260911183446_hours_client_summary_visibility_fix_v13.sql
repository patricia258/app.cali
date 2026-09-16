-- Reapplies the client hours summary with the explicit client visibility filter.
-- The original V13 migration may already exist in production, so this is a
-- separate idempotent migration.

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

  select coalesce(sum(h.minutes), 0)::integer
    into v_consumed
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
    'usagePercent', case
      when coalesce(v_contracted, 0) > 0
      then round((v_consumed::numeric / (v_contracted * 60)) * 100, 1)
      else null
    end
  );
end;
$$;

grant execute on function cali_workspace.get_client_hours_summary(date,date) to authenticated;