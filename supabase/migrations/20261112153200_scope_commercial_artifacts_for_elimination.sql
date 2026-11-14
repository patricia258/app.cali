begin;

-- A submissão comercial representa o cliente e reúne todas as versões da proposta.
create function cali_session_guard.elimination_commercial_submissions(p_company uuid)
returns uuid[]
language sql stable set search_path = ''
as $$
  with links as (
    select s.company_id, s.submission_id from cali_session_guard.phase4_commercial_scope s
    union
    select s.company_id, p.submission_id
    from cali_session_guard.phase4_commercial_scope s join public.cali_proposals p on p.id = s.proposal_id
    union
    select r.company_id, p.submission_id
    from cali_workspace.partner_material_reviews r join public.cali_proposals p on p.id = r.entity_id
    where r.kind = 'proposal'
    union
    select r.company_id, p.submission_id
    from cali_workspace.material_email_receipts r join public.cali_proposals p on p.id = r.entity_id
    where r.kind = 'proposal' and r.company_id is not null
  )
  select array(
    select l.submission_id from links l group by l.submission_id
    having bool_and(l.company_id = p_company)
  );
$$;

create function cali_session_guard.elimination_proposal_object_scope(p_company uuid)
returns jsonb
language sql stable set search_path = ''
as $$
  with owned as materialized (
    select p.id, p.submission_id, nullif(btrim(p.pdf_path), '') as path
    from public.cali_proposals p
    where p.submission_id = any(cali_session_guard.elimination_commercial_submissions(p_company))
  ), protected as (
    select distinct p.pdf_path
    from public.cali_proposals p
    where p.pdf_path is not null and not exists (select 1 from owned o where o.id = p.id)
      and exists (select 1 from owned o where p.pdf_path = o.path or
        (split_part(p.pdf_path, '/', 1) = o.submission_id::text and split_part(p.pdf_path, '/', 2) = o.id::text))
  )
  select jsonb_build_object(
    'proposalPaths', to_jsonb(array(select distinct o.path from owned o where o.path is not null)),
    'proposalPrefixes', to_jsonb(array(select o.submission_id::text || '/' || o.id::text from owned o)),
    'protectedProposalPaths', to_jsonb(array(select p.pdf_path from protected p))
  );
$$;

alter function cali_workspace.company_elimination_scope(uuid) set schema cali_session_guard;
alter function cali_workspace.elimination_scope_matches(jsonb, text, text) set schema cali_session_guard;

create function cali_workspace.company_elimination_scope(p_company uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select cali_session_guard.company_elimination_scope(p_company)
    || cali_session_guard.elimination_proposal_object_scope(p_company);
$$;

create function cali_workspace.elimination_scope_matches(p_scope jsonb, p_bucket text, p_path text)
returns boolean
language sql immutable set search_path = ''
as $$
  select case when p_bucket = 'cali-proposals' then
    not coalesce(p_scope->'protectedProposalPaths' ? p_path, false)
    and (coalesce(p_scope->'proposalPaths' ? p_path, false)
      or coalesce(p_scope->'proposalPrefixes' ? (split_part(p_path, '/', 1) || '/' || split_part(p_path, '/', 2)), false))
  else cali_session_guard.elimination_scope_matches(p_scope, p_bucket, p_path) end;
$$;

alter function cali_workspace.company_elimination_scope(uuid) owner to postgres;
alter function cali_workspace.elimination_scope_matches(jsonb, text, text) owner to postgres;
alter function cali_session_guard.company_elimination_scope(uuid) owner to postgres;
alter function cali_session_guard.elimination_scope_matches(jsonb, text, text) owner to postgres;
alter function cali_session_guard.elimination_commercial_submissions(uuid) owner to postgres;
alter function cali_session_guard.elimination_proposal_object_scope(uuid) owner to postgres;
revoke all on function cali_session_guard.elimination_commercial_submissions(uuid),
  cali_session_guard.elimination_proposal_object_scope(uuid),
  cali_session_guard.company_elimination_scope(uuid),
  cali_session_guard.elimination_scope_matches(jsonb, text, text),
  cali_workspace.company_elimination_scope(uuid),
  cali_workspace.elimination_scope_matches(jsonb, text, text)
from public, anon, authenticated, service_role;

-- Reutiliza o inventário no expurgo relacional e preserva o mesmo vínculo no manifesto.
do $commercial$
declare
  definition text := pg_get_functiondef('cali_workspace.purge_company_elimination_projections(uuid)'::regprocedure);
  first_anchor text := '  select array(select distinct s.proposal_id from cali_session_guard.phase4_commercial_scope s';
  last_anchor text := '  delete from cali_session_guard.phase4_commercial_email where proposal_id = any(proposal_ids);';
  first_position integer := strpos(definition, first_anchor);
  last_position integer := strpos(definition, last_anchor);
begin
  if first_position = 0 or last_position <= first_position then
    raise exception 'O expurgo comercial diverge do catálogo reconciliado.';
  end if;
  definition := substr(definition,1,first_position-1) || $replacement$
  submission_ids := cali_session_guard.elimination_commercial_submissions(p_company);
  select array(select p.id from public.cali_proposals p where p.submission_id = any(submission_ids)) into proposal_ids;
  delete from cali_workspace.material_email_receipts where kind = 'proposal' and entity_id = any(proposal_ids);
$replacement$ || substr(definition,last_position);
  execute definition;
end;
$commercial$;

do $fence$
declare
  definition text := pg_get_functiondef('cali_workspace.fence_company_elimination_storage()'::regprocedure);
  original text := $anchor$('cali-workspace-private','workspace-assets','cali-forms','cali-profiles')$anchor$;
begin
  if strpos(definition, original) = 0 then
    raise exception 'A guarda de Storage diverge do catálogo reconciliado.';
  end if;
  execute replace(definition,original,$replacement$('cali-workspace-private','workspace-assets','cali-forms','cali-profiles','cali-proposals')$replacement$);
end;
$fence$;

-- Amplia somente operações pendentes. Recibos concluídos continuam históricos.
lock table storage.objects in share row exclusive mode;
update cali_workspace.company_elimination_jobs j
set scope = j.scope || cali_session_guard.elimination_proposal_object_scope(j.company_id)
where j.completed_at is null and j.scope is not null;

insert into cali_workspace.company_elimination_objects(job_id,bucket,path,object_id,object_version)
select j.id, o.bucket_id, o.name, o.id, o.version
from cali_workspace.company_elimination_jobs j
join storage.objects o on o.bucket_id = 'cali-proposals'
  and cali_workspace.elimination_scope_matches(j.scope, o.bucket_id, o.name)
where j.completed_at is null
on conflict (job_id,bucket,path) do nothing;

notify pgrst, 'reload schema';
commit;
