begin;

-- Projeções privadas sem cascata, vinculadas por ID à empresa ou ao registro original.
create function cali_workspace.purge_company_elimination_projections(p_company uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  notice_ids uuid[];
  report_ids uuid[];
  document_ids uuid[];
  proposal_ids uuid[];
  submission_ids uuid[];
  mapa_ids uuid[];
begin
  delete from cali_session_guard.team_month_events where company_id = p_company;

  select array(select n.id from cali_workspace.notices n
    where n.audience = 'selected'
      and exists (select 1 from cali_workspace.notice_targets t where t.notice_id = n.id and t.company_id = p_company)
      and not exists (select 1 from cali_workspace.notice_targets t where t.notice_id = n.id and t.company_id <> p_company))
    into notice_ids;
  delete from cali_session_guard.phase4_notice_cover where notice_id = any(notice_ids);
  delete from cali_workspace.notices where id = any(notice_ids);

  select array(select r.id from cali_workspace.reports r where r.company_id = p_company) into report_ids;
  delete from cali_session_guard.phase4_report_releases where report_id = any(report_ids);
  delete from cali_session_guard.phase4_report_pdfs where report_id = any(report_ids);
  delete from cali_session_guard.phase4_report_approvals where report_id = any(report_ids);
  delete from cali_session_guard.phase4_report_curation where report_id = any(report_ids);

  select array(select d.id from cali_session_guard.phase4_documents d where d.company_id = p_company) into document_ids;
  update cali_session_guard.phase4_documents set published_revision = null where id = any(document_ids);
  delete from cali_session_guard.phase4_document_acknowledgments a using cali_session_guard.phase4_document_revisions v
    where a.revision_id = v.id and v.document_id = any(document_ids);
  delete from cali_session_guard.phase4_document_revisions where document_id = any(document_ids);
  delete from cali_session_guard.phase4_documents where id = any(document_ids);

  delete from cali_session_guard.phase4_agenda_material p using cali_workspace.events e
    where p.event_id = e.id and e.company_id = p_company;
  delete from cali_session_guard.phase4_extra_expense_pdf p using cali_workspace.extra_visit_expenses e
    where p.expense_id = e.id and e.company_id = p_company;
  delete from cali_session_guard.phase4_project_qa p using cali_workspace.projects j
    where p.project_id = j.id and j.company_id = p_company;

  select array(select distinct s.proposal_id from cali_session_guard.phase4_commercial_scope s
    where s.company_id = p_company and s.proposal_id is not null and not exists (
      select 1 from cali_session_guard.phase4_commercial_scope other
      where other.proposal_id = s.proposal_id and other.company_id <> p_company
    )) into proposal_ids;
  select array(select distinct s.submission_id from cali_session_guard.phase4_commercial_scope s
    where s.company_id = p_company and not exists (
      select 1 from cali_session_guard.phase4_commercial_scope other
      where other.submission_id = s.submission_id and other.company_id <> p_company
    )) into submission_ids;
  delete from cali_session_guard.phase4_commercial_email where proposal_id = any(proposal_ids);
  delete from cali_session_guard.phase4_commercial_scope where company_id = p_company;
  delete from public.cali_proposals where id = any(proposal_ids);
  delete from public.cali_submissions s where s.id = any(submission_ids)
    and not exists (select 1 from public.cali_proposals p where p.submission_id = s.id);

  select array(select s.record_id from cali_session_guard.phase4_mapa_scope s
    where s.company_id = p_company and not exists (
      select 1 from cali_session_guard.phase4_mapa_scope other
      where other.record_id = s.record_id and other.company_id <> p_company
    )) into mapa_ids;
  delete from cali_session_guard.phase4_mapa_email where company_id = p_company;
  delete from cali_session_guard.phase4_mapa_scope where company_id = p_company;
  delete from public.mapa_respostas where id = any(mapa_ids);
end;
$$;

create function cali_workspace.finalize_company_elimination_job(p_job uuid, p_lease uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  job cali_workspace.company_elimination_jobs%rowtype;
  target cali_workspace.companies%rowtype;
  counts jsonb := '{}'::jsonb;
  result jsonb;
  removed integer;
  people integer;
  files integer;
  table_name text;
  subject_ids uuid[];
  scope_now jsonb;
  tables text[] := array[
    'account_record_message_reactions','account_record_messages','account_record_feedback',
    'account_record_reopen_requests',
    'comment_reactions','comments','task_messages','task_notes','deliverable_notes','note_entries',
    'document_acknowledgements','file_sync_jobs','files','account_documents',
    'deliverable_client_dependencies','deliverable_due_revisions','deliverable_status_history','deliverable_adjustments',
    'deliverable_dependencies','deliverable_tasks','nps_responses','satisfaction_followups','hour_alerts','work_timers','hour_entries',
    'staff_hour_submissions','staff_review_requests','event_attendees','event_outcomes',
    'extra_visit_expenses','extra_visit_request_attachments','agenda_change_requests','scheduling_requests','events',
    'report_client_events','reports','project_review_requests','project_lifecycle_events',
    'deliverables','project_workstreams','projects','account_records','capacity_events','capacity_reviews','capacity_pauses',
    'service_cycles','company_fronts','company_hours_visibility','team_member_private','team_changes',
    'team_month_metrics','team_month_snapshots','team_month_reviews','team_month_reminders','team_months',
    'team_vacancy_events','team_vacancies','team_members','notice_comments','notice_reactions',
    'notice_acknowledgements','notice_targets','notifications','communication_outbox','calendar_connections',
    'calendar_oauth_states','drive_connections','google_calendar_credentials','client_invites','staff_company_assignments',
    'company_onboarding','company_access_releases','material_email_receipts','partner_material_reviews'
  ];
begin
  select * into job from cali_workspace.company_elimination_jobs j where j.id = p_job for update;
  if job.completed_at is not null then return cali_workspace.company_elimination_job_summary(p_job); end if;
  if job.id is null or job.lease_id is null or job.lease_id is distinct from p_lease or job.lease_until <= clock_timestamp() then
    raise exception using errcode = '40001', message = 'Reserva de eliminação desatualizada.';
  end if;
  select * into target from cali_workspace.companies c where c.id = job.company_id for update;
  if target.status <> 'closed' or target.closed_at is distinct from job.closed_at or target.data_eliminated_at is not null then
    raise exception using errcode = '55000', message = 'Encerramento diverge da autorização registrada.';
  end if;
  scope_now := cali_workspace.company_elimination_scope(job.company_id);
  if exists (select 1 from cali_workspace.company_elimination_objects o where o.job_id = p_job and o.removed_at is null)
    or exists (select 1 from storage.objects o
      where cali_workspace.elimination_scope_matches(job.scope, o.bucket_id, o.name)
        or cali_workspace.elimination_scope_matches(scope_now, o.bucket_id, o.name)) then
    raise exception using errcode = '55000', message = 'Ainda há arquivos por reconciliar.';
  end if;
  select count(*) into files from cali_workspace.company_elimination_objects o where o.job_id = p_job;

  delete from cali_workspace.forms_trash t where t.form->>'company_id' = job.company_id::text
    or exists (select 1 from cali_workspace.forms f where f.id = t.form_id and f.company_id = job.company_id);
  get diagnostics removed = row_count;
  if removed > 0 then counts := counts || jsonb_build_object('forms_trash', removed); end if;

  delete from cali_workspace.forms f where f.company_id = job.company_id;
  get diagnostics removed = row_count;
  if removed > 0 then counts := counts || jsonb_build_object('forms', removed); end if;

  delete from cali_workspace.profile_results r where job.scope->'discResults' ? r.id::text
    or scope_now->'discResults' ? r.id::text;
  get diagnostics removed = row_count;
  if removed > 0 then counts := counts || jsonb_build_object('profile_results', removed); end if;

  delete from cali_workspace.profile_invites i where exists (
    select 1 from cali_workspace.team_members m where m.id = i.team_member_id and m.company_id = job.company_id
  ) and not exists (
    select 1 from cali_workspace.profile_links l where l.id = i.link_id and l.company_id is not null and l.company_id <> job.company_id
  );
  delete from cali_workspace.profile_links l where l.company_id = job.company_id;
  get diagnostics removed = row_count;
  if removed > 0 then counts := counts || jsonb_build_object('profile_links', removed); end if;

  if to_regclass('cali_workspace.partner_notice_reviews') is not null then
    execute 'delete from cali_workspace.partner_notice_reviews where company_ids @> array[$1]' using job.company_id;
    get diagnostics removed = row_count;
    if removed > 0 then counts := counts || jsonb_build_object('partner_notice_reviews', removed); end if;
  end if;

  perform cali_workspace.purge_company_elimination_projections(job.company_id);

  foreach table_name in array tables loop
    if table_name in ('material_email_receipts','partner_material_reviews')
      and to_regclass('cali_workspace.' || table_name) is null then continue; end if;
    execute format('delete from cali_workspace.%I where company_id = $1', table_name) using job.company_id;
    get diagnostics removed = row_count;
    if removed > 0 then counts := counts || jsonb_build_object(table_name, removed); end if;
  end loop;

  select array(select p.id from cali_workspace.profiles p where p.company_id = job.company_id and p.role = 'client') into subject_ids;
  delete from auth.sessions s where s.user_id = any(subject_ids);
  delete from auth.mfa_factors f where f.user_id = any(subject_ids);
  delete from auth.identities i where i.user_id = any(subject_ids);
  update auth.users u set email = 'removido+' || u.id || '@calirh.invalid', phone = null,
    raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity'::timestamptz, updated_at = clock_timestamp()
  where u.id = any(subject_ids);
  update cali_workspace.profiles p set full_name = 'Pessoa removida',
    email = 'removido+' || p.id || '@calirh.invalid', active = false, job_title = null, phone = null,
    avatar_url = null, whatsapp = null, linkedin_url = null, instagram_url = null, signature_url = null
  where p.id = any(subject_ids);
  get diagnostics people = row_count;

  -- A trilha conserva o fato e o ator pseudonimizado sem o conteúdo da operação.
  update cali_workspace.activity_log a set metadata = '{}'::jsonb where a.company_id = job.company_id;
  update cali_workspace.companies c set notes = null, document_notes = null, document_owner = null,
    payment_notes = null, logo_url = null, logo_workspace_url = null, drive_folder_url = null,
    branches = '[]'::jsonb, has_branches = false, data_eliminated_at = clock_timestamp()
  where c.id = job.company_id;
  result := jsonb_build_object('rows_removed', counts, 'people_anonymized', people, 'files_removed', files);
  insert into cali_workspace.company_data_eliminations (
    company_id, company_name, closed_at, eliminated_by, files_removed, rows_removed, people_anonymized, kept
  ) values (job.company_id, 'Empresa eliminada', job.closed_at, job.requested_by, files, counts, people,
    'Cadastro mínimo da empresa, cobrança, trilha mínima de segurança, pedidos de privacidade e comprovante de eliminação.');
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (job.company_id, job.requested_by, 'company_data_eliminated', 'company', job.company_id,
    result || jsonb_build_object('jobId', job.id));

  delete from cali_workspace.company_elimination_objects where job_id = p_job;
  update cali_workspace.company_elimination_jobs j set receipt = result, completed_at = clock_timestamp(),
    lease_id = null, lease_until = null, retry_at = null, last_error = null where j.id = p_job;
  return cali_workspace.company_elimination_job_summary(p_job);
end;
$$;

create or replace function cali_workspace.dispatch_company_elimination_alerts()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  target record;
  notice_count integer := 0;
begin
  for target in
    select c.id, c.display_name, cali_workspace.company_elimination_deadline(c.closed_at) as deadline
    from cali_workspace.companies c
    where c.status = 'closed' and c.closed_at is not null and c.data_eliminated_at is null
      and cali_workspace.company_elimination_deadline(c.closed_at) - interval '3 days' <= statement_timestamp()
      and (
        c.elimination_alerted_at is null
        or (c.elimination_alerted_at < cali_workspace.company_elimination_deadline(c.closed_at)
          and cali_workspace.company_elimination_deadline(c.closed_at) <= statement_timestamp())
      )
    order by c.id for update of c skip locked
  loop
    perform cali_workspace.notify_workspace_movement(
      target.id, null, 'admin', 'company_elimination_due',
      case when target.deadline <= statement_timestamp() then 'Prazo de eliminação chegou' else 'Prazo de eliminação se aproxima' end,
      left('A eliminação de “' || target.display_name || '” deve ser concluída em até 30 dias corridos do encerramento. Confira a execução na ficha.', 420),
      'company', target.id, '/admin/clientes', 'high', false);
    update cali_workspace.companies set elimination_alerted_at = clock_timestamp() where id = target.id;
    notice_count := notice_count + 1;
  end loop;
  return notice_count;
end;
$$;

create function cali_workspace.dispatch_company_elimination_worker()
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  endpoint text;
  hook text;
  bearer text;
  dispatched bigint;
begin
  update cali_workspace.company_elimination_jobs set scope = null
    where scope is not null and completed_at < clock_timestamp() - interval '10 minutes';
  if not exists (select 1 from cali_workspace.company_elimination_jobs where completed_at is null
    and (retry_at is null or retry_at <= clock_timestamp())
    and (lease_until is null or lease_until <= clock_timestamp())) then return null; end if;

  select secret_value into endpoint from cali_workspace.runtime_secrets where secret_key = 'company_elimination_worker_url';
  select secret_value into hook from cali_workspace.runtime_secrets where secret_key = 'company_elimination_worker_hook';
  if endpoint is null or hook is null or length(hook) < 32
    or (endpoint !~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/workspace-company-elimination$'
      and endpoint <> 'http://ingress:56431/functions/v1/workspace-company-elimination') then return null; end if;
  select decrypted_secret into bearer from vault.decrypted_secrets where name = 'company_elimination_worker_bearer';
  if bearer is null then return null; end if;
  select net.http_post(url := endpoint,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||bearer,'x-workspace-hook',hook),
    body := '{"action":"scheduled"}'::jsonb, timeout_milliseconds := 55000) into dispatched;
  return dispatched;
end;
$$;

-- A cerca cobre requisições em trânsito após o recibo, até o expurgo do escopo temporário.
create or replace function cali_workspace.fence_company_elimination_storage()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.bucket_id not in ('cali-workspace-private','workspace-assets','cali-forms','cali-profiles') then return new; end if;
  if exists (select 1 from cali_workspace.company_elimination_jobs j
    where j.scope is not null and cali_workspace.elimination_scope_matches(j.scope, new.bucket_id, new.name))
    or exists (select 1 from cali_workspace.companies c
      where c.data_eliminated_at is not null and c.id::text = any(string_to_array(new.name, '/'))) then
    raise exception using errcode = '42501', message = 'Arquivo fora de um escopo ativo de guarda.';
  end if;
  return new;
end;
$$;

revoke all on function cali_workspace.purge_company_elimination_projections(uuid),
  cali_workspace.finalize_company_elimination_job(uuid, uuid),
  cali_workspace.dispatch_company_elimination_worker() from public, anon, authenticated, service_role;
grant execute on function cali_workspace.finalize_company_elimination_job(uuid, uuid) to service_role;

-- A rotina de alerta existente continua às 08h10. A nova fila só dispara com o worker configurado.
select cron.schedule('workspace-company-elimination-worker', '0,5,10,15,20,25,30,35,40,45,50,55 * * * *',
  'select cali_workspace.dispatch_company_elimination_worker();');
notify pgrst, 'reload schema';
commit;
