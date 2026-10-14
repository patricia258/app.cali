# Mapa de ação e reação — administradora ↔ cliente

Levantado em 2026-10-13 lendo as regras de aviso do banco (gatilhos e funções). "Sino" = aviso dentro do Workspace. "E-mail" = o aviso também sai por e-mail. Coluna "Conferido" diz se foi testado com conta real na Company IN.

## Ações da CALI → reação no cliente

| Ação da CALI | Sino | E-mail | Abre em | Conferido |
|---|---|---|---|---|
| Envia cronograma para validação | sim | sim | Projetos | não |
| Projeto entra em execução | sim | não | Projetos | não |
| Projeto concluído ou cancelado | sim | sim | Projetos | não |
| Entregável: em andamento / stand by / aprovado | sim | não | a entrega | não |
| Entregável: aguardando validação do cliente | sim | sim | a entrega | não |
| Entregável: ajuste registrado, rebriefing, cancelado | sim | sim | a entrega | não |
| Mensagem na conversa do entregável | sim | não | a entrega | não |
| Mensagem na conversa da subtarefa | sim | sim | a entrega | não |
| Subtarefa enviada para aprovação do cliente | sim (novo) | sim (novo) | a entrega | não |
| Dependência do cliente registrada | sim (novo) | sim (novo) | a entrega | não |
| Prazo reprogramado | sim (novo) | sim (novo) | a entrega | não |
| Documento liberado | sim | só se for final ou exigir ciência | Documentos (página) | não |
| Relatório publicado | sim | não (o envio do relatório tem e-mail próprio) | Relatórios (página) | não |
| Comentário em documento, relatório ou evento | sim | não | página do módulo | não |
| Evento criado, alterado ou cancelado | sim | conforme a regra da agenda | Agenda | não |
| Comunicado publicado | sim | conforme o comunicado | Avisos | não |
| Alerta de capacidade mensal | sim | sim | Horas | não |

## Ações do cliente → reação na CALI

| Ação do cliente | Sino | E-mail | Abre em | Conferido |
|---|---|---|---|---|
| Aprova o cronograma | sim | sim | Projetos | não |
| Pede ajuste no cronograma | sim | sim | Projetos | não |
| Aprova entregável / pede ajuste / pede rebriefing | sim | sim | a entrega | não |
| Mensagem na conversa do entregável | sim | não | a entrega | não |
| Mensagem na conversa da subtarefa | sim | não | a entrega | não |
| Aprova subtarefa | sim | não | a entrega | não |
| Pede ajuste na subtarefa | sim | não | a entrega | não |
| Confirma recebimento de documento | sim (novo) | não | Documentos | não |
| Envia documento | sim | não | Documentos | não |
| Pergunta em relatório | sim | — | Ocorrências | não |
| Abre ocorrência / responde | sim | — | Ocorrências | não |
| Solicita agendamento, aceita ou pede mudança | sim | conforme a regra da agenda | Agenda | não |
| Responde NPS / avalia entrega | sim | — | NPS | não |

## Lacunas que continuam abertas

1. Dependência em atraso não gera lembrete automático (precisa de rotina diária).
2. Aviso de documento e de relatório abre a página do módulo, não o item.
3. Mensagem na conversa do entregável não sai por e-mail em nenhum sentido (a da subtarefa sai para o cliente). Decisão da proprietária: igualar?
4. Mensagens do cliente nunca chegam por e-mail à CALI; só o sino. Decisão da proprietária.
5. Nenhuma linha desta tabela foi conferida com conta real. O próximo passo é percorrer cada uma na Company IN.
