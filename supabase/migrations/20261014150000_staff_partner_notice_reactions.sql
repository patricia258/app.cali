-- Perfil Partner — reagir aos comunicados como o cliente (pedido de 2026-10-13). Só acréscimo: duas políticas novas na
-- tabela de reações (criada em 12/10), valendo apenas para quem é Partner com o módulo Avisos.
drop policy if exists notice_reactions_partner_read on cali_workspace.notice_reactions;
create policy notice_reactions_partner_read on cali_workspace.notice_reactions for select to authenticated using ((select cali_workspace.partner_has_module('notices')));
drop policy if exists notice_reactions_partner_insert on cali_workspace.notice_reactions;
create policy notice_reactions_partner_insert on cali_workspace.notice_reactions for insert to authenticated with check (user_id = (select auth.uid()) and company_id is null and (select cali_workspace.partner_has_module('notices')));
