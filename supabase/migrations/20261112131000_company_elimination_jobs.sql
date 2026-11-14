begin;

create table cali_workspace.company_elimination_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references cali_workspace.companies(id),
  requested_by uuid not null,
  requested_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz not null,
  scope jsonb,
  lease_id uuid,
  lease_until timestamptz,
  retry_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  completed_at timestamptz,
  receipt jsonb
);

create table cali_workspace.company_elimination_objects (
  job_id uuid not null references cali_workspace.company_elimination_jobs(id) on delete cascade,
  bucket text not null,
  path text not null,
  object_id uuid not null,
  object_version text,
  removed_at timestamptz,
  primary key (job_id, bucket, path)
);

alter table cali_workspace.company_elimination_jobs enable row level security;
alter table cali_workspace.company_elimination_objects enable row level security;
revoke all on cali_workspace.company_elimination_jobs, cali_workspace.company_elimination_objects
  from public, anon, authenticated, service_role;

create function cali_workspace.company_elimination_deadline(p_closed_at timestamptz)
returns timestamptz
language sql immutable set search_path = ''
as $$
  select ((p_closed_at at time zone 'America/Sao_Paulo') + interval '30 days') at time zone 'America/Sao_Paulo';
$$;

create or replace function cali_workspace.company_elimination_ready(p_company_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from cali_workspace.companies c
    where c.id = p_company_id and c.status = 'closed' and c.closed_at is not null
      and cali_workspace.company_elimination_deadline(c.closed_at) <= statement_timestamp()
      and c.data_eliminated_at is null);
$$;

create function cali_workspace.company_elimination_scope(p_company uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'workspaceKeys', to_jsonb(array[p_company::text] || array(
      select p.id::text from cali_workspace.profiles p where p.company_id = p_company and p.role = 'client')),
    'noticeCovers', to_jsonb(array(
      select substring(n.cover_path from 9) from cali_workspace.notices n
      where n.audience = 'selected' and n.cover_path like 'private:notices/%'
        and exists (select 1 from cali_workspace.notice_targets t where t.notice_id = n.id and t.company_id = p_company)
        and not exists (select 1 from cali_workspace.notice_targets t where t.notice_id = n.id and t.company_id <> p_company))),
    'formSlugs', to_jsonb(array(
      select f.slug from cali_workspace.forms f where f.company_id = p_company
      union
      select t.form->>'slug' from cali_workspace.forms_trash t where t.form->>'company_id' = p_company::text)),
    'discLinks', to_jsonb(array(
      select l.id::text from cali_workspace.profile_links l where l.company_id = p_company)),
    'discResults', to_jsonb(array(
      select r.id::text from cali_workspace.profile_results r
      left join cali_workspace.profile_links l on l.id = r.link_id
      left join cali_workspace.team_members m on m.id = r.team_member_id
      where r.company_id = p_company or (r.company_id is null and coalesce(l.company_id, m.company_id) = p_company)))
  );
$$;

create function cali_workspace.elimination_scope_matches(p_scope jsonb, p_bucket text, p_path text)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when p_bucket in ('cali-workspace-private', 'workspace-assets') then
      exists (select 1 from jsonb_array_elements_text(p_scope->'workspaceKeys') keys
        where keys.value = any(string_to_array(p_path, '/')))
      or (p_bucket = 'cali-workspace-private' and p_scope->'noticeCovers' ? p_path)
    when p_bucket = 'cali-forms' then p_scope->'formSlugs' ? split_part(p_path, '/', 1)
    when p_bucket = 'cali-profiles' then
      p_scope->'discResults' ? split_part(p_path, '/', 1)
      or (split_part(p_path, '/', 1) = 'gestao' and p_scope->'discLinks' ? split_part(p_path, '/', 2))
    else false
  end;
$$;

create function cali_workspace.fence_company_elimination_storage()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.bucket_id not in ('cali-workspace-private', 'workspace-assets', 'cali-forms', 'cali-profiles') then
    return new;
  end if;
  if exists (select 1 from cali_workspace.company_elimination_jobs j
    where j.completed_at is null and cali_workspace.elimination_scope_matches(j.scope, new.bucket_id, new.name))
    or exists (select 1 from cali_workspace.companies c
      where c.data_eliminated_at is not null and c.id::text = any(string_to_array(new.name, '/')))
  then
    raise exception using errcode = '42501', message = 'Arquivo fora de um escopo ativo de guarda.';
  end if;
  return new;
end;
$$;

create trigger fence_company_elimination_storage
before insert or update on storage.objects
for each row execute function cali_workspace.fence_company_elimination_storage();

