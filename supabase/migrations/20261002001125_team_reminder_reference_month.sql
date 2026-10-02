-- Lembrete no terceiro dia útil pede a conferência do mês anterior.
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
  if p_reference_month not in (month_start,(month_start-interval '1 month')::date) then raise exception 'Atualize o mês atual ou o mês anterior.'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'A lista de pessoas deve ser um array.'; end if;
  row_count:=jsonb_array_length(p_rows);
  if row_count>2000 then raise exception 'Envie no máximo 2000 pessoas por atualização.'; end if;
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
       nullif(item->>'admission_date','') is null or not (item ? 'status') then
      raise exception 'Código, nome, admissão, cargo e departamento são obrigatórios.';
    end if;
    select * into old_row from cali_workspace.team_members where company_id=p_company_id and employee_code=code for update;
    before_data:=case when old_row.id is null then null else to_jsonb(old_row)-'id'-'company_id'-'created_at'-'updated_at' end;
    insert into cali_workspace.team_members as m
      (company_id,employee_code,full_name,work_email,admission_date,job_title,seniority,department,team_area,manager_code,employment_type,weekly_hours,work_model,location,status,termination_date,termination_initiative,termination_reason,notice_type)
    values (p_company_id,code,name_text,nullif(trim(item->>'work_email'),''),(item->>'admission_date')::date,trim(item->>'job_title'),nullif(trim(item->>'seniority'),''),trim(item->>'department'),nullif(trim(item->>'team_area'),''),nullif(trim(item->>'manager_code'),''),coalesce(nullif(trim(item->>'employment_type'),''),'clt'),nullif(item->>'weekly_hours','')::numeric,nullif(trim(item->>'work_model'),''),nullif(trim(item->>'location'),''),coalesce(nullif(item->>'status',''),'active'),nullif(item->>'termination_date','')::date,nullif(item->>'termination_initiative',''),nullif(trim(item->>'termination_reason'),''),nullif(item->>'notice_type',''))
    on conflict (company_id,employee_code) do update set
      full_name=excluded.full_name,work_email=case when item ? 'work_email' then excluded.work_email else m.work_email end,admission_date=excluded.admission_date,job_title=excluded.job_title,seniority=case when item ? 'seniority' then excluded.seniority else m.seniority end,department=excluded.department,team_area=case when item ? 'team_area' then excluded.team_area else m.team_area end,manager_code=case when item ? 'manager_code' then excluded.manager_code else m.manager_code end,employment_type=case when item ? 'employment_type' then excluded.employment_type else m.employment_type end,weekly_hours=case when item ? 'weekly_hours' then excluded.weekly_hours else m.weekly_hours end,work_model=case when item ? 'work_model' then excluded.work_model else m.work_model end,location=case when item ? 'location' then excluded.location else m.location end,status=excluded.status,termination_date=case when item ? 'termination_date' or excluded.status<>'terminated' then excluded.termination_date else m.termination_date end,termination_initiative=case when item ? 'termination_initiative' or excluded.status<>'terminated' then excluded.termination_initiative else m.termination_initiative end,termination_reason=case when item ? 'termination_reason' or excluded.status<>'terminated' then excluded.termination_reason else m.termination_reason end,notice_type=case when item ? 'notice_type' or excluded.status<>'terminated' then excluded.notice_type else m.notice_type end
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
  if exists(select 1 from jsonb_array_elements(p_rows) x where nullif(x.value->>'manager_code','') is not null and not exists (select 1 from cali_workspace.team_members m where m.company_id=p_company_id and m.employee_code=x.value->>'manager_code')) then
    raise exception 'Há um gestor sem código cadastrado nesta empresa.';
  end if;
  -- Linhas ausentes nunca implicam desligamento. O quadro confirmado inclui a equipe vigente.
  insert into cali_workspace.team_months(company_id,reference_month,confirmed_by)
  values(p_company_id,p_reference_month,actor.id)
  on conflict(company_id,reference_month) do update set confirmed_by=excluded.confirmed_by,confirmed_at=now(),revision=cali_workspace.team_months.revision+1;
  insert into cali_workspace.team_month_snapshots(company_id,reference_month,member_id,status,department,manager_code,job_title,seniority,employment_type,admission_date,termination_date)
  select company_id,p_reference_month,id,status,department,manager_code,job_title,seniority,employment_type,admission_date,termination_date
  from cali_workspace.team_members where company_id=p_company_id and admission_date<=(p_reference_month+interval '1 month'-interval '1 day')::date
  on conflict(company_id,reference_month,member_id) do update set
    status=excluded.status,department=excluded.department,manager_code=excluded.manager_code,job_title=excluded.job_title,seniority=excluded.seniority,employment_type=excluded.employment_type,admission_date=excluded.admission_date,termination_date=excluded.termination_date;
  return jsonb_build_object('received',touched,'changed',changed_count,'admissions',added_count,'missing_rows_do_not_terminate',true);
end; $$;
revoke all on function cali_workspace.save_team_month_v1(uuid,date,jsonb) from public;
grant execute on function cali_workspace.save_team_month_v1(uuid,date,jsonb) to authenticated;

create or replace function cali_workspace.dispatch_team_month_reminders_v1()
returns integer language plpgsql security definer set search_path=pg_catalog,cali_workspace,auth,net,public
as $$
declare today_sp date:=(now() at time zone 'America/Sao_Paulo')::date;
        first_day date:=(date_trunc('month',now() at time zone 'America/Sao_Paulo')-interval '1 month')::date;
        reminder_month date:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
        due_day date; p record; v_note uuid; v_hook text; sent integer:=0;
begin
  select d::date into due_day from generate_series(reminder_month,reminder_month+interval '14 days',interval '1 day') d
  where cali_workspace.is_business_day(d::date) order by d limit 1 offset 2;
  if today_sp<>due_day then return 0; end if;
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key='notification_email_hook';
  for p in select pr.id,pr.company_id from cali_workspace.profiles pr join cali_workspace.companies c on c.id=pr.company_id
           where pr.role='client' and pr.is_primary and pr.active and c.status='active' and
                 not exists(select 1 from cali_workspace.team_months tm where tm.company_id=c.id and tm.reference_month=first_day)
  loop
    insert into cali_workspace.team_month_reminders(company_id,reference_month,user_id) values(p.company_id,first_day,p.id)
    on conflict do nothing;
    if found then
      insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,action_url,relevance,email_required)
      values(p.company_id,p.id,'team_month_update','Hora de atualizar a equipe','Houve admissões, desligamentos, mudanças de posição ou vagas neste mês? Confira a equipe e confirme a atualização.','team_month','/cliente/equipe','normal',true)
      returning id into v_note;
      update cali_workspace.team_month_reminders set notification_id=v_note where company_id=p.company_id and reference_month=first_day and user_id=p.id;
      if v_hook is not null then
        perform net.http_post(url:='https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/workspace-notification-email-hook',
          headers:=jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),body:=jsonb_build_object('notification_id',v_note));
      end if;
      sent:=sent+1;
    end if;
  end loop;
  return sent;
end; $$;
revoke all on function cali_workspace.dispatch_team_month_reminders_v1() from public;
grant execute on function cali_workspace.dispatch_team_month_reminders_v1() to service_role;
do $$ declare v_jobid bigint; begin select jobid into v_jobid from cron.job where jobname='workspace-team-month-reminder'; if v_jobid is not null then perform cron.unschedule(v_jobid); end if; exception when undefined_table then null; end $$;
select cron.schedule('workspace-team-month-reminder','0 11 * * *',$cron$select cali_workspace.dispatch_team_month_reminders_v1();$cron$);
