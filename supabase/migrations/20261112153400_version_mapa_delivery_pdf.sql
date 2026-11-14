begin;
set local lock_timeout = '5s';

alter table public.mapa_respostas add column delivery_revision integer not null default 1;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('cali-mapa-delivery', 'cali-mapa-delivery', false, 8388608, array['application/pdf']);

create table cali_workspace.mapa_delivery_pdfs (
  response_id uuid not null references public.mapa_respostas(id) on delete cascade,
  revision integer not null check (revision > 0),
  pdf_path text not null unique,
  archived_at timestamptz not null default now(),
  primary key (response_id, revision)
);
alter table cali_workspace.mapa_delivery_pdfs enable row level security;
revoke all on cali_workspace.mapa_delivery_pdfs from public, anon, authenticated, service_role;

alter table cali_workspace.material_email_receipts
  add column material_version integer,
  add column official_pdf_path text;

create function cali_session_guard.keep_mapa_delivery_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  content_changed boolean;
begin
  new.delivery_revision := old.delivery_revision;
  content_changed := (to_jsonb(new) - array['status','relatorio_enviado_em','delivery_revision'])
    is distinct from (to_jsonb(old) - array['status','relatorio_enviado_em','delivery_revision']);
  if content_changed or (new.status = 'cancelado' and old.status <> 'cancelado') then
    if exists (select 1 from cali_workspace.material_email_receipts
      where kind = 'mapa' and entity_id = old.id and completed_at is null and rejected_at is null) then
      raise exception using errcode = '40001', message = 'Confirme a entrega pendente antes de editar a devolutiva.';
    end if;
  end if;
  if content_changed then new.delivery_revision := old.delivery_revision + 1; end if;
  return new;
end;
$$;
create trigger keep_mapa_delivery_revision before update on public.mapa_respostas
for each row execute function cali_session_guard.keep_mapa_delivery_revision();

