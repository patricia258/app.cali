-- A primeira versão do anexo do Partner (abandonada em 2026-10-13) gravava o arquivo da CONVERSA como DOCUMENTO publicado.
-- Regra da proprietária: documento é a entrega final do entregável ou da subtarefa, nunca um arquivo trocado no chat.
-- A função não é mais usada por nenhuma tela; aqui só se retira a permissão de executá-la, para não se repetir.
revoke all on function cali_workspace.partner_attach_deliverable_file(uuid, text, text, text, bigint, boolean) from authenticated;
