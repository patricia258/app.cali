begin;

create table cali_workspace.company_onboarding (
  company_id uuid primary key references cali_workspace.companies(id) on delete cascade,
  created_by uuid,
  support_partner_id uuid references cali_workspace.staff_members(id) on delete set null,
  token_hash bytea unique,
  expires_at timestamptz,
  submitted_at timestamptz,
  fields jsonb,
  constraint company_onboarding_link_check check ((token_hash is null) = (expires_at is null)),
  constraint company_onboarding_submission_check check ((submitted_at is null) = (fields is null))
);

create table cali_workspace.company_access_releases (
  id uuid primary key,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  actor_id uuid not null,
  contract_id uuid not null,
  contract_version timestamptz not null,
  contract_object_id uuid not null,
  review_version text not null,
  transaction_id xid8 not null default pg_current_xact_id(),
  released_at timestamptz,
  access_count integer not null check (access_count between 1 and 4)
);
create index company_access_releases_company_idx
  on cali_workspace.company_access_releases (company_id, released_at desc);

alter table cali_workspace.company_onboarding enable row level security;
alter table cali_workspace.company_access_releases enable row level security;
revoke all on cali_workspace.company_onboarding, cali_workspace.company_access_releases
  from public, anon, authenticated, service_role;

create function cali_workspace.require_company_admin()
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if not coalesce(cali_workspace.is_admin() and cali_workspace.workspace_private_access_v2(), false)
    or not exists (
      select 1 from cali_workspace.profiles p where p.id = actor and p.role = 'admin' and p.active
    ) then
    raise exception using errcode = '42501', message = 'Operação restrita à administração CALI.';
  end if;
  return actor;
end;
$$;

create function cali_workspace.create_company_draft(p_request uuid, p_company text, p_hours numeric, p_service text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := cali_workspace.require_company_admin();
  company_name text := btrim(p_company);
begin
  if p_request is null or coalesce(length(company_name), 0) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Informe o nome da empresa.';
  end if;

  insert into cali_workspace.companies (id, display_name, legal_name, service_type, monthly_hours_contracted, show_hours_to_client)
  values (p_request, company_name, '', nullif(btrim(p_service), ''), p_hours, true)
  on conflict (id) do nothing;
  if not found then
    if exists (
      select 1 from cali_workspace.company_onboarding
      where company_id = p_request and created_by = actor
    ) then
      return p_request;
    end if;
    raise exception using errcode = '23505', message = 'Identificador de cadastro indisponível.';
  end if;

  insert into cali_workspace.company_onboarding (company_id, created_by)
  values (p_request, actor);
  if p_hours > 0 then
    insert into cali_workspace.service_cycles (company_id, reference_month, contracted_hours, status)
    values (p_request, date_trunc('month', statement_timestamp() at time zone 'America/Sao_Paulo')::date, p_hours, 'open');
  end if;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id)
  values (p_request, actor, 'client_account_created', 'company', p_request);
  return p_request;
end;
$$;

create function cali_workspace.issue_company_pre_registration(p_company uuid, p_token uuid)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  digest bytea := sha256(convert_to(p_token::text, 'UTF8'));
  expires timestamptz;
begin
  perform cali_workspace.require_company_admin();
  if p_token is null then
    raise exception using errcode = '22023', message = 'Link inválido.';
  end if;
  perform 1 from cali_workspace.companies where id = p_company and status = 'active' for update;
  if not found then
    raise exception using errcode = '55000', message = 'Selecione uma empresa ativa.';
  end if;

  insert into cali_workspace.company_onboarding as previous (company_id, token_hash, expires_at)
  values (p_company, digest, clock_timestamp() + interval '7 days')
  on conflict (company_id) do update set
    token_hash = excluded.token_hash,
    expires_at = case when previous.token_hash = excluded.token_hash then previous.expires_at else excluded.expires_at end
  where previous.submitted_at is null
  returning expires_at into expires;
  if not found then
    raise exception using errcode = '55000', message = 'O pré-cadastro já foi enviado.';
  end if;
  return expires;
