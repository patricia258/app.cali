# Operação diária · Horas, Agenda, Ocorrências e Avisos

## FLOW-07

**Horas e cronômetro.** Admin abre `/admin/horas`. Cliente acompanha consumo e saldo em `/cliente/horas`. Partner usa `/equipe/horas` e o cronômetro do shell, com alvo de trabalho atribuído.

**Atual.** Há timer global, pausa/encerramento, extrato, capacidade e lançamentos manuais. A regra legada insere horas de Partner diretamente ao finalizar o timer, inclusive no encerramento por inatividade. O sinal depende de aba visível e interação recente. Reunião no Meet ou edição em outra janela pode parecer inatividade. [Horas Admin e Partner](../../src/modules/shared/hours/AdminHoursPageV3.tsx) · [Timer e notificações legados](../../supabase/migrations/20261015090000_staff_timer_direct_and_notifications.sql) · [Timer e pausa](../../supabase/migrations/20260901173000_hours_connect_timer_pause.sql)

**Dados e integrações.** Empresa e ciclo, ator, alvo, início, pausa e tempo original, último sinal, justificativa, ajuste e decisão. Extrato e saldo somam lançamentos autorizados. Justificativa interna fica com a CALI. Alertas de consumo por ciclo usam 70%, 85% e 100% como parâmetros previstos.

