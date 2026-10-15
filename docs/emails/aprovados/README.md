# CALI Workspace — catálogo de e-mails e modelos aprovados

Atualizado em 13/10/2026. Referência: aprovação da proprietária em conversa.

## Cliente — HTML aprovado

| Tipo | Modelo | Disparo correspondente | Pasta |
|---|---|---|---|
| Boas-vindas no primeiro acesso | V3 | workspace-access: verificação de código de cliente convidado, única vez | boas-vindas-v3.html |
| Cronograma para validação | V1 | project_schedule_review (ou aviso project "Planejamento para sua validação") | cronograma-validacao-v1.html |
| Lembrete de cronograma | V1 | project_schedule_reminder | lembrete-cronograma-v1.html |
| Projeto concluído | V2 | project "Projeto concluído" | projeto-concluido-v2.html |
| Projeto cancelado | V2 | project_lifecycle "Execução cancelada" para escopo Projeto; ou project "Projeto cancelado" | projeto-cancelado-v2.html |
| Entregável para validação | V2 (72 horas úteis) | deliverable_status "Sua validação é necessária" | entregavel-validacao-v2.html |
| Subtarefa aguardando aprovação | V1 | task_client_review, identificação inequívoca da subtarefa | subtarefa-validacao-v1.html |
| A CALI precisa de um retorno | V1 | client_dependency, identificação inequívoca da pendência e prazo real | solicitacao-retorno-v1.html |
| Documento para ciência | V1 | document + arquivo publicado que exige ciência (somente evento já existente) | documento-ciencia-v1.html |

HTML fonte nesta pasta. Os módulos TypeScript são cópias literais desses seis arquivos, usadas pelas duas Edge Functions de envio. **Não modificar textos/layouts aprovados sem aprovação nova.**

### Não aprovados / pendentes
- Código de acesso V2: **pendente aprovação explícita**; o envio de código continua com HTML e assunto anteriores.
- Ajuste registrado V1: **descartado por redundância**; não implantar.
- Rebriefing V1: **ainda em análise**; não implantar.
- Demais e-mails de cliente, administração e Partner: aguardar redesenho por tipo, com o mesmo fluxo de aprovação.

### Preservação de funcionamento
- Não alterar o evento que gera a notificação, a autenticação do hook, destinatários, idempotência, marcação de `emailed_at`, ou regras de e-mail normal.
- Quando evento não tem correspondência aprovada e confirmada, manter template anterior.
- Apenas perfil cliente recebe os modelos aprovados de notificação.
- O resumo da administradora, relatórios, convite/boas-vindas Partner e outros emissores não foram redesenhados.
- Conversa comum não deve gerar e-mail; apenas menção com @.

## Próximas revisões por perfil
Cliente: rebriefing, entregável cancelado, subtarefa para aprovação, dependência do cliente, pendência atrasada, prazo reprogramado, documentos, relatório, agendamento, ocorrência, atualização de equipe, menções. Admin e Partner: após finalizar os clientes.

## Regra oficial de remetente e rodapé — 13/10/2026

- Remetente obrigatório: `APP CALI RH <workspace@calirh.com>`.
- Resposta obrigatória: `nao-responda@calirh.com`.
- Nenhum envio deve usar endereço pessoal da fundadora.
- Todos os e-mails precisam exibir: **E-mail automático. Não responda a esta mensagem.** E indicar que o contato deve ocorrer pelo **Workspace**.
- Os 12 layouts aprovados estão arquivados nesta pasta com a linha de rodapé. **Apenas oito** já estão associados a disparos operacionais no envio do Workspace; `pendencia-atraso-v1`, `prazo-reprogramado-v1`, `documento-final-v2` e `relatorio-mensal-v2` ficam preservados como **HTML aprovado, ainda sem implementação do layout**. Seu envio anterior não foi modificado nesta rodada.


## Solicitações de agendamento extra — cliente (aprovadas 14/10/2026)