create function cali_workspace.read_mapa_delivery_state(p_response_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
  worker boolean := coalesce(auth.role() = 'service_role', false);
begin
  if not worker and not (cali_workspace.workspace_private_access_v2() is true and cali_workspace.is_admin() is true) then
    raise exception using errcode = '42501', message = 'Acesso administrativo necessário.';
  end if;
  select jsonb_build_object('revision', r.delivery_revision, 'has_pdf', a.pdf_path is not null,
    'pdf_path', case when worker then a.pdf_path end)
  into result
  from public.mapa_respostas r left join cali_workspace.mapa_delivery_pdfs a
    on a.response_id = r.id and a.revision = r.delivery_revision
  where r.id = p_response_id and r.lgpd_aceite and r.status <> 'cancelado';
  if result is null then raise exception using errcode = '22023', message = 'Devolutiva indisponível.'; end if;
  return result;
end;
$$;

create function cali_session_guard.lock_mapa_delivery(p_response_id uuid, p_revision integer)
returns void language plpgsql set search_path = '' as $$
begin
  perform 1 from public.mapa_respostas
  where id = p_response_id and delivery_revision = p_revision and lgpd_aceite and status <> 'cancelado'
  for update;
  if not found or exists (select 1 from cali_workspace.partner_material_reviews
    where kind = 'mapa' and entity_id = p_response_id and status <> 'accepted') then
    raise exception using errcode = '40001', message = 'Atualize a devolutiva e conclua a revisão antes do envio.';
  end if;
end;
$$;

create function cali_workspace.register_mapa_delivery_pdf(p_response_id uuid, p_revision integer, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform cali_session_guard.lock_mapa_delivery(p_response_id, p_revision);
  if p_path is null or p_path !~ ('^' || p_response_id::text || '/' || p_revision::text || '/[0-9a-f]{64}\.pdf$')
    or not exists (select 1 from storage.objects where bucket_id = 'cali-mapa-delivery' and name = p_path) then
    raise exception using errcode = '22023', message = 'O PDF da revisão precisa ser arquivado.';
  end if;

  insert into cali_workspace.mapa_delivery_pdfs(response_id, revision, pdf_path)
  values(p_response_id, p_revision, p_path) on conflict (response_id, revision) do nothing;
  if not exists (select 1 from cali_workspace.mapa_delivery_pdfs
    where response_id = p_response_id and revision = p_revision and pdf_path = p_path) then
    raise exception using errcode = '40001', message = 'Já há um PDF oficial para esta revisão.';
  end if;
end;
$$;

create function cali_session_guard.mapa_delivery_links(p_response_id uuid default null)
returns table(response_id uuid, company_id uuid)
language sql stable set search_path = '' as $$
  select s.record_id, s.company_id from cali_session_guard.phase4_mapa_scope s
  where p_response_id is null or s.record_id = p_response_id
  union
  select r.entity_id, r.company_id from cali_workspace.partner_material_reviews r
  where r.kind = 'mapa' and (p_response_id is null or r.entity_id = p_response_id)
  union
  select r.entity_id, r.company_id from cali_workspace.material_email_receipts r
  where r.kind = 'mapa' and r.company_id is not null and (p_response_id is null or r.entity_id = p_response_id);
$$;

alter function cali_workspace.reserve_material_email(uuid,text,uuid,uuid,text,uuid,integer) set schema cali_session_guard;
alter function cali_workspace.complete_material_email(uuid,text,text[],text,integer) set schema cali_session_guard;

create function cali_workspace.reserve_material_email(
  p_request_id uuid, p_kind text, p_entity_id uuid, p_actor_id uuid, p_hash text, p_company_id uuid, p_version integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  job jsonb;
  path text;
  companies uuid[];
begin
  if p_kind = 'mapa' then
    perform cali_session_guard.lock_mapa_delivery(p_entity_id, p_version);
    select a.pdf_path into path from cali_workspace.mapa_delivery_pdfs a
    join storage.objects o on o.bucket_id = 'cali-mapa-delivery' and o.name = a.pdf_path
    where a.response_id = p_entity_id and a.revision = p_version;
    if path is null then
      raise exception using errcode = '40001', message = 'Arquive o PDF da revisão antes do envio.';
    end if;
    select array(select company_id from cali_session_guard.mapa_delivery_links(p_entity_id)) into companies;
    if exists (select 1 from cali_workspace.company_elimination_jobs where company_id = any(companies)) then
      raise exception using errcode = '42501', message = 'Devolutiva indisponível.';
    end if;
    p_company_id := case when cardinality(companies) = 1 then companies[1] end;
  end if;

  job := cali_session_guard.reserve_material_email(p_request_id,p_kind,p_entity_id,p_actor_id,p_hash,p_company_id,p_version);
  if p_kind = 'mapa' then
    update cali_workspace.material_email_receipts set material_version = p_version, official_pdf_path = path
    where id = (job->>'id')::uuid and
      (material_version is null or (material_version, official_pdf_path) = (p_version, path));
    if not found then raise exception using errcode = '40001', message = 'A revisão do recibo mudou.'; end if;
  end if;
  return job;
end;
$$;

create function cali_workspace.complete_material_email(
  p_job_id uuid, p_provider_id text, p_recipients text[], p_pdf_path text, p_version integer
) returns void language plpgsql security definer set search_path = '' as $$
declare
  job cali_workspace.material_email_receipts%rowtype;
  recipient text;
begin
  select * into job from cali_workspace.material_email_receipts where id = p_job_id;
  if job.kind = 'mapa' then
    select lower(btrim(c_email)) into recipient from public.mapa_respostas where id = job.entity_id;
    if recipient is null or p_recipients is distinct from array[recipient]
      or job.material_version is distinct from p_version or job.official_pdf_path is distinct from p_pdf_path then
      raise exception using errcode = '40001', message = 'A revisão ou o destinatário do recibo mudou.';
    end if;
  end if;
  perform cali_session_guard.complete_material_email(p_job_id,p_provider_id,p_recipients,p_pdf_path,p_version);
end;
$$;

-- A eliminação inclui todas as revisões exclusivas do cliente e preserva respostas compartilhadas.
create function cali_session_guard.elimination_mapa_responses(p_company uuid)
returns uuid[] language sql stable set search_path = '' as $$
  select array(
    select l.response_id from cali_session_guard.mapa_delivery_links() l
    group by l.response_id having bool_and(l.company_id = p_company)
  );
$$;

create or replace function cali_workspace.company_elimination_scope(p_company uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select cali_session_guard.company_elimination_scope(p_company)
    || cali_session_guard.elimination_proposal_object_scope(p_company)
    || jsonb_build_object('mapaDeliveryPrefixes', to_jsonb(cali_session_guard.elimination_mapa_responses(p_company)));
$$;

create or replace function cali_workspace.elimination_scope_matches(p_scope jsonb, p_bucket text, p_path text)
returns boolean language sql immutable set search_path = '' as $$
  select case
  when p_bucket = 'cali-mapa-delivery' then coalesce(p_scope->'mapaDeliveryPrefixes' ? split_part(p_path, '/', 1), false)
  when p_bucket = 'cali-proposals' then
    not coalesce(p_scope->'protectedProposalPaths' ? p_path, false)
    and (coalesce(p_scope->'proposalPaths' ? p_path, false)
      or coalesce(p_scope->'proposalPrefixes' ? (split_part(p_path, '/', 1) || '/' || split_part(p_path, '/', 2)), false))
  else cali_session_guard.elimination_scope_matches(p_scope, p_bucket, p_path) end;
$$;

do $retention$
declare
  fence text := pg_get_functiondef('cali_workspace.fence_company_elimination_storage()'::regprocedure);
  purge text := pg_get_functiondef('cali_workspace.purge_company_elimination_projections(uuid)'::regprocedure);
  buckets text := $anchor$('cali-workspace-private','workspace-assets','cali-forms','cali-profiles','cali-proposals')$anchor$;
  first_position integer := strpos(purge, '  select array(select s.record_id from cali_session_guard.phase4_mapa_scope s');
  last_position integer := strpos(purge, '  delete from cali_session_guard.phase4_mapa_email where company_id = p_company;');
begin
  if strpos(fence, buckets) = 0 or first_position = 0 or last_position <= first_position then
    raise exception 'O expurgo do Mapa diverge do catálogo reconciliado.';
  end if;
  execute replace(fence,buckets,$replacement$('cali-workspace-private','workspace-assets','cali-forms','cali-profiles','cali-proposals','cali-mapa-delivery')$replacement$);
  execute substr(purge,1,first_position-1) || $replacement$
  mapa_ids := cali_session_guard.elimination_mapa_responses(p_company);
  delete from cali_workspace.material_email_receipts where kind = 'mapa' and entity_id = any(mapa_ids);
$replacement$ || substr(purge,last_position);
end;
$retention$;

lock table storage.objects in share row exclusive mode;
update cali_workspace.company_elimination_jobs j
set scope = j.scope || jsonb_build_object('mapaDeliveryPrefixes', to_jsonb(cali_session_guard.elimination_mapa_responses(j.company_id)))
where j.completed_at is null and j.scope is not null;
insert into cali_workspace.company_elimination_objects(job_id,bucket,path,object_id,object_version)
select j.id, o.bucket_id, o.name, o.id, o.version
from cali_workspace.company_elimination_jobs j
join storage.objects o on o.bucket_id = 'cali-mapa-delivery'
  and cali_workspace.elimination_scope_matches(j.scope, o.bucket_id, o.name)
where j.completed_at is null
on conflict (job_id,bucket,path) do nothing;

alter table cali_workspace.mapa_delivery_pdfs owner to postgres;
alter function cali_session_guard.keep_mapa_delivery_revision() owner to postgres;
alter function cali_session_guard.lock_mapa_delivery(uuid,integer) owner to postgres;
alter function cali_session_guard.mapa_delivery_links(uuid) owner to postgres;
alter function cali_session_guard.elimination_mapa_responses(uuid) owner to postgres;
alter function cali_workspace.register_mapa_delivery_pdf(uuid,integer,text) owner to postgres;
alter function cali_workspace.read_mapa_delivery_state(uuid) owner to postgres;
alter function cali_workspace.reserve_material_email(uuid,text,uuid,uuid,text,uuid,integer) owner to postgres;
alter function cali_workspace.complete_material_email(uuid,text,text[],text,integer) owner to postgres;

revoke all on function cali_session_guard.keep_mapa_delivery_revision(),
  cali_session_guard.lock_mapa_delivery(uuid,integer),
  cali_session_guard.mapa_delivery_links(uuid),
  cali_session_guard.elimination_mapa_responses(uuid),
  cali_session_guard.reserve_material_email(uuid,text,uuid,uuid,text,uuid,integer),
  cali_session_guard.complete_material_email(uuid,text,text[],text,integer),
  cali_workspace.register_mapa_delivery_pdf(uuid,integer,text),
  cali_workspace.read_mapa_delivery_state(uuid),
  cali_workspace.reserve_material_email(uuid,text,uuid,uuid,text,uuid,integer),
  cali_workspace.complete_material_email(uuid,text,text[],text,integer)
from public, anon, authenticated, service_role;
grant execute on function cali_workspace.read_mapa_delivery_state(uuid) to authenticated, service_role;
grant execute on function cali_workspace.register_mapa_delivery_pdf(uuid,integer,text),
  cali_workspace.reserve_material_email(uuid,text,uuid,uuid,text,uuid,integer),
  cali_workspace.complete_material_email(uuid,text,text[],text,integer) to service_role;

notify pgrst, 'reload schema';
commit;