create function cali_workspace.fence_company_elimination_reopening()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status = 'closed' and (new.status <> 'closed' or new.closed_at is distinct from old.closed_at)
    and exists (select 1 from cali_workspace.company_elimination_jobs where company_id = old.id) then
    raise exception using errcode = '42501', message = 'A eliminação já foi autorizada para este encerramento.';
  end if;
  return new;
end;
$$;

create trigger fence_company_elimination_reopening
before update of status, closed_at on cali_workspace.companies
for each row execute function cali_workspace.fence_company_elimination_reopening();

create function cali_workspace.company_elimination_job_summary(p_job uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'jobId', j.id,
    'companyId', j.company_id,
    'deadlineAt', cali_workspace.company_elimination_deadline(j.closed_at),
    'state', case when j.completed_at is not null then 'completed'
      when j.lease_until > statement_timestamp() then 'running'
      when j.last_error is not null then 'retry' else 'queued' end,
    'filesPending', (select count(*) from cali_workspace.company_elimination_objects o where o.job_id = j.id and o.removed_at is null),
    'receipt', j.receipt
  ) from cali_workspace.company_elimination_jobs j where j.id = p_job;
$$;

create function cali_workspace.admin_preview_company_elimination(p_company uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  target cali_workspace.companies%rowtype;
  existing_job uuid;
  target_scope jsonb;
begin
  perform cali_workspace.require_company_admin();
  select * into target from cali_workspace.companies where id = p_company;
  if not found or target.status <> 'closed' or target.closed_at is null then
    raise exception using errcode = '55000', message = 'A empresa precisa ter encerramento efetivo registrado.';
  end if;
  select j.id into existing_job from cali_workspace.company_elimination_jobs j where j.company_id = p_company;
  target_scope := cali_workspace.company_elimination_scope(p_company);
  return jsonb_build_object(
    'companyId', p_company,
    'deadlineAt', cali_workspace.company_elimination_deadline(target.closed_at),
    'due', cali_workspace.company_elimination_ready(p_company),
    'files', (select count(*) from storage.objects o
      where cali_workspace.elimination_scope_matches(target_scope, o.bucket_id, o.name)),
    'externalCopies', exists(select 1 from cali_workspace.file_sync_jobs j where j.company_id = p_company)
      or exists(select 1 from cali_workspace.calendar_connections c where c.company_id = p_company)
      or exists(select 1 from cali_session_guard.phase4_commercial_scope s where s.company_id = p_company)
      or exists(select 1 from cali_session_guard.phase4_mapa_scope s where s.company_id = p_company)
      or nullif(btrim(target.drive_folder_url), '') is not null,
    'job', cali_workspace.company_elimination_job_summary(existing_job)
  );
end;
$$;

create function cali_workspace.admin_begin_company_elimination(
  p_company uuid, p_confirm_name text, p_copies_reviewed boolean
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := cali_workspace.require_company_admin();
  target cali_workspace.companies%rowtype;
  job uuid;
  target_scope jsonb;
begin
  select * into target from cali_workspace.companies where id = p_company for update;
  if not found or target.status <> 'closed' or target.closed_at is null or target.closed_at > statement_timestamp() then
    raise exception using errcode = '55000', message = 'A empresa precisa ter encerramento efetivo registrado.';
  end if;
  if lower(btrim(coalesce(p_confirm_name, ''))) <> lower(btrim(target.display_name)) or p_copies_reviewed is not true then
    raise exception using errcode = '22023', message = 'Confirme a empresa e confira as cópias e a exportação aplicável.';
  end if;
  select j.id into job from cali_workspace.company_elimination_jobs j where j.company_id = p_company;
  if found then return cali_workspace.company_elimination_job_summary(job); end if;
  if target.data_eliminated_at is not null then
    raise exception using errcode = '55000', message = 'Os dados desta empresa já foram eliminados.';
  end if;

  update cali_workspace.forms set status = 'closed' where company_id = p_company;
  update cali_workspace.profile_links set status = 'closed' where company_id = p_company;
  target_scope := cali_workspace.company_elimination_scope(p_company);

  -- O catálogo e a cerca ficam consistentes antes de enviar qualquer remoção ao Storage.
  lock table storage.objects in share row exclusive mode;
  insert into cali_workspace.company_elimination_jobs (company_id, requested_by, closed_at, scope)
  values (p_company, actor, target.closed_at, target_scope) returning id into job;
  insert into cali_workspace.company_elimination_objects (job_id, bucket, path, object_id, object_version)
  select job, o.bucket_id, o.name, o.id, o.version from storage.objects o
  where cali_workspace.elimination_scope_matches(target_scope, o.bucket_id, o.name);

  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (p_company, actor, 'company_elimination_authorized', 'company', p_company, jsonb_build_object('jobId', job));
  return cali_workspace.company_elimination_job_summary(job);
end;
$$;

create function cali_workspace.admin_read_company_elimination_job(p_job uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform cali_workspace.require_company_admin();
  return cali_workspace.company_elimination_job_summary(p_job);
end;
$$;

create function cali_workspace.claim_company_elimination_job(p_job uuid default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  job cali_workspace.company_elimination_jobs%rowtype;
  lease uuid := gen_random_uuid();
begin
  select * into job from cali_workspace.company_elimination_jobs j
    where (p_job is null or j.id = p_job) and j.completed_at is null
      and (j.lease_until is null or j.lease_until <= clock_timestamp())
      and (p_job is not null or j.retry_at is null or j.retry_at <= clock_timestamp())
    order by j.closed_at, j.id limit 1 for update skip locked;
  if not found then return null; end if;
  update cali_workspace.company_elimination_jobs j
    set lease_id = lease, lease_until = clock_timestamp() + interval '2 minutes',
      attempts = attempts + 1, last_error = null where j.id = job.id;
  return jsonb_build_object('jobId', job.id, 'leaseId', lease);
end;
$$;

create function cali_workspace.company_elimination_batch(p_job uuid, p_lease uuid)
returns table(bucket text, path text)
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from cali_workspace.company_elimination_jobs j
    where j.id = p_job and j.lease_id = p_lease and j.lease_until > clock_timestamp()
      and j.completed_at is null for update;
  if not found then raise exception using errcode = '40001', message = 'Reserva de eliminação desatualizada.'; end if;

  if exists (select 1 from cali_workspace.company_elimination_objects t join storage.objects o
    on o.bucket_id = t.bucket and o.name = t.path
    where t.job_id = p_job and (o.id is distinct from t.object_id or o.version is distinct from t.object_version))
  then raise exception using errcode = '40001', message = 'A versão de um arquivo diverge do manifesto.'; end if;

  update cali_workspace.company_elimination_objects t set removed_at = clock_timestamp()
    where t.job_id = p_job and t.removed_at is null
      and not exists (select 1 from storage.objects o where o.bucket_id = t.bucket and o.name = t.path);
  return query select t.bucket, t.path from cali_workspace.company_elimination_objects t
    where t.job_id = p_job and t.removed_at is null order by t.bucket, t.path limit 100;
end;
$$;

create function cali_workspace.release_company_elimination_lease(p_job uuid, p_lease uuid, p_failed boolean)
returns void
language sql security definer set search_path = ''
as $$
  update cali_workspace.company_elimination_jobs j
  set lease_id = null, lease_until = null,
    retry_at = case when p_failed then clock_timestamp() + interval '5 minutes' end,
    last_error = case when p_failed then 'worker_retry' end
  where j.id = p_job and j.lease_id = p_lease and j.completed_at is null;
$$;

revoke all on function cali_workspace.company_elimination_deadline(timestamptz),
  cali_workspace.company_elimination_scope(uuid), cali_workspace.elimination_scope_matches(jsonb, text, text),
  cali_workspace.fence_company_elimination_storage(), cali_workspace.fence_company_elimination_reopening(),
  cali_workspace.company_elimination_job_summary(uuid), cali_workspace.admin_preview_company_elimination(uuid),
  cali_workspace.admin_begin_company_elimination(uuid, text, boolean), cali_workspace.admin_read_company_elimination_job(uuid),
  cali_workspace.claim_company_elimination_job(uuid), cali_workspace.company_elimination_batch(uuid, uuid),
  cali_workspace.release_company_elimination_lease(uuid, uuid, boolean)
from public, anon, authenticated, service_role;

grant execute on function cali_workspace.admin_preview_company_elimination(uuid),
  cali_workspace.admin_begin_company_elimination(uuid, text, boolean), cali_workspace.admin_read_company_elimination_job(uuid)
to authenticated;
grant execute on function cali_workspace.claim_company_elimination_job(uuid), cali_workspace.company_elimination_batch(uuid, uuid),
  cali_workspace.release_company_elimination_lease(uuid, uuid, boolean) to service_role;
grant execute on function cali_workspace.company_elimination_deadline(timestamptz) to postgres;

revoke execute on function cali_workspace.admin_eliminate_company_data(uuid, text, integer) from public, anon, authenticated, service_role;
notify pgrst, 'reload schema';
commit;
