-- CALI Workspace · aprovação formal do cronograma, privacidade de rascunho e gestão de frentes V38

alter table cali_workspace.project_review_requests
  add column if not exists request_number integer not null default 1,
  add column if not exists requested_changes jsonb not null default '{}'::jsonb,
  add column if not exists resolution_note text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users(id) on delete set null;

alter table cali_workspace.project_review_requests drop constraint if exists project_review_requests_status_check;
alter table cali_workspace.project_review_requests
  add constraint project_review_requests_status_check
  check (status = any (array['pending'::text,'approved'::text,'adjustment_requested'::text,'accepted'::text,'rejected'::text,'expired'::text,'cancelled'::text]));

create unique index if not exists project_review_requests_one_pending_v38
  on cali_workspace.project_review_requests(project_id)
  where status='pending';

create or replace function cali_workspace.client_can_view_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path to 'pg_catalog','cali_workspace' as $$
  select exists(
    select 1 from cali_workspace.projects p
    where p.id=p_project_id
      and p.company_id=cali_workspace.current_company_id()
      and p.planning_status in ('client_review','adjustment_requested','approved','active','rebriefing','closed')
      and p.status <> 'cancelled'
  );
$$;
grant execute on function cali_workspace.client_can_view_project(uuid) to authenticated;

create or replace function cali_workspace.client_can_view_deliverable(p_deliverable_id uuid)
returns boolean language sql stable security definer set search_path to 'pg_catalog','cali_workspace' as $$
  select exists(
    select 1 from cali_workspace.deliverables d
    where d.id=p_deliverable_id
      and d.company_id=cali_workspace.current_company_id()
      and d.client_visible=true
      and d.status <> 'cancelled'
      and d.project_id is not null
      and cali_workspace.client_can_view_project(d.project_id)
  );
$$;
grant execute on function cali_workspace.client_can_view_deliverable(uuid) to authenticated;

drop policy if exists projects_client_select on cali_workspace.projects;
create policy projects_client_select on cali_workspace.projects for select to authenticated
using (company_id=cali_workspace.current_company_id() and cali_workspace.client_can_view_project(id));

drop policy if exists project_workstreams_client_select on cali_workspace.project_workstreams;
create policy project_workstreams_client_select on cali_workspace.project_workstreams for select to authenticated
using (company_id=cali_workspace.current_company_id() and cali_workspace.client_can_view_project(project_id));

drop policy if exists deliverables_client_select on cali_workspace.deliverables;
create policy deliverables_client_select on cali_workspace.deliverables for select to authenticated
using (company_id=cali_workspace.current_company_id() and client_visible and project_id is not null and cali_workspace.client_can_view_project(project_id));

drop policy if exists project_review_requests_client_select on cali_workspace.project_review_requests;
create policy project_review_requests_client_select on cali_workspace.project_review_requests for select to authenticated
using (company_id=cali_workspace.current_company_id() and cali_workspace.client_can_view_project(project_id));

drop policy if exists deliverable_tasks_client_select on cali_workspace.deliverable_tasks;
create policy deliverable_tasks_client_select on cali_workspace.deliverable_tasks for select to authenticated
using (company_id=cali_workspace.current_company_id() and client_visible and cali_workspace.client_can_view_deliverable(deliverable_id));

drop policy if exists deliverable_adjustments_client_select on cali_workspace.deliverable_adjustments;
create policy deliverable_adjustments_client_select on cali_workspace.deliverable_adjustments for select to authenticated
using (company_id=cali_workspace.current_company_id() and cali_workspace.client_can_view_deliverable(deliverable_id));

drop policy if exists deliverable_history_client_select on cali_workspace.deliverable_status_history;
create policy deliverable_history_client_select on cali_workspace.deliverable_status_history for select to authenticated
using (company_id=cali_workspace.current_company_id() and cali_workspace.client_can_view_deliverable(deliverable_id));

drop policy if exists files_client_select on cali_workspace.files;
create policy files_client_select on cali_workspace.files for select to authenticated
using (company_id=cali_workspace.current_company_id() and client_visible and (deliverable_id is null or cali_workspace.client_can_view_deliverable(deliverable_id)));

