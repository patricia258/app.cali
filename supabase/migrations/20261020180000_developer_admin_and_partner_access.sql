-- Pedido da proprietária em 15/10/2026: acessos para o desenvolvedor de confiança (felipesdl@outlook.com).
-- Aplicada pelo painel (migração developer_admin_and_partner_access); esta é a cópia de registro.
-- 1) Administrador geral: e-mail incluído em is_admin() (mesmas exigências da proprietária, inclusive duas etapas).
-- 2) Conta (auth.users + auth.identities) e perfil de administrador criados para esse e-mail.
-- 3) Partner de teste: staff_members felipesdl+partner@outlook.com, todos os módulos, atribuído só à Company IN.
-- 4) Trigger notifications_secondary_admin_without_email: administrador que não é a proprietária recebe os avisos no sino, sem e-mail.
-- Para remover o acesso: tirar o e-mail de is_admin(), desativar o perfil (profiles.active = false) e o staff_members.
create or replace function cali_workspace.is_admin()
returns boolean language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in ('patricia@calirh.com', 'felipesdl@outlook.com') and cali_workspace.session_meets_mfa();
$$;
