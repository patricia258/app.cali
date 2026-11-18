begin;

create table cali_workspace.google_oauth_attempts (
  nonce uuid primary key,
  user_id uuid not null references cali_workspace.profiles(id) on delete cascade,
  session_id uuid not null,
  company_id uuid references cali_workspace.companies(id) on delete cascade,
  purpose text not null check (purpose in ('calendar', 'drive')),
  redirect_uri text not null,
  verifier text not null,
  expires_at timestamptz not null,
  code_fingerprint bytea,
  claimed_at timestamptz,
  receipt jsonb
);
create index google_oauth_attempts_expires_idx on cali_workspace.google_oauth_attempts(expires_at);

create table cali_workspace.google_operation_locks (
  operation_key text primary key,
  lease_id uuid not null,
  leased_until timestamptz not null
);

alter table cali_workspace.google_oauth_attempts enable row level security;
alter table cali_workspace.google_operation_locks enable row level security;
revoke all on cali_workspace.google_oauth_attempts, cali_workspace.google_operation_locks from public, anon, authenticated, service_role;
grant select, insert, update, delete on cali_workspace.google_oauth_attempts to service_role;

alter table cali_workspace.events
  add column if not exists google_connection_id uuid references cali_workspace.calendar_connections(id) on delete set null,
  add column if not exists google_account_id text,
  add column if not exists google_account_email text;

alter table cali_workspace.file_sync_jobs add column if not exists source_version text;
create unique index file_sync_jobs_connection_version_idx on cali_workspace.file_sync_jobs(connection_id, file_id, source_version)
  where source_version is not null;

create table cali_workspace.google_drive_folders (
  connection_id uuid not null references cali_workspace.drive_connections(id) on delete cascade,
  folder_key text not null,
  external_id text not null,
  primary key (connection_id, folder_key)
);
alter table cali_workspace.google_drive_folders enable row level security;
revoke all on cali_workspace.google_drive_folders from public, anon, authenticated, service_role;
grant select, insert, update, delete on cali_workspace.google_drive_folders to service_role;

