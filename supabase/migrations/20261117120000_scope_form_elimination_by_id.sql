begin;
set local lock_timeout = '5s';

-- An issued batch may still be removing objects through the Storage API.
lock table cali_workspace.company_elimination_jobs in share row exclusive mode;
lock table storage.objects in share row exclusive mode;
do $leases$
begin
  if exists (
    select 1 from cali_workspace.company_elimination_jobs
    where completed_at is null and lease_until > clock_timestamp()
  ) then
    raise exception using errcode = '55000',
      message = 'Aguarde a conclusão da reserva de eliminação antes de reconciliar os anexos de Forms.';
  end if;
end;
$leases$;

create or replace function cali_session_guard.elimination_form_links()
returns table(company_id uuid, form_id uuid, slug text)
language sql stable set search_path = '' as $$
  select f.company_id, f.id, f.slug from cali_workspace.forms f where f.company_id is not null
  union
  select c.id, t.form_id, t.form->>'slug'
  from cali_workspace.forms_trash t
  join cali_workspace.companies c on t.form->>'company_id' = c.id::text;
$$;

create or replace function cali_session_guard.elimination_form_object_scope(p_company uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'formIds', to_jsonb(array(
      select l.form_id from cali_session_guard.elimination_form_links() l
      group by l.form_id having bool_and(l.company_id = p_company)
      order by l.form_id
    )),
    'protectedFormIds', to_jsonb(array(
      select l.form_id from cali_session_guard.elimination_form_links() l
      group by l.form_id having bool_or(l.company_id = p_company) and not bool_and(l.company_id = p_company)
      order by l.form_id
    ))
  );
$$;