drop policy if exists comments_client_select on cali_workspace.comments;
create policy comments_client_select on cali_workspace.comments for select to authenticated
using (company_id=cali_workspace.current_company_id() and client_visible and (target_type <> 'deliverable' or cali_workspace.client_can_view_deliverable(target_id)));

create or replace function cali_workspace.shift_business_date(p_date date,p_days integer)
returns date language plpgsql stable security definer set search_path to 'pg_catalog','cali_workspace' as $$
declare v_date date:=p_date; v_left integer:=abs(coalesce(p_days,0)); v_step integer:=case when coalesce(p_days,0)<0 then -1 else 1 end;
begin
  while v_left>0 loop
    v_date:=v_date+v_step;
    if cali_workspace.is_business_day(v_date) then v_left:=v_left-1; end if;
  end loop;
  return v_date;
end;
$$;
grant execute on function cali_workspace.shift_business_date(date,integer) to authenticated;

create or replace function cali_workspace.validate_project_schedule_before_share_v38()
returns trigger language plpgsql security definer set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_empty_fronts integer; v_deliverables integer; v_missing_deadlines integer;
begin
  if old.planning_status='draft' and new.planning_status='client_review' then
    if not cali_workspace.is_admin() then raise exception 'Apenas a CALI pode enviar um cronograma para aprovação.'; end if;
    select count(*) into v_empty_fronts from cali_workspace.project_workstreams w
      where w.project_id=new.id and w.status<>'cancelled'
      and not exists(select 1 from cali_workspace.deliverables d where d.project_id=new.id and d.status<>'cancelled' and (d.workstream_id=w.id or (d.workstream_id is null and lower(trim(coalesce(d.workstream,'')))=lower(trim(w.name)))));
    select count(*) into v_deliverables from cali_workspace.deliverables d where d.project_id=new.id and d.status<>'cancelled';
    select count(*) into v_missing_deadlines from cali_workspace.deliverables d where d.project_id=new.id and d.status<>'cancelled' and d.due_at is null;
    if v_deliverables=0 then raise exception 'Inclua pelo menos um entregável antes de enviar o cronograma.'; end if;
    if v_empty_fronts>0 then raise exception 'Existem % frente(s) sem entregáveis. Exclua, complete ou reorganize antes de enviar.',v_empty_fronts; end if;
    if v_missing_deadlines>0 then raise exception 'Existem % entregável(is) sem deadline. Complete as datas antes de enviar.',v_missing_deadlines; end if;
    new.start_date:=coalesce(new.start_date,current_date);
    new.roadmap_start_date:=coalesce(new.roadmap_start_date,new.start_date,current_date);
  end if;
  return new;
end;
$$;

drop trigger if exists projects_validate_schedule_share_v38 on cali_workspace.projects;
create trigger projects_validate_schedule_share_v38 before update of planning_status on cali_workspace.projects
for each row execute function cali_workspace.validate_project_schedule_before_share_v38();

create or replace function cali_workspace.open_project_schedule_review_v38()
returns trigger language plpgsql security definer set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_due timestamptz;
begin
  if old.planning_status='draft' and new.planning_status='client_review' then
    v_due:=((cali_workspace.add_business_days(current_date,coalesce(new.client_response_business_days,3))::timestamp+time '18:00') at time zone 'America/Sao_Paulo');
    insert into cali_workspace.project_review_requests(company_id,project_id,review_type,status,request_number,requested_at,response_due_at,created_by)
    values(new.company_id,new.id,'schedule','pending',1,now(),v_due,auth.uid()) on conflict do nothing;
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    select new.company_id,p.id,'project_schedule_review','Cronograma para sua aprovação',new.name||' está pronto para sua revisão. O projeto só começa após sua aprovação formal.','project',new.id,'/cliente/entregaveis','high',true
    from cali_workspace.profiles p where p.company_id=new.company_id and p.role='client' and p.active=true;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_open_schedule_review_v38 on cali_workspace.projects;
