-- Fim de contrato (Política de Privacidade, item 8, e cláusula de encerramento — 15/10/2026):
-- 45 dias corridos depois do encerramento, os dados da empresa são eliminados ou anonimizados.
-- Decisão da proprietária: alerta no dia 45 + botão "Eliminar dados" com confirmação (nada é apagado sozinho).
-- Ficam guardados: o cadastro da empresa (sem textos livres e sem logo), cobrança (billing_records), histórico de
-- segurança/auditoria (activity_log, team_private_audit), pedidos de privacidade (data_subject_requests) e o registro
-- da própria eliminação. Pessoas do cliente: perfil e login anonimizados e bloqueados (não são apagados, para não
-- quebrar o histórico de auditoria). Arquivos: a tela apaga do armazenamento os caminhos listados por
-- admin_company_storage_objects antes de chamar admin_eliminate_company_data.
alter table cali_workspace.companies add column if not exists data_eliminated_at timestamptz;
alter table cali_workspace.companies add column if not exists elimination_alerted_at timestamptz;

create table if not exists cali_workspace.company_data_eliminations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id),
  company_name text not null,
  closed_at timestamptz,
  eliminated_at timestamptz not null default now(),
  eliminated_by uuid,
  files_removed integer not null default 0,
  rows_removed jsonb not null default '{}'::jsonb,
  people_anonymized integer not null default 0,
  kept text not null
);
alter table cali_workspace.company_data_eliminations enable row level security;
create policy company_data_eliminations_admin_read on cali_workspace.company_data_eliminations for select to authenticated using (cali_workspace.is_admin());
grant select on cali_workspace.company_data_eliminations to authenticated;

-- Liberada só para empresa encerrada há 45 dias ou mais e ainda não eliminada.
create or replace function cali_workspace.company_elimination_ready(p_company_id uuid)
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select exists (select 1 from cali_workspace.companies c where c.id = p_company_id and c.status = 'closed'
    and c.closed_at is not null and c.closed_at <= now() - interval '45 days' and c.data_eliminated_at is null);
$$;
revoke all on function cali_workspace.company_elimination_ready(uuid) from public, anon;
grant execute on function cali_workspace.company_elimination_ready(uuid) to authenticated;

-- Arquivos da empresa nos dois buckets: qualquer caminho com o id da empresa ou de uma pessoa do cliente.
create or replace function cali_workspace.admin_company_storage_objects(p_company_id uuid)
returns table(bucket text, path text) language plpgsql stable security definer set search_path to 'pg_catalog', 'cali_workspace', 'storage' as $$
begin
  if not cali_workspace.is_admin() then raise exception 'Somente a administração.'; end if;
  if not cali_workspace.company_elimination_ready(p_company_id) then raise exception 'A eliminação só fica liberada 45 dias depois do encerramento.'; end if;
  return query
    select o.bucket_id::text, o.name::text from storage.objects o
     where o.bucket_id in ('cali-workspace-private', 'workspace-assets')
       and (string_to_array(o.name, '/') && array[p_company_id::text]
         or string_to_array(o.name, '/') && (select coalesce(array_agg(p.id::text), '{}') from cali_workspace.profiles p where p.company_id = p_company_id and p.role = 'client'));
end $$;
revoke all on function cali_workspace.admin_company_storage_objects(uuid) from public, anon;
grant execute on function cali_workspace.admin_company_storage_objects(uuid) to authenticated;

create or replace function cali_workspace.admin_eliminate_company_data(p_company_id uuid, p_confirm_name text, p_files_removed integer)
returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog', 'cali_workspace', 'auth' as $$
declare
  v_company cali_workspace.companies%rowtype;
  v_counts jsonb := '{}'::jsonb;
  v_rows integer;
  v_people integer := 0;
  v_table text;
  v_kept text := 'Cadastro da empresa sem textos livres; cobrança (billing_records); histórico de segurança e auditoria (activity_log, team_private_audit); pedidos de privacidade; este registro. Perfis e logins das pessoas do cliente anonimizados e bloqueados.';
  -- Ordem: dependentes antes dos principais.
  v_tables text[] := array['account_record_message_reactions','account_record_messages','account_record_feedback','account_record_reopen_requests',
    'comment_reactions','comments','task_messages','task_notes','deliverable_notes','note_entries','document_acknowledgements','file_sync_jobs',
    'files','account_documents','deliverable_client_dependencies','deliverable_due_revisions','deliverable_status_history','deliverable_adjustments',
    'deliverable_dependencies','deliverable_tasks','nps_responses','satisfaction_followups','hour_alerts','work_timers','hour_entries',
    'staff_hour_submissions','staff_review_requests','event_attendees','event_outcomes','extra_visit_expenses','extra_visit_request_attachments',
    'agenda_change_requests','scheduling_requests','events','report_client_events','reports','project_review_requests','project_lifecycle_events',
    'deliverables','project_workstreams','projects','account_records','capacity_events','capacity_reviews','capacity_pauses','service_cycles',
    'company_fronts','company_hours_visibility','team_member_private','team_changes','team_month_metrics','team_month_snapshots','team_month_reviews',
    'team_month_reminders','team_months','team_vacancy_events','team_vacancies','team_members','notice_comments','notice_reactions',
    'notice_acknowledgements','notice_targets','notifications','communication_outbox','calendar_connections','calendar_oauth_states',
    'drive_connections','google_calendar_credentials','client_invites','staff_company_assignments'];
