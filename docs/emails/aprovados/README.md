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
