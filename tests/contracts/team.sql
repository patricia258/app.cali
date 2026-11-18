do $team$
declare
  company_a constant uuid := 'ca110000-0000-4000-8000-000000000001';
  month_start date := date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
  metrics_month date := (month_start-interval '12 months')::date;
  code text := 'QA-'||gen_random_uuid()::text;
  row jsonb := jsonb_build_object('employee_code',code,'full_name','Pessoa sintética','admission_date',current_date,
    'job_title','Analista','department','Operações','status','active','salary',1234,'optional_data_declared',true);
  rows jsonb := jsonb_build_array(row);
  metrics jsonb := '{"planned_hours":160,"enps_score":-20}';
  target_member uuid;
  first_metrics jsonb;
  corrected_metrics jsonb;
  receipt jsonb;
  request_id uuid := gen_random_uuid();
  correction_id uuid := gen_random_uuid();
  target_vacancy uuid;
  vacancy jsonb := jsonb_build_object('vacancy_code',code,'title','Pessoa analista','department','Operações',
    'opened_on',current_date-1,'status','open');
  a2 uuid := (current_setting('qa.claims_client_a2')::jsonb->>'sub')::uuid;
begin
  -- A2 is a second equivalent Client and starts without the current terms receipt in the fixture.
  insert into cali_v2_terms.confirmations(user_id,version,content_hash)
  values(a2,current_setting('qa.terms_version'),current_setting('qa.terms_hash')) on conflict do nothing;

  set local role authenticated;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a2'),true);
  receipt := cali_workspace.save_team_month_v1(company_a,month_start,rows);
  if receipt->>'admissions' is distinct from '1'
    or cali_workspace.save_team_month_v1(company_a,month_start,rows)->>'changed' is distinct from '0' then
    raise exception 'Importação repetida alterou as pessoas ou duplicou admissão.';
  end if;
  select m.id into strict target_member from cali_workspace.team_members m where m.company_id=company_a and m.employee_code=code;
  if not exists(select 1 from cali_workspace.team_member_private p where p.member_id=target_member and p.salary=1234) then
    raise exception 'Cliente equivalente não consegue ler dado privado da equipe própria.';
  end if;
  begin
    perform cali_workspace.save_team_month_v1(company_a,month_start,rows||rows);
    raise exception 'Importação aceitou código repetido.';
  exception when raise_exception then
    if sqlerrm not like 'Há códigos%repetidos na planilha.' then raise; end if;
  end;
  receipt := cali_workspace.confirm_team_month_v2(company_a,month_start,rows,'[]','{}');
  if receipt->>'changed' is distinct from '0' or receipt->>'vacancy_changes' is distinct from '0'
    or not exists(select 1 from cali_workspace.team_month_snapshots s where s.company_id=company_a and s.reference_month=month_start and s.member_id=target_member) then
    raise exception 'Confirmação não preservou o snapshot ou alterou os dados.';
  end if;
  receipt := cali_workspace.confirm_team_month_v2(company_a,month_start,rows,jsonb_build_array(vacancy),'{}');
  select v.id into strict target_vacancy from cali_workspace.team_vacancies v where v.company_id=company_a and v.vacancy_code=code;
  if receipt->>'vacancy_changes' is distinct from '1'
    or cali_workspace.confirm_team_month_v2(company_a,month_start,rows,jsonb_build_array(vacancy),'{}')->>'vacancy_changes' is distinct from '0' then
    raise exception 'Abertura de vaga não produziu uma única mudança após retry.';
  end if;
  begin
    perform cali_workspace.confirm_team_month_v2(company_a,month_start,rows,
      jsonb_build_array(vacancy||jsonb_build_object('status','filled')),'{}');
    raise exception 'Vaga preenchida aceita sem data de fechamento.';
  exception when raise_exception then
    if sqlerrm <> 'Confira título, datas e situação da vaga.' then raise; end if;
  end;
  begin
    perform cali_workspace.confirm_team_month_v2(company_a,month_start,rows,
      jsonb_build_array(vacancy||jsonb_build_object('opened_on',current_date)),'{}');
    raise exception 'Revisão reescreveu a data original de abertura.';
  exception when raise_exception then
    if sqlerrm <> 'A data de abertura de uma vaga existente não pode ser alterada nesta revisão.' then raise; end if;
  end;
  receipt := cali_workspace.confirm_team_month_v2(company_a,month_start,rows,
    jsonb_build_array(vacancy||jsonb_build_object('status','filled','closed_on',current_date)),'{}');
  if receipt->>'vacancy_changes' is distinct from '1'
    or not exists(select 1 from cali_workspace.team_vacancies v where v.id=target_vacancy and v.status='filled' and v.closed_on=current_date)
    or (select count(*) from cali_workspace.team_vacancy_events e where e.vacancy_id=target_vacancy) <> 2
    or not exists(select 1 from cali_workspace.team_vacancy_events e where e.vacancy_id=target_vacancy and e.actor_user_id=a2
      and e.before_state->>'status'='open' and e.after_state->>'status'='filled') then
    raise exception 'Preenchimento da vaga perdeu data ou trilha de mudanças.';
  end if;

  first_metrics := cali_workspace.write_company_team_metrics(company_a,metrics_month,null,metrics,null,request_id);
  if first_metrics->>'revision' is distinct from '1'
    or cali_workspace.write_company_team_metrics(company_a,metrics_month,null,metrics,null,request_id) is distinct from first_metrics then
    raise exception 'Métrica inicial não produziu recibo idempotente.';
  end if;
  begin
    perform cali_workspace.write_company_team_metrics(company_a,metrics_month,(first_metrics->>'updatedAt')::timestamptz,'{"planned_hours":120}',null,gen_random_uuid());
    raise exception 'Cliente sobrescreveu métrica confirmada.';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims',current_setting('qa.claims_client_b'),true);
  if exists(select 1 from cali_workspace.team_members m where m.id=target_member)
    or exists(select 1 from cali_workspace.team_member_private p where p.member_id=target_member)
    or exists(select 1 from cali_workspace.team_vacancies v where v.id=target_vacancy)
    or exists(select 1 from cali_workspace.team_vacancy_events e where e.vacancy_id=target_vacancy) then
    raise exception 'Empresa B leu equipe, vaga ou dado privado da empresa A.';
  end if;
  begin
    perform cali_workspace.archive_team_member_v1(company_a,target_member);
    raise exception 'Empresa B arquivou pessoa da empresa A.';
  exception when raise_exception then
    if sqlerrm not like 'Acesso não autorizado%' then raise; end if;
  end;
  perform set_config('request.jwt.claims',current_setting('qa.claims_partner'),true);
  if not exists(select 1 from cali_workspace.team_members m where m.id=target_member)
    or exists(select 1 from cali_workspace.team_member_private p where p.member_id=target_member) then
    raise exception 'Partner perdeu equipe atribuída ou recebeu dado privado.';
  end if;

  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  begin
    perform cali_workspace.write_company_team_metrics(company_a,metrics_month,null,'{"planned_hours":120}','Correção QA',gen_random_uuid());
    raise exception 'Correção aceitou versão obsoleta.';
  exception when serialization_failure then null;
  end;
  corrected_metrics := cali_workspace.write_company_team_metrics(company_a,metrics_month,(first_metrics->>'updatedAt')::timestamptz,'{"planned_hours":120}','Correção QA',correction_id);
  if corrected_metrics->>'revision' is distinct from '2' then raise exception 'Correção não avançou revisão.'; end if;
  perform set_config('request.jwt.claims',current_setting('qa.claims_client_a'),true);
  receipt := cali_workspace.archive_team_member_v1(company_a,target_member);
  if receipt->>'archived' is distinct from 'true' then
    raise exception 'Cliente equivalente não arquivou pessoa da própria equipe.';
  end if;
  reset role;
  if not exists(select 1 from cali_workspace.team_members m where m.id=target_member and m.archived_at is not null) then
    raise exception 'Arquivamento perdeu a ficha ou deixou de gravar a data.';
  end if;
  if not exists(select 1 from cali_session_guard.team_month_events e where e.request_id=correction_id
    and e.reason='Correção QA' and (e.before_state->>'planned_hours')::numeric=160 and (e.after_state->>'planned_hours')::numeric=120) then
    raise exception 'Correção perdeu motivo ou trilha antes/depois.';
  end if;
end;
$team$;
