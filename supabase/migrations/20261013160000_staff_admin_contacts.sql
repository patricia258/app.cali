-- Perfil Partner — nome e foto da administradora nas conversas (para o chat mostrar "Patrícia Lima" com foto, e não "CALI").
-- Só acréscimo: função nova que devolve apenas id, nome e foto de quem é administradora, e só para quem é Partner.
create or replace function cali_workspace.staff_admin_contacts()
returns table (id uuid, full_name text, avatar_url text)
language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select p.id, p.full_name, p.avatar_url from cali_workspace.profiles p
  where p.role = 'admin' and p.active and cali_workspace.is_partner();
$$;
revoke all on function cali_workspace.staff_admin_contacts() from public, anon;
grant execute on function cali_workspace.staff_admin_contacts() to authenticated;
