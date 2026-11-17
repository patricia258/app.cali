begin;

create table cali_workspace.profile_report_deliveries (
  result_id uuid primary key references cali_workspace.profile_results(id) on delete cascade,
  signer jsonb,
  queued_at timestamptz not null default statement_timestamp(),
  lease_id uuid,
  leased_at timestamptz
);
alter table cali_workspace.profile_report_deliveries enable row level security;
revoke all on cali_workspace.profile_report_deliveries from public, anon, authenticated, service_role;

-- O link antigo continua válido para o agradecimento, sem permitir leitura do resultado.
create or replace function public.cali_profile_report(p_token uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('acknowledged', true);
$$;
revoke all on function public.cali_profile_report(uuid) from public, anon, authenticated, service_role;
grant execute on function public.cali_profile_report(uuid) to anon, authenticated;
revoke all on function public.cali_profile_report_ready(uuid, text),
  public.cali_profile_accepts_report(text) from public, anon, authenticated, service_role;

drop policy if exists profile_results_client_visible on cali_workspace.profile_results;

create or replace function public.cali_profile_base()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when cali_workspace.workspace_private_access_v2() and cali_workspace.is_admin() then jsonb_build_object(
    'n', count(*),
    'min', 30,
    'by_primary', case when count(*) >= 30 then jsonb_build_object(
      'D', count(*) filter (where primary_style = 'D'), 'I', count(*) filter (where primary_style = 'I'),
      'S', count(*) filter (where primary_style = 'S'), 'C', count(*) filter (where primary_style = 'C')) end
  ) end from cali_workspace.profile_results;
$$;
revoke all on function public.cali_profile_base() from public, anon, authenticated, service_role;
grant execute on function public.cali_profile_base() to authenticated;

create function cali_workspace.cali_profile_enqueue_report(p_result_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  endpoint text;
  hook text;
  bearer text;
  headers jsonb;
begin
  select secret_value into endpoint from cali_workspace.runtime_secrets where secret_key = 'disc_report_url';
  select secret_value into hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
  select secret_value into bearer from cali_workspace.runtime_secrets where secret_key = 'disc_report_bearer';
  if nullif(hook, '') is null or endpoint is null or
    (endpoint !~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/cali-profile-report-email$'
      and endpoint <> 'http://ingress:56431/functions/v1/cali-profile-report-email') then
    return false;
  end if;

  headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', hook);
  if nullif(bearer, '') is not null then
    headers := headers || jsonb_build_object('Authorization', 'Bearer ' || bearer);
  end if;

  insert into cali_workspace.profile_report_deliveries (result_id, signer)
  values (p_result_id, cali_workspace.profile_signer_snapshot())
  on conflict (result_id) do nothing;
  if not found then return true; end if;
  perform net.http_post(url := endpoint, headers := headers, body := jsonb_build_object('result_id', p_result_id));
  return true;
exception when others then
  -- A resposta permanece disponível à CALI mesmo sem transporte configurado.
  return false;
end $$;

create function cali_workspace.cali_profile_claim_report(p_result_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  delivery cali_workspace.profile_report_deliveries%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Entrega indisponível.';
  end if;
  update cali_workspace.profile_report_deliveries d
  set lease_id = gen_random_uuid(), leased_at = statement_timestamp()
  where d.result_id = p_result_id
    and (d.lease_id is null or d.leased_at < statement_timestamp() - interval '2 minutes')
    and d.queued_at > statement_timestamp() - interval '23 hours'
    and exists (select 1 from cali_workspace.profile_results r
      where r.id = d.result_id and r.report_emailed_at is null)
  returning d.* into delivery;
  if not found then return null; end if;
  return jsonb_build_object('lease', delivery.lease_id, 'signer', delivery.signer);
end $$;

create function cali_workspace.cali_profile_finish_report(p_result_id uuid, p_lease uuid, p_sent boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Entrega indisponível.';
  end if;
  update cali_workspace.profile_report_deliveries
  set lease_id = null, leased_at = null
  where result_id = p_result_id and lease_id = p_lease;
  if not found then return false; end if;
  if p_sent then
    update cali_workspace.profile_results
    set report_emailed_at = statement_timestamp()
    where id = p_result_id and report_emailed_at is null;
  end if;
  return true;
end $$;

revoke all on function cali_workspace.cali_profile_enqueue_report(uuid),
  cali_workspace.cali_profile_claim_report(uuid),
  cali_workspace.cali_profile_finish_report(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
grant execute on function cali_workspace.cali_profile_claim_report(uuid),
  cali_workspace.cali_profile_finish_report(uuid, uuid, boolean) to service_role;

-- Convite e link aberto continuam usando o mesmo escritor e método.
alter function public.cali_profile_submit(text, text, text, text, text, jsonb, boolean)
  set schema cali_workspace;
alter function cali_workspace.cali_profile_submit(text, text, text, text, text, jsonb, boolean)
  rename to cali_profile_submit_legacy;
revoke all on function cali_workspace.cali_profile_submit_legacy(text, text, text, text, text, jsonb, boolean)
  from public, anon, authenticated, service_role;

create function public.cali_profile_submit(
  p_slug text, p_name text, p_email text, p_job_title text, p_company_name text,
  p_answers jsonb, p_consent boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  receipt jsonb;
begin
  receipt := cali_workspace.cali_profile_submit_legacy(
    p_slug, p_name, p_email, p_job_title, p_company_name, p_answers, p_consent
  );
  perform cali_workspace.cali_profile_enqueue_report((receipt->>'id')::uuid);
  return receipt;
end $$;
revoke all on function public.cali_profile_submit(text, text, text, text, text, jsonb, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.cali_profile_submit(text, text, text, text, text, jsonb, boolean)
  to anon, authenticated;

notify pgrst, 'reload schema';
commit;
