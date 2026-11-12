# Coleta pública e devolutivas

## FLOW-17

**DISC, CALI Forms e Mapa de People.** As entradas públicas são `/perfil/:slug` e `/f/:slug`. O Mapa recebe dados do portal e abre triagem e devolutiva em `/admin/mapa-de-people`. Respondente, avaliador, gestor, Admin e Partner têm acessos próprios em cada subfluxo.

**Atual e alvo.** As três jornadas têm escritores e leitores distintos. Na migração, preservar slugs, tokens emitidos, protocolos, rascunhos, anexos e relações verificáveis. Receber dados, autorizar leitura e entregar documentos são etapas com guardas e evidências próprias. [Rotas](../../src/app/router.tsx) · [Contratos de dados](../DATA_CONTRACTS.md)

**Aceite e lacunas.** Registrar resultados independentes de [DISC](#flow-17a), [CALI Forms](#flow-17b) e [Mapa](#flow-17c). Usar links emitidos antes do corte e manter dados pessoais e tokens fora dos artefatos de teste. Conferir em cada subfluxo escritor efetivo, projeção pública, retorno após falha e recibo de entrega. [Matriz de validação](../CONSOLIDATION_ACCEPTANCE.md)

## FLOW-17a

**DISC.** Respondente usa `/perfil/:slug` ou `/perfil/:slug?c=:token`, opt-out em `/perfil/sair/:token` e link legado `/perfil/relatorio/:token`. CALI opera campanhas e avaliações em `/admin/perfil-comportamental`. Gestão Cliente consulta relatório liberado da própria empresa.

**Atual.** Convite ou link aberto → progresso e rascunho no navegador → envio → agradecimento. Link individual antigo mostra agradecimento e contato da CALI. Avaliador Admin pode recuperar PDF arquivado ou gerar uma cópia com dados disponíveis. O relatório de gestão é liberado separadamente, após parecer e aprovação. [Agradecimento](../../src/modules/public/disc/ProfileReportPage.tsx) · [Avaliador](../../src/modules/disc/ProfileEvaluatorPage.tsx) · [Guarda do respondente](../../supabase/migrations/20261112141000_disc_private_respondent_reports.sql) · [Guarda do arquivo](../../supabase/migrations/20261112141100_disc_storage_policy.sql)

**Dados e integrações.** Campanha, slug, token, convite, progresso, opt-out, resposta, revisão, resultado, relatório e recibo de e-mail. Rascunho preserva a chave legada do convite ou slug no navegador. PDF fica no acervo privado. A metodologia e os cálculos ficam restritos à CALI.

**Alvo.** Convite ativo → resposta → agradecimento → PDF individual por e-mail ao respondente. Link antigo de relatório individual mostra agradecimento e orienta contato com a CALI. Se precisar do PDF, CALI confere identidade e recupera o PDF privado existente ou gera a revisão histórica quando os dados permitirem. Se faltarem dados para reconstrução, registrar indisponibilidade. O endpoint público entrega apenas a projeção necessária à tela. Avaliador CALI consulta resultado individual no escopo autorizado. Gestão exige cinco respostas, usa linguagem qualitativa de cinco a 14 e preserva anonimato, com resultado buscado e parecer da Patrícia antes de aprovar/liberar. Alteração exige nova revisão. Gestão recebe aviso por e-mail e abre o relatório no app quando tem conta. Sem conta, o gestor recebe o PDF por e-mail. Convite vence em sete dias, no fim do dia em Brasília. Até três lembretes em dias úteis, 8h–18h. Avisar a pessoa focal na véspera e no encerramento. [Regras de DISC](../PRODUCT_RULES.md#disc-e-formulários-públicos)

**Aceite.** Convite antigo e aberto sem token, rascunho parcial, concluído, expirado, revogado e opt-out. Abrir link individual antigo e verificar agradecimento sem resposta, metodologia, download ou PDF em UI, RPC e Storage. Exercitar PDF armazenado, reconstrução fiel e dados insuficientes. Reenvio autorizado chega ao próprio respondente. Testar avaliador CALI e gestão com 4, 5, 14 e 15 respostas, outra empresa e revisão sem parecer ou sem liberação.

**Evidência e lacunas.** O laboratório cobriu link legado, convite, entrega privada, recuperação CALI e negativas de escopo. Para resposta antiga sem PDF, a cópia usa os dados que ainda existirem. Reenvio de cópia recuperada por CALI e fidelidade histórica dependem da conferência da identidade, do arquivo e da revisão. Validar amostra autorizada no ambiente de destino.

## FLOW-17b

**CALI Forms.** Admin cria, compartilha, revisa, exporta e restaura em `/admin/formularios`. Respondente usa `/f/:slug` sem login e pode anexar arquivos nos campos autorizados.

**Atual.** Configurar formulário → abrir → responder com regras condicionais e anexos → confirmar → triar e exportar. Há lixeira, restauração, QR, cartão e prévia social. A restauração chama o schema público, preservando IDs e vínculos. Envio e confirmação usam recibos para retomar e deduplicar. [Página pública](../../src/modules/public/forms/PublicFormPage.tsx) · [Restauração](../../supabase/migrations/20261029180000_cali_forms_lixeira.sql) · [Recibos e validação](../../supabase/migrations/20261112140000_forms_submission_receipts.sql) · [Confirmação](../../supabase/functions/cali-forms-confirmation/index.ts)

**Dados e integrações.** Slug, ID e versão do formulário, perguntas, condicionais, resposta, caminho do anexo, consentimentos, triagem, recibo, lixeira e vínculos com exportação. A rota também atende prévia social pelo rewrite. [Rewrites](../../vercel.json)

**Alvo.** Preservar os links e IDs emitidos, validar formulário e anexos no servidor, persistir resposta com recibo e confirmar uma vez sob retry. Fechar, arquivar e restaurar por ID mantendo respostas e anexos. Importar a evolução de transporte preservando triagem, apresentações e exportações atuais. [Regras de Forms](../PRODUCT_RULES.md#disc-e-formulários-públicos)

**Aceite.** Link ativo/fechado, condicional, tipos de campo, envio com anexo e caminho forjado de outro formulário. Simular queda após gravação e confirmação concorrente. Testar resposta legada sem reenvio, colisão de slug no restore, QR/prévia sem sessão e exportação com anexos autorizados.

**Evidência e lacunas.** SQL, Edge e Mailpit locais cobriram retomada, tentativa repetida, restauração e anexos. Confirmar slugs e arquivos legados com amostra autorizada e testar entrega externa somente na caixa de teste.

## FLOW-17c

**Mapa de People e devolutiva.** Respostas entram pelo portal. Admin consulta `/admin/mapa-de-people`, revisão e relatório por protocolo/ID. Partner atribuído prepara parecer. Destinatário autorizado recebe a devolutiva.

**Atual.** Resposta → triagem → revisão CALI → PDF → envio. Partner atribuído submete parecer para decisão da Patrícia. Envio exige duas confirmações e associa o PDF privado à revisão corrente. A Edge usa o e-mail da resposta consentida. Reenvio usa o arquivo oficial da revisão quando disponível. [Mapa e protocolo](../MAPA_PEOPLE_PARITY.md) · [Revisão do Mapa](../../src/modules/admin/people-map/AdminPeopleMapReviewPage.tsx) · [Edge de envio](../../supabase/functions/workspace-enviar-relatorio-mapa/index.ts)

**Dados e integrações.** ID e protocolo da resposta, empresa/destinatário, respostas de origem, parecer, revisão da devolutiva, PDF e recibo. Portal e Workspace preservam o vínculo do registro e o protocolo emitido.

**Alvo.** Partner atribuído prepara parecer → Patrícia devolve ou aprova → envio/reenvio após “Deseja enviar?” e “Tem certeza?”. Autoria da Patrícia segue para envio direto com as mesmas confirmações. O servidor fixa revisão e destinatário e entrega de fato, com recibo. [Contrato de envio](ADMIN.md#flow-12)

**Aceite.** Preservar protocolo legado, abrir resposta pelo vínculo de origem e negar parecer de Partner sem atribuição. Testar devolução, aprovação, cancelamento em ambas as confirmações, timeout e reenvio deliberado. Conferir revisão, caixa de teste e recibo.

**Evidência e lacunas.** No laboratório, a Edge recusou revisão e destinatário divergentes. Primeiro envio e reenvio deliberado geraram duas mensagens no Mailpit com o PDF oficial da mesma revisão. Repetir cada operação conservou o recibo. Revisões legadas sem PDF exigem anexar o PDF da revisão confirmada. Reconciliar protocolos e trilhas com o portal de teste e conferir o recebimento externo. [Smoke comercial](../../tests/contracts/commercial-http.mjs)
