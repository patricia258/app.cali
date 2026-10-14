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
