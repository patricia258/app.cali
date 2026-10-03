-- Escopo contratado. project_workstreams permanece exclusivo da execução dos projetos.
alter table cali_workspace.companies drop constraint if exists companies_service_plan_check;
alter table cali_workspace.companies add constraint companies_service_plan_check
  check (service_plan is null or service_plan in ('partner','full','build_essential','build_complete'));

create or replace function cali_workspace.sync_company_service_plan()
returns trigger language plpgsql set search_path to 'pg_catalog','cali_workspace' as $$
begin
  if new.service_type='CALI Partner' then new.service_plan:='partner';
  elsif new.service_type='CALI Full' then new.service_plan:='full';
  elsif new.service_type='CALI Build Essencial' then new.service_plan:='build_essential';
  elsif new.service_type='CALI Build Completo' then new.service_plan:='build_complete';
  elsif new.service_type is distinct from 'Assessoria Estratégica Mensal' then new.service_plan:=null;
  end if;
  return new;
end; $$;

create table cali_workspace.front_catalog (
  code text primary key,
  title text not null,
  description text not null,
  category text not null check (category in ('recurring','vacancy','addon','project')),
  partner_core boolean not null default false,
  full_core boolean not null default false,
  partner_slot boolean not null default false,
  full_slot boolean not null default false,
  build_allowed boolean not null default false,
  display_order smallint not null,
  active boolean not null default true
);
alter table cali_workspace.front_catalog enable row level security;
create policy front_catalog_read on cali_workspace.front_catalog for select to authenticated using (true);
grant select on cali_workspace.front_catalog to authenticated;

insert into cali_workspace.front_catalog(code,title,description,category,partner_core,full_core,partner_slot,full_slot,build_allowed,display_order) values
 ('strategic_direction','Direção estratégica de pessoas','Prioridades de People e orientação à liderança.','recurring',true,true,false,false,true,10),
 ('essential_indicators','Indicadores essenciais','Acompanhamento de turnover, absenteísmo e clima em nível essencial.','recurring',true,true,false,false,true,20),
 ('dp_advisory','Orientação a DP','Assessoria técnica sobre decisões de pessoal, sem executar rotinas de departamento pessoal.','recurring',true,true,false,false,true,30),
 ('critical_decisions','Decisões críticas','Apoio pontual à liderança em estrutura, promoção e desligamento.','recurring',true,true,false,false,true,40),
 ('dho','Desenvolvimento humano','Direção de desenvolvimento e acompanhamento de pessoas.','recurring',true,true,false,false,true,50),
 ('leadership','Liderança','Acompanhamento da liderança e desenho de práticas de gestão.','recurring',true,true,false,false,true,60),
 ('compensation','Cargos e Salários','Estrutura de cargos, níveis e diretrizes de remuneração.','recurring',false,true,true,false,true,70),
 ('people_analytics','People Analytics','Análises aprofundadas da força de trabalho, além dos indicadores essenciais.','recurring',false,true,true,false,true,80),
 ('development','Treinamento e Desenvolvimento','Arquitetura e implantação de desenvolvimento conforme escopo.','recurring',false,true,true,false,true,90),
 ('occupational','Saúde Ocupacional e Conformidade','Governança, acompanhamento e validações especializadas quando necessárias.','recurring',false,true,true,false,true,100),
 ('selection_vacancy','Atração e Seleção por vaga','Desenho e supervisão de uma vaga específica; sem sourcing nem abertura operacional.','vacancy',false,false,true,true,true,110),
 ('employer_brand','Marca Empregadora','Serviço adicional com escopo próprio, fora dos slots recorrentes.','addon',false,false,false,false,false,120),
 ('executive_diagnostic','Diagnóstico Executivo','Projeto pontual com início e fim definidos.','project',false,false,false,false,false,130),
 ('leadership_shadowing','Shadowing de Liderança','Projeto pontual de acompanhamento da liderança.','project',false,false,false,false,false,140),
 ('talks','Treinamentos e Palestras pontuais','Encontros contratados como projeto específico.','project',false,false,false,false,false,150);

