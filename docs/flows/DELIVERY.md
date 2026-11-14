# Projetos, entregáveis e documentos

## FLOW-05

**Projetos e cronograma.** Admin planeja em `/admin/projetos`. Cliente acompanha e valida o cronograma liberado em `/cliente/cronograma` e no contexto de entregáveis. Partner opera `/equipe/projetos` para trabalhos atribuídos.

**Atual.** Rascunho → compartilhamento para validação → aprovação ou ajuste solicitado → projeto vigente após validação. Execução usa frentes, entregas, dependências, prazo e histórico. Pausa e retomada passam por regras de recálculo e sobreposição. [Cronograma Cliente](../../src/modules/client/timeline/ClientTimelinePage.tsx) · [Aprovação e privacidade do cronograma](../../supabase/migrations/20260905212500_project_schedule_approval_and_draft_privacy_v38.sql) · [Execução e recálculo](../../supabase/migrations/20260906161000_project_lifecycle_recalculate_on_resume_v45.sql)

**Dados e integrações.** Empresa, projeto, frente, revisão de cronograma, datas, dependências, prazo, responsável e status de planejamento e execução. [Frentes contratuais](../FRONTES_CONTRATUAIS_2026-10-03.md)

**Alvo.** CALI prepara o cronograma, libera uma revisão para Cliente e registra a decisão sobre aquela revisão. Ajuste devolve à CALI com justificativa. Aprovação torna o planejamento vigente. Mudança de prazo preserva histórico, recalcula dependências e mantém acesso por empresa, módulo e atribuição. [Regras de projeto](../PRODUCT_RULES.md#projetos-cronograma-e-entregáveis)

**Aceite.** Ocultar rascunho, validar cronograma, testar aprovação e ajuste concorrentes, pausa/retomada, revisão de prazo e sobreposição. Conferir recarga, links e recortes. Negar escrita e leitura de Partner fora do escopo em chamada direta.

No rascunho, Admin pode renomear a frente ou excluí-la após indicar destino para os entregáveis vinculados. O botão de envio fica disponível quando há data planejada de início, pelo menos um entregável, prazos preenchidos e entregáveis em todas as frentes ativas. Decisão sobre ajuste exige justificativa. Lembrete registra notificação do cronograma pendente. [Rascunho e publicação](../../tests/e2e/project-creation.cjs) · [Decisão e lembrete](../../tests/e2e/project-components.cjs)

Cliente abre a revisão no projeto selecionado, inclusive por acesso direto a Entregáveis. Troca de ordem exige complexidade equivalente. Falha preserva o pedido para nova tentativa. Ajuste enviado e aprovação atualizam a página aberta. A aprovação mantém as datas planejadas. No Kanban Admin, soltar um cartão aciona a mesma transição da seleção de situação pelo ID do entregável. [Aprovação e Kanban](../../tests/e2e/project-components.cjs)

**Evidência e lacunas.** Navegação, visualização e operações de projeto foram exercitadas em fixtures. A ordem dos patches e os escritores do cronograma precisam coincidir no catálogo hospedado. O SLA automático de 72 horas depende de decisão de produto.

## FLOW-06

**Entregáveis.** Admin e Partner atribuído trabalham no contexto de projetos. Cliente abre `/cliente/entregaveis` e valida entregas liberadas da sua empresa.

**Atual.** Execução → revisão interna → revisão Cliente → ajuste solicitado ou aprovação. Detalhe reúne subtarefas, dependências, histórico, conversa e arquivos finais. A RPC valida a revisão vigente e o estado antes de aceitar ajuste ou aprovação. Ao corrigir, o Admin informa motivo e a revisão fica oculta até nova liberação. [Entregáveis Cliente](../../src/modules/client/deliverables/ClientDeliverablesPage.tsx) · [Ciclo de aprovação](../../supabase/migrations/20261112153000_deliverable_review_cycles.sql) · [Guardas de leitura](../../supabase/migrations/20261112153100_guard_delivery_review_consumers.sql)

**Dados e integrações.** Entrega/protocolo, revisão, prazos, subtarefas, horas, arquivos, conversa, autoria e decisões. Conversa e arquivos anexados à conversa têm projeções próprias. O arquivo final depende da revisão publicada. [Arquivos finais](../../supabase/migrations/20261016120000_deliverable_folder_final_files.sql) · [Histórico](OPERATIONS.md#flow-10)

Quando a RPC recusa uma revisão desatualizada, as ações ficam bloqueadas. **Atualizar dados** busca a revisão vigente na mesma página. Após a atualização, o Cliente abre a revisão vigente para decidir. [Jornada de revisão desatualizada](../../tests/e2e/journeys.cjs)

O retorno do cronômetro usa os identificadores de projeto, entregável e subtarefa. Projetos abre a visão geral do entregável ou destaca a subtarefa correspondente na aba Subtarefas. [Retorno ao trabalho](../../tests/e2e/project-components.cjs)

A aba Conversas mantém rascunhos separados para o canal Cliente e para notas internas. Uma falha de envio preserva o rascunho e os anexos. A lista tem rolagem própria, mantendo campo e ações da entrega acessíveis. [Conversa, canais e retry](../../tests/e2e/project-components.cjs)

**Alvo.** Cliente aprova ou solicita ajuste com comentário. Aprovação fecha a revisão e solicita nota de 1 a 5. Notas de 1 a 3 exigem justificativa. Admin pode reabrir o mesmo item com motivo e trilha. Retirar a revisão da visão Cliente durante correção. Nova liberação exige nova aprovação e mantém histórico, IDs e anexos autorizados. [Regras de entregáveis](../PRODUCT_RULES.md#projetos-cronograma-e-entregáveis)

**Aceite.** Abrir detalhe, ajustar, aprovar, avaliar e reabrir. Testar nota baixa sem justificativa, ajuste em estado inelegível via RPC e acesso a bytes retirados por URL direta. Reliberar e confirmar que a aprovação anterior não aprova a revisão nova. Conferir subtarefas e retorno ao objeto de origem.

**Evidência e lacunas.** Provas locais cobriram correção, retirada de visibilidade, nova aprovação e ajuste com estado obsoleto. Playwright verificou ajuste por clique, toque e teclado. Conferir negativas para bytes e URLs assinadas no catálogo hospedado. [Jornadas](../../tests/e2e/journeys.cjs)

## FLOW-11

**Documentos e Drive.** Admin em `/admin/documentos` organiza e publica o acervo. Cliente em `/cliente/documentos` abre, dá ciência e copia materiais finais autorizados. Partner em `/equipe/documentos` lê o escopo atribuído.

**Atual.** Arquivo ou link → rascunho → publicação → leitura e ciência → retirada ou arquivo. Há versões, validade, pastas de entrega e URLs assinadas. A conexão Drive suporta status, autorização e cópia de arquivo/pasta. A leitura de metadados e a de bytes têm guardas próprias. [Documentos Cliente](../../src/modules/client/documents/ClientDocumentsPage.tsx) · [Biblioteca de documentos](../../supabase/migrations/007_document_library_protocol_system.sql) · [Arquivos de projeto](../../supabase/migrations/20260831034000_documents_project_attachment_access.sql) · [Drive OAuth](../../supabase/functions/google-drive-oauth/index.ts)

**Dados e integrações.** Empresa, projeto, entrega, arquivo, versão, vínculo de publicação, ciência, caminho Storage, conexão Google e recibo da cópia. Storage privado é a origem dos arquivos gerenciados. A cópia usa a conexão e pasta autorizadas. Relatórios publicados podem ser arquivados no Drive configurado.

**Alvo.** Publicar revisão autorizada → Cliente consulta e confirma ciência quando requerida → cópia Drive pendente, concluída ou com erro recuperável. Retry retoma itens pendentes da operação. Troca de conta exige nova vinculação da pasta. Desconectar Drive preserva o vínculo Calendar ainda em uso. Retirada restringe acesso ao arquivo correspondente, incluindo entrega direta conforme a política de download. [Regras de arquivos](../PRODUCT_RULES.md#documentos-e-google-drive)

**Aceite.** Arquivo legado, nova revisão, pasta mista, falha parcial e retomada. Conferir bytes, autorização de empresa e versão, validade, ciência repetida e URL assinada após retirada. Copiar para Google de teste e reconciliar recibo, destino e original. Verificar desconexão sem perda do Calendar.

**Evidência e lacunas.** No laboratório, a Edge operou com provedor Google simulado e destinos sintéticos. O ensaio inclui retomada da cópia e desvinculação de Drive preservando Calendar. Homologar conta e pasta de teste no Google e conferir bytes e validade das URLs no catálogo hospedado. [Contratos de dados](../DATA_CONTRACTS.md)