end;
$$;

create function public.cali_read_company_pre_registration(p_token uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case when o.submitted_at is null then 'open' else 'submitted' end
    from cali_workspace.company_onboarding o
    join cali_workspace.companies c on c.id = o.company_id and c.status = 'active'
    where o.token_hash = sha256(convert_to(p_token::text, 'UTF8')) and o.expires_at > statement_timestamp()
  ), 'missing');
$$;

create function public.cali_submit_company_pre_registration(
  p_token uuid, p_name text, p_legal_name text, p_city text, p_state text, p_contact text, p_email text
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  intake cali_workspace.company_onboarding%rowtype;
  details jsonb;
begin
  select o.* into intake
  from cali_workspace.company_onboarding o
  join cali_workspace.companies c on c.id = o.company_id and c.status = 'active'
  where o.token_hash = sha256(convert_to(p_token::text, 'UTF8')) and o.expires_at > clock_timestamp()
  for update of o;
  if not found then
    raise exception using errcode = '42501', message = 'Link indisponível. Solicite um novo link à CALI.';
  end if;

  if coalesce(length(btrim(p_name)), 0) not between 1 and 200
    or coalesce(length(btrim(p_legal_name)), 0) not between 1 and 200
    or coalesce(length(btrim(p_city)), 0) not between 1 and 200
    or coalesce(upper(btrim(p_state)), '') !~ '^[A-Z]{2}$'
    or coalesce(length(btrim(p_contact)), 0) not between 1 and 200
    or coalesce(length(btrim(p_email)), 0) not between 3 and 254
    or btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Revise os campos obrigatórios.';
  end if;

  details := jsonb_build_object(
    'name', btrim(p_name), 'legalName', btrim(p_legal_name),
    'city', btrim(p_city), 'state', upper(btrim(p_state)),
    'contact', btrim(p_contact), 'email', lower(btrim(p_email))
  );
  if intake.fields = details then return 'submitted'; end if;
  if intake.submitted_at is not null then
    raise exception using errcode = '55000', message = 'O pré-cadastro já foi enviado.';
  end if;
  update cali_workspace.company_onboarding
    set submitted_at = clock_timestamp(), fields = details where company_id = intake.company_id;
  return 'submitted';
end;
$$;

create function cali_workspace.company_access_review_version(p_company uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select encode(sha256(convert_to(jsonb_build_array(
    c.display_name, c.legal_name, c.address_city, c.address_state,
    c.service_plan, c.service_type, c.status, c.start_date, c.end_date,
    (select jsonb_agg(jsonb_build_array(i.id, i.email, i.full_name, i.is_primary, i.active, i.platform_access) order by i.id)
      from cali_workspace.client_invites i where i.company_id = c.id)
  )::text, 'UTF8')), 'hex') from cali_workspace.companies c where c.id = p_company;
$$;

create function cali_workspace.read_company_onboarding(p_company uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform cali_workspace.require_company_admin();
  if not exists (select 1 from cali_workspace.companies where id = p_company) then
    raise exception using errcode = '22023', message = 'Empresa não encontrada.';
  end if;
  return jsonb_build_object(
    'registration', (select jsonb_build_object(
      'expiresAt', o.expires_at, 'submittedAt', o.submitted_at, 'fields', o.fields
    ) from cali_workspace.company_onboarding o where o.company_id = p_company and o.expires_at is not null),
    'supportPartnerId', (select o.support_partner_id from cali_workspace.company_onboarding o where o.company_id = p_company),
    'partners', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.full_name) order by s.full_name, s.id)
      from cali_workspace.staff_company_assignments a
      join cali_workspace.staff_members s on s.id = a.staff_id and s.active and s.role = 'partner'
      where a.company_id = p_company
    ), '[]'::jsonb),
    'contract', (select jsonb_build_object(
      'id', d.id, 'title', d.title, 'date', d.document_date, 'version', d.updated_at,
      'available', exists (
        select 1 from storage.objects b
        where b.bucket_id = 'cali-workspace-private' and b.name = d.storage_path
          and b.name like p_company::text || '/account/%'
      )
    ) from cali_workspace.account_documents d
      where d.company_id = p_company and d.document_type = 'contract'
      order by d.created_at desc, d.id desc limit 1),
    'reviewVersion', cali_workspace.company_access_review_version(p_company),
    'pendingContacts', coalesce((select jsonb_agg(
      jsonb_build_object('id', i.id, 'name', i.full_name, 'email', i.email) order by i.is_primary desc, i.full_name, i.id
    ) from cali_workspace.client_invites i
      where i.company_id = p_company and i.platform_access and not i.active), '[]'::jsonb),
    'pendingAccesses', (select count(*) from cali_workspace.client_invites i
      where i.company_id = p_company and i.platform_access and not i.active),
    'activeAccesses', (select count(*) from cali_workspace.client_invites i
      where i.company_id = p_company and i.active and i.platform_access),
    'releasedAt', (select max(r.released_at) from cali_workspace.company_access_releases r where r.company_id = p_company)
  );
