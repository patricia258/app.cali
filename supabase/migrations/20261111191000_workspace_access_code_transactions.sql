begin;

create function cali_workspace.reserve_workspace_access_code(
  p_email text,
  p_code_hash text,
  p_requested_ip text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
  issued_at timestamptz;
  code_id uuid;
begin
  if normalized_email is null or normalized_email = ''
     or p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Solicitação inválida.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 20261111191000));
  issued_at := clock_timestamp();

  if exists (
    select 1 from cali_workspace.workspace_access_codes c
    where lower(c.email) = normalized_email and c.created_at >= issued_at - interval '2 minutes'
  ) then
    return null;
  end if;

  update cali_workspace.workspace_access_codes
  set used_at = issued_at
  where lower(email) = normalized_email and used_at is null;

  insert into cali_workspace.workspace_access_codes (email, code_hash, expires_at, created_at, requested_ip)
  values (normalized_email, p_code_hash, issued_at + interval '10 minutes', issued_at, p_requested_ip)
  returning id into code_id;

  return code_id;
end;
$$;

create function cali_workspace.consume_workspace_access_code(p_email text, p_code_hash text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
  checked_at timestamptz;
  latest cali_workspace.workspace_access_codes%rowtype;
  matches boolean;
begin
  if normalized_email is null or normalized_email = ''
     or p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 20261111191000));
  select c.* into latest
  from cali_workspace.workspace_access_codes c
  where lower(c.email) = normalized_email and c.used_at is null
  order by c.created_at desc, c.id desc
  limit 1 for update;

  checked_at := clock_timestamp();
  if not found or latest.expires_at <= checked_at or latest.attempts >= 5 then
    return false;
  end if;

  matches := false;
  if latest.code_hash ~ '^[0-9a-f]{64}$' then
    matches := bit_count(('x' || latest.code_hash)::bit(256) # ('x' || p_code_hash)::bit(256)) = 0;
  end if;
  update cali_workspace.workspace_access_codes
  set attempts = attempts + 1, used_at = case when matches then checked_at else null end
  where id = latest.id;

  return matches;
end;
$$;

revoke all on function cali_workspace.reserve_workspace_access_code(text, text, text),
  cali_workspace.consume_workspace_access_code(text, text) from public, anon, authenticated;
grant execute on function cali_workspace.reserve_workspace_access_code(text, text, text),
  cali_workspace.consume_workspace_access_code(text, text) to service_role;

notify pgrst, 'reload schema';
commit;
