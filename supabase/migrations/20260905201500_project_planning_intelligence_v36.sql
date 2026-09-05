-- CALI Workspace · inteligência de planejamento e proteção de frentes V36

create unique index if not exists project_workstreams_unique_active_name_v36
  on cali_workspace.project_workstreams (project_id, lower(trim(name)))
  where status <> 'cancelled';

-- target_end_date = meta desejada informada pela CALI (opcional)
-- roadmap_end_date = previsão operacional recalculada pelos entregáveis vigentes.
create or replace function cali_workspace.refresh_project_forecast(p_project_id uuid)
returns date
language plpgsql
security definer
set search_path to 'pg_catalog','cali_workspace'
as $$
declare
  v_forecast date;
begin
  if p_project_id is null then return null; end if;

  select max(d.due_at::date)
    into v_forecast
  from cali_workspace.deliverables d
  where d.project_id = p_project_id
    and d.status <> 'cancelled'
    and d.due_at is not null;

  update cali_workspace.projects
     set roadmap_end_date = v_forecast,
         updated_at = now()
   where id = p_project_id
     and roadmap_end_date is distinct from v_forecast;

  return v_forecast;
end;
$$;

grant execute on function cali_workspace.refresh_project_forecast(uuid) to authenticated;

create or replace function cali_workspace.sync_project_forecast_from_deliverable()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','cali_workspace'
as $$
begin
  if tg_op = 'DELETE' then
    perform cali_workspace.refresh_project_forecast(old.project_id);
    return old;
  end if;

  perform cali_workspace.refresh_project_forecast(new.project_id);
  if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id then
    perform cali_workspace.refresh_project_forecast(old.project_id);
  end if;
  return new;
end;
$$;

drop trigger if exists deliverables_refresh_project_forecast_v36 on cali_workspace.deliverables;
create trigger deliverables_refresh_project_forecast_v36
after insert or delete or update of due_at,status,project_id
on cali_workspace.deliverables
for each row execute function cali_workspace.sync_project_forecast_from_deliverable();

update cali_workspace.projects p
   set roadmap_end_date = x.forecast,
       updated_at = now()
  from (
    select p2.id,
           max(d.due_at::date) filter (where d.status <> 'cancelled') as forecast
      from cali_workspace.projects p2
      left join cali_workspace.deliverables d on d.project_id = p2.id
     group by p2.id
  ) x
 where p.id = x.id
   and p.roadmap_end_date is distinct from x.forecast;

-- Atraso do cliente: dias efetivamente atrasados + janela de remobilização
-- no impacto a jusante. MC1: sem buffer; MC2: +1 dia útil; MC3: +2 dias úteis.
create or replace function cali_workspace.register_client_delay(
  p_deliverable_id uuid,
  p_delay_business_days integer,
  p_reason text default 'Atraso na resposta do cliente'::text
)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog','cali_workspace'
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
  v_sort_order integer;
  v_complexity text;
  v_delay integer := greatest(coalesce(p_delay_business_days,0),0);
  v_remobilization integer := 0;
  v_total_shift integer := 0;
  v_shifted integer := 0;
begin
  select company_id, project_id, sort_order, coalesce(complexity,'MC2')
    into v_company_id, v_project_id, v_sort_order, v_complexity
  from cali_workspace.deliverables
  where id = p_deliverable_id;

  if v_company_id is null or not cali_workspace.can_access_company(v_company_id) then
    raise exception 'access denied';
  end if;
  if v_project_id is null or v_delay <= 0 then return 0; end if;

  v_remobilization := case upper(v_complexity)
    when 'MC3' then 2
    when 'MC2' then 1
    else 0
  end;
  v_total_shift := v_delay + v_remobilization;

  update cali_workspace.deliverables
     set client_delay_business_days = client_delay_business_days + v_delay,
         updated_at = now()
   where id = p_deliverable_id;

  v_shifted := cali_workspace.shift_project_deadlines(
    v_project_id,
    v_sort_order,
    v_total_shift,
    p_reason || format(' · %s dia(s) de atraso + %s dia(s) de remobilização %s', v_delay, v_remobilization, upper(v_complexity))
  );

  perform cali_workspace.refresh_project_forecast(v_project_id);

  insert into cali_workspace.activity_log(company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (
    v_company_id, auth.uid(), 'client_response_delay', 'deliverable', p_deliverable_id,
    jsonb_build_object(
      'business_days',v_delay,
      'complexity',upper(v_complexity),
      'remobilization_business_days',v_remobilization,
      'downstream_shift_business_days',v_total_shift,
      'reason',p_reason,
      'downstream_shifted',v_shifted
    )
  );
  return v_shifted;
end;
$$;

grant execute on function cali_workspace.register_client_delay(uuid,integer,text) to authenticated;
