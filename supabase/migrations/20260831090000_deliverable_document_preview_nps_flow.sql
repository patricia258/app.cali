-- CALI Workspace · fluxo integrado Entregável → NPS → Documento
-- 1) Entregáveis marcados como "Gera documento" criam uma prévia interna sem arquivo.
-- 2) Aprovação do cliente exige NPS 1–5; notas 1–3 exigem justificativa.
-- 3) A aprovação move a prévia para "aguardando arquivo final".
-- 4) O documento só fica visível ao cliente quando a CALI publica explicitamente.

alter table cali_workspace.files
  add column if not exists workflow_origin text not null default 'manual',
  add column if not exists workflow_stage text not null default 'ready_to_publish';

alter table cali_workspace.files drop constraint if exists files_workflow_origin_check;
alter table cali_workspace.files add constraint files_workflow_origin_check
  check (workflow_origin in ('manual','deliverable','project_attachment'));

alter table cali_workspace.files drop constraint if exists files_workflow_stage_check;
alter table cali_workspace.files add constraint files_workflow_stage_check
  check (workflow_stage in ('preparation','awaiting_final_file','ready_to_publish','published','archived'));

update cali_workspace.files
set workflow_stage = case
  when status='published' then 'published'
  when status='archived' then 'archived'
  else 'ready_to_publish'
end;

alter table cali_workspace.files drop constraint if exists files_check;
alter table cali_workspace.files add constraint files_check check (
  storage_path is not null
  or drive_url is not null
  or (workflow_origin='deliverable' and status='draft')
);

create unique index if not exists files_one_deliverable_preview_idx
  on cali_workspace.files(deliverable_id)
  where workflow_origin='deliverable' and revision_of_id is null and deliverable_id is not null;

create or replace function cali_workspace.normalize_file_workflow_stage()
returns trigger
language plpgsql
set search_path = cali_workspace, public
as $$
declare
  v_deliverable_status text;
begin
  if new.status='published' then
    new.workflow_stage := 'published';
  elsif new.status='archived' then
    new.workflow_stage := 'archived';
  elsif new.storage_path is not null or new.drive_url is not null then
    new.workflow_stage := 'ready_to_publish';
  elsif new.workflow_origin='deliverable' and new.deliverable_id is not null then
    select status into v_deliverable_status from cali_workspace.deliverables where id=new.deliverable_id;
    new.workflow_stage := case when v_deliverable_status='approved' then 'awaiting_final_file' else 'preparation' end;
  else
    new.workflow_stage := coalesce(new.workflow_stage,'ready_to_publish');
  end if;
  return new;
end;
$$;

drop trigger if exists files_normalize_workflow_stage on cali_workspace.files;
create trigger files_normalize_workflow_stage
before insert or update of status, storage_path, drive_url, workflow_origin, deliverable_id
on cali_workspace.files
for each row execute function cali_workspace.normalize_file_workflow_stage();

create or replace function cali_workspace.sync_deliverable_document_preview()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace, public
as $$
begin
  if new.is_document then
    insert into cali_workspace.files(
      company_id, project_id, deliverable_id, title, category, document_kind,
      description, version_label, status, client_visible, source_type,
      workflow_origin, workflow_stage, is_final
    ) values (
      new.company_id, new.project_id, new.id, new.title, 'deliverable', 'Entregável',
      new.description, 'v1.0', 'draft', false, 'workspace',
      'deliverable', case when new.status='approved' then 'awaiting_final_file' else 'preparation' end, false
    )
    on conflict (deliverable_id) where workflow_origin='deliverable' and revision_of_id is null and deliverable_id is not null
    do update set
      company_id=excluded.company_id,
      project_id=excluded.project_id,
      title=excluded.title,
      description=excluded.description,
      category='deliverable',
      document_kind='Entregável',
      updated_at=now();
  elsif tg_op='UPDATE' and old.is_document and not new.is_document then
    update cali_workspace.files
       set status='archived', client_visible=false, updated_at=now()
     where deliverable_id=new.id
       and workflow_origin='deliverable'
       and revision_of_id is null
       and storage_path is null
       and drive_url is null
       and status='draft';
  end if;
  return new;
end;
$$;

drop trigger if exists deliverables_sync_document_preview on cali_workspace.deliverables;
create trigger deliverables_sync_document_preview
after insert or update of is_document, title, description, status, company_id, project_id
on cali_workspace.deliverables
for each row execute function cali_workspace.sync_deliverable_document_preview();

alter table cali_workspace.nps_responses drop constraint if exists nps_responses_score_check;
alter table cali_workspace.nps_responses add constraint nps_responses_score_check check (score between 1 and 5);

alter table cali_workspace.nps_responses drop constraint if exists nps_responses_comment_required_check;
alter table cali_workspace.nps_responses add constraint nps_responses_comment_required_check
  check (score >= 4 or length(trim(coalesce(comment,''))) >= 3);