| Modalidade | Modelo | Condições comunicadas | Arquivo |
|---|---|---|---|
| Visita presencial extra | V2 | R$ 800 por até 4 horas; despesas adicionais com comprovantes; 2 datas; sujeita a análise de agenda | visita-presencial-extra-solicitacao-v2.html |
| Reunião online extra | V3 | R$ 200 por 1 hora ou R$ 300 por 1h30; valor da duração escolhida; 2 datas; sujeita a análise de agenda | reuniao-online-extra-solicitacao-v3.html |

**Integração:** os modelos HTML também estão no módulo `approved-client-templates.ts` da função `workspace-notification-email-hook`, preservando remetente `APP CALI RH <workspace@calirh.com>` e `reply_to: nao-responda@calirh.com`. Isso **não habilita sozinho** o envio de recibo inicial: a inserção de `scheduling_request` no banco atualmente é dirigida à administradora, e não existe evento de notificação ao cliente, nessa fase, que o hook possa usar sem nova regra. Não criar notificações adicionais nem modificar banco/telas por causa deste registro. O fluxo precisa de autorização específica para incorporar o disparo do recibo no evento correto.

**Observação de consistência:** a tela do cliente tem tabela online fixa 1h/R$ 200 ou 1h30/R$ 300, mas a rotina `client_request_online_extra_v2` ainda aciona `client_request_online_extra_v1` que marca orçamento pendente; isso deve ser alinhado em uma alteração separada, sem modificar a regra comercial pelo e-mail.

## Disparo dos comprovantes extras — implementação de 14/10/2026

- Recibo exclusivo para o cliente solicitante, com `notification_type='scheduling_extra_request_receipt'`, `entity_type='scheduling_request'` e `entity_id` do pedido.
- Registrado APÓS assinatura das condições nos RPCs `create_extra_visit_request_v1` e `client_request_online_extra_v2`, antes de retornarem sucesso.
- Usa mecanismo existente `notifications_email_dispatch` → `workspace-notification-email-hook` → Resend com `emailed_at` e chave idempotente da notificação. Não cria nova fila, trigger ou destinatário administrativo.
- Na reunião online, o valor é fixo e previamente aceito: 60 minutos R$ 200,00 (20000 centavos), 90 minutos R$ 300,00 (30000 centavos), registrado com consentimento do solicitante. Nenhuma cobrança é realizada pelo envio do pedido.
- Os dois horários, assunto, objetivo, duração, nome de quem assinou e endereço da visita (quando informado) são lidos do pedido real no momento do e-mail. O formulário só envia dois horários; não inventar dados.
- O HTML aprovado é preservado em `docs/emails/aprovados/cliente/`, e o módulo de templates contém cópia literal (somente correção de fechamento da tag strong do preço online).
- **Não são cobertos:** novas opções, reagendamento, confirmação definitiva, cancelamento. Permanecem em revisão de layouts própria.
- **Atenção ao legado:** o botão administrativo de orçamento manual online pode existir para outros fluxos; a nova solicitação assinada usa o valor fixo. Evitar registrar orçamento manual novo sobre uma solicitação já aceita.

## Confirmação de atendimento extra — modelos aprovados (15/10/2026)

- **Visita presencial extra V1:** `visita-extra-confirmada-v1.html`, evento `scheduling_extra_confirmed` somente quando `status` passa para `confirmed`, evento final e data selecionada estão registrados.
- **Reunião online extra V1:** `reuniao-online-extra-confirmada-v1.html`, mesma regra, preço fixo aceito conforme duração (1 hora R$ 200 / 1h30 R$ 300).
- A função `notify_confirmed_extra_request_v1` envia uma única notificação ao solicitante para qualquer confirmação de atendimento extra (CALI ou aceite de uma nova data). A notificação anterior de cliente na `admin_confirm_extra_visit_v1` é substituída para não enviar duplicado; avisos à administração preservados.
- Os HTMLs são copiados integralmente para `approved-client-templates.ts`, com dados validados contra o evento de calendário.
- Sem envio retroativo, sem alteração de valores ou regras de calendário; templates de novas datas e reagendamento seguem aguardando aprovação.

## Novas datas e pedido de reagendamento de visita extra — aprovados 15/10/2026

