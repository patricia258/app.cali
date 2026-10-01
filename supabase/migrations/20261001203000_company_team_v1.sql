-- CALI Workspace · equipe da empresa. Nenhuma linha de colaborador é criada nesta migração.
create table if not exists cali_workspace.team_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  employee_code text not null check (length(trim(employee_code)) between 1 and 60),
  full_name text not null check (length(trim(full_name)) between 2 and 180),
  work_email text,
  admission_date date not null,
  job_title text not null,
  seniority text,
  department text not null,
  team_area text,
  manager_code text,
  employment_type text not null default 'clt',
  weekly_hours numeric(5,2),
  work_model text,
  location text,
  status text not null default 'active' check (status in ('active','leave','terminated')),
  termination_date date,
  termination_initiative text check (termination_initiative in ('employee','company','contract_end','other')),
  termination_reason text,
  notice_type text check (notice_type in ('worked','indemnified','waived','not_applicable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,employee_code),
  check (weekly_hours is null or weekly_hours between 0 and 80),
  check ((status='terminated' and termination_date is not null) or (status<>'terminated' and termination_date is null))
);
create index if not exists team_members_company_status_idx on cali_workspace.team_members(company_id,status);

-- A ficha restrita não está na mesma tabela consultada pelo cliente.
create table if not exists cali_workspace.team_member_private (
  member_id uuid primary key references cali_workspace.team_members(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  salary numeric(12,2) check (salary is null or salary>=0),
  gender text check (gender in ('female','male','other','prefer_not')),
  gender_detail text check (gender_detail is null or length(gender_detail)<=120),
  has_children text check (has_children in ('yes','no','prefer_not')),
  updated_at timestamptz not null default now(),
  check (gender='other' or gender_detail is null)
);
create index if not exists team_member_private_company_idx on cali_workspace.team_member_private(company_id);

create table if not exists cali_workspace.team_months (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  reference_month date not null check (extract(day from reference_month)=1),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz not null default now(),
  revision integer not null default 1,
  unique(company_id,reference_month)
);
create index if not exists team_months_company_date_idx on cali_workspace.team_months(company_id,reference_month desc);

create table if not exists cali_workspace.team_month_snapshots (
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  reference_month date not null,
  member_id uuid not null references cali_workspace.team_members(id) on delete cascade,
  status text not null,
  department text not null,
  manager_code text,
  job_title text not null,
  seniority text,
  employment_type text not null,
  admission_date date not null,
  termination_date date,
  primary key(company_id,reference_month,member_id),
  foreign key(company_id,reference_month) references cali_workspace.team_months(company_id,reference_month) on delete cascade
);
create index if not exists team_snapshots_member_idx on cali_workspace.team_month_snapshots(member_id,reference_month);

create table if not exists cali_workspace.team_changes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  member_id uuid not null references cali_workspace.team_members(id) on delete cascade,
  reference_month date not null,
  change_type text not null check (change_type in ('admission','promotion','transfer','manager_change','contract_change','leave','return','termination','correction')),
  before_state jsonb,
  after_state jsonb,
  actor_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists team_changes_company_month_idx on cali_workspace.team_changes(company_id,reference_month,created_at desc);

create trigger team_members_touch before update on cali_workspace.team_members
  for each row execute function cali_workspace.touch_updated_at();

alter table cali_workspace.team_members enable row level security;
alter table cali_workspace.team_member_private enable row level security;
alter table cali_workspace.team_months enable row level security;
alter table cali_workspace.team_month_snapshots enable row level security;
alter table cali_workspace.team_changes enable row level security;

-- A gravação é exclusivamente pelo RPC validado abaixo; nenhum INSERT/UPDATE direto.
grant select on cali_workspace.team_members,cali_workspace.team_months,cali_workspace.team_month_snapshots,cali_workspace.team_changes to authenticated;
grant select on cali_workspace.team_member_private to authenticated;
revoke insert,update,delete on cali_workspace.team_members,cali_workspace.team_member_private,cali_workspace.team_months,cali_workspace.team_month_snapshots,cali_workspace.team_changes from authenticated;

create policy team_members_read on cali_workspace.team_members for select to authenticated
  using (cali_workspace.can_access_company(company_id));
create policy team_private_admin_read on cali_workspace.team_member_private for select to authenticated
  using (cali_workspace.is_admin());
create policy team_months_read on cali_workspace.team_months for select to authenticated
  using (cali_workspace.can_access_company(company_id));
create policy team_snapshots_read on cali_workspace.team_month_snapshots for select to authenticated
  using (cali_workspace.can_access_company(company_id));
create policy team_changes_read on cali_workspace.team_changes for select to authenticated
  using (cali_workspace.can_access_company(company_id));

create or replace function cali_workspace.save_team_month_v1(p_company_id uuid,p_reference_month date,p_rows jsonb)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,cali_workspace,auth,public
as $$
declare
  actor cali_workspace.profiles;
  item jsonb;
  old_row cali_workspace.team_members;
  saved cali_workspace.team_members;
  code text;
  name_text text;
  month_start date;
  allowed_keys text[] := array['employee_code','full_name','work_email','admission_date','job_title','seniority','department','team_area','manager_code','employment_type','weekly_hours','work_model','location','status','termination_date','termination_initiative','termination_reason','notice_type','salary','gender','gender_detail','has_children','optional_data_declared'];
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
  if p_reference_month<>month_start then raise exception 'Atualize somente o mês atual.'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'A lista de pessoas deve ser um array.'; end if;
  row_count:=jsonb_array_length(p_rows);
  if row_count<1 or row_count>2000 then raise exception 'Envie de 1 a 2000 pessoas por atualização.'; end if;
  select count(*)-count(distinct trim(x.value->>'employee_code')) into duplicates
    from jsonb_array_elements(p_rows) x;
  if duplicates>0 then raise exception 'Há códigos repetidos na planilha.'; end if;
  -- Serializa atualizações simultâneas da mesma empresa/mês.
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text||p_reference_month::text,0));
  for item in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(item)<>'object' or exists(select 1 from jsonb_object_keys(item) k where k<>all(allowed_keys)) then
      raise exception 'A planilha contém campos não reconhecidos.';
    end if;
    code:=trim(coalesce(item->>'employee_code',''));
    name_text:=trim(coalesce(item->>'full_name',''));
    if length(code) not between 1 and 60 or length(name_text) not between 2 and 180 or
       length(trim(coalesce(item->>'job_title','')))=0 or length(trim(coalesce(item->>'department','')))=0 or
       nullif(item->>'admission_date','') is null then
      raise exception 'Código, nome, admissão, cargo e departamento são obrigatórios.';
    end if;
    select * into old_row from cali_workspace.team_members where company_id=p_company_id and employee_code=code for update;
    before_data:=case when old_row.id is null then null else to_jsonb(old_row)-'id'-'company_id'-'created_at'-'updated_at' end;
    insert into cali_workspace.team_members as m
      (company_id,employee_code,full_name,work_email,admission_date,job_title,seniority,department,team_area,manager_code,employment_type,weekly_hours,work_model,location,status,termination_date,termination_initiative,termination_reason,notice_type)
    values (p_company_id,code,name_text,nullif(trim(item->>'work_email'),''),(item->>'admission_date')::date,trim(item->>'job_title'),nullif(trim(item->>'seniority'),''),trim(item->>'department'),nullif(trim(item->>'team_area'),''),nullif(trim(item->>'manager_code'),''),coalesce(nullif(trim(item->>'employment_type'),''),'clt'),nullif(item->>'weekly_hours','')::numeric,nullif(trim(item->>'work_model'),''),nullif(trim(item->>'location'),''),coalesce(nullif(item->>'status',''),'active'),nullif(item->>'termination_date','')::date,nullif(item->>'termination_initiative',''),nullif(trim(item->>'termination_reason'),''),nullif(item->>'notice_type',''))
    on conflict (company_id,employee_code) do update set
      full_name=excluded.full_name,work_email=excluded.work_email,admission_date=excluded.admission_date,job_title=excluded.job_title,seniority=excluded.seniority,department=excluded.department,team_area=excluded.team_area,manager_code=excluded.manager_code,employment_type=excluded.employment_type,weekly_hours=excluded.weekly_hours,work_model=excluded.work_model,location=excluded.location,status=excluded.status,termination_date=excluded.termination_date,termination_initiative=excluded.termination_initiative,termination_reason=excluded.termination_reason,notice_type=excluded.notice_type
    returning * into saved;
    after_data:=to_jsonb(saved)-'id'-'company_id'-'created_at'-'updated_at';
    if item ? 'salary' or item ? 'gender' or item ? 'has_children' then
      if coalesce(item->>'optional_data_declared','false')<>'true' then
        raise exception 'Confirme a origem dos dados opcionais antes de enviá-los.';
      end if;
      insert into cali_workspace.team_member_private as priv(member_id,company_id,salary,gender,gender_detail,has_children)
      values(saved.id,p_company_id,nullif(item->>'salary','')::numeric,nullif(item->>'gender',''),case when item->>'gender'='other' then nullif(trim(item->>'gender_detail'),'') else null end,nullif(item->>'has_children',''))
      on conflict(member_id) do update set
        salary=case when item ? 'salary' then excluded.salary else priv.salary end,
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
  -- Linhas ausentes nunca implicam desligamento. O quadro confirmado inclui a equipe vigente.
  insert into cali_workspace.team_months(company_id,reference_month,confirmed_by)
  values(p_company_id,p_reference_month,actor.id)
  on conflict(company_id,reference_month) do update set confirmed_by=excluded.confirmed_by,confirmed_at=now(),revision=cali_workspace.team_months.revision+1;
  insert into cali_workspace.team_month_snapshots(company_id,reference_month,member_id,status,department,manager_code,job_title,seniority,employment_type,admission_date,termination_date)
  select company_id,p_reference_month,id,status,department,manager_code,job_title,seniority,employment_type,admission_date,termination_date
  from cali_workspace.team_members where company_id=p_company_id and admission_date<=current_date
  on conflict(company_id,reference_month,member_id) do update set
    status=excluded.status,department=excluded.department,manager_code=excluded.manager_code,job_title=excluded.job_title,seniority=excluded.seniority,employment_type=excluded.employment_type,admission_date=excluded.admission_date,termination_date=excluded.termination_date;
  return jsonb_build_object('received',touched,'changed',changed_count,'admissions',added_count,'missing_rows_do_not_terminate',true);
end; $$;
revoke all on function cali_workspace.save_team_month_v1(uuid,date,jsonb) from public;
grant execute on function cali_workspace.save_team_month_v1(uuid,date,jsonb) to authenticated;