create unique index if not exists nps_one_response_per_deliverable_user_idx
  on cali_workspace.nps_responses(deliverable_id,user_id)
  where deliverable_id is not null;

create or replace function cali_workspace.client_approve_deliverable_with_feedback(
  p_deliverable_id uuid,
  p_score integer,
  p_comment text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace, public
as $$
declare
  v_company_id uuid;
  v_status text;
  v_client_visible boolean;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_score < 1 or p_score > 5 then raise exception 'score must be between 1 and 5'; end if;
  if p_score <= 3 and length(trim(coalesce(p_comment,''))) < 3 then raise exception 'comment required for scores from 1 to 3'; end if;

  select company_id,status,client_visible
    into v_company_id,v_status,v_client_visible
    from cali_workspace.deliverables
   where id=p_deliverable_id
   for update;

  if v_company_id is null then raise exception 'deliverable not found'; end if;
  if v_company_id is distinct from cali_workspace.current_company_id() then raise exception 'access denied'; end if;
  if not coalesce(v_client_visible,false) then raise exception 'deliverable not visible to client'; end if;
  if v_status <> 'client_review' then raise exception 'deliverable is not awaiting client review'; end if;

  insert into cali_workspace.nps_responses(company_id,user_id,deliverable_id,score,comment)
  values(v_company_id,auth.uid(),p_deliverable_id,p_score,nullif(trim(coalesce(p_comment,'')),''));

  update cali_workspace.deliverables
     set status='approved',client_response_at=v_now,approved_at=v_now,locked_at=v_now,updated_at=v_now
   where id=p_deliverable_id;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_company_id,auth.uid(),'deliverable_client_approved','deliverable',p_deliverable_id,
    jsonb_build_object('score',p_score,'comment_provided',length(trim(coalesce(p_comment,'')))>0));

  return jsonb_build_object('ok',true,'deliverable_id',p_deliverable_id,'score',p_score,'approved_at',v_now);
end;
$$;

revoke all on function cali_workspace.client_approve_deliverable_with_feedback(uuid,integer,text) from public, anon;
grant execute on function cali_workspace.client_approve_deliverable_with_feedback(uuid,integer,text) to authenticated;

-- Aprovação administrativa continua existindo, mas apenas para a CALI.
create or replace function cali_workspace.change_deliverable_status(p_deliverable_id uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, cali_workspace
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
  v_current text;
begin
  if not cali_workspace.is_admin() then raise exception 'admin access required'; end if;
  if p_status not in ('not_started','in_progress','standby','internal_review','client_review','rebriefing','approved','cancelled') then raise exception 'invalid status'; end if;

  select company_id, project_id, status into v_company_id, v_project_id, v_current
  from cali_workspace.deliverables where id = p_deliverable_id;

  if v_company_id is null then raise exception 'deliverable not found'; end if;
  if v_current = 'approved' and p_status <> 'approved' then raise exception 'approved deliverable is locked'; end if;
  if p_status in ('standby','rebriefing','cancelled') and length(trim(coalesce(p_note,''))) < 3 then raise exception 'reason required'; end if;

  perform set_config('cali_workspace.status_note', trim(coalesce(p_note,'')), true);

  update cali_workspace.deliverables
     set status = p_status,
         approval_requested_at = case when p_status='client_review' then now() else approval_requested_at end,
         approved_at = case when p_status='approved' then now() else approved_at end,
         locked_at = case when p_status='approved' then now() else locked_at end,
         cancelled_at = case when p_status='cancelled' then now() else cancelled_at end,
         cancellation_reason = case when p_status='cancelled' then trim(p_note) else cancellation_reason end,
         updated_at = now()
   where id = p_deliverable_id;

  if p_status='rebriefing' and v_project_id is not null then
    update cali_workspace.projects set planning_status='rebriefing', updated_at=now() where id=v_project_id;
  end if;

  return jsonb_build_object('deliverable_id',p_deliverable_id,'from_status',v_current,'to_status',p_status,'changed_at',now());
end;
$$;

revoke all on function cali_workspace.change_deliverable_status(uuid,text,text) from public, anon;
grant execute on function cali_workspace.change_deliverable_status(uuid,text,text) to authenticated;

revoke all on function cali_workspace.request_deliverable_adjustment(uuid,text,integer) from public, anon;
grant execute on function cali_workspace.request_deliverable_adjustment(uuid,text,integer) to authenticated;

insert into cali_workspace.files(
  company_id,project_id,deliverable_id,title,category,document_kind,description,version_label,status,client_visible,source_type,workflow_origin,workflow_stage,is_final
)
select d.company_id,d.project_id,d.id,d.title,'deliverable','Entregável',d.description,'v1.0','draft',false,'workspace','deliverable',
       case when d.status='approved' then 'awaiting_final_file' else 'preparation' end,false
from cali_workspace.deliverables d
where d.is_document
  and not exists (
    select 1 from cali_workspace.files f
    where f.deliverable_id=d.id and f.workflow_origin='deliverable' and f.revision_of_id is null
  );