begin
  if not cali_workspace.is_admin() then raise exception 'Somente a administração pode eliminar dados.'; end if;
  select * into v_company from cali_workspace.companies where id = p_company_id for update;
  if not found then raise exception 'Empresa não encontrada.'; end if;
  if v_company.data_eliminated_at is not null then raise exception 'Os dados desta empresa já foram eliminados.'; end if;
  if not cali_workspace.company_elimination_ready(p_company_id) then raise exception 'A eliminação só fica liberada 45 dias depois do encerramento.'; end if;
  if lower(trim(coalesce(p_confirm_name, ''))) <> lower(trim(v_company.display_name)) then raise exception 'Digite o nome da empresa exatamente como aparece para confirmar.'; end if;

  foreach v_table in array v_tables loop
    execute format('delete from cali_workspace.%I where company_id = $1', v_table) using p_company_id;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then v_counts := v_counts || jsonb_build_object(v_table, v_rows); end if;
  end loop;

  -- Pessoas do cliente: anonimiza perfil e login e bloqueia o acesso.
  update auth.users u set email = 'removido+' || u.id || '@calirh.invalid', phone = null,
         raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity'::timestamptz, updated_at = now()
   where u.id in (select p.id from cali_workspace.profiles p where p.company_id = p_company_id and p.role = 'client');
  update auth.identities i set identity_data = jsonb_build_object('sub', i.user_id::text, 'email', 'removido+' || i.user_id || '@calirh.invalid'), updated_at = now()
   where i.user_id in (select p.id from cali_workspace.profiles p where p.company_id = p_company_id and p.role = 'client');
  delete from auth.sessions where user_id in (select p.id from cali_workspace.profiles p where p.company_id = p_company_id and p.role = 'client');
  update cali_workspace.profiles p set full_name = 'Pessoa removida', email = 'removido+' || p.id || '@calirh.invalid', active = false,
         job_title = null, phone = null, avatar_url = null, whatsapp = null, linkedin_url = null, instagram_url = null, signature_url = null, updated_at = now()
   where p.company_id = p_company_id and p.role = 'client';
  get diagnostics v_people = row_count;

  update cali_workspace.companies set notes = null, document_notes = null, payment_notes = null, logo_url = null, logo_workspace_url = null,
         drive_folder_url = null, branches = '[]'::jsonb, has_branches = false, data_eliminated_at = now(), updated_at = now()
   where id = p_company_id;

  insert into cali_workspace.company_data_eliminations (company_id, company_name, closed_at, eliminated_by, files_removed, rows_removed, people_anonymized, kept)
  values (p_company_id, v_company.display_name, v_company.closed_at, auth.uid(), greatest(0, coalesce(p_files_removed, 0)), v_counts, v_people, v_kept);
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (p_company_id, auth.uid(), 'company_data_eliminated', 'company', p_company_id,
          jsonb_build_object('files_removed', greatest(0, coalesce(p_files_removed, 0)), 'rows_removed', v_counts, 'people_anonymized', v_people));
  return jsonb_build_object('rows_removed', v_counts, 'people_anonymized', v_people, 'files_removed', greatest(0, coalesce(p_files_removed, 0)));
end $$;
revoke all on function cali_workspace.admin_eliminate_company_data(uuid, text, integer) from public, anon;
grant execute on function cali_workspace.admin_eliminate_company_data(uuid, text, integer) to authenticated;

-- Alerta diário (08h10 de Brasília): empresa encerrada há 45 dias e ainda não eliminada.
create or replace function cali_workspace.dispatch_company_elimination_alerts()
returns integer language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_row record; v_count integer := 0;
begin
  for v_row in select id, display_name from cali_workspace.companies
     where status = 'closed' and closed_at is not null and closed_at <= now() - interval '45 days'
       and data_eliminated_at is null and elimination_alerted_at is null
  loop
    perform cali_workspace.notify_workspace_movement(v_row.id, null, 'admin', 'company_elimination_due', 'Eliminação de dados liberada',
      left('Os 45 dias depois do encerramento de “' || v_row.display_name || '” terminaram. Confira se a exportação foi entregue e elimine os dados na ficha do cliente (aba Contrato).', 420),
      'company', v_row.id, '/admin/clientes', 'high', false);
    update cali_workspace.companies set elimination_alerted_at = now() where id = v_row.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke all on function cali_workspace.dispatch_company_elimination_alerts() from public, anon, authenticated;
select cron.schedule('workspace-company-elimination-alerts', '10 11 * * *', 'select cali_workspace.dispatch_company_elimination_alerts();');
