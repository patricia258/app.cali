# Inventário auditado — E-mails CALI Workspace (13/10/2026)

**Fonte:** repositório `patricia258/app.cali` (Edge Functions e migrações), funções ativas e schema `cali_workspace` no projeto Supabase `kqtbfeeqbcllwvlkbrkq`, implantação da Vercel `app-cali`. Status de disparo depende de `email_required` e do evento. Presença no código não garante histórico de envio.

## Emissores atuais

| Origem | Função / origem real | Papel |
|---|---|---|
| Login por código | `workspace-access` | Código de acesso; agora também boas-vindas no primeiro acesso de cliente convidado; boas-vindas Partner existente |
| Notificações gerais | `workspace-notification-email-hook` | Envia apenas avisos `email_required=true`, com proteção de duplicidade `emailed_at`; templates selecionados conforme evento |
| Relatório executivo | `workspace-send-executive-report` | Envio direto via Resend, template próprio, sem usar o hook genérico |
| Resumo da administradora | `workspace-admin-daily-summary` | E-mail próprio diário às 19h (Brasília) |
| Convite Equipe CALI | `workspace-staff-invite` | Convite inicial Partner |
| Digest de conversas | `workspace-daily-chat-digest` | Função legada; cron documentado como desativado (regra: conversa comum não gera e-mail) |
| Emissores históricos | `workspace-movement-email` e `workspace-movement-email-hook` | Permanecem ativos no Supabase; não substituir sem confirmar utilização; não constam das Edge Functions versionadas no repositório atual |

## Cliente — estado dos layouts

| Situação | Evento/fonte encontrado | Estado visual |
|---|---|---|
| Código de acesso | `workspace-access` | Modelo V2 **sem aprovação explícita**: manter anterior |
| Boas-vindas no primeiro acesso | `workspace-access` após verificação de convite | **V3 aprovado e publicado** |
| Cronograma enviado para validação | `project_schedule_review` / `project` de validação | **V1 aprovado e publicado** |
| Lembrete de validação do cronograma | `project_schedule_reminder` | **V1 aprovado e publicado** |
| Projeto concluído | `project` com título `Projeto concluído` | **V2 aprovado e publicado** |
| Projeto cancelado | `project_lifecycle` cancelamento de projeto | **V2 aprovado e publicado** |
| Entregável para validação | `deliverable_status` com título `Sua validação é necessária` | **V2 (72 horas úteis) aprovado e publicado** |
| Entregável em rebriefing ou cancelado | `deliverable_status` | Pendente novo layout; rebriefing V1 não aprovado |
| Ajuste registrado | `deliverable_status` | Modelo anterior descartado por redundância, não implantado |
| Subtarefa aguardando validação | `task_client_review` | Pendente novo layout |
| Dependência do cliente | `client_dependency` | Pendente novo layout |
| Dependência em atraso | `client_dependency_overdue` | Pendente novo layout |
| Prazo reprogramado | `deliverable_due_revision` | Pendente novo layout |
| Documentos e ciência | Avisos `document` e fluxos de documentos | Pendente novo layout |
| Relatório executivo mensal | `workspace-send-executive-report` | Pendente novo layout |
| Resposta de agendamento | `scheduling_response` | Pendente novo layout |
| Ocorrência: status e reabertura | `record_status`, `record_reopen_decision` | Pendente novo layout |
| Atualização mensal da equipe | `team_month_update` | Pendente novo layout |
| Menção com @ | `chat_mention` | Pendente novo layout |
| Aviso geral da CALI | `notice` | Pendente novo layout |

## Administração — próximos a redesenhar

- Cronograma aprovado (`project_schedule_approved`), cronograma com ajuste solicitado (`project_schedule_adjustment`).
- Entregável aprovado/ajuste/rebriefing (`deliverable_status`).
- Nova ocorrência e solicitação de reabertura (`record_opened`, `record_reopen_request`).
- Pedido de agendamento (`scheduling_request`) e confirmação, quando marcado para e-mail.
- Alertas de capacidade (`capacity_alert`), avisos de validade documental, menções (`chat_mention`).
- Resumo das 19h (`workspace-admin-daily-summary`).

## Equipe CALI / Partner — próximos a redesenhar

- Convite (`workspace-staff-invite`), boas-vindas (`workspace-access`) e menções (`chat_mention`).

## Regras de preservação

- Mensagens comuns de conversa: apenas sininho, **não e-mail**; exceção: menção com @. Trigger ativo `notifications_chat_without_email`.
- Modelos novos só são aplicados quando evento e destinatário correspondem exatamente aos aprovados. Os demais continuam no envio genérico existente.
- O cliente é o destinatário do corpo; empresa só no assunto para os novos modelos de notificação, respeitando HTML aprovado; não inventar motivos/prazos.
- Não modificar autenticação do hook, token, envio do Resend, `emailed_at`, limites de tentativas ou prazo de código.
- Testes de ponta a ponta exigem disparar evento real controlado; compilação/publicação não são comprovante de entrega na caixa postal.
