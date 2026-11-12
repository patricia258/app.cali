# Projetos, entregáveis e documentos

## FLOW-05

**Projetos e cronograma.** Admin planeja em `/admin/projetos`. Cliente acompanha e valida o cronograma liberado em `/cliente/cronograma` e no contexto de entregáveis. Partner opera `/equipe/projetos` para trabalhos atribuídos.

**Atual.** Rascunho → compartilhamento para validação → aprovação ou ajuste solicitado → projeto vigente após validação. Execução usa frentes, entregas, dependências, prazo e histórico. Pausa e retomada passam por regras de recálculo e sobreposição. [Cronograma Cliente](../../src/modules/client/timeline/ClientTimelinePage.tsx) · [Aprovação e privacidade do cronograma](../../supabase/migrations/20260905212500_project_schedule_approval_and_draft_privacy_v38.sql) · [Execução e recálculo](../../supabase/migrations/20260906161000_project_lifecycle_recalculate_on_resume_v45.sql)

**Dados e integrações.** Empresa, projeto, frente, revisão de cronograma, datas, dependências, prazo, responsável e status de planejamento e execução. [Frentes contratuais](../FRONTES_CONTRATUAIS_2026-10-03.md)

**Alvo.** CALI prepara o cronograma, libera uma revisão para Cliente e registra a decisão sobre aquela revisão. Ajuste devolve à CALI com justificativa. Aprovação torna o planejamento vigente. Mudança de prazo preserva histórico, recalcula dependências e mantém acesso por empresa, módulo e atribuição. [Regras de projeto](../PRODUCT_RULES.md#projetos-cronograma-e-entregáveis)

**Aceite.** Ocultar rascunho, validar cronograma, testar aprovação e ajuste concorrentes, pausa/retomada, revisão de prazo e sobreposição. Conferir recarga, links e recortes. Negar escrita e leitura de Partner fora do escopo em chamada direta.

**Lacunas.** Reconciliar a ordem dos patches de planejamento e execução com o catálogo efetivo. SLA automático de 72 horas depende de nova confirmação de produto.

## FLOW-06

**Entregáveis.** Admin e Partner atribuído trabalham no contexto de projetos. Cliente abre `/cliente/entregaveis` e valida entregas liberadas da sua empresa.

**Atual.** Execução → revisão interna → revisão Cliente → ajuste solicitado ou aprovação. Detalhe reúne subtarefas, dependências, histórico, conversa e arquivos finais. A interface de ajuste restringe a ação à revisão Cliente. A RPC versionada legada precisa de verificação equivalente do estado. [Entregáveis Cliente](../../src/modules/client/deliverables/ClientDeliverablesPage.tsx) · [Fluxo de entregas](../../supabase/migrations/20260829164500_projects_deliverables_cali_workflow.sql) · [Dependências e revisões de prazo](../../supabase/migrations/20261017150000_deliverable_client_dependencies_and_due_revisions.sql)

**Dados e integrações.** Entrega/protocolo, revisão, prazos, subtarefas, horas, arquivos, conversa, autoria e decisões. Conversa e arquivos anexados à conversa têm projeções próprias. O arquivo final depende da revisão publicada. [Arquivos finais](../../supabase/migrations/20261016120000_deliverable_folder_final_files.sql) · [Histórico](OPERATIONS.md#flow-10)

**Alvo.** Cliente aprova ou solicita ajuste com comentário. Aprovação fecha a revisão e solicita nota de 1 a 5. Notas de 1 a 3 exigem justificativa. Admin pode reabrir o mesmo item com motivo e trilha. Retirar a revisão da visão Cliente durante correção. Nova liberação exige nova aprovação e mantém histórico, IDs e anexos autorizados. [Regras de entregáveis](../PRODUCT_RULES.md#projetos-cronograma-e-entregáveis)

**Aceite.** Abrir detalhe, ajustar, aprovar, avaliar e reabrir. Testar nota baixa sem justificativa, ajuste em estado inelegível via RPC e acesso a bytes retirados por URL direta. Reliberar e confirmar que a aprovação anterior não aprova a revisão nova. Conferir subtarefas e retorno ao objeto de origem.

**Lacunas.** Confirmar elegibilidade na RPC de ajuste e acesso a objetos de revisão retirada no catálogo efetivo. A caracterização local identificou sobreposição de modais na abertura de ajuste por clique. Validar o comportamento por clique, toque e teclado na rodada de correções.

## FLOW-11

**Documentos e Drive.** Admin em `/admin/documentos` organiza e publica o acervo. Cliente em `/cliente/documentos` abre, dá ciência e copia materiais finais autorizados. Partner em `/equipe/documentos` lê o escopo atribuído.

**Atual.** Arquivo ou link → rascunho → publicação → leitura e ciência → retirada ou arquivo. Há versões, validade, pastas de entrega e URLs assinadas. A conexão Drive suporta status, autorização e cópia de arquivo/pasta. A leitura de metadados e a de bytes têm guardas próprias. [Documentos Cliente](../../src/modules/client/documents/ClientDocumentsPage.tsx) · [Biblioteca de documentos](../../supabase/migrations/007_document_library_protocol_system.sql) · [Arquivos de projeto](../../supabase/migrations/20260831034000_documents_project_attachment_access.sql) · [Drive OAuth](../../supabase/functions/google-drive-oauth/index.ts)

**Dados e integrações.** Empresa, projeto, entrega, arquivo, versão, vínculo de publicação, ciência, caminho Storage, conexão Google e recibo da cópia. Storage privado é a origem dos arquivos gerenciados. A cópia usa a conexão e pasta autorizadas. Relatórios publicados podem ser arquivados no Drive configurado.

**Alvo.** Publicar revisão autorizada → Cliente consulta e confirma ciência quando requerida → cópia Drive pendente, concluída ou com erro recuperável. Retry retoma itens pendentes da operação. Troca de conta exige nova vinculação da pasta. Desconectar Drive preserva o vínculo Calendar ainda em uso. Retirada restringe acesso ao arquivo correspondente, incluindo entrega direta conforme a política de download. [Regras de arquivos](../PRODUCT_RULES.md#documentos-e-google-drive)

**Aceite.** Arquivo legado, nova revisão, pasta mista, falha parcial e retomada. Conferir bytes, autorização de empresa e versão, validade, ciência repetida e URL assinada após retirada. Copiar para Google de teste e reconciliar recibo, destino e original. Verificar desconexão sem perda do Calendar.

**Lacunas.** Validar policies vigentes de metadata, Storage, ciência e comentários. Medir a janela residual de URLs antigas e homologar a cópia real com destinos de teste. [Contratos de dados](../DATA_CONTRACTS.md)