end;
$$;

create function cali_workspace.set_company_support_partner(p_company uuid, p_partner uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := cali_workspace.require_company_admin();
begin
  perform 1 from cali_workspace.companies where id = p_company for update;
  if not found then
    raise exception using errcode = '22023', message = 'Empresa não encontrada.';
  end if;
  if p_partner is not null then
    perform 1 from cali_workspace.staff_company_assignments a
      join cali_workspace.staff_members s on s.id = a.staff_id and s.active and s.role = 'partner'
      where a.company_id = p_company and a.staff_id = p_partner
      for share of a, s;
    if not found then
      raise exception using errcode = '42501', message = 'Escolha um Partner ativo atribuído a esta empresa.';
    end if;
  end if;
  insert into cali_workspace.company_onboarding as current (company_id, support_partner_id)
  values (p_company, p_partner)
  on conflict (company_id) do update set support_partner_id = excluded.support_partner_id
  where current.support_partner_id is distinct from excluded.support_partner_id;
  if found then
    insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
    values (p_company, actor, 'company_support_partner_changed', 'company', p_company, jsonb_build_object('partnerId', p_partner));
  end if;
end;
$$;

create function cali_workspace.read_client_account_responsibles()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'executive', (
      select jsonb_build_object('full_name', p.full_name, 'job_title', p.job_title,
        'avatar_url', p.avatar_url, 'avatar_position_x', p.avatar_position_x,
        'avatar_position_y', p.avatar_position_y, 'avatar_zoom', p.avatar_zoom)
      from cali_workspace.profiles p
      where p.role = 'admin' and p.active and lower(p.email) = 'patricia@calirh.com'
      order by p.created_at, p.id limit 1
    ),
    'supportPartner', (
      select jsonb_build_object('full_name', s.full_name)
      from cali_workspace.company_onboarding o
      join cali_workspace.staff_company_assignments a
        on a.company_id = o.company_id and a.staff_id = o.support_partner_id
      join cali_workspace.staff_members s on s.id = a.staff_id and s.active and s.role = 'partner'
      where o.company_id = viewer.company_id
    )
  )
  from cali_workspace.profiles viewer
  where viewer.id = auth.uid() and viewer.active and viewer.role = 'client'
    and viewer.company_id = cali_workspace.current_company_id()
    and cali_workspace.workspace_private_access_v2();
$$;

create function cali_workspace.guard_new_company_access()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not new.active or not new.platform_access then return new; end if;
  if tg_op = 'UPDATE' and old.active and old.platform_access and new.company_id = old.company_id
    and lower(btrim(new.email)) = lower(btrim(old.email)) then
    return new;
  end if;
  if not exists (
    select 1 from cali_workspace.company_access_releases r
    where r.company_id = new.company_id and r.actor_id = auth.uid()
      and r.transaction_id = pg_current_xact_id() and r.released_at is null
  ) then
    raise exception using errcode = '42501', message = 'Use a liberação da ficha para ativar novos acessos.';
  end if;
  return new;
