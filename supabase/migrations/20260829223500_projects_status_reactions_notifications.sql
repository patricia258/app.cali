alter table cali_workspace.deliverables drop constraint if exists deliverables_status_check;
alter table cali_workspace.deliverables add constraint deliverables_status_check check (status = any (array['not_started'::text,'in_progress'::text,'standby'::text,'internal_review'::text,'client_review'::text,'adjustment_requested'::text,'rebriefing'::text,'approved'::text,'cancelled'::text]));

create or replace function cali_workspace.log_deliverable_status_change()
returns trigger language plpgsql security definer set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_note text;
begin
  if old.status is distinct from new.status then
    v_note := nullif(current_setting('cali_workspace.status_note', true),'');
    insert into cali_workspace.deliverable_status_history(company_id,deliverable_id,from_status,to_status,actor_user_id,note)
    values(new.company_id,new.id,old.status,new.status,auth.uid(),v_note);
  end if;
  return new;
end; $$;

create or replace function cali_workspace.change_deliverable_status(p_deliverable_id uuid,p_status text,p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog','auth','cali_workspace' as $$
declare v_company_id uuid; v_project_id uuid; v_current text;
begin
  if p_status not in ('not_started','in_progress','standby','internal_review','client_review','rebriefing','approved','cancelled') then raise exception 'invalid status'; end if;
  select company_id,project_id,status into v_company_id,v_project_id,v_current from cali_workspace.deliverables where id=p_deliverable_id;
  if v_company_id is null or not cali_workspace.can_access_company(v_company_id) then raise exception 'access denied'; end if;
  if v_current='approved' and p_status<>'approved' then raise exception 'approved deliverable is locked'; end if;
  if p_status in ('standby','rebriefing','cancelled') and length(trim(coalesce(p_note,'')))<3 then raise exception 'reason required'; end if;
  perform set_config('cali_workspace.status_note',trim(coalesce(p_note,'')),true);
  update cali_workspace.deliverables set status=p_status,
    approval_requested_at=case when p_status='client_review' then now() else approval_requested_at end,
    approved_at=case when p_status='approved' then now() else approved_at end,
    locked_at=case when p_status='approved' then now() else locked_at end,
    cancelled_at=case when p_status='cancelled' then now() else cancelled_at end,
    cancellation_reason=case when p_status='cancelled' then trim(p_note) else cancellation_reason end,
    updated_at=now() where id=p_deliverable_id;
  if p_status='rebriefing' and v_project_id is not null then update cali_workspace.projects set planning_status='rebriefing',updated_at=now() where id=v_project_id; end if;
  return jsonb_build_object('deliverable_id',p_deliverable_id,'from_status',v_current,'to_status',p_status,'changed_at',now());
end; $$;
grant execute on function cali_workspace.change_deliverable_status(uuid,text,text) to authenticated;

create or replace function cali_workspace.notify_deliverable_status_change()
returns trigger language plpgsql security definer set search_path to 'pg_catalog','cali_workspace' as $$
declare v_title text; v_body text;
begin
  if old.status is not distinct from new.status or not coalesce(new.client_visible,false) then return new; end if;
  if new.status not in ('in_progress','standby','client_review','adjustment_requested','rebriefing','approved','cancelled') then return new; end if;
  v_title := case new.status when 'in_progress' then 'Entregável em andamento' when 'standby' then 'Entregável em standby' when 'client_review' then 'Sua validação é necessária' when 'adjustment_requested' then 'Ajuste registrado' when 'rebriefing' then 'Rebriefing necessário' when 'approved' then 'Entregável aprovado' when 'cancelled' then 'Entregável cancelado' else 'Atualização de entregável' end;
  v_body := new.title || ' · ' || case new.status when 'in_progress' then 'a CALI iniciou esta entrega.' when 'standby' then 'esta entrega foi temporariamente pausada. Consulte o histórico para o contexto.' when 'client_review' then 'o material está aguardando sua validação.' when 'adjustment_requested' then 'um pedido de ajuste foi registrado e poderá impactar o cronograma.' when 'rebriefing' then 'o fluxo exige nova validação de contexto, escopo e prazo.' when 'approved' then 'a aprovação foi registrada no Workspace.' when 'cancelled' then 'o cancelamento foi registrado e preservado no histórico.' else 'o status foi atualizado.' end;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id)
  select new.company_id,p.id,'deliverable_status',v_title,v_body,'deliverable',new.id from cali_workspace.profiles p where p.company_id=new.company_id and p.role='client' and p.active=true;
  return new;
end; $$;
drop trigger if exists deliverables_client_status_notification on cali_workspace.deliverables;
create trigger deliverables_client_status_notification after update of status on cali_workspace.deliverables for each row execute function cali_workspace.notify_deliverable_status_change();

create table if not exists cali_workspace.comment_reactions(
  id uuid primary key default gen_random_uuid(), company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  comment_id uuid not null references cali_workspace.comments(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check(reaction in('ok','like','question','heart','smile')), created_at timestamptz not null default now(), unique(comment_id,user_id,reaction)
);
alter table cali_workspace.comment_reactions enable row level security;
drop policy if exists comment_reactions_select on cali_workspace.comment_reactions;
create policy comment_reactions_select on cali_workspace.comment_reactions for select to authenticated using(cali_workspace.can_access_company(company_id));
drop policy if exists comment_reactions_insert on cali_workspace.comment_reactions;
create policy comment_reactions_insert on cali_workspace.comment_reactions for insert to authenticated with check(user_id=auth.uid() and cali_workspace.can_access_company(company_id));
drop policy if exists comment_reactions_delete on cali_workspace.comment_reactions;
create policy comment_reactions_delete on cali_workspace.comment_reactions for delete to authenticated using(user_id=auth.uid() or cali_workspace.is_admin());
grant select,insert,delete on cali_workspace.comment_reactions to authenticated;

create or replace function cali_workspace.sync_company_service_plan()
returns trigger language plpgsql set search_path to 'pg_catalog','cali_workspace' as $$
begin
  if new.service_type='CALI Partner' then new.service_plan:='partner';
  elsif new.service_type='CALI Full' then new.service_plan:='full';
  elsif new.service_type is distinct from 'Assessoria Estratégica Mensal' then new.service_plan:=null;
  end if;
  return new;
end; $$;
drop trigger if exists companies_sync_service_plan on cali_workspace.companies;
create trigger companies_sync_service_plan before insert or update of service_type on cali_workspace.companies for each row execute function cali_workspace.sync_company_service_plan();