**Alvo.** Timer ativo → alerta de inatividade → **Continuo aqui** renova presença no servidor ou a pausa preserva o trecho. A proposta para homologação é avisar aos 25 minutos sem sinal e pausar aos 30. Enviar aviso no Workspace e por e-mail para Patrícia e para o Partner responsável, com uma entrega por destinatário e episódio. Na volta de aba fechada, recuperar trecho e justificativa. Partner submete o ajuste, Patrícia aprova, devolve ou rejeita. Só a aprovação gera lançamento no extrato. [Regras de Horas](../PRODUCT_RULES.md#horas)

**Aceite.** Rodar com Meet ou edição em outra janela, aba aberta e fechada, duas abas, perda de rede, cron concorrente e retry. Medir alerta, recebimento e pausa. Conferir que “Continuo aqui” desloca o prazo e que a justificativa recupera o trecho. Aprovar uma vez e reler o original e o lançamento. Negar consulta a horas de outro Partner fora do escopo.

**Lacunas.** Homologar janela e cadência do job com o fluxo final. Reconciliar todos os escritores legados, incluindo o encerramento automático, antes de ativar a fila de aprovação.

## FLOW-09

**Agenda, Calendar e Meet.** Admin abre `/admin/calendario`. Cliente acessa a agenda pelo Início. Partner com módulo e atribuição abre `/equipe/calendario`. `/oauth/google/callback` atende o retorno da conexão.

**Atual.** Agenda compõe eventos locais, Google e avisos pertinentes. Solicitação → confirmação ou recusa. Remarcação, cancelamento e visita extra têm comandos próprios, inclusive contraproposta, despesas, convidados, ata e histórico. Sincronização usa Edge com ID externo determinístico e trata colisão de criação. [Agenda Admin e Partner](../../src/modules/shared/calendar/AdminCalendarPage.tsx) · [OAuth Calendar](../../supabase/functions/google-calendar-oauth/index.ts) · [Sincronização](../../supabase/functions/workspace-sync-scheduled-event/index.ts) · [Visita extra](../VISITA_EXTRA_SPEC.md)

**Dados e integrações.** Empresa, evento, pedido, horário e fuso, convidados, situação, despesas e valor aceito, conta Google, calendário, evento externo e Meet. Confirmação local, sincronização Google e entrega de convites têm recibos independentes.

**Alvo.** Autorizar conexão → confirmar evento → sincronizar com vínculo externo estável. Alterar ou cancelar no mesmo vínculo. Conflito ou aceite externo seguido de falha local exige releitura e reconciliação antes de repetir. Convite, Meet, ata e histórico permanecem associados ao evento correto. [Contratos OAuth e agenda](../DATA_CONTRACTS.md#contratos-por-lote)

**Aceite.** Criar, remarcar e cancelar no calendário de teste, incluindo Meet. Conferir tentativa repetida, colisão de ID, ausência de objeto externo, conta errada, token expirado e corrida cancelar × alterar. Conferir visita extra, preço, despesas, convidados e ata. Um vínculo persistente e um efeito externo por operação confirmada.

**Lacunas.** Inventariar escritores e permissões OAuth no destino. Homologar conta, pasta e calendário de teste e verificar conexão remanescente após desconectar [Drive](DELIVERY.md#flow-11).

## FLOW-10

**Ocorrências e histórico.** Cliente abre `/cliente/registros` ou o atalho do Início. Admin trata em `/admin/registros`. Partner atribuído usa `/equipe/ocorrencias`.

**Atual.** Abrir → conversar e anexar → atender ou aguardar Cliente → concluir. Cliente pode avaliar ou pedir reabertura. Admin decide reabertura. Partner pode pedir encerramento conforme módulo. A lista Admin filtra por empresa e o detalhe concentra conversa, status e anexos. [Ocorrências](../../src/modules/shared/records/WorkspaceRecordsPage.tsx) · [Feedback e reabertura](../../supabase/migrations/20260905181500_records_feedback_reopen_decision_satisfaction_v28.sql) · [Anexos](../../supabase/migrations/20261014230000_chat_attachments_client_deliverable_partner_records.sql)

**Dados e integrações.** Empresa, assunto, protocolo, status, autoria, mensagens, anexos, horas, aprovações e eventos de encerramento. Identificar cada evento por origem e registro. Notas internas e horas restritas permanecem no recorte CALI. Mensagens ficam no aplicativo, com alertas contextuais de menção ou ação quando elegíveis.

**Alvo.** Um assunto por conversa. A ficha Admin abre histórico cronológico por empresa com filtros de período e tipo e navegação para o assunto. Detalhe reúne mensagens, arquivos, horas e aprovações autorizados. Cada encerramento visível ao Cliente gera solicitação de avaliação vinculada ao evento. Reabrir preserva avaliações anteriores. Encerrar de novo cria outra solicitação. Repetir o mesmo comando reaproveita a anterior. [Regras de ocorrências](../PRODUCT_RULES.md#ocorrências-histórico-e-satisfação) · [Coorte de satisfação](ADMIN.md#flow-16)

**Aceite.** Criar, anexar, responder, encerrar, avaliar, pedir reabertura, reabrir e encerrar de novo. Provar duas avaliações independentes e ausência de duplicidade no retry. Abrir assuntos distintos pela lista por empresa, com mais de uma página e empate de data. Negar outra empresa e nota, hora ou byte restrito na lista, no detalhe e no acesso direto.

**Lacunas.** O contrato candidato de detalhe por assunto precisa de índice por empresa. Reconciliar links e anexos legados e testar a vinculação da solicitação anterior ao encerramento original quando a resposta chegar após a reabertura.

## FLOW-13

**Avisos.** Admin em `/admin/avisos` publica para o público definido. Cliente em `/cliente/avisos` interage com conteúdo publicado. Partner autorizado usa `/equipe/avisos`.

**Atual.** Cadastro → publicação → mural, agenda e notificações conforme o alvo. Há ciência, comentário e reações. O fluxo Partner legado chama `partner_publish_notice` e publica diretamente. [Mural e visibilidade](../../supabase/migrations/20261011220000_notices_board.sql) · [Publicação Partner legada](../../supabase/migrations/20261012230000_staff_partner_notices_and_decisions.sql)

**Dados e integrações.** Aviso, autor, público/empresas, categoria, datas, estado de publicação, capa, ciência, comentário e reação. Publicação alimenta mural, Agenda e sino. Notificações e e-mail seguem o evento e o público autorizado.

**Alvo.** Partner autorizado prepara → submete → Patrícia devolve para ajuste ou aprova → publicar uma vez. Até aprovação, aviso fica interno e sem efeito para Cliente. Patrícia pode publicar conteúdo próprio. A revisão vale no primeiro rollout. [Regras de Avisos](../PRODUCT_RULES.md#materiais-propostas-e-avisos)

**Aceite.** Testar devolução, reenvio e aprovação. Negar publicação direta pelo Partner via RPC/DML e publicação por Cliente. Antes da aprovação, verificar ausência no mural, agenda, sino, e-mail e bytes da capa Cliente. Depois, conferir público, ciência, reações e uma publicação sob retry.

**Lacunas.** Substituir ou bloquear a RPC legada e seus efeitos pré-aprovação. Reavaliar a exigência de revisão após observar o volume do primeiro rollout.