create trigger projects_open_schedule_review_v38 after update of planning_status on cali_workspace.projects
for each row execute function cali_workspace.open_project_schedule_review_v38();

create or replace function cali_workspace.client_request_project_schedule_adjustment(p_project_id uuid,p_target_type text,p_target_id uuid,p_reason text,p_priority text default null)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_company uuid; v_project_name text; v_review cali_workspace.project_review_requests%rowtype; v_target_label text;
begin
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Descreva o ajuste solicitado.'; end if;
  if p_target_type not in ('project','workstream','deliverable') then raise exception 'Tipo de ajuste inválido.'; end if;
  select p.company_id,p.name into v_company,v_project_name from cali_workspace.projects p where p.id=p_project_id and p.company_id=cali_workspace.current_company_id() and p.planning_status='client_review';
  if v_company is null then raise exception 'Cronograma indisponível para ajuste.'; end if;
  select * into v_review from cali_workspace.project_review_requests r where r.project_id=p_project_id and r.status='pending' order by r.request_number desc,r.requested_at desc limit 1;
  if v_review.id is null then raise exception 'Não há uma revisão aberta para este cronograma.'; end if;
  if v_review.request_number>2 then raise exception 'O limite de dois pedidos de ajuste deste cronograma já foi utilizado.'; end if;
  if p_target_type='workstream' then
    select w.name into v_target_label from cali_workspace.project_workstreams w where w.id=p_target_id and w.project_id=p_project_id and w.status<>'cancelled';
    if v_target_label is null then raise exception 'Frente não encontrada.'; end if;
  elsif p_target_type='deliverable' then
    select d.title into v_target_label from cali_workspace.deliverables d where d.id=p_target_id and d.project_id=p_project_id and d.status<>'cancelled';
    if v_target_label is null then raise exception 'Entregável não encontrado.'; end if;
  else v_target_label:=v_project_name; end if;
  update cali_workspace.project_review_requests set status='adjustment_requested',responded_at=now(),responded_by=auth.uid(),response_note=trim(p_reason),requested_changes=jsonb_build_object('targetType',p_target_type,'targetId',p_target_id,'targetLabel',v_target_label,'priority',nullif(trim(coalesce(p_priority,'')),'')) where id=v_review.id;
  update cali_workspace.projects set planning_status='adjustment_requested',updated_at=now() where id=p_project_id;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  select v_company,p.id,'project_schedule_adjustment','Ajuste solicitado no cronograma',v_project_name||' recebeu um pedido de ajuste do cliente: '||trim(p_reason),'project',p_project_id,'/admin/projetos','high',true from cali_workspace.profiles p where p.role='admin' and p.active=true;
  return jsonb_build_object('review_id',v_review.id,'request_number',v_review.request_number,'status','adjustment_requested');
end;
$$;
grant execute on function cali_workspace.client_request_project_schedule_adjustment(uuid,text,uuid,text,text) to authenticated;

