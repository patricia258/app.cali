begin;
set local lock_timeout = '5s';

create table cali_workspace.material_email_receipts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  kind text not null check (kind in ('report','proposal','mapa')),
  entity_id uuid not null,
  company_id uuid references cali_workspace.companies(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  provider_id text,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(kind,entity_id,request_id)
);
create unique index material_email_pending_idx on cali_workspace.material_email_receipts(kind,entity_id)
  where completed_at is null and rejected_at is null;
alter table cali_workspace.material_email_receipts enable row level security;
revoke all on cali_workspace.material_email_receipts from public,anon,authenticated;

create or replace function cali_workspace.reserve_material_email(
  p_request_id uuid, p_kind text, p_entity_id uuid, p_actor_id uuid, p_hash text, p_company_id uuid, p_version integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_job cali_workspace.material_email_receipts%rowtype;
  v_report cali_workspace.reports%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_kind || ':mail:' || p_entity_id::text,0));
  if p_kind = 'report' then
    select * into v_report from cali_workspace.reports where id=p_entity_id and company_id=p_company_id
      and status in ('approved','sent','published') and version=p_version;
    if not found then raise exception using errcode='40001', message='A versão do relatório mudou.'; end if;
    perform pg_advisory_xact_lock(hashtextextended(concat_ws(':','report-period',p_company_id,v_report.report_type,v_report.period_start,v_report.period_end),0));
    if exists (
      select 1 from cali_workspace.reports r
      where r.company_id=p_company_id and r.report_type=v_report.report_type and r.period_start=v_report.period_start
        and r.period_end=v_report.period_end and r.id<>p_entity_id
        and (r.status in ('sent','published') or exists (
          select 1 from cali_workspace.material_email_receipts m where m.kind='report' and m.entity_id=r.id
            and m.completed_at is null and m.rejected_at is null
        ))
    ) then raise exception using errcode='40001',message='Já existe outro envio nesta competência.'; end if;
  elsif p_kind = 'proposal' and not exists (
    select 1 from public.cali_proposals p where p.id=p_entity_id and p.version=p_version and p.status in ('aprovada','enviada')
  ) then raise exception using errcode='40001',message='A versão da proposta mudou.'; end if;

  select * into v_job from cali_workspace.material_email_receipts
  where kind = p_kind and entity_id = p_entity_id and request_id = p_request_id;
  if not found then
    select * into v_job from cali_workspace.material_email_receipts
    where kind = p_kind and entity_id = p_entity_id and actor_id = p_actor_id
      and content_hash = p_hash and completed_at is null and rejected_at is null;
  end if;
  if v_job.id is not null then
    if v_job.actor_id is distinct from p_actor_id or v_job.content_hash is distinct from p_hash
      or (v_job.provider_id is null and v_job.created_at < now() - interval '23 hours') then
      raise exception using errcode = '40001', message = 'O recibo precisa ser conferido antes de repetir o envio.';
    end if;
    if v_job.rejected_at is not null then
      update cali_workspace.material_email_receipts set rejected_at = null where id = v_job.id;
    end if;
  else
    insert into cali_workspace.material_email_receipts(request_id,kind,entity_id,company_id,actor_id,content_hash)
    values (p_request_id,p_kind,p_entity_id,p_company_id,p_actor_id,p_hash) returning * into v_job;
  end if;
  return jsonb_build_object('id',v_job.id,'provider_id',v_job.provider_id);
end;
$$;

create or replace function cali_workspace.reject_material_email(p_job_id uuid)
returns void language sql security definer set search_path = '' as $$
  update cali_workspace.material_email_receipts set rejected_at = now()
  where id = p_job_id and completed_at is null;
$$;

