# Operação diária · Horas, Agenda, Ocorrências e Avisos

## FLOW-07

**Horas e cronômetro.** Admin abre `/admin/horas`. Cliente acompanha consumo e saldo em `/cliente/horas`. Partner usa `/equipe/horas` e o cronômetro do shell, com alvo de trabalho atribuído.

**Atual.** Timer global → alerta após 25 minutos sem presença → confirmação **Continuo aqui** ou pausa aos 30 minutos. A pausa mantém o trecho para justificativa. Escritores Partner encaminham o tempo à revisão. O extrato recebe o lançamento após aprovação Admin. [Horas Admin e Partner](../../src/modules/hours/AdminHoursPage.tsx) · [Presença e revisão](../../supabase/migrations/20261112150000_partner_timer_presence_and_review.sql) · [Aprovação](../../supabase/migrations/20261112150200_approve_partner_timer_hours.sql)

**Dados e integrações.** Empresa e ciclo, ator, alvo, início, pausa e tempo original, último sinal, justificativa, ajuste e decisão. Extrato e saldo somam lançamentos autorizados. Justificativa interna fica com a CALI. Alertas de consumo por ciclo usam 70%, 85% e 100% como parâmetros previstos.

**Alvo.** Timer ativo → alerta de inatividade → **Continuo aqui** renova presença no servidor ou a pausa preserva o trecho. A proposta para homologação é avisar aos 25 minutos sem sinal e pausar aos 30. Enviar aviso no Workspace e por e-mail para Patrícia e para o Partner responsável, com uma entrega por destinatário e episódio. Na volta de aba fechada, recuperar trecho e justificativa. Partner submete o ajuste, Patrícia aprova, devolve ou rejeita. Só a aprovação gera lançamento no extrato. [Regras de Horas](../PRODUCT_RULES.md#horas)

**Aceite.** Rodar com Meet ou edição em outra janela, aba aberta e fechada, duas abas, perda de rede, cron concorrente e retry. Medir alerta, recebimento e pausa. Conferir que “Continuo aqui” desloca o prazo e que a justificativa recupera o trecho. Aprovar uma vez e reler o original e o lançamento. Negar consulta a horas de outro Partner fora do escopo.

**Evidência e lacunas.** PostgreSQL local cobriu presença, inatividade, pausa, recuperação e lançamento único. O dispatcher usa os destinatários e a chave do episódio. Homologar cadência e entrega externa dos dois alertas na configuração de teste, inclusive uso em outra janela.

## FLOW-09

**Agenda, Calendar e Meet.** Admin abre `/admin/calendario`. Cliente acessa a agenda pelo Início. Partner com módulo e atribuição abre `/equipe/calendario`. `/oauth/google/callback` atende o retorno da conexão.

**Atual.** Agenda compõe eventos locais, Google e avisos pertinentes. Solicitação → confirmação ou recusa. Remarcação, cancelamento e visita extra têm comandos próprios, inclusive contraproposta, despesas, convidados, ata e histórico. Sincronização usa Edge com ID externo determinístico e trata colisão de criação. [Agenda Admin e Partner](../../src/modules/calendar/AdminCalendarPage.tsx) · [OAuth Calendar](../../supabase/functions/google-calendar-oauth/index.ts) · [Sincronização](../../supabase/functions/workspace-sync-scheduled-event/index.ts) · [Visita extra](../VISITA_EXTRA_SPEC.md)

**Dados e integrações.** Empresa, evento, pedido, horário e fuso, convidados, situação, despesas e valor aceito, conta Google, calendário, evento externo e Meet. Confirmação local, sincronização Google e entrega de convites têm recibos independentes.

**Alvo.** Autorizar conexão → confirmar evento → sincronizar com vínculo externo estável. Alterar ou cancelar no mesmo vínculo. Conflito ou aceite externo seguido de falha local exige releitura e reconciliação antes de repetir. Convite, Meet, ata e histórico permanecem associados ao evento correto. [Contratos OAuth e agenda](../DATA_CONTRACTS.md#contratos-por-lote)

**Aceite.** Criar, remarcar e cancelar no calendário de teste, incluindo Meet. Conferir tentativa repetida, colisão de ID, ausência de objeto externo, conta errada, token expirado e corrida cancelar × alterar. Conferir visita extra, preço, despesas, convidados e ata. Um vínculo persistente e um efeito externo por operação confirmada.

**Evidência e lacunas.** A Edge e o banco locais exercitaram criação, remarcação, cancelamento e reconciliação com provedor Google simulado. Conta, calendário, participantes e Meet de teste dependem de homologação no destino Google. [Drive](DELIVERY.md#flow-11)

## FLOW-10

**Ocorrências e histórico.** Cliente abre `/cliente/registros` ou o atalho do Início. Admin trata em `/admin/registros`. Partner atribuído usa `/equipe/ocorrencias`.

**Atual.** Abrir → conversar e anexar → atender ou aguardar Cliente → concluir. Cliente pode avaliar ou pedir reabertura. Admin decide reabertura. Partner pode pedir encerramento conforme módulo. Histórico por empresa consulta eventos com filtros, paginação e acesso ao assunto. Cada fechamento tem identidade própria para avaliação. [Ocorrências](../../src/modules/records/WorkspaceRecordsPage.tsx) · [Histórico por empresa](../../supabase/migrations/20261112133100_company_conversation_history.sql) · [Fechamentos e avaliações](../../supabase/migrations/20261112133000_record_closure_feedback.sql)

**Dados e integrações.** Empresa, assunto, protocolo, status, autoria, mensagens, anexos, horas, aprovações e eventos de encerramento. Identificar cada evento por origem e registro. Notas internas e horas restritas permanecem no recorte CALI. Mensagens ficam no aplicativo, com alertas contextuais de menção ou ação quando elegíveis.

**Alvo.** Um assunto por conversa. A ficha Admin abre histórico cronológico por empresa com filtros de período e tipo e navegação para o assunto. Detalhe reúne mensagens, arquivos, horas e aprovações autorizados. Cada encerramento visível ao Cliente gera solicitação de avaliação vinculada ao evento. Reabrir preserva avaliações anteriores. Encerrar de novo cria outra solicitação. Repetir o mesmo comando reaproveita a anterior. [Regras de ocorrências](../PRODUCT_RULES.md#ocorrências-histórico-e-satisfação) · [Coorte de satisfação](ADMIN.md#flow-16)

**Aceite.** Criar, anexar, responder, encerrar, avaliar, pedir reabertura, reabrir e encerrar de novo. Provar duas avaliações independentes e ausência de duplicidade no retry. Abrir assuntos distintos pela lista por empresa, com mais de uma página e empate de data. Negar outra empresa e nota, hora ou byte restrito na lista, no detalhe e no acesso direto.

**Evidência e lacunas.** PostgreSQL local cobriu fechamento, reabertura, nova avaliação e isolamento. A validação do catálogo hospedado precisa incluir vínculos legados e URLs de anexos já emitidas.

## FLOW-13

**Avisos.** Admin em `/admin/avisos` publica para o público definido. Cliente em `/cliente/avisos` interage com conteúdo publicado. Partner autorizado usa `/equipe/avisos`.

**Atual.** Partner prepara → submete → Patrícia devolve ou aprova. A aprovação publica uma vez para o público autorizado e alimenta mural, agenda e sino. A RPC legada de publicação direta foi bloqueada para Partner. Há ciência, comentário e reações. [Mural e visibilidade](../../supabase/migrations/20261011220000_notices_board.sql) · [Revisão Partner](../../supabase/migrations/20261112151000_partner_notice_review.sql)

**Dados e integrações.** Aviso, autor, público/empresas, categoria, datas, estado de publicação, capa, ciência, comentário e reação. Publicação alimenta mural, Agenda e sino. Notificações e e-mail seguem o evento e o público autorizado.

**Alvo.** Partner autorizado prepara → submete → Patrícia devolve para ajuste ou aprova → publicar uma vez. Até aprovação, aviso fica interno e sem efeito para Cliente. Patrícia pode publicar conteúdo próprio. A revisão vale no primeiro rollout. [Regras de Avisos](../PRODUCT_RULES.md#materiais-propostas-e-avisos)

**Aceite.** Testar devolução, reenvio e aprovação. Negar publicação direta pelo Partner via RPC/DML e publicação por Cliente. Antes da aprovação, verificar ausência no mural, agenda, sino, e-mail e bytes da capa Cliente. Depois, conferir público, ciência, reações e uma publicação sob retry.

**Evidência e lacunas.** Ensaio SQL local cobre publicação única, devolução e negativa de publicação direta. Conferir o público no catálogo hospedado. Patrícia pode reavaliar a revisão após observar o volume do primeiro rollout.
