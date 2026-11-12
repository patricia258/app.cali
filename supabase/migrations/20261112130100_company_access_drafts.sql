begin;

create function cali_workspace.save_company_access_draft(p_company uuid, p_people jsonb, p_removed uuid[])
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  person record;
  previous cali_workspace.client_invites%rowtype;
  address text;
  keep_active boolean;
  access_role_value text;
begin
  perform cali_workspace.require_company_admin();
  perform 1 from cali_workspace.companies where id = p_company for update;
  if not found then
    raise exception using errcode = '22023', message = 'Empresa não encontrada.';
  end if;
  if jsonb_typeof(p_people) is distinct from 'array' or jsonb_array_length(p_people) > 100 then
    raise exception using errcode = '22023', message = 'Revise os contatos da ficha.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_people) as row(email text)
    group by lower(btrim(row.email)) having count(*) > 1
  ) or (select count(*) from jsonb_to_recordset(p_people) as row(primary_contact boolean)
    where row.primary_contact) > 1 then
    raise exception using errcode = '22023', message = 'Revise os e-mails duplicados e a pessoa de contato.';
  end if;

  for previous in
    select i.* from cali_workspace.client_invites i where i.company_id = p_company and i.id = any(p_removed)
  loop
    if previous.is_primary then
      raise exception using errcode = '22023', message = 'Mantenha a pessoa de contato na ficha.';
    end if;
    update cali_workspace.profiles p set active = false
      where p.company_id = p_company and p.role = 'client' and lower(btrim(p.email)) = lower(btrim(previous.email));
    delete from cali_workspace.client_invites where id = previous.id;
  end loop;

  for person in
    select * from jsonb_to_recordset(p_people) as row(
      id uuid, name text, email text, job text, phone text, whatsapp text, birthday date,
      primary_contact boolean, requested boolean, access_role text
    )
  loop
    address := lower(btrim(person.email));
    if coalesce(length(btrim(person.name)), 0) not between 1 and 200
      or coalesce(length(address), 0) not between 3 and 254
      or address !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      or person.primary_contact is null or person.requested is null then
      raise exception using errcode = '22023', message = 'Informe nome e e-mail válidos para cada contato.';
    end if;
    select i.* into previous from cali_workspace.client_invites i
      where i.company_id = p_company and (
        i.id = person.id or (person.id is null and (
          (i.is_primary and person.primary_contact) or lower(btrim(i.email)) = address
        ))
      )
      order by i.is_primary desc, i.created_at, i.id limit 1 for update;
    if (person.id is not null and previous.id is null)
      or (previous.id is not null and previous.is_primary is distinct from person.primary_contact) then
      raise exception using errcode = '40001', message = 'A lista de acessos mudou. Reabra a ficha.';
    end if;
    if exists (
      select 1 from cali_workspace.client_invites i
      where i.company_id = p_company and lower(btrim(i.email)) = address and i.id is distinct from previous.id
    ) then
      raise exception using errcode = '23505', message = 'O e-mail já consta na ficha.';
    end if;

    keep_active := coalesce(previous.active and previous.platform_access, false)
      and person.requested and lower(btrim(previous.email)) = address;
    access_role_value := case when person.primary_contact then 'primary'
      when person.access_role = 'decision_maker' then 'decision_maker' else 'additional' end;
    if previous.id is null then
      -- Perfis antigos podem ter acesso ativo sem convite. A edição da ficha preserva esse vínculo.
      update cali_workspace.profiles p set
        full_name = btrim(person.name), job_title = nullif(btrim(person.job), ''),
        phone = nullif(btrim(person.phone), ''), whatsapp = nullif(btrim(person.whatsapp), ''),
        active = person.requested
      where p.company_id = p_company and p.role = 'client' and p.active and lower(btrim(p.email)) = address;
      if found and person.requested then continue; end if;
      insert into cali_workspace.client_invites (
        company_id, email, full_name, is_primary, active, job_title, phone, whatsapp, birthday, access_role, platform_access
      ) values (p_company, address, btrim(person.name), person.primary_contact, false,
        nullif(btrim(person.job), ''), nullif(btrim(person.phone), ''), nullif(btrim(person.whatsapp), ''),
        person.birthday, access_role_value, person.requested);
    else
      if previous.is_primary and lower(btrim(previous.email)) <> address and exists (
        select 1 from cali_workspace.profiles p where p.company_id = p_company and p.role = 'client'
          and lower(btrim(p.email)) = lower(btrim(previous.email))
      ) then
        raise exception using errcode = '42501', message = 'O e-mail vinculado ao perfil precisa ser alterado na gestão de acesso.';
      end if;
      if not person.requested or lower(btrim(previous.email)) <> address then
        update cali_workspace.profiles p set active = false
          where p.company_id = p_company and p.role = 'client' and lower(btrim(p.email)) = lower(btrim(previous.email));
      end if;
      update cali_workspace.client_invites set
        email = address, full_name = btrim(person.name), active = keep_active, platform_access = person.requested,
        job_title = nullif(btrim(person.job), ''), phone = nullif(btrim(person.phone), ''),
        whatsapp = case when person.primary_contact then nullif(btrim(person.whatsapp), '') else previous.whatsapp end,
        birthday = case when person.primary_contact then person.birthday else previous.birthday end,
        access_role = access_role_value,
        accepted_at = case when lower(btrim(previous.email)) = address then previous.accepted_at end,
        invited_at = case when lower(btrim(previous.email)) = address then previous.invited_at end
      where id = previous.id;
      update cali_workspace.profiles p set
        full_name = btrim(person.name), job_title = nullif(btrim(person.job), ''),
        phone = nullif(btrim(person.phone), ''),
        whatsapp = case when person.primary_contact then nullif(btrim(person.whatsapp), '') else p.whatsapp end
      where p.company_id = p_company and p.role = 'client' and lower(btrim(p.email)) = address;
    end if;
  end loop;

  if (select count(*) from cali_workspace.client_invites where company_id = p_company and (active or platform_access)) > 4 then
    raise exception using errcode = '22023', message = 'Cada empresa pode ter até quatro acessos.';
  end if;
end;
$$;

create function cali_workspace.guard_company_client_profile_activation()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not new.active or new.role <> 'client' then return new; end if;
  if tg_op = 'UPDATE' and old.role = 'client' and old.active and old.company_id = new.company_id
    and lower(btrim(old.email)) = lower(btrim(new.email)) then
    return new;
  end if;
  if not exists (
    select 1 from cali_workspace.client_invites i
    where i.company_id = new.company_id and i.active and i.platform_access
      and lower(btrim(i.email)) = lower(btrim(new.email))
  ) then
    raise exception using errcode = '42501', message = 'O acesso do cliente ainda precisa ser liberado na ficha.';
  end if;
  return new;
end;
$$;

create trigger guard_company_client_profile_activation
before insert or update of active, role, company_id, email on cali_workspace.profiles
for each row execute function cali_workspace.guard_company_client_profile_activation();

revoke all on function cali_workspace.save_company_access_draft(uuid, jsonb, uuid[]),
  cali_workspace.guard_company_client_profile_activation() from public, anon, authenticated, service_role;
grant execute on function cali_workspace.save_company_access_draft(uuid, jsonb, uuid[]) to authenticated;

notify pgrst, 'reload schema';
commit;