create function cali_workspace.claim_google_oauth(
  p_nonce uuid, p_user uuid, p_session uuid, p_company uuid,
  p_purpose text, p_redirect text, p_code text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  attempt cali_workspace.google_oauth_attempts%rowtype;
  fingerprint bytea := sha256(convert_to(p_code, 'UTF8'));
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'OAuth indisponível.';
  end if;
  select a.* into attempt from cali_workspace.google_oauth_attempts a
  where a.nonce = p_nonce and a.user_id = p_user and a.session_id = p_session
    and a.company_id is not distinct from p_company and a.purpose = p_purpose
    and a.redirect_uri = p_redirect and a.expires_at > statement_timestamp()
  for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if attempt.receipt is not null and attempt.code_fingerprint = fingerprint then
    return jsonb_build_object('status', 'complete', 'receipt', attempt.receipt);
  end if;
  if attempt.claimed_at is not null then
    return jsonb_build_object('status', 'claimed');
  end if;
  update cali_workspace.google_oauth_attempts set claimed_at = statement_timestamp(),
    code_fingerprint = fingerprint where nonce = p_nonce;
  return jsonb_build_object('status', 'ready', 'verifier', attempt.verifier);
end $$;

create function cali_workspace.lease_google_operation(p_key text, p_lease uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Integração indisponível.';
  end if;
  if p_lease is null or p_key !~ '^(calendar|drive|oauth):[a-f0-9-]{36}$' then return false; end if;
  insert into cali_workspace.google_operation_locks (operation_key, lease_id, leased_until)
  values (p_key, p_lease, statement_timestamp() + interval '2 minutes')
  on conflict (operation_key) do update
    set lease_id = excluded.lease_id, leased_until = excluded.leased_until
    where google_operation_locks.leased_until <= statement_timestamp()
      or google_operation_locks.lease_id = p_lease;
  return found;
end $$;

create function cali_workspace.release_google_operation(p_key text, p_lease uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Integração indisponível.';
  end if;
  delete from cali_workspace.google_operation_locks where operation_key = p_key and lease_id = p_lease;
end $$;

create function cali_workspace.finish_google_oauth(
  p_nonce uuid, p_connection uuid, p_target text, p_credential jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  attempt cali_workspace.google_oauth_attempts%rowtype;
  credential cali_workspace.google_calendar_credentials%rowtype;
  result jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'OAuth indisponível.';
  end if;
  select a.* into attempt from cali_workspace.google_oauth_attempts a
  where a.nonce = p_nonce and a.claimed_at > statement_timestamp() - interval '2 minutes'
  for update;
  if not found then raise exception using errcode = '42501', message = 'Tentativa OAuth indisponível.'; end if;
  if attempt.receipt is not null then return attempt.receipt; end if;
  credential := jsonb_populate_record(null::cali_workspace.google_calendar_credentials, p_credential);
  if credential.user_id is distinct from attempt.user_id or credential.company_id is distinct from attempt.company_id
    or credential.credential_key is distinct from attempt.user_id::text || ':' || coalesce(attempt.company_id::text, 'self')
    or nullif(credential.access_token, '') is null or nullif(credential.refresh_token, '') is null
    or nullif(credential.account_email, '') is null or nullif(credential.provider_account_id, '') is null then
    raise exception using errcode = '22023', message = 'Credencial OAuth incompatível.';
  end if;

  insert into cali_workspace.google_calendar_credentials (
    credential_key, user_id, company_id, account_email, provider_account_id, access_token,
    refresh_token, token_type, scope, expires_at, updated_at
  ) values (
    credential.credential_key, credential.user_id, credential.company_id, credential.account_email,
    credential.provider_account_id, credential.access_token, credential.refresh_token, credential.token_type,
    credential.scope, credential.expires_at, statement_timestamp()
  ) on conflict (credential_key) do update set
    account_email = excluded.account_email, provider_account_id = excluded.provider_account_id,
    access_token = excluded.access_token, refresh_token = excluded.refresh_token, token_type = excluded.token_type,
    scope = excluded.scope, expires_at = excluded.expires_at, updated_at = excluded.updated_at;

  if attempt.purpose = 'calendar' then
    if p_connection is null then
      insert into cali_workspace.calendar_connections (
        user_id, company_id, provider, account_email, provider_account_id, calendar_id, credential_key, sync_enabled, status, is_primary
      ) values (
        attempt.user_id, attempt.company_id, 'google', credential.account_email, credential.provider_account_id,
        coalesce(p_target, 'primary'), credential.credential_key, true, 'connected', true
      );
    else
      update cali_workspace.calendar_connections c set account_email = credential.account_email,
        provider_account_id = credential.provider_account_id, calendar_id = coalesce(p_target, 'primary'),
        credential_key = credential.credential_key, sync_enabled = true, status = 'connected',
        is_primary = true, updated_at = statement_timestamp()
      where c.id = p_connection and c.user_id = attempt.user_id and c.provider = 'google'
        and c.company_id is not distinct from attempt.company_id;
      if not found then raise exception 'A conexão Google Calendar mudou.'; end if;
    end if;
    result := jsonb_build_object('ok', true, 'accountEmail', credential.account_email, 'companyId', attempt.company_id);
  else
    if attempt.company_id is null then raise exception 'Empresa do Google Drive ausente.'; end if;
    if p_connection is null then
      insert into cali_workspace.drive_connections (
        company_id, owner_type, account_email, google_account_id, root_folder_id, credential_key, status, connected_by
      ) values (
        attempt.company_id, 'client', credential.account_email, credential.provider_account_id, p_target,
        credential.credential_key, 'connected', attempt.user_id
      );
    else
      update cali_workspace.drive_connections c set account_email = credential.account_email,
        google_account_id = credential.provider_account_id, root_folder_id = coalesce(p_target, c.root_folder_id),
        credential_key = credential.credential_key, connected_by = attempt.user_id, updated_at = statement_timestamp()
      where c.id = p_connection and c.company_id = attempt.company_id and c.owner_type = 'client' and c.status = 'connected';
      if not found then raise exception 'A conexão Google Drive mudou.'; end if;
    end if;
    result := jsonb_build_object('ok', true, 'purpose', 'drive', 'accountEmail', credential.account_email);
  end if;

  update cali_workspace.google_oauth_attempts set receipt = result, verifier = '' where nonce = p_nonce;
  return result;
end $$;

revoke all on function cali_workspace.claim_google_oauth(uuid, uuid, uuid, uuid, text, text, text),
  cali_workspace.lease_google_operation(text, uuid), cali_workspace.release_google_operation(text, uuid),
  cali_workspace.finish_google_oauth(uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function cali_workspace.claim_google_oauth(uuid, uuid, uuid, uuid, text, text, text),
  cali_workspace.lease_google_operation(text, uuid), cali_workspace.release_google_operation(text, uuid),
  cali_workspace.finish_google_oauth(uuid, uuid, text, jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