create or replace function cali_workspace.admin_resolve_project_schedule_adjustment(p_review_id uuid,p_accept boolean,p_justification text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_review cali_workspace.project_review_requests%rowtype; v_project cali_workspace.projects%rowtype; v_next integer; v_due timestamptz; v_status text;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso administrativo necessário.'; end if;
  if length(trim(coalesce(p_justification,'')))<3 then raise exception 'Informe a justificativa da decisão.'; end if;
  select * into v_review from cali_workspace.project_review_requests where id=p_review_id and status='adjustment_requested';
  if v_review.id is null then raise exception 'Pedido de ajuste não encontrado ou já resolvido.'; end if;
  select * into v_project from cali_workspace.projects where id=v_review.project_id;
  v_status:=case when p_accept then 'accepted' else 'rejected' end;
  update cali_workspace.project_review_requests set status=v_status,resolution_note=trim(p_justification),resolved_at=now(),resolved_by=auth.uid() where id=v_review.id;
  v_next:=v_review.request_number+1;
  v_due:=((cali_workspace.add_business_days(current_date,coalesce(v_project.client_response_business_days,3))::timestamp+time '18:00') at time zone 'America/Sao_Paulo');
  insert into cali_workspace.project_review_requests(company_id,project_id,review_type,status,request_number,requested_at,response_due_at,created_by)
  values(v_project.company_id,v_project.id,'schedule','pending',v_next,now(),v_due,auth.uid());
  update cali_workspace.projects set planning_status='client_review',updated_at=now() where id=v_project.id;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  select v_project.company_id,p.id,'project_schedule_adjustment_resolution',case when p_accept then 'Seu ajuste foi acolhido' else 'Retorno sobre seu pedido de ajuste' end,case when p_accept then v_project.name||' voltou para sua validação após a análise da CALI. ' else v_project.name||' voltou para sua validação. ' end||trim(p_justification),'project',v_project.id,'/cliente/entregaveis','high',true from cali_workspace.profiles p where p.company_id=v_project.company_id and p.role='client' and p.active=true;
  return jsonb_build_object('review_id',v_review.id,'decision',v_status,'next_request_number',v_next,'project_id',v_project.id);
end;
$$;
grant execute on function cali_workspace.admin_resolve_project_schedule_adjustment(uuid,boolean,text) to authenticated;

create or replace function cali_workspace.client_approve_project_schedule(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_project cali_workspace.projects%rowtype; v_review cali_workspace.project_review_requests%rowtype; v_old_start date; v_new_start date:=current_date; v_shift integer:=0;
begin
  select * into v_project from cali_workspace.projects p where p.id=p_project_id and p.company_id=cali_workspace.current_company_id() and p.planning_status='client_review';
  if v_project.id is null then raise exception 'Cronograma indisponível para aprovação.'; end if;
  select * into v_review from cali_workspace.project_review_requests r where r.project_id=p_project_id and r.status='pending' order by r.request_number desc,r.requested_at desc limit 1;
  if v_review.id is null then raise exception 'Não há uma revisão aberta para aprovação.'; end if;
  v_old_start:=coalesce(v_project.roadmap_start_date,v_project.start_date,v_review.requested_at::date,v_new_start);
  v_shift:=cali_workspace.business_days_delta(v_old_start,v_new_start);
  if v_shift<>0 then
    update cali_workspace.deliverables d set original_due_at=coalesce(d.original_due_at,d.due_at),due_at=case when d.due_at is null then null else ((cali_workspace.shift_business_date((d.due_at at time zone 'America/Sao_Paulo')::date,v_shift)::timestamp + (d.due_at at time zone 'America/Sao_Paulo')::time) at time zone 'America/Sao_Paulo') end,updated_at=now() where d.project_id=p_project_id and d.status<>'cancelled';
    update cali_workspace.deliverable_tasks t set due_at=case when t.due_at is null then null else ((cali_workspace.shift_business_date((t.due_at at time zone 'America/Sao_Paulo')::date,v_shift)::timestamp + (t.due_at at time zone 'America/Sao_Paulo')::time) at time zone 'America/Sao_Paulo') end,updated_at=now() where exists(select 1 from cali_workspace.deliverables d where d.id=t.deliverable_id and d.project_id=p_project_id);
  end if;
  update cali_workspace.project_review_requests set status='approved',responded_at=now(),responded_by=auth.uid(),response_note='Cronograma aprovado pelo cliente.' where id=v_review.id;
  update cali_workspace.project_workstreams set status='active',updated_at=now() where project_id=p_project_id and status='planned';
  update cali_workspace.projects set planning_status='active',status='active',start_date=v_new_start,roadmap_start_date=v_new_start,client_approved_at=now(),activated_at=now(),updated_at=now() where id=p_project_id;
  perform cali_workspace.refresh_project_forecast(p_project_id);
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  select v_project.company_id,p.id,'project_schedule_approved','Cronograma aprovado pelo cliente',v_project.name||' foi aprovado e agora é um projeto ativo. O prazo começou a contar em '||to_char(v_new_start,'DD/MM/YYYY')||'.','project',p_project_id,'/admin/projetos','high',true from cali_workspace.profiles p where p.role='admin' and p.active=true;
  return jsonb_build_object('project_id',p_project_id,'status','active','approved_at',now(),'start_date',v_new_start,'business_day_shift',v_shift);
end;
$$;
grant execute on function cali_workspace.client_approve_project_schedule(uuid) to authenticated;

create or replace function cali_workspace.admin_update_project_workstream(p_workstream_id uuid,p_name text,p_objective text default null)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_front cali_workspace.project_workstreams%rowtype; v_name text:=trim(coalesce(p_name,''));
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso administrativo necessário.'; end if;
  if length(v_name)<2 then raise exception 'Informe o nome da frente.'; end if;
  select w.* into v_front from cali_workspace.project_workstreams w join cali_workspace.projects p on p.id=w.project_id where w.id=p_workstream_id and p.planning_status='draft';
  if v_front.id is null then raise exception 'A frente só pode ser editada enquanto o projeto está em rascunho.'; end if;
  update cali_workspace.deliverables set workstream=v_name,updated_at=now() where project_id=v_front.project_id and status<>'cancelled' and (workstream_id=v_front.id or (workstream_id is null and lower(trim(coalesce(workstream,'')))=lower(trim(v_front.name))));
  update cali_workspace.project_workstreams set name=v_name,objective=nullif(trim(coalesce(p_objective,'')),''),updated_at=now() where id=v_front.id;
  return jsonb_build_object('workstream_id',v_front.id,'name',v_name);
end;
$$;
grant execute on function cali_workspace.admin_update_project_workstream(uuid,text,text) to authenticated;

create or replace function cali_workspace.admin_delete_project_workstream(p_workstream_id uuid,p_move_to_workstream_id uuid default null)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_front cali_workspace.project_workstreams%rowtype; v_target cali_workspace.project_workstreams%rowtype; v_count integer:=0;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso administrativo necessário.'; end if;
  select w.* into v_front from cali_workspace.project_workstreams w join cali_workspace.projects p on p.id=w.project_id where w.id=p_workstream_id and p.planning_status='draft';
  if v_front.id is null then raise exception 'A frente só pode ser excluída enquanto o projeto está em rascunho.'; end if;
  select count(*) into v_count from cali_workspace.deliverables d where d.project_id=v_front.project_id and d.status<>'cancelled' and (d.workstream_id=v_front.id or (d.workstream_id is null and lower(trim(coalesce(d.workstream,'')))=lower(trim(v_front.name))));
  if v_count>0 then
    if p_move_to_workstream_id is null then raise exception 'Esta frente possui % entregável(is). Escolha outra frente para transferi-los antes de excluir.',v_count; end if;
    select * into v_target from cali_workspace.project_workstreams where id=p_move_to_workstream_id and project_id=v_front.project_id and id<>v_front.id and status<>'cancelled';
    if v_target.id is null then raise exception 'Frente de destino inválida.'; end if;
    update cali_workspace.deliverables set workstream_id=v_target.id,workstream=v_target.name,updated_at=now() where project_id=v_front.project_id and status<>'cancelled' and (workstream_id=v_front.id or (workstream_id is null and lower(trim(coalesce(workstream,'')))=lower(trim(v_front.name))));
  end if;
  delete from cali_workspace.project_workstreams where id=v_front.id;
  perform cali_workspace.refresh_project_workstream_ranges(v_front.project_id);
  return jsonb_build_object('deleted_workstream_id',v_front.id,'moved_deliverables',v_count,'destination_workstream_id',p_move_to_workstream_id);
end;
$$;
grant execute on function cali_workspace.admin_delete_project_workstream(uuid,uuid) to authenticated;

insert into cali_workspace.project_review_requests(company_id,project_id,review_type,status,request_number,requested_at,response_due_at,created_by)
select p.company_id,p.id,'schedule','pending',1,now(),((cali_workspace.add_business_days(current_date,coalesce(p.client_response_business_days,3))::timestamp+time '18:00') at time zone 'America/Sao_Paulo'),null
from cali_workspace.projects p
where p.planning_status='client_review'
and not exists(select 1 from cali_workspace.project_review_requests r where r.project_id=p.id and r.status='pending');
