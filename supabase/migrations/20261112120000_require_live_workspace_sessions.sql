begin;

-- Mantém a vinculação mais estrita do piloto e aceita perfis legados já ativos.
-- Após um corte, Cliente sem convite elegível precisa de um novo vínculo explícito.
create or replace function cali_session_guard.profile_login_eligible(subject uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case when cali_session_guard.is_pilot_account(subject) then exists (
    select 1
    from cali_session_guard.pilot_accounts a
    join cali_workspace.profiles p on p.id = a.profile_id and p.company_id = a.company_id
    join cali_workspace.companies c on c.id = a.company_id
    join cali_workspace.client_invites i on i.id = a.invite_id and i.company_id = a.company_id
    join auth.users u on u.id = a.profile_id
    where a.profile_id = subject and a.revoked_at is null and p.active and p.role = 'client'
      and c.status in ('active', 'paused') and i.active and i.platform_access
      and lower(btrim(i.email)) = a.recipient_email
      and lower(btrim(p.email)) = a.recipient_email
      and lower(btrim(u.email)) = a.recipient_email
  ) else exists (
    select 1
    from cali_workspace.profiles p
    join auth.users u on u.id = p.id and lower(btrim(u.email)) = lower(btrim(p.email))
    left join cali_workspace.companies c on c.id = p.company_id
    where p.id = subject and p.active and (
      p.role = 'admin'
      or (p.role = 'partner' and exists (
        select 1 from cali_workspace.staff_members s
        where s.user_id = p.id and s.active and lower(btrim(s.email)) = lower(btrim(p.email))
      ))
      or (p.role = 'client' and c.status in ('active', 'paused') and (
        exists (
          select 1 from cali_workspace.client_invites i
          where i.company_id = p.company_id and lower(btrim(i.email)) = lower(btrim(p.email))
            and i.active and i.platform_access
        )
        or (
          not exists (
            select 1 from cali_workspace.client_invites i
            where i.company_id = p.company_id and lower(btrim(i.email)) = lower(btrim(p.email))
          )
          and not exists (
            select 1 from cali_session_guard.profile_cutoffs r where r.user_id = p.id
          )
        )
      ))
    )
  ) end;
$$;

create or replace function cali_session_guard.profile_requires_admission(subject uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cali_session_guard.is_pilot_account(subject)
    or exists (select 1 from cali_session_guard.profile_cutoffs r where r.user_id = subject);
$$;

create or replace function cali_session_guard.session_is_live()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    left join cali_session_guard.profile_cutoffs r on r.user_id = s.user_id
    where s.user_id = (select auth.uid())
      and s.id::text = (select auth.jwt() ->> 'session_id')
      and (s.not_after is null or s.not_after > statement_timestamp())
      and cali_session_guard.profile_login_eligible(s.user_id)
      and (r.revoked_before is null or s.created_at > r.revoked_before)
      and (
        not cali_session_guard.profile_requires_admission(s.user_id)
        or exists (
          select 1 from cali_session_guard.login_authorizations a
          where a.user_id = s.user_id and a.session_id = s.id
            and (r.revoked_before is null or a.code_created_at > r.revoked_before)
        )
      )
  );
$$;

create function cali_workspace.workspace_login_eligible_v2(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cali_session_guard.profile_login_eligible(p_user_id);
$$;

create function cali_workspace.workspace_session_live_v2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cali_session_guard.session_is_live();
$$;

alter function cali_workspace.workspace_login_eligible_v2(uuid) owner to postgres;
alter function cali_workspace.workspace_session_live_v2() owner to postgres;
revoke all on function cali_workspace.workspace_login_eligible_v2(uuid),
  cali_workspace.workspace_session_live_v2() from public, anon, authenticated, service_role;
grant execute on function cali_workspace.workspace_login_eligible_v2(uuid) to service_role;
grant execute on function cali_workspace.workspace_session_live_v2() to authenticated;

-- O mesmo marcador invalida sessão e prova de código. O relógio nunca recua para um ator.
create function cali_session_guard.record_workspace_cutoffs(subjects uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into cali_session_guard.profile_cutoffs (user_id, revoked_before)
    select u.id, clock_timestamp()
    from auth.users u
    where u.id = any(subjects)
    order by u.id
    on conflict (user_id) do update
      set revoked_before = greatest(
        cali_session_guard.profile_cutoffs.revoked_before, excluded.revoked_before
      );
$$;

create function cali_session_guard.cut_changed_workspace_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform cali_session_guard.record_workspace_cutoffs(array[old.id]);
  elsif tg_op = 'INSERT' then
    -- Sessão criada antes do vínculo não herda acesso após o perfil ser provisionado.
    if exists (select 1 from auth.sessions s where s.user_id = new.id) then
      perform cali_session_guard.record_workspace_cutoffs(array[new.id]);
    end if;
  elsif old.active is distinct from new.active
    or old.company_id is distinct from new.company_id
    or old.role is distinct from new.role
    or lower(btrim(old.email)) is distinct from lower(btrim(new.email))
  then
    perform cali_session_guard.record_workspace_cutoffs(array[old.id, new.id]);
  end if;
  return null;
end;
$$;

create function cali_session_guard.cut_changed_workspace_company()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (old.status in ('active', 'paused')) is distinct from (new.status in ('active', 'paused')) then
    perform cali_session_guard.record_workspace_cutoffs(array(
      select p.id from cali_workspace.profiles p where p.company_id = new.id and p.role = 'client'
      union
      select s.user_id
      from cali_workspace.staff_company_assignments a
      join cali_workspace.staff_members s on s.id = a.staff_id
      where a.company_id = new.id and s.user_id is not null
    ));
  end if;
  return null;
end;
$$;

create function cali_session_guard.cut_changed_workspace_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_company uuid;
  old_email text;
  new_company uuid;
  new_email text;
begin
  if tg_op = 'UPDATE'
    and old.company_id is not distinct from new.company_id
    and lower(btrim(old.email)) is not distinct from lower(btrim(new.email))
    and old.active is not distinct from new.active
    and old.platform_access is not distinct from new.platform_access
  then
    return null;
  end if;
  if tg_op <> 'INSERT' then
    old_company := old.company_id;
    old_email := lower(btrim(old.email));
  end if;
  if tg_op <> 'DELETE' then
    new_company := new.company_id;
    new_email := lower(btrim(new.email));
  end if;

  perform cali_session_guard.record_workspace_cutoffs(array(
    select p.id
    from cali_workspace.profiles p
    where p.role = 'client' and (
      (p.company_id = old_company and lower(btrim(p.email)) = old_email)
      or (p.company_id = new_company and lower(btrim(p.email)) = new_email)
    )
  ));
  return null;
end;
$$;

create function cali_session_guard.cut_changed_workspace_staff()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform cali_session_guard.record_workspace_cutoffs(array[old.user_id]);
  elsif tg_op = 'INSERT' then
    perform cali_session_guard.record_workspace_cutoffs(array[new.user_id]);
  elsif old.user_id is distinct from new.user_id
    or old.active is distinct from new.active
    or old.modules is distinct from new.modules
    or lower(btrim(old.email)) is distinct from lower(btrim(new.email))
  then
    perform cali_session_guard.record_workspace_cutoffs(array[old.user_id, new.user_id]);
  end if;
  return null;
end;
$$;

create function cali_session_guard.cut_changed_workspace_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_ids uuid[];
begin
  if tg_op = 'DELETE' then
    staff_ids := array[old.staff_id];
  elsif tg_op = 'INSERT' then
    staff_ids := array[new.staff_id];
  elsif old.staff_id is distinct from new.staff_id or old.company_id is distinct from new.company_id then
    staff_ids := array[old.staff_id, new.staff_id];
  else
    return null;
  end if;
  perform cali_session_guard.record_workspace_cutoffs(array(
    select s.user_id from cali_workspace.staff_members s where s.id = any(staff_ids)
  ));
  return null;
end;
$$;

alter function cali_session_guard.record_workspace_cutoffs(uuid[]) owner to postgres;
alter function cali_session_guard.cut_changed_workspace_profile() owner to postgres;
alter function cali_session_guard.cut_changed_workspace_company() owner to postgres;
alter function cali_session_guard.cut_changed_workspace_invite() owner to postgres;
alter function cali_session_guard.cut_changed_workspace_staff() owner to postgres;
alter function cali_session_guard.cut_changed_workspace_assignment() owner to postgres;

revoke all on function cali_session_guard.record_workspace_cutoffs(uuid[]),
  cali_session_guard.cut_changed_workspace_profile(), cali_session_guard.cut_changed_workspace_company(),
  cali_session_guard.cut_changed_workspace_invite(), cali_session_guard.cut_changed_workspace_staff(),
  cali_session_guard.cut_changed_workspace_assignment() from public, anon, authenticated, service_role;

create trigger workspace_profile_session_cut_v2
after insert or update of active, company_id, role, email or delete on cali_workspace.profiles
for each row execute function cali_session_guard.cut_changed_workspace_profile();

create trigger workspace_company_session_cut_v2
after update of status on cali_workspace.companies
for each row execute function cali_session_guard.cut_changed_workspace_company();

create trigger workspace_invite_session_cut_v2
after insert or update of company_id, email, active, platform_access or delete on cali_workspace.client_invites
for each row execute function cali_session_guard.cut_changed_workspace_invite();

create trigger workspace_staff_session_cut_v2
after insert or update of user_id, active, modules, email or delete on cali_workspace.staff_members
for each row execute function cali_session_guard.cut_changed_workspace_staff();

create trigger workspace_assignment_session_cut_v2
after insert or update of staff_id, company_id or delete on cali_workspace.staff_company_assignments
for each row execute function cali_session_guard.cut_changed_workspace_assignment();

-- Preserva a allowlist instalada sem versionar identidades. Aborta se o contrato divergir.
do $admin_guard$
declare
  definition text := pg_get_functiondef('cali_workspace.is_admin()'::regprocedure);
  original text := 'and cali_workspace.session_meets_mfa();';
  guarded text := 'and cali_workspace.session_meets_mfa()
    and cali_session_guard.session_is_live()
    and exists (select 1 from cali_workspace.profiles p where p.id = auth.uid() and p.role = ''admin'' and p.active);';
begin
  if position(original in definition) = 0 or position('cali_session_guard.session_is_live()' in definition) <> 0 then
    raise exception 'O predicado Admin diverge do catálogo reconciliado.';
  end if;
  execute replace(definition, original, guarded);
end;
$admin_guard$;

create or replace function cali_workspace.is_partner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cali_session_guard.session_is_live()
    and cali_workspace.session_meets_mfa()
    and exists (
      select 1
      from cali_workspace.profiles p
      join cali_workspace.staff_members s on s.user_id = p.id
      where p.id = auth.uid() and p.active and p.role = 'partner' and s.active
    );
$$;

create or replace function cali_workspace.partner_can_access(target_company_id uuid, target_module text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cali_workspace.is_partner() and exists (
    select 1
    from cali_workspace.staff_members s
    join cali_workspace.staff_company_assignments a on a.staff_id = s.id
    join cali_workspace.companies c on c.id = a.company_id
    where s.user_id = auth.uid() and s.active and a.company_id = target_company_id
      and c.status in ('active', 'paused')
      and (target_module is null or target_module = any(s.modules))
  );
$$;

notify pgrst, 'reload schema';
commit;
