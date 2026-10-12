-- Perfil Partner — ETAPA 1 (base). Autorizado pela proprietária em 2026-10-12 ("pode começar assim, pelo que você projetou das etapas").
-- Cria a estrutura; ainda NÃO dá acesso a ninguém: o login do Partner só passa a existir quando a função de acesso
-- (workspace-access) e as telas dele forem publicadas. is_admin() não muda.

-- 1) O perfil passa a aceitar 'partner' (único ajuste em regra existente).
alter table cali_workspace.profiles drop constraint if exists profiles_role_check;
alter table cali_workspace.profiles add constraint profiles_role_check check (role = any (array['admin'::text, 'client'::text, 'partner'::text]));

-- 2) Pessoas da equipe CALI (convite + módulos liberados).
create table if not exists cali_workspace.staff_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  full_name text not null,
  role text not null default 'partner' check (role = 'partner'),
  modules text[] not null default '{}',
  active boolean not null default true,
  user_id uuid unique references auth.users(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 3) Empresas que cada pessoa da equipe atende.
create table if not exists cali_workspace.staff_company_assignments (
  staff_id uuid not null references cali_workspace.staff_members(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (staff_id, company_id)
);

-- 4) Checagens usadas pelas próximas etapas.
create or replace function cali_workspace.is_partner() returns boolean
language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select exists (select 1 from cali_workspace.profiles p join cali_workspace.staff_members s on s.user_id = p.id
                 where p.id = auth.uid() and p.active and p.role = 'partner' and s.active);
$$;
create or replace function cali_workspace.partner_can_access(target_company_id uuid, target_module text default null) returns boolean
language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select exists (select 1 from cali_workspace.staff_members s
                 join cali_workspace.profiles p on p.id = s.user_id and p.active and p.role = 'partner'
                 join cali_workspace.staff_company_assignments a on a.staff_id = s.id
                 where s.user_id = auth.uid() and s.active and a.company_id = target_company_id
                   and (target_module is null or target_module = any (s.modules)));
$$;
revoke all on function cali_workspace.is_partner() from public, anon;
revoke all on function cali_workspace.partner_can_access(uuid, text) from public, anon;
grant execute on function cali_workspace.is_partner() to authenticated;
grant execute on function cali_workspace.partner_can_access(uuid, text) to authenticated;

-- 5) Quem lê e grava: só a administradora gerencia; a pessoa lê a própria ficha e as próprias empresas.
alter table cali_workspace.staff_members enable row level security;
alter table cali_workspace.staff_company_assignments enable row level security;
create policy staff_members_admin_all on cali_workspace.staff_members for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy staff_members_self_read on cali_workspace.staff_members for select to authenticated using (user_id = (select auth.uid()));
create policy staff_assignments_admin_all on cali_workspace.staff_company_assignments for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy staff_assignments_self_read on cali_workspace.staff_company_assignments for select to authenticated using (exists (select 1 from cali_workspace.staff_members s where s.id = staff_id and s.user_id = (select auth.uid())));
grant select, insert, update, delete on cali_workspace.staff_members, cali_workspace.staff_company_assignments to authenticated;
