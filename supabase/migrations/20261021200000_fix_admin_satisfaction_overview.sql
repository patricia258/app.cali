-- Conserto: get_admin_satisfaction_overview falhava sempre ("aggregate function calls cannot be nested", 400 na
-- Visão geral da administração). A série mensal agregava avg/count e jsonb_agg no mesmo nível; agora o agrupamento
-- por mês é feito numa subconsulta. Resultado e permissões iguais aos de antes.
create or replace function cali_workspace.get_admin_satisfaction_overview()
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'cali_workspace', 'public' as $function$
declare
  v_average numeric;
  v_total integer;
  v_distribution jsonb;
  v_monthly jsonb;
  v_recent jsonb;
begin
  if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode acessar este painel.'; end if;

  with feedback as (
    select f.company_id,f.score::numeric as score
    from cali_workspace.account_record_feedback f
    join cali_workspace.account_records r on r.id=f.record_id
    join cali_workspace.companies c on c.id=f.company_id
    union all
    select n.company_id,n.score::numeric
    from cali_workspace.nps_responses n
    left join cali_workspace.deliverables d on d.id=n.deliverable_id
    join cali_workspace.companies c on c.id=n.company_id
  )
  select round(avg(score),2),count(*)::integer into v_average,v_total from feedback;

  with feedback as (
    select score::integer from cali_workspace.account_record_feedback
    union all
    select score::integer from cali_workspace.nps_responses
  ), scores as (select generate_series(1,5) as score)
  select jsonb_object_agg(scores.score::text,coalesce(x.total,0) order by scores.score)
    into v_distribution
  from scores left join (
    select score,count(*)::integer as total from feedback group by score
  ) x using(score);

  with months as (
    select generate_series(date_trunc('month',now())-interval '5 months',date_trunc('month',now()),interval '1 month') as month_start
  ), feedback as (
    select score::numeric,created_at from cali_workspace.account_record_feedback
    union all
    select score::numeric,created_at from cali_workspace.nps_responses
  ), per_month as (
    select m.month_start,
           case when count(f.score)=0 then null else round(avg(f.score),2) end as average,
           count(f.score)::integer as total
    from months m
    left join feedback f on date_trunc('month',f.created_at)=m.month_start
    group by m.month_start
  )
  select jsonb_agg(jsonb_build_object('month',to_char(month_start,'YYYY-MM-01'),'average',average,'count',total) order by month_start)
    into v_monthly
  from per_month;

  with feedback as (
    select f.score::integer as score,f.comment,f.created_at,
           'record'::text as source_type,f.record_id as entity_id,r.protocol,r.title,c.display_name as company_name
    from cali_workspace.account_record_feedback f
    join cali_workspace.account_records r on r.id=f.record_id
    join cali_workspace.companies c on c.id=f.company_id
    union all
    select n.score::integer,n.comment,n.created_at,
           'deliverable'::text,n.deliverable_id,null::text,d.title,c.display_name
    from cali_workspace.nps_responses n
    left join cali_workspace.deliverables d on d.id=n.deliverable_id
    join cali_workspace.companies c on c.id=n.company_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'score',score,'comment',comment,'createdAt',created_at,'sourceType',source_type,
    'entityId',entity_id,'protocol',protocol,'title',title,'company',company_name
  ) order by created_at desc),'[]'::jsonb)
    into v_recent
  from (select * from feedback order by created_at desc limit 8) q;

  return jsonb_build_object(
    'average',v_average,
    'total',coalesce(v_total,0),
    'distribution',coalesce(v_distribution,'{}'::jsonb),
    'monthly',coalesce(v_monthly,'[]'::jsonb),
    'recent',coalesce(v_recent,'[]'::jsonb)
  );
end;
$function$;
