-- Equipe V3 · campos completos, afastamentos e remuneração histórica
ALTER TABLE cali_workspace.team_members
  ADD COLUMN IF NOT EXISTS work_phone text,
  ADD COLUMN IF NOT EXISTS leave_reason text,
  ADD COLUMN IF NOT EXISTS leave_start_date date,
  ADD COLUMN IF NOT EXISTS expected_return_date date;

ALTER TABLE cali_workspace.team_member_private
  ADD COLUMN IF NOT EXISTS salary_review_date date;

COMMENT ON COLUMN cali_workspace.team_members.work_phone IS 'Telefone profissional opcional do colaborador.';
COMMENT ON COLUMN cali_workspace.team_members.leave_reason IS 'Categoria objetiva do afastamento/férias; não registrar diagnóstico médico.';
COMMENT ON COLUMN cali_workspace.team_members.leave_start_date IS 'Data efetiva de início do afastamento/férias.';
COMMENT ON COLUMN cali_workspace.team_members.expected_return_date IS 'Previsão de retorno do afastamento/férias, quando conhecida.';
COMMENT ON COLUMN cali_workspace.team_member_private.salary_review_date IS 'Data da última revisão salarial; acesso restrito junto à remuneração.';

CREATE OR REPLACE FUNCTION cali_workspace.save_team_month_v1(p_company_id uuid, p_reference_month date, p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'cali_workspace', 'auth', 'public'
AS $function$
declare
  actor cali_workspace.profiles;
  item jsonb;
  old_row cali_workspace.team_members;
  saved cali_workspace.team_members;
  code text;
  name_text text;
  month_start date;
  item_status text;
  allowed_keys text[] := array[
    'employee_code','full_name','work_email','work_phone','admission_date','job_title','seniority',
    'department','team_area','manager_code','is_leader','employment_type','weekly_hours','work_model',
    'location','status','leave_reason','leave_start_date','expected_return_date',
    'termination_date','termination_initiative','termination_reason','notice_type',
    'salary','salary_review_date','gender','gender_detail','has_children','optional_data_declared'
  ];
  before_data jsonb;
  after_data jsonb;
  changed_count integer:=0;
  added_count integer:=0;
  touched integer:=0;
  row_count integer;
  duplicates integer;
  change_kind text;
begin
  select * into actor from cali_workspace.profiles where id=auth.uid() and active=true;
  if actor.id is null or (actor.role<>'admin' and not (actor.role='client' and actor.is_primary and actor.company_id=p_company_id)) then
    raise exception 'Acesso não autorizado para atualizar esta equipe.';
  end if;
  if not exists(select 1 from cali_workspace.companies where id=p_company_id and status='active') then
    raise exception 'Empresa não disponível.';
  end if;
  month_start:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
  if p_reference_month not in (month_start,(month_start-interval '1 month')::date) then
    raise exception 'Atualize o mês atual ou o mês anterior.';
  end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'A lista de colaboradores deve ser um array.'; end if;
  row_count:=jsonb_array_length(p_rows);
  if row_count>2000 then raise exception 'Envie no máximo 2000 colaboradores por atualização.'; end if;
  select count(*)-count(distinct trim(x.value->>'employee_code')) into duplicates from jsonb_array_elements(p_rows) x;
  if duplicates>0 then raise exception 'Há códigos de colaborador repetidos na planilha.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text||p_reference_month::text,0));

  for item in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(item)<>'object' or exists(select 1 from jsonb_object_keys(item) k where k<>all(allowed_keys)) then
      raise exception 'A planilha contém campos não reconhecidos.';
    end if;

    code:=trim(coalesce(item->>'employee_code',''));
    name_text:=trim(coalesce(item->>'full_name',''));
    item_status:=coalesce(nullif(item->>'status',''),'active');

    if length(code) not between 1 and 60 or length(name_text) not between 2 and 180 or
       length(trim(coalesce(item->>'job_title','')))=0 or length(trim(coalesce(item->>'department','')))=0 or
       nullif(item->>'admission_date','') is null then
      raise exception 'Código, nome, admissão, cargo e departamento são obrigatórios.';
    end if;

    select * into old_row from cali_workspace.team_members
      where company_id=p_company_id and employee_code=code for update;

    before_data:=case when old_row.id is null then null else to_jsonb(old_row)-'id'-'company_id'-'created_at'-'updated_at' end;

    insert into cali_workspace.team_members as m
      (company_id,employee_code,full_name,work_email,work_phone,admission_date,job_title,seniority,department,team_area,
       manager_code,is_leader,avatar_style,employment_type,weekly_hours,work_model,location,status,
       leave_reason,leave_start_date,expected_return_date,termination_date,termination_initiative,termination_reason,notice_type)
    values
      (p_company_id,code,name_text,nullif(trim(item->>'work_email'),''),nullif(trim(item->>'work_phone'),''),
       (item->>'admission_date')::date,trim(item->>'job_title'),nullif(trim(item->>'seniority'),''),
       trim(item->>'department'),nullif(trim(item->>'team_area'),''),nullif(trim(item->>'manager_code'),''),
       coalesce((item->>'is_leader')::boolean,false),
       case when item->>'gender' in ('female','male') then item->>'gender' else 'neutral' end,
       coalesce(nullif(trim(item->>'employment_type'),''),'clt'),nullif(item->>'weekly_hours','')::numeric,
       nullif(trim(item->>'work_model'),''),nullif(trim(item->>'location'),''),item_status,
       case when item_status='leave' then nullif(trim(item->>'leave_reason'),'') else null end,
       case when item_status='leave' then nullif(item->>'leave_start_date','')::date else null end,
       case when item_status='leave' then nullif(item->>'expected_return_date','')::date else null end,
       case when item_status='terminated' then nullif(item->>'termination_date','')::date else null end,
       case when item_status='terminated' then nullif(item->>'termination_initiative','') else null end,
       case when item_status='terminated' then nullif(trim(item->>'termination_reason'),'') else null end,
       case when item_status='terminated' then nullif(item->>'notice_type','') else null end)
    on conflict (company_id,employee_code) do update set
      archived_at=null,archived_by=null,
      full_name=excluded.full_name,
      work_email=case when item ? 'work_email' then excluded.work_email else m.work_email end,
      work_phone=case when item ? 'work_phone' then excluded.work_phone else m.work_phone end,
      admission_date=excluded.admission_date,
      job_title=excluded.job_title,
      seniority=case when item ? 'seniority' then excluded.seniority else m.seniority end,
      department=excluded.department,
      team_area=case when item ? 'team_area' then excluded.team_area else m.team_area end,
      manager_code=case when item ? 'manager_code' then excluded.manager_code else m.manager_code end,
      is_leader=case when item ? 'is_leader' then excluded.is_leader else m.is_leader end,
      avatar_style=case when item ? 'gender' then excluded.avatar_style else m.avatar_style end,
      employment_type=case when item ? 'employment_type' then excluded.employment_type else m.employment_type end,
      weekly_hours=case when item ? 'weekly_hours' then excluded.weekly_hours else m.weekly_hours end,
      work_model=case when item ? 'work_model' then excluded.work_model else m.work_model end,
      location=case when item ? 'location' then excluded.location else m.location end,
      status=excluded.status,
      leave_reason=case when excluded.status<>'leave' then null when item ? 'leave_reason' then excluded.leave_reason else m.leave_reason end,
      leave_start_date=case when excluded.status<>'leave' then null when item ? 'leave_start_date' then excluded.leave_start_date else m.leave_start_date end,
      expected_return_date=case when excluded.status<>'leave' then null when item ? 'expected_return_date' then excluded.expected_return_date else m.expected_return_date end,
      termination_date=case when excluded.status<>'terminated' then null when item ? 'termination_date' then excluded.termination_date else m.termination_date end,
      termination_initiative=case when excluded.status<>'terminated' then null when item ? 'termination_initiative' then excluded.termination_initiative else m.termination_initiative end,
      termination_reason=case when excluded.status<>'terminated' then null when item ? 'termination_reason' then excluded.termination_reason else m.termination_reason end,
      notice_type=case when excluded.status<>'terminated' then null when item ? 'notice_type' then excluded.notice_type else m.notice_type end
    returning * into saved;

    after_data:=to_jsonb(saved)-'id'-'company_id'-'created_at'-'updated_at';

    if item ? 'salary' or item ? 'salary_review_date' or item ? 'gender' or item ? 'has_children' then
      if coalesce(item->>'optional_data_declared','false')<>'true' then
        raise exception 'Confirme a origem dos dados opcionais antes de enviá-los.';
      end if;
      insert into cali_workspace.team_member_private as priv
        (member_id,company_id,salary,salary_review_date,gender,gender_detail,has_children)
      values
        (saved.id,p_company_id,nullif(item->>'salary','')::numeric,nullif(item->>'salary_review_date','')::date,
         nullif(item->>'gender',''),case when item->>'gender'='other' then nullif(trim(item->>'gender_detail'),'') else null end,
         nullif(item->>'has_children',''))
      on conflict(member_id) do update set
        salary=case when item ? 'salary' then excluded.salary else priv.salary end,
        salary_review_date=case when item ? 'salary_review_date' then excluded.salary_review_date else priv.salary_review_date end,
        gender=case when item ? 'gender' then excluded.gender else priv.gender end,
        gender_detail=case when item ? 'gender' then excluded.gender_detail else priv.gender_detail end,
        has_children=case when item ? 'has_children' then excluded.has_children else priv.has_children end,
        updated_at=now();
    end if;

    if before_data is distinct from after_data then
      changed_count:=changed_count+1;
      if old_row.id is null then added_count:=added_count+1;change_kind:='admission';
      elsif old_row.status<>'terminated' and saved.status='terminated' then change_kind:='termination';
      elsif old_row.status='active' and saved.status='leave' then change_kind:='leave';
      elsif old_row.status='leave' and saved.status='active' then change_kind:='return';
      elsif old_row.department is distinct from saved.department then change_kind:='transfer';
      elsif old_row.job_title is distinct from saved.job_title or old_row.seniority is distinct from saved.seniority then change_kind:='promotion';
      elsif old_row.manager_code is distinct from saved.manager_code then change_kind:='manager_change';
      elsif old_row.employment_type is distinct from saved.employment_type then change_kind:='contract_change';
      else change_kind:='correction'; end if;

      insert into cali_workspace.team_changes(company_id,member_id,reference_month,change_type,before_state,after_state,actor_user_id)
      values(p_company_id,saved.id,p_reference_month,change_kind,before_data,after_data,actor.id);
    end if;

    touched:=touched+1;
  end loop;

  if exists(
    select 1 from jsonb_array_elements(p_rows) x
    where nullif(x.value->>'manager_code','') is not null
      and not exists (
        select 1 from cali_workspace.team_members m
        where m.company_id=p_company_id and m.employee_code=x.value->>'manager_code'
      )
  ) then
    raise exception 'Há um gestor sem código cadastrado nesta empresa.';
  end if;

  insert into cali_workspace.team_months(company_id,reference_month,confirmed_by)
  values(p_company_id,p_reference_month,actor.id)
  on conflict(company_id,reference_month) do update
    set confirmed_by=excluded.confirmed_by,confirmed_at=now(),revision=cali_workspace.team_months.revision+1;

  insert into cali_workspace.team_month_snapshots(company_id,reference_month,member_id,status,department,manager_code,job_title,seniority,employment_type,admission_date,termination_date)
  select company_id,p_reference_month,id,
         case when termination_date>(p_reference_month+interval '1 month'-interval '1 day')::date and status='terminated' then 'active' else status end,
         department,manager_code,job_title,seniority,employment_type,admission_date,
         case when termination_date>(p_reference_month+interval '1 month'-interval '1 day')::date then null else termination_date end
  from cali_workspace.team_members
  where company_id=p_company_id and archived_at is null
    and admission_date<=(p_reference_month+interval '1 month'-interval '1 day')::date
  on conflict(company_id,reference_month,member_id) do update set
    status=excluded.status,department=excluded.department,manager_code=excluded.manager_code,job_title=excluded.job_title,
    seniority=excluded.seniority,employment_type=excluded.employment_type,admission_date=excluded.admission_date,
    termination_date=excluded.termination_date;

  return jsonb_build_object('received',touched,'changed',changed_count,'admissions',added_count,'missing_rows_do_not_terminate',true);
end;
$function$;

REVOKE ALL ON FUNCTION cali_workspace.save_team_month_v1(uuid,date,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION cali_workspace.save_team_month_v1(uuid,date,jsonb) TO authenticated;