| Tipo | HTML aprovado | Disparo |
|---|---|---|
| CALI propõe 1–2 opções de data para extra | `extra-novas-datas-v1.html` | Aviso `scheduling_response` que já existe; apenas troca layout quando o pedido está `client_review` e modalidade é extra |
| Cliente solicita reagendar visita extra previamente confirmada | `extra-reagendamento-solicitado-v1.html` | Novo aviso `scheduling_extra_reschedule_requested` apenas no evento `confirmed → reschedule_review` com motivo e duas datas reais |

Não gera notificações duplicadas para propostas administrativas. Em outros pedidos, mantém o template existente. A confirmação de reagendamento definitivo continuará usando seu próprio e-mail já aprovado de confirmação, após aprovação de nova data no sistema. Remetente e rodapé preservados.

## Visita extra cancelada e reagendamento confirmado — aprovados (15/10/2026)

- **Visita extra cancelada V2**: `extra-visita-cancelada-v2.html`. Conteúdo atualizado com condição de multa de 20% (R$ 160,00) somente após avaliação, sem cobrança por este e-mail. Notificação `scheduling_extra_cancelled` para visita presencial previamente confirmada, quando `confirmed -> cancelled`.
- **Nova data da visita extra confirmada V1**: `extra-visita-reagendada-confirmada-v1.html`. Reaproveita notificação `scheduling_extra_confirmed`; reconhece campos da visita reagendada e usa a data antiga e a nova. Não gera aviso duplicado.
- O código vigente contempla decisão de multa de 20% apenas na visita presencial, via função administrativa. Para online existe condição genérica de avaliação de cobrança, mas não há cálculo de 20% implementado. Não assumir que está ativo.
- **Prazo de aviso para isenção:** pendente confirmação da proprietária; não confundir antecedência de solicitação (48h) com antecedência de cancelamento.


## Modelos de cliente — ocorrências, equipe e menções (aprovados 15/10/2026)
- `ocorrencia-situacao-v1.html`: evento `record_status`; mostrar a situação textual que constava na notificação, não a situação corrente.
- `ocorrencia-reabertura-v1.html`: `record_reopen_decision`; buscar a decisão formal e a justificativa específica daquele momento, inclusive quando recusada.
- `equipe-atualizacao-mensal-v1.html`: `team_month_update`; referência mensal do lembrete, sem confundir com o mês corrente.
- `mencao-conversa-v1.html`: `chat_mention`; enviar ao cliente mencionado com autor e trecho da notificação. **Mensagens comuns não geram e-mail.**
- Todos os HTMLs são cópias literais dos aprovados. Não cria triggers, avisos, novos destinatários nem muda remetente ou reply_to.
- Quando dados não permitem associar o registro original com segurança, a função mantém o layout genérico anterior; sem inventar decisões ou nomes.

## Entregáveis — modelos de cliente aprovados em 15/10/2026

- **Rebriefing V2:** `entregavel-rebriefing-v2.html`, notificação existente `deliverable_status` / `Rebriefing necessário`; exige entregável visível em rebriefing.
- **Cancelamento V1:** `entregavel-cancelado-v1.html`, notificação existente `deliverable_status` / `Entregável cancelado`; inclui motivo de cancelamento efetivamente registrado.
- Os demais status e regras de envio não foram alterados. Caso a referência não seja inequívoca, mantém o modelo anterior. Sender/reply-to e rodapé preservados.


## Cliente — código de acesso V3 e ajuste registrado V1 (15/10/2026)

- **Código V3:** `codigo-acesso-v3.html`. Renderizador `workspace-access/approved-code-v3.ts` utiliza apenas para `role='client'`. As regras existentes de código de 6 dígitos, validade 10 minutos, uso único e limitação de solicitações não foram alteradas. Admin/Partner preservam o HTML anterior; assunto novo somente para o Cliente.
- **Ajuste registrado V1:** `ajuste-registrado-v1.html`. Evento `adjustment` existente, título `Ajuste registrado no projeto`, registro `deliverable_adjustment`. Confere solicitação de ajuste comum originada pela CALI, motivo da notificação, empresa e entregável visível; não cria disparos novos.
- Remetente e reply_to novos preservados. Cópias HTML literais aprovadas, sem novas tabelas, fluxos de autenticação, gatilhos ou telas.
