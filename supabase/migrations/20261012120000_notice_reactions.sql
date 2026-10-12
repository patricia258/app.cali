-- Reações nos comunicados (curtir, amei, palmas). Uma reação por pessoa por comunicado.
-- Só cria; não altera nem apaga nada existente. Cliente vê as reações da própria empresa; a administradora vê todas.
create table if not exists cali_workspace.notice_reactions (
  notice_id uuid not null references cali_workspace.notices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references cali_workspace.companies(id) on delete cascade,
  reaction text not null check (reaction in ('like','love','clap')),
  created_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);
alter table cali_workspace.notice_reactions enable row level security;
create policy notice_reactions_read on cali_workspace.notice_reactions for select to authenticated using (cali_workspace.is_admin() or company_id = cali_workspace.current_company_id());
create policy notice_reactions_insert on cali_workspace.notice_reactions for insert to authenticated with check (user_id = (select auth.uid()) and company_id is not distinct from cali_workspace.current_company_id() and cali_workspace.can_read_notice(notice_id));
create policy notice_reactions_update on cali_workspace.notice_reactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and company_id is not distinct from cali_workspace.current_company_id());
create policy notice_reactions_delete on cali_workspace.notice_reactions for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, update, delete on cali_workspace.notice_reactions to authenticated;
