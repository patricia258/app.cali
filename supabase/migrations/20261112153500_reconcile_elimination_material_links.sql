begin;
set local lock_timeout = '5s';

-- Workers with a granted batch can still be deleting objects outside the database.
lock table cali_workspace.company_elimination_jobs in share row exclusive mode;
do $$
begin
  if exists (select 1 from cali_workspace.company_elimination_jobs where completed_at is null and lease_until > clock_timestamp()) then
    raise exception using errcode = '55000', message = 'Aguarde a conclusão da reserva de eliminação antes de atualizar o executor.';
  end if;
end;
$$;

create function cali_session_guard.elimination_commercial_links()
returns table(company_id uuid, submission_id uuid)
language sql stable set search_path = '' as $$
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
  where r.kind = 'proposal' and r.company_id is not null;
$$;

create or replace function cali_session_guard.elimination_commercial_submissions(p_company uuid)
returns uuid[] language sql stable set search_path = '' as $$
  select array(select l.submission_id from cali_session_guard.elimination_commercial_links() l
    group by l.submission_id having bool_and(l.company_id = p_company));
$$;

create function cali_session_guard.elimination_material_link_scope(p_company uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'proposalLinks', to_jsonb(array(select l.submission_id from cali_session_guard.elimination_commercial_links() l where l.company_id = p_company)),
    'mapaLinks', to_jsonb(array(select l.response_id from cali_session_guard.mapa_delivery_links() l where l.company_id = p_company))
  );
$$;