create or replace function cali_workspace.complete_material_email(
  p_job_id uuid, p_provider_id text, p_recipients text[], p_pdf_path text, p_version integer
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_job cali_workspace.material_email_receipts%rowtype;
  v_submission uuid;
begin
  select * into v_job from cali_workspace.material_email_receipts where id = p_job_id for update;
  if not found or coalesce(length(p_provider_id),0) not between 1 and 128 then raise exception 'Recibo de envio inválido.'; end if;
  if v_job.provider_id = p_provider_id then return; end if;
  if v_job.provider_id is not null then raise exception 'Recibo de envio divergente.'; end if;

  case v_job.kind
  when 'report' then
    update cali_workspace.reports
    set status = case when status = 'approved' then 'sent' else status end,
        sent_at = coalesce(sent_at,now()), sent_by = coalesce(sent_by,v_job.actor_id), sent_to = to_jsonb(p_recipients),
        published_at = coalesce(published_at,now())
    where id = v_job.entity_id and company_id = v_job.company_id and version = p_version
      and status in ('approved','sent','published');
    if not found then raise exception 'A revisão do relatório mudou.'; end if;
    insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values (v_job.company_id,v_job.actor_id,'report_sent','report',v_job.entity_id,
      jsonb_build_object('version',p_version,'email_id',p_provider_id,'to',p_recipients));
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required,emailed_at)
    select p.company_id,p.id,'report_available','Novo relatório disponível','O fechamento está disponível no Workspace.',
      'report',v_job.entity_id,'/cliente/relatorios?report=' || v_job.entity_id,'high',false,now()
    from cali_workspace.profiles p
    where p.active and p.role = 'client' and p.company_id = v_job.company_id and lower(p.email) = any(p_recipients)
      and not exists (
        select 1 from cali_workspace.notifications n where n.user_id = p.id
          and n.entity_type = 'report' and n.entity_id = v_job.entity_id and n.notification_type = 'report_available'
      );
  when 'proposal' then
    update public.cali_proposals
    set status = 'enviada', pdf_path = coalesce(pdf_path,p_pdf_path),
      sent_at = coalesce(sent_at,now()), resend_email_id = p_provider_id, updated_at = now()
    where id = v_job.entity_id and version = p_version and status in ('aprovada','enviada')
      and (pdf_path is null or pdf_path = p_pdf_path)
    returning submission_id into v_submission;
    if not found then raise exception 'A revisão da proposta mudou.'; end if;
    update public.cali_submissions set status = 'enviada', updated_at = now()
    where id = v_submission and status in ('novo','analise','edicao','aprovada');
    insert into public.cali_activity(submission_id,proposal_id,event_type,metadata)
    values (v_submission,v_job.entity_id,'proposal_sent',
      jsonb_build_object('version',p_version,'email_id',p_provider_id,'to',p_recipients));
  when 'mapa' then
    update public.mapa_respostas set status = 'enviado', relatorio_enviado_em = now() where id = v_job.entity_id;
    if not found then raise exception 'A devolutiva mudou.'; end if;
    insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values (v_job.company_id,v_job.actor_id,'mapa_report_sent','mapa_response',v_job.entity_id,
      jsonb_build_object('email_id',p_provider_id,'to',p_recipients));
  end case;
  update cali_workspace.material_email_receipts
  set provider_id = p_provider_id, completed_at = now(), rejected_at = null where id = p_job_id;
end;
$$;

revoke all on function cali_workspace.reserve_material_email(uuid,text,uuid,uuid,text,uuid,integer),
  cali_workspace.reject_material_email(uuid), cali_workspace.complete_material_email(uuid,text,text[],text,integer)
  from public,anon,authenticated;
grant execute on function cali_workspace.reserve_material_email(uuid,text,uuid,uuid,text,uuid,integer),
  cali_workspace.reject_material_email(uuid), cali_workspace.complete_material_email(uuid,text,text[],text,integer)
  to service_role;

-- These Portal tables are in public; the private Workspace gate must also apply there.
create policy workspace_private_access_v2 on public.cali_proposals as restrictive for all to authenticated
  using ((select cali_workspace.workspace_private_access_v2())) with check ((select cali_workspace.workspace_private_access_v2()));
create policy workspace_private_access_v2 on public.cali_submissions as restrictive for all to authenticated
  using ((select cali_workspace.workspace_private_access_v2())) with check ((select cali_workspace.workspace_private_access_v2()));
create policy workspace_private_access_v2 on public.cali_activity as restrictive for all to authenticated
  using ((select cali_workspace.workspace_private_access_v2())) with check ((select cali_workspace.workspace_private_access_v2()));
create policy workspace_private_access_v2 on public.mapa_respostas as restrictive for all to authenticated
  using ((select cali_workspace.workspace_private_access_v2())) with check ((select cali_workspace.workspace_private_access_v2()));

notify pgrst, 'reload schema';
commit;