create or replace function cali_workspace.company_elimination_scope(p_company uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select cali_session_guard.company_elimination_scope(p_company)
    || cali_session_guard.elimination_proposal_object_scope(p_company)
    || jsonb_build_object('mapaDeliveryPrefixes', to_jsonb(cali_session_guard.elimination_mapa_responses(p_company)))
    || cali_session_guard.elimination_material_link_scope(p_company)
    || cali_session_guard.elimination_form_object_scope(p_company);
$$;

create or replace function cali_workspace.elimination_scope_matches(p_scope jsonb, p_bucket text, p_path text)
returns boolean language sql immutable set search_path = '' as $$
  select case
  when p_bucket = 'cali-forms' then
    coalesce(p_scope->'formIds' ? split_part(p_path, '/', 1), false)
    and not coalesce(p_scope->'protectedFormIds' ? split_part(p_path, '/', 1), false)
  when p_bucket = 'cali-mapa-delivery' then coalesce(p_scope->'mapaDeliveryPrefixes' ? split_part(p_path, '/', 1), false)
  when p_bucket = 'cali-proposals' then
    not coalesce(p_scope->'protectedProposalPaths' ? p_path, false)
    and (coalesce(p_scope->'proposalPaths' ? p_path, false)
      or coalesce(p_scope->'proposalPrefixes' ? (split_part(p_path, '/', 1) || '/' || split_part(p_path, '/', 2)), false))
  else cali_session_guard.elimination_scope_matches(p_scope, p_bucket, p_path) end;
$$;

-- Only incomplete manifests are reconciled. Completed legacy jobs require an
-- independent preflight report: their UUID mapping may already have been purged.
-- Never infer an object UUID from a slug or from a file-name coincidence.
do $legacy_manifests$
begin
  if exists (
    select 1 from cali_workspace.company_elimination_jobs j
    cross join lateral jsonb_array_elements_text(coalesce(j.scope->'formSlugs', '[]'::jsonb)) old_slug(value)
    where j.completed_at is null and not exists (
      select 1 from cali_session_guard.elimination_form_links() l
      where l.company_id = j.company_id and l.slug = old_slug.value
    ) and not (j.scope ? 'formIds')
  ) then
    raise exception using errcode = '55000',
      message = 'Reconcilie os IDs de Forms dos manifestos antigos antes de atualizar a eliminação.';
  end if;
end;
$legacy_manifests$;

update cali_workspace.company_elimination_jobs j
set scope = j.scope || cali_session_guard.elimination_form_object_scope(j.company_id)
where j.completed_at is null and j.scope is not null and not (j.scope ? 'formIds');

do $removed_manifests$
begin
  if exists (
    select 1 from cali_workspace.company_elimination_objects o
    join cali_workspace.company_elimination_jobs j on j.id = o.job_id
    where j.completed_at is null and o.bucket = 'cali-forms' and o.removed_at is not null
      and not cali_workspace.elimination_scope_matches(j.scope, o.bucket, o.path)
  ) then
    raise exception using errcode = '55000',
      message = 'Confira os anexos de Forms já removidos por manifesto legado.';
  end if;
end;
$removed_manifests$;

delete from cali_workspace.company_elimination_objects o
using cali_workspace.company_elimination_jobs j
where j.id = o.job_id and j.completed_at is null and o.bucket = 'cali-forms'
  and o.removed_at is null and not cali_workspace.elimination_scope_matches(j.scope, o.bucket, o.path);

insert into cali_workspace.company_elimination_objects(job_id, bucket, path, object_id, object_version)
select j.id, o.bucket_id, o.name, o.id, o.version
from cali_workspace.company_elimination_jobs j
join storage.objects o on o.bucket_id = 'cali-forms' and cali_workspace.elimination_scope_matches(j.scope, o.bucket_id, o.name)
where j.completed_at is null
on conflict on constraint company_elimination_objects_pkey do nothing;

-- The worker may not consume an unreconciled legacy manifest. Other material
-- reconciliation remains identical to the final material-scope wrapper.
create or replace function cali_workspace.company_elimination_batch(p_job uuid, p_lease uuid)
returns table(bucket text, path text) language plpgsql security definer set search_path = '' as $$
declare
  company uuid;
  scope_now jsonb;
begin
  perform cali_session_guard.lock_elimination_material_scope(true);
  select j.company_id into company from cali_workspace.company_elimination_jobs j
  where j.id = p_job and j.lease_id = p_lease and j.lease_until > clock_timestamp() and j.completed_at is null for update;
  if company is null then raise exception using errcode = '40001', message = 'Reserva de eliminação desatualizada.'; end if;
  if not exists (select 1 from cali_workspace.company_elimination_jobs j
    where j.id = p_job and jsonb_typeof(j.scope->'formIds') = 'array') then
    raise exception using errcode = '55000', message = 'Reconcilie os IDs de Forms do manifesto antes de emitir outro lote.';
  end if;
  scope_now := cali_workspace.company_elimination_scope(company);
  update cali_workspace.company_elimination_jobs j set scope = j.scope || jsonb_build_object(
    'proposalPaths', scope_now->'proposalPaths', 'proposalPrefixes', scope_now->'proposalPrefixes',
    'protectedProposalPaths', scope_now->'protectedProposalPaths', 'proposalLinks', scope_now->'proposalLinks',
    'mapaDeliveryPrefixes', scope_now->'mapaDeliveryPrefixes', 'mapaLinks', scope_now->'mapaLinks'
  ) where j.id = p_job;
  delete from cali_workspace.company_elimination_objects t
  where t.job_id = p_job and t.removed_at is null and t.bucket in ('cali-proposals','cali-mapa-delivery')
    and not cali_workspace.elimination_scope_matches(scope_now, t.bucket, t.path);
  insert into cali_workspace.company_elimination_objects(job_id,bucket,path,object_id,object_version)
  select p_job,o.bucket_id,o.name,o.id,o.version from storage.objects o
  where o.bucket_id in ('cali-proposals','cali-mapa-delivery') and cali_workspace.elimination_scope_matches(scope_now,o.bucket_id,o.name)
  on conflict on constraint company_elimination_objects_pkey do nothing;
  return query select b.bucket, b.path from cali_session_guard.company_elimination_batch(p_job, p_lease) b;
end;
$$;

-- Form identity and ownership cannot move out of an authorized manifest.
create or replace function cali_session_guard.fence_elimination_form_links()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  previous_row jsonb;
  next_row jsonb;
  row_form_id text;
  row_company_id text;
  row_data jsonb;
begin
  perform cali_session_guard.lock_elimination_material_scope(false);
  if tg_op <> 'INSERT' then previous_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then next_row := to_jsonb(new); end if;
  foreach row_data in array array[previous_row, next_row] loop
    if row_data is null then continue; end if;
    row_form_id := case when tg_table_name = 'forms' then row_data->>'id' else row_data->>'form_id' end;
    row_company_id := case when tg_table_name = 'forms' then row_data->>'company_id' else row_data->'form'->>'company_id' end;
    if tg_op = 'DELETE' and exists (
      select 1 from cali_workspace.company_elimination_jobs j
      where j.completed_at is null and j.lease_until > clock_timestamp()
        and j.lease_id::text = current_setting('cali.elimination_finalizing_lease', true)
        and (j.company_id::text = row_company_id or j.scope->'formIds' ? row_form_id)
    ) then continue; end if;
    if exists (
      select 1 from cali_workspace.company_elimination_jobs j
      where j.company_id::text = row_company_id
        or j.scope->'formIds' ? row_form_id or j.scope->'protectedFormIds' ? row_form_id
    ) then
      raise exception using errcode = '42501', message = 'Formulário indisponível durante a eliminação da empresa.';
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists fence_elimination_form_links on cali_workspace.forms;
create trigger fence_elimination_form_links
before insert or update of id, company_id, slug or delete on cali_workspace.forms
for each row execute function cali_session_guard.fence_elimination_form_links();

drop trigger if exists fence_elimination_form_links on cali_workspace.forms_trash;
create trigger fence_elimination_form_links
before insert or update of form_id, form or delete on cali_workspace.forms_trash
for each row execute function cali_session_guard.fence_elimination_form_links();


-- The normal soft-delete trigger must not recreate a full copy after the
-- finalizer has already purged the company's trash. Ordinary deletes still archive.
create or replace function cali_workspace.forms_trash_form()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from cali_workspace.company_elimination_jobs j
    where j.company_id = old.company_id and j.completed_at is null
      and j.lease_until > clock_timestamp()
      and j.lease_id::text = current_setting('cali.elimination_finalizing_lease', true)
  ) then return old; end if;
  insert into cali_workspace.forms_trash(kind, form_id, form_title, form, responses)
  values ('form', old.id, old.title, to_jsonb(old),
    coalesce((select jsonb_agg(to_jsonb(r) order by r.submitted_at)
      from cali_workspace.form_responses r where r.form_id = old.id), '[]'::jsonb));
  return old;
