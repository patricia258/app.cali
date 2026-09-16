-- CALI Workspace · Relatórios V63
-- Permite validar o fluxo completo de fechamento no ambiente dedicado de teste,
-- sem reduzir a regra de 20 dias para clientes reais.

create or replace function cali_workspace.report_generation_readiness_v61(
  p_company_id uuid,
  p_report_type text,
  p_period_start date,
  p_period_end date
) returns jsonb
language plpgsql
security definer
set search_path = cali_workspace, public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_company_start date;
  v_company_name text;
  v_is_test boolean := false;
  v_collection_start date;
  v_collection_end date;
  v_collected_days integer := 0;
  v_required_days integer := case when coalesce(p_report_type,'monthly')='monthly' then 20 else 0 end;
  v_available_on date;
  v_official record;
  v_mode text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select role into v_role from cali_workspace.profiles where id=v_uid and active=true;
  if v_role <> 'admin' then raise exception 'Usuário sem permissão para gerenciar relatórios.'; end if;
  if p_company_id is null or p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    raise exception 'Período inválido.';
  end if;

  select start_date,display_name into v_company_start,v_company_name
  from cali_workspace.companies where id=p_company_id;
  if not found then raise exception 'Cliente não encontrado.'; end if;

  v_is_test := v_company_name = 'CALI · Ambiente de Teste';
  if v_is_test then v_required_days := 0; end if;

  v_collection_start := greatest(p_period_start, coalesce(v_company_start,p_period_start));
  v_collection_end := least(current_date,p_period_end);
  if v_collection_end >= v_collection_start then
    v_collected_days := (v_collection_end-v_collection_start)+1;
  end if;
  v_available_on := case when v_required_days>0 then v_collection_start+(v_required_days-1) else v_collection_start end;

  select r.id,r.protocol,r.version,r.status,r.sent_at,r.acknowledged_at
    into v_official
  from cali_workspace.reports r
  where r.company_id=p_company_id
    and r.report_type=coalesce(p_report_type,'monthly')
    and r.period_start=p_period_start
    and r.period_end=p_period_end
    and r.status in ('sent','published')
  order by r.version desc
  limit 1;

  if v_official.id is not null then
    v_mode := 'simulation';
  elsif v_required_days>0 and v_collected_days<v_required_days then
    v_mode := 'preview';
  else
    v_mode := 'official';
  end if;

  return jsonb_build_object(
    'mode',v_mode,
    'company_start_date',v_company_start,
    'collection_start',v_collection_start,
    'collection_end',v_collection_end,
    'collected_days',v_collected_days,
    'required_days',v_required_days,
    'available_on',v_available_on,
    'test_environment',v_is_test,
    'can_generate_official',(v_official.id is null and (v_required_days=0 or v_collected_days>=v_required_days)),
    'can_send',(v_official.id is null and (v_required_days=0 or v_collected_days>=v_required_days)),
    'official_report_id',v_official.id,
    'official_protocol',v_official.protocol,
    'official_version',v_official.version,
    'official_status',v_official.status,
    'official_sent_at',v_official.sent_at,
    'official_acknowledged_at',v_official.acknowledged_at
  );
end;
$$;

grant execute on function cali_workspace.report_generation_readiness_v61(uuid,text,date,date) to authenticated;