end;
$$;
create trigger guard_new_company_access
before insert or update of active, platform_access, company_id, email on cali_workspace.client_invites
for each row execute function cali_workspace.guard_new_company_access();

create function cali_workspace.release_company_access(
  p_company uuid, p_request uuid, p_contract uuid, p_contract_version timestamptz,
  p_review_version text, p_signed_and_adhesion boolean
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := cali_workspace.require_company_admin();
  company cali_workspace.companies%rowtype;
  document cali_workspace.account_documents%rowtype;
  previous cali_workspace.company_access_releases%rowtype;
  contract_object uuid;
  address text;
  access_count integer;
  receipt_time timestamptz;
  today date := (statement_timestamp() at time zone 'America/Sao_Paulo')::date;
begin
  if p_request is null or p_contract is null or p_contract_version is null or p_signed_and_adhesion is not true then
    raise exception using errcode = '22023', message = 'Confirme o contrato assinado e a adesão ao Workspace.';
  end if;
  select * into company from cali_workspace.companies where id = p_company for update;
  if not found then
    raise exception using errcode = '22023', message = 'Empresa não encontrada.';
  end if;

  select * into previous from cali_workspace.company_access_releases where id = p_request;
  if found then
    if previous.company_id = p_company and previous.actor_id = actor and previous.contract_id = p_contract
      and previous.contract_version = p_contract_version and previous.review_version = p_review_version
      and previous.released_at is not null then
      return jsonb_build_object('releasedAt', previous.released_at, 'accessCount', previous.access_count);
    end if;
    raise exception using errcode = '23505', message = 'Operação de liberação indisponível.';
  end if;

  if company.status <> 'active' or (company.end_date is not null and company.end_date < today) then
    raise exception using errcode = '55000', message = 'A empresa precisa estar ativa e com contrato vigente.';
  end if;
  if coalesce(length(btrim(company.display_name)), 0) not between 1 and 200
    or coalesce(length(btrim(company.legal_name)), 0) not between 1 and 200
    or coalesce(length(btrim(company.address_city)), 0) not between 1 and 200
    or coalesce(upper(btrim(company.address_state)), '') !~ '^[A-Z]{2}$'
    or coalesce(nullif(btrim(company.service_plan), ''), nullif(btrim(company.service_type), ''), 'Serviço a definir') = 'Serviço a definir' then
    raise exception using errcode = '55000', message = 'Complete empresa, razão social, cidade, UF e serviço na ficha.';
  end if;
  if not exists (
    select 1 from (
      select i.full_name, i.email from cali_workspace.client_invites i
      where i.company_id = p_company and i.is_primary
      union all
      select p.full_name, p.email from cali_workspace.profiles p
      where p.company_id = p_company and p.role = 'client' and p.is_primary and p.active
    ) contacts
    where nullif(btrim(full_name), '') is not null and btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) then
    raise exception using errcode = '55000', message = 'Informe o nome e e-mail da pessoa de contato.';
  end if;

  select * into document from cali_workspace.account_documents d
    where d.company_id = p_company and d.document_type = 'contract'
    order by d.created_at desc, d.id desc limit 1 for share;
  if document.id is distinct from p_contract or document.updated_at is distinct from p_contract_version
    or document.document_date > today then
    raise exception using errcode = '40001', message = 'O contrato mudou. Reabra a ficha e confira a versão atual.';
  end if;
  select b.id into contract_object from storage.objects b
    where b.bucket_id = 'cali-workspace-private' and b.name = document.storage_path
      and b.name like p_company::text || '/account/%' for share;
  if not found then
    raise exception using errcode = '55000', message = 'Anexe o arquivo do contrato assinado.';
  end if;

  perform 1 from cali_workspace.client_invites where company_id = p_company for update;
  if p_review_version is distinct from cali_workspace.company_access_review_version(p_company) then
    raise exception using errcode = '40001', message = 'Os dados ou acessos mudaram. Confira a ficha atual antes de liberar.';
  end if;
  if not exists (select 1 from cali_workspace.client_invites where company_id = p_company and platform_access and not active) then
    raise exception using errcode = '55000', message = 'Nenhum acesso aguarda liberação.';
  end if;
  select count(*) into access_count from (
    select lower(btrim(email)) from cali_workspace.client_invites where company_id = p_company and (platform_access or active)
    union
    select lower(btrim(email)) from cali_workspace.profiles where company_id = p_company and role = 'client' and active
  ) members;
  if access_count not between 1 and 4
    or exists (select 1 from cali_workspace.client_invites where company_id = p_company and (platform_access or active)
      group by lower(btrim(email)) having count(*) > 1) then
    raise exception using errcode = '22023', message = 'Confira os e-mails e o limite de quatro acessos.';
  end if;

  for address in
    select lower(btrim(email)) from cali_workspace.client_invites
      where company_id = p_company and platform_access and not active order by 1
  loop
    perform pg_advisory_xact_lock(hashtextextended('cali-company-access:' || address, 0));
    if address !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      or exists (select 1 from cali_workspace.client_invites i
        where i.company_id <> p_company and i.active and lower(btrim(i.email)) = address)
      or exists (select 1 from cali_workspace.profiles p
        where lower(btrim(p.email)) = address and (p.company_id is distinct from p_company or p.role <> 'client'))
      or exists (select 1 from cali_workspace.staff_members s where s.active and lower(btrim(s.email)) = address) then
      raise exception using errcode = '23505', message = 'Há um e-mail inválido ou vinculado a outro acesso.';
    end if;
  end loop;

  insert into cali_workspace.company_access_releases (
    id, company_id, actor_id, contract_id, contract_version, contract_object_id, review_version, access_count
  ) values (p_request, p_company, actor, p_contract, p_contract_version, contract_object, p_review_version, access_count);
  update cali_workspace.client_invites
    set active = true, invited_at = coalesce(invited_at, statement_timestamp())
    where company_id = p_company and platform_access and not active;
  receipt_time := clock_timestamp();
  update cali_workspace.company_access_releases r set released_at = receipt_time where r.id = p_request;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (p_company, actor, 'company_registration_released', 'company', p_company,
    jsonb_build_object('contractId', p_contract, 'accessCount', access_count, 'receiptId', p_request));
  return jsonb_build_object('releasedAt', receipt_time, 'accessCount', access_count);
end;
$$;

revoke all on function cali_workspace.require_company_admin(), cali_workspace.guard_new_company_access(),
  cali_workspace.company_access_review_version(uuid),
  cali_workspace.create_company_draft(uuid, text, numeric, text), cali_workspace.issue_company_pre_registration(uuid, uuid),
  cali_workspace.read_company_onboarding(uuid), cali_workspace.set_company_support_partner(uuid, uuid),
  cali_workspace.read_client_account_responsibles(),
  cali_workspace.release_company_access(uuid, uuid, uuid, timestamptz, text, boolean),
  public.cali_read_company_pre_registration(uuid),
  public.cali_submit_company_pre_registration(uuid, text, text, text, text, text, text)
from public, anon, authenticated, service_role;

grant execute on function cali_workspace.create_company_draft(uuid, text, numeric, text),
  cali_workspace.issue_company_pre_registration(uuid, uuid),
  cali_workspace.read_company_onboarding(uuid), cali_workspace.set_company_support_partner(uuid, uuid),
  cali_workspace.read_client_account_responsibles(),
  cali_workspace.release_company_access(uuid, uuid, uuid, timestamptz, text, boolean) to authenticated;
grant execute on function public.cali_read_company_pre_registration(uuid),
  public.cali_submit_company_pre_registration(uuid, text, text, text, text, text, text) to anon;

do $$
begin
  if to_regprocedure('cali_workspace.client_submit_account_message(text,text)') is not null then
    revoke execute on function cali_workspace.client_submit_account_message(text, text) from public, anon, authenticated;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