create or replace function cali_workspace.company_elimination_scope(p_company uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select cali_session_guard.company_elimination_scope(p_company)
    || cali_session_guard.elimination_proposal_object_scope(p_company)
    || jsonb_build_object('mapaDeliveryPrefixes', to_jsonb(cali_session_guard.elimination_mapa_responses(p_company)))
    || cali_session_guard.elimination_material_link_scope(p_company);
$$;

create function cali_session_guard.lock_elimination_material_scope(p_exclusive boolean)
returns void language plpgsql set search_path = '' as $$
declare
  lock_key constant bigint := hashtextextended('cali.company-elimination.material-scope', 0);
  locked boolean;
begin
  locked := case when p_exclusive then pg_try_advisory_xact_lock(lock_key) else pg_try_advisory_xact_lock_shared(lock_key) end;
  if not locked then raise exception using errcode = '40001', message = 'A guarda de materiais mudou. Repita a operação.'; end if;
end;
$$;

create or replace function cali_workspace.fence_company_elimination_storage()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  material boolean := new.bucket_id in ('cali-proposals','cali-mapa-delivery');
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

create function cali_session_guard.assert_elimination_material_writable(p_row jsonb, p_table text)
returns void language plpgsql set search_path = '' as $$
declare
  company uuid := (p_row->>'company_id')::uuid;
  proposal uuid;
  submission uuid := (p_row->>'submission_id')::uuid;
  mapa uuid;
  path text := p_row->>'pdf_path';
begin
  case p_table
  when 'phase4_commercial_scope' then proposal := (p_row->>'proposal_id')::uuid;
  when 'phase4_mapa_scope' then mapa := (p_row->>'record_id')::uuid;
  when 'mapa_respostas' then mapa := (p_row->>'id')::uuid;
  when 'cali_submissions' then submission := (p_row->>'id')::uuid;
  when 'cali_proposals' then null;
  else
    case p_row->>'kind'
    when 'mapa' then mapa := (p_row->>'entity_id')::uuid;
    when 'proposal' then proposal := (p_row->>'entity_id')::uuid;
    else null;
    end case;
  end case;
  if proposal is not null then
    select p.submission_id into proposal from public.cali_proposals p where p.id = proposal;
  end if;
  if exists (select 1 from cali_workspace.company_elimination_jobs j where j.company_id = company
    or (j.completed_at is null and (
      j.scope->'proposalLinks' ? submission::text or j.scope->'proposalLinks' ? proposal::text
      or j.scope->'mapaLinks' ? mapa::text or j.scope->'mapaDeliveryPrefixes' ? mapa::text
      or cali_workspace.elimination_scope_matches(j.scope, 'cali-proposals', path)
      or j.scope->'protectedProposalPaths' ? path
    ))) then
    raise exception using errcode = '42501', message = 'Material indisponível durante a eliminação da empresa.';
  end if;
end;
$$;

create function cali_session_guard.fence_elimination_material_links()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  link_columns text[] := array['company_id','submission_id','proposal_id','entity_id','kind','record_id','pdf_path','id'];
  old_row jsonb;
  new_row jsonb;
begin
  if tg_op <> 'INSERT' then old_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_row := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and not exists (
    select 1 from unnest(link_columns) k where old_row->k is distinct from new_row->k
  ) and not (old_row->>'rejected_at' is not null and new_row->>'rejected_at' is null) then
    return new;
  end if;
  perform cali_session_guard.lock_elimination_material_scope(false);
  if tg_op = 'DELETE' and exists (
    select 1 from cali_workspace.company_elimination_jobs j where j.completed_at is null
      and j.lease_until > clock_timestamp() and j.lease_id::text = current_setting('cali.elimination_finalizing_lease', true)
  ) then return old; end if;
  if old_row is not null then perform cali_session_guard.assert_elimination_material_writable(old_row, tg_table_name); end if;
  if new_row is not null then perform cali_session_guard.assert_elimination_material_writable(new_row, tg_table_name); end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger fence_elimination_material_links before insert or update of company_id, submission_id, proposal_id or delete
on cali_session_guard.phase4_commercial_scope for each row execute function cali_session_guard.fence_elimination_material_links();
create trigger fence_elimination_material_links before insert or update of company_id, record_id or delete
on cali_session_guard.phase4_mapa_scope for each row execute function cali_session_guard.fence_elimination_material_links();
create trigger fence_elimination_material_links before insert or update of company_id, entity_id, kind or delete
on cali_workspace.partner_material_reviews for each row execute function cali_session_guard.fence_elimination_material_links();
create trigger fence_elimination_material_links before insert or update of company_id, entity_id, kind, rejected_at or delete
on cali_workspace.material_email_receipts for each row execute function cali_session_guard.fence_elimination_material_links();
create trigger fence_elimination_material_links before insert or update of id, submission_id, pdf_path or delete
on public.cali_proposals for each row execute function cali_session_guard.fence_elimination_material_links();
create trigger fence_elimination_material_links before update of id or delete
on public.cali_submissions for each row execute function cali_session_guard.fence_elimination_material_links();
create trigger fence_elimination_material_links before update of id or delete
on public.mapa_respostas for each row execute function cali_session_guard.fence_elimination_material_links();

alter function cali_workspace.admin_begin_company_elimination(uuid, text, boolean) set schema cali_session_guard;
alter function cali_workspace.company_elimination_batch(uuid, uuid) set schema cali_session_guard;
alter function cali_workspace.finalize_company_elimination_job(uuid, uuid) set schema cali_session_guard;

create function cali_workspace.admin_begin_company_elimination(p_company uuid, p_confirm_name text, p_copies_reviewed boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
begin
  perform cali_workspace.require_company_admin();
  perform cali_session_guard.lock_elimination_material_scope(true);
  result := cali_session_guard.admin_begin_company_elimination(p_company, p_confirm_name, p_copies_reviewed);
  if exists (
    select 1 from cali_workspace.material_email_receipts r
    left join public.cali_proposals p on r.kind = 'proposal' and p.id = r.entity_id
    join cali_workspace.company_elimination_jobs j on j.id = (result->>'jobId')::uuid and j.completed_at is null
    where r.completed_at is null and r.rejected_at is null
      and (r.company_id = p_company or j.scope->'proposalLinks' ? p.submission_id::text
        or (r.kind = 'mapa' and j.scope->'mapaLinks' ? r.entity_id::text))
  ) then
    raise exception using errcode = '55000', message = 'Confira os envios pendentes antes de iniciar a eliminação.';
  end if;
  return result;
end;
$$;

create function cali_workspace.company_elimination_batch(p_job uuid, p_lease uuid)
returns table(bucket text, path text) language plpgsql security definer set search_path = '' as $$
declare
  company uuid;
  scope_now jsonb;
begin
  perform cali_session_guard.lock_elimination_material_scope(true);
  select j.company_id into company from cali_workspace.company_elimination_jobs j
  where j.id = p_job and j.lease_id = p_lease and j.lease_until > clock_timestamp() and j.completed_at is null for update;
  if company is null then raise exception using errcode = '40001', message = 'Reserva de eliminação desatualizada.'; end if;
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

create function cali_workspace.finalize_company_elimination_job(p_job uuid, p_lease uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
begin
  perform cali_session_guard.lock_elimination_material_scope(true);
  if exists (select 1 from cali_workspace.company_elimination_jobs j where j.id = p_job and j.completed_at is not null) then
    return cali_session_guard.finalize_company_elimination_job(p_job, p_lease);
  end if;
  if exists (select 1 from cali_workspace.company_elimination_batch(p_job,p_lease)) then
    raise exception using errcode = '55000', message = 'Ainda há arquivos por reconciliar.';
  end if;
  perform set_config('cali.elimination_finalizing_lease', p_lease::text, true);
  result := cali_session_guard.finalize_company_elimination_job(p_job, p_lease);
  perform set_config('cali.elimination_finalizing_lease', '', true);
  return result;
end;
$$;

update cali_workspace.company_elimination_jobs j
set scope = j.scope || cali_session_guard.elimination_material_link_scope(j.company_id)
where j.completed_at is null and j.scope is not null;

alter function cali_session_guard.elimination_commercial_links() owner to postgres;
alter function cali_session_guard.elimination_material_link_scope(uuid) owner to postgres;

revoke all on function cali_session_guard.elimination_commercial_links(),
  cali_session_guard.elimination_material_link_scope(uuid), cali_session_guard.lock_elimination_material_scope(boolean),
  cali_session_guard.assert_elimination_material_writable(jsonb,text), cali_session_guard.fence_elimination_material_links(),
  cali_session_guard.admin_begin_company_elimination(uuid,text,boolean), cali_session_guard.company_elimination_batch(uuid,uuid),
  cali_session_guard.finalize_company_elimination_job(uuid,uuid),
  cali_workspace.admin_begin_company_elimination(uuid,text,boolean), cali_workspace.company_elimination_batch(uuid,uuid),
  cali_workspace.finalize_company_elimination_job(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function cali_workspace.admin_begin_company_elimination(uuid,text,boolean) to authenticated;
grant execute on function cali_workspace.company_elimination_batch(uuid,uuid),
  cali_workspace.finalize_company_elimination_job(uuid,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
