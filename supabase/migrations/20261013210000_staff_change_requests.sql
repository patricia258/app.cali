-- Perfil Partner — alterações sujeitas à autorização da administradora (regra de 2026-10-13: "tudo o que ele criar,
-- alterar ou tentar excluir, só pode fazer se EU autorizar"). Ajuste apenas na fila criada para a Equipe CALI:
-- um campo a mais (o que foi pedido, em JSON) e o tipo 'change'. O Partner NÃO grava em projetos/frentes/entregáveis;
-- ele registra o pedido e, ao aprovar, é a administradora (com o acesso dela) que executa.
alter table cali_workspace.staff_review_requests add column if not exists payload jsonb;
alter table cali_workspace.staff_review_requests drop constraint if exists staff_review_requests_kind_check;
alter table cali_workspace.staff_review_requests add constraint staff_review_requests_kind_check check (kind in ('report', 'deliverable', 'document', 'notice', 'other', 'record_close', 'change'));
