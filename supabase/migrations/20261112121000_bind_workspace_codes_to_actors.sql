begin;

alter table cali_workspace.workspace_access_codes
  add column actor_user_id uuid references auth.users(id) on delete cascade,
  add column delivered_at timestamptz;

create index workspace_access_codes_actor_idx
  on cali_workspace.workspace_access_codes(actor_user_id) where actor_user_id is not null;

create function cali_workspace.workspace_auth_identity_v2(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select (array_agg(u.id))[1]
  from auth.users u
  where lower(btrim(u.email)) = lower(btrim(p_email)) and u.deleted_at is null
  having count(*) = 1;
$$;

create function cali_workspace.reserve_workspace_access_code_v2(
  p_email text, p_code_hash text, p_requested_ip text, p_actor_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(btrim(p_email));
  issued_at timestamptz;
  code_id uuid;
begin
  if normalized_email is null or length(normalized_email) not between 3 and 320
     or p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' or p_actor_id is null then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 20261111191000));
  issued_at := clock_timestamp();
  if p_actor_id is distinct from cali_workspace.workspace_auth_identity_v2(normalized_email)
     or cali_workspace.workspace_login_eligible_v2(p_actor_id) is not true
     or exists (
       select 1 from cali_workspace.workspace_access_codes c
       where lower(c.email) = normalized_email and c.created_at >= issued_at - interval '2 minutes'
     ) then
    return null;
  end if;

  update cali_workspace.workspace_access_codes set used_at = issued_at
  where lower(email) = normalized_email and used_at is null;

  insert into cali_workspace.workspace_access_codes
    (email, code_hash, expires_at, created_at, requested_ip, actor_user_id)
  values
    (normalized_email, p_code_hash, issued_at + interval '10 minutes', issued_at, left(p_requested_ip, 96), p_actor_id)
  returning id into code_id;
  return code_id;
end;
$$;

create function cali_workspace.confirm_workspace_access_code_delivery_v2(p_code_id uuid, p_actor_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  with confirmed as (
    update cali_workspace.workspace_access_codes
    set delivered_at = coalesce(delivered_at, clock_timestamp())
    where id = p_code_id and actor_user_id = p_actor_id and used_at is null
      and expires_at > clock_timestamp()
    returning id
  ) select exists(select 1 from confirmed);
$$;

create function cali_workspace.consume_workspace_access_code_v2(p_email text, p_code_hash text, p_actor_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(btrim(p_email));
  latest cali_workspace.workspace_access_codes%rowtype;
  proof_id uuid;
begin
  if normalized_email is null or length(normalized_email) not between 3 and 320
     or p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' or p_actor_id is null then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 20261111191000));
  select c.* into latest from cali_workspace.workspace_access_codes c
  where lower(c.email) = normalized_email and c.used_at is null
  order by c.created_at desc, c.id desc limit 1 for update;

  if not found or latest.actor_user_id is distinct from p_actor_id or latest.delivered_at is null
     or latest.expires_at <= clock_timestamp() or latest.attempts >= 5
     or p_actor_id is distinct from cali_workspace.workspace_auth_identity_v2(normalized_email) then
    return null;
  end if;

  update cali_workspace.workspace_access_codes set attempts = attempts + 1 where id = latest.id;
  if latest.code_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  if bit_count(('x' || latest.code_hash)::bit(256) # ('x' || p_code_hash)::bit(256)) <> 0 then
    return null;
  end if;

  proof_id := cali_session_guard.authorize_code(p_actor_id, latest.created_at);
  update cali_workspace.workspace_access_codes set used_at = clock_timestamp() where id = latest.id;
  return proof_id;
end;
$$;

revoke all on function cali_workspace.workspace_auth_identity_v2(text),
  cali_workspace.reserve_workspace_access_code_v2(text,text,text,uuid),
  cali_workspace.confirm_workspace_access_code_delivery_v2(uuid,uuid),
  cali_workspace.consume_workspace_access_code_v2(text,text,uuid) from public, anon, authenticated;
grant execute on function cali_workspace.workspace_auth_identity_v2(text),
  cali_workspace.reserve_workspace_access_code_v2(text,text,text,uuid),
  cali_workspace.confirm_workspace_access_code_delivery_v2(uuid,uuid),
  cali_workspace.consume_workspace_access_code_v2(text,text,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