end;
$$;

-- Completed manifests retain UUID tombstones as well: neither stale public
-- upload clients nor retries may recreate purged attachments afterwards.
create or replace function cali_workspace.fence_company_elimination_storage()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  material boolean := new.bucket_id in ('cali-proposals','cali-mapa-delivery','cali-forms');
begin
  if new.bucket_id not in ('cali-workspace-private','workspace-assets','cali-forms','cali-profiles','cali-proposals','cali-mapa-delivery') then
    return new;
  end if;
  if material then perform cali_session_guard.lock_elimination_material_scope(false); end if;
  if exists (select 1 from cali_workspace.company_elimination_jobs j
    where (j.completed_at is null or material) and cali_workspace.elimination_scope_matches(j.scope,new.bucket_id,new.name))
    or exists (select 1 from cali_workspace.companies c
      where c.data_eliminated_at is not null and c.id::text = any(string_to_array(new.name,'/'))) then
    raise exception using errcode = '42501', message = 'Arquivo fora de um escopo ativo de guarda.';
  end if;
  return new;
end;
$$;

alter function cali_session_guard.elimination_form_links() owner to postgres;
alter function cali_session_guard.elimination_form_object_scope(uuid) owner to postgres;
-- Match the existing elimination wrappers: the migration role owns the job
-- tables in isolated restores, while hosted migrations normally run as postgres.
alter function cali_session_guard.fence_elimination_form_links() owner to current_user;
alter function cali_workspace.forms_trash_form() owner to current_user;
revoke all on function cali_session_guard.elimination_form_links(),
  cali_session_guard.elimination_form_object_scope(uuid), cali_session_guard.fence_elimination_form_links()
  from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
