-- Horas do cliente (decisão da proprietária em 2026-10-13): TODO o tempo trabalhado conta no consumo; o cliente vê o total
-- e em quê foi gasto (projeto, entregável/subtarefa/ocorrência, frente), nunca dia, hora ou sessão. O que não está marcado
-- "visível ao cliente" entra somado como "Outras atividades da assessoria".
-- ALTERA uma função existente do cliente (get_client_hours_summary): sai o filtro "client_visible" da soma — mudança de regra
-- pedida e aprovada por ela. Acrescenta get_client_hours_breakdown.
create or replace function cali_workspace.get_client_hours_summary(p_period_start date, p_period_end date)
 returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $function$
declare v_company_id uuid; v_contracted numeric := 0; v_consumed integer := 0;
begin
 v_company_id := cali_workspace.current_company_id(); if v_company_id is null then raise exception 'Empresa vinculada não encontrada.' using errcode='42501'; end if;
 if not cali_workspace.client_hours_enabled_for_period(v_company_id,p_period_start) then return jsonb_build_object('visible',false); end if;
 select coalesce(sc.contracted_hours,c.monthly_hours_contracted,0) into v_contracted from cali_workspace.companies c left join lateral (select s.contracted_hours from cali_workspace.service_cycles s where s.company_id=c.id and date_trunc('month',s.reference_month)::date=date_trunc('month',p_period_start)::date order by s.created_at desc limit 1) sc on true where c.id=v_company_id;
 select coalesce(sum(h.minutes),0)::integer into v_consumed from cali_workspace.hour_entries h where h.company_id=v_company_id and h.work_date between p_period_start and p_period_end and cali_workspace.hour_project_operational(h.project_id);
 return jsonb_build_object('visible',true,'companyId',v_company_id,'contractedHours',coalesce(v_contracted,0),'consumedMinutes',v_consumed,'remainingMinutes',greatest(0,round(coalesce(v_contracted,0)*60)::integer-v_consumed),'overMinutes',greatest(0,v_consumed-round(coalesce(v_contracted,0)*60)::integer),'usagePercent',case when coalesce(v_contracted,0)>0 then round((v_consumed::numeric/(v_contracted*60))*100,1) else null end);
end; $function$;

create or replace function cali_workspace.get_client_hours_breakdown(p_period_start date, p_period_end date)
returns table (kind text, project_name text, item_title text, protocol text, front text, minutes integer)
language plpgsql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_company_id uuid := cali_workspace.current_company_id();
begin
  if v_company_id is null then raise exception 'Empresa vinculada não encontrada.' using errcode='42501'; end if;
  if not cali_workspace.client_hours_enabled_for_period(v_company_id, p_period_start) then return; end if;
  return query
  with base as (
    select h.minutes, h.client_visible, p.name as project_name, d.title as d_title, d.protocol as d_protocol, d.workstream as d_front, d.client_visible as d_visible,
           t.title as t_title, t.protocol as t_protocol, t.client_visible as t_visible, r.title as r_title, r.protocol as r_protocol, r.visibility as r_visibility
      from cali_workspace.hour_entries h
      left join cali_workspace.projects p on p.id = h.project_id
      left join cali_workspace.deliverables d on d.id = h.deliverable_id
      left join cali_workspace.deliverable_tasks t on t.id = h.task_id
      left join cali_workspace.account_records r on r.id = h.account_record_id
     where h.company_id = v_company_id and h.work_date between p_period_start and p_period_end and cali_workspace.hour_project_operational(h.project_id)
  ), named as (
    select b.minutes,
      case when not b.client_visible then 'Outras'
           when b.t_title is not null and coalesce(b.t_visible, false) and coalesce(b.d_visible, false) then 'Subtarefa'
           when b.d_title is not null and coalesce(b.d_visible, false) then 'Entregável'
           when b.r_title is not null and b.r_visibility = 'client' then 'Ocorrência'
           when b.project_name is not null and b.d_title is null and b.r_title is null then 'Projeto'
           else 'Outras' end as kind,
      b.project_name, b.d_title, b.d_protocol, b.d_front, b.t_title, b.t_protocol, b.r_title, b.r_protocol
    from base b
  )
  select n.kind,
         case when n.kind = 'Outras' then null else n.project_name end,
         case n.kind when 'Subtarefa' then n.t_title when 'Entregável' then n.d_title when 'Ocorrência' then n.r_title when 'Projeto' then 'Atuação geral no projeto' else 'Outras atividades da assessoria' end,
         case n.kind when 'Subtarefa' then n.t_protocol when 'Entregável' then n.d_protocol when 'Ocorrência' then n.r_protocol else null end,
         case when n.kind in ('Subtarefa', 'Entregável') then n.d_front else null end,
         sum(n.minutes)::integer
    from named n
   group by 1, 2, 3, 4, 5
   order by 6 desc;
end;
$$;
revoke all on function cali_workspace.get_client_hours_breakdown(date, date) from public, anon;
grant execute on function cali_workspace.get_client_hours_breakdown(date, date) to authenticated;
