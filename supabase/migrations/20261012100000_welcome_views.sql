-- Boas-vindas do primeiro acesso: guarda quem já viu a apresentação, para não repetir em outro aparelho.
-- Só cria; não altera nem apaga nada existente. Cada pessoa lê e grava apenas a própria linha.
create table if not exists cali_workspace.welcome_views (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table cali_workspace.welcome_views enable row level security;
create policy welcome_views_select_own on cali_workspace.welcome_views for select to authenticated using (user_id = (select auth.uid()));
create policy welcome_views_insert_own on cali_workspace.welcome_views for insert to authenticated with check (user_id = (select auth.uid()));
grant select, insert on cali_workspace.welcome_views to authenticated;