create table cali_workspace.company_fronts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  front_code text not null references cali_workspace.front_catalog(code),
  mode text not null check(mode in ('slot_included','slot_paid','addon','build_assisted')),
  scope_label text,
  started_at date not null default current_date,
  ends_at date,
  status text not null default 'active' check(status in ('active','ended')),
  activated_by_user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  check(ends_at is null or ends_at >= started_at),
  check(front_code <> 'selection_vacancy' or nullif(btrim(scope_label),'') is not null)
);
create index company_fronts_company_idx on cali_workspace.company_fronts(company_id,status,front_code);
create unique index company_fronts_active_unique on cali_workspace.company_fronts(company_id,front_code,coalesce(scope_label,'')) where status='active';
alter table cali_workspace.company_fronts enable row level security;
create policy company_fronts_read on cali_workspace.company_fronts for select to authenticated
  using(cali_workspace.is_admin() or company_id=cali_workspace.current_company_id());
create policy company_fronts_admin_insert on cali_workspace.company_fronts for insert to authenticated
  with check(cali_workspace.is_admin());
create policy company_fronts_admin_update on cali_workspace.company_fronts for update to authenticated
  using(cali_workspace.is_admin()) with check(cali_workspace.is_admin());
grant select,insert,update on cali_workspace.company_fronts to authenticated;

create or replace function cali_workspace.validate_company_front()
returns trigger language plpgsql security definer
set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_plan text; v_front cali_workspace.front_catalog%rowtype; v_count int;
begin
  if not cali_workspace.is_admin() then raise exception 'Somente a administração pode configurar frentes.'; end if;
  if tg_op='UPDATE' and (new.company_id<>old.company_id or new.front_code<>old.front_code or new.mode<>old.mode or new.started_at<>old.started_at or new.scope_label is distinct from old.scope_label or old.status='ended') then
    raise exception 'Para mudar a frente ou o tipo, encerre esta ativação e crie outra.';
  end if;
  select service_plan into v_plan from cali_workspace.companies where id=new.company_id for update;
  select * into v_front from cali_workspace.front_catalog where code=new.front_code and active;
  if v_plan is null or v_front.code is null then raise exception 'Defina um plano válido e uma frente ativa.'; end if;
  if new.status='active' then
    if v_front.partner_core and v_plan in ('partner','full') or v_front.full_core and v_plan='full' then
      raise exception 'A frente já está incluída no núcleo do plano.';
    end if;
    if new.ends_at is not null and new.ends_at<current_date then raise exception 'A data final já passou.'; end if;
    if v_plan='partner' and (new.mode<>'slot_paid' or not v_front.partner_slot) and not (new.mode='addon' and v_front.category in ('addon','project')) then
      raise exception 'Esta frente não pode ser ativada nesse formato no CALI Partner.';
    elsif v_plan='full' and (new.mode not in ('slot_included','slot_paid') or not v_front.full_slot) and not (new.mode='addon' and v_front.category in ('addon','project')) then
      raise exception 'Esta frente não pode ser ativada nesse formato no CALI Full.';
    elsif v_plan like 'build_%' and (new.mode<>'build_assisted' or not v_front.build_allowed) then
      raise exception 'Selecione uma frente em implantação assistida do CALI Build.';
    end if;
    if new.mode like 'slot_%' then
      select count(*) into v_count from cali_workspace.company_fronts
       where company_id=new.company_id and mode=new.mode and status='active'
         and (ends_at is null or ends_at>=current_date) and id is distinct from new.id;
      if v_count>=1 then raise exception 'Limite de um slot deste tipo já utilizado.'; end if;
    elsif new.mode='build_assisted' and v_plan='build_essential' then
      select count(*) into v_count from cali_workspace.company_fronts
       where company_id=new.company_id and mode='build_assisted' and status='active'
         and (ends_at is null or ends_at>=current_date) and id is distinct from new.id;
      if v_count>=1 then raise exception 'O CALI Build Essencial acompanha uma frente por vez.'; end if;
    end if;
  end if;
  if new.status='ended' and new.ended_at is null then new.ended_at:=now(); end if;
  return new;
end; $$;
create trigger validate_company_front before insert or update on cali_workspace.company_fronts
for each row execute function cali_workspace.validate_company_front();

create or replace function cali_workspace.guard_company_front_plan_change()
returns trigger language plpgsql set search_path to 'pg_catalog','cali_workspace' as $$
begin
  if old.service_plan is distinct from new.service_plan and exists (
    select 1 from cali_workspace.company_fronts
    where company_id=new.id and status='active' and (ends_at is null or ends_at>=current_date)
  ) then
    raise exception 'Encerre as frentes adicionais antes de alterar o plano da empresa.';
  end if;
  return null;
end; $$;
create trigger guard_company_front_plan_change after update of service_plan,service_type on cali_workspace.companies
for each row execute function cali_workspace.guard_company_front_plan_change();
