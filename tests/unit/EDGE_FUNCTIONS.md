# Cobertura das Edge Functions

`npm test` executa os handlers de `Deno.serve` das 17 Edges com `Request` e `Response` reais. Cada entrada recusa método inválido e exige a guarda aplicável. O teste usa ambiente sintético, intercepta `fetch` e falha em chamada de rede inesperada. O SDK Supabase vem do lockfile do app. A geração do PDF DISC com `pdf-lib` exige a dependência Deno usada no ensaio de integração. O unitário verifica a entrega do PDF já arquivado.

| Edge | Exercício adicional versionado | Lacuna de integração recorrente |
| --- | --- | --- |
| `workspace-access` | OTP concorrente, MFA, termos, troca de sessão, corte e logout em `session-http.mjs`. | Cadastro inicial de fator e boas-vindas seguem nos ensaios específicos da QA. |
| `portal-send-proposal` | Destinatário, revisão, retry e entrega no Mailpit em `commercial-http.mjs`. Hash e falhas do transporte no unitário compartilhado. | Provedor externo em homologação. |
| `workspace-send-executive-report` | Destinatário, revisão, retry e entrega no Mailpit em `commercial-http.mjs`. | Provedor externo em homologação. |
| `workspace-enviar-relatorio-mapa` | Destinatário, PDF oficial por revisão, retry e Mailpit em `commercial-http.mjs` e `mapa-delivery.sql`. | Provedor externo em homologação. |
| `workspace-company-elimination` | Lote, bucket permitido, liberação de lease em falha, recibo e retry no handler. Escopo, concorrência e retenção em `commercial-retention.sql` e `mapa-retention.sql`. | Remoção de bytes e corrida de conexões verificadas em ensaios locais específicos. A suíte SQL usa metadados de Storage. |
| `cali-forms-confirmation` | Handler confirma, libera a reserva se o provedor falha e evita reenvio após o recibo. | Gatilho, PostgREST e Mailpit juntos seguem no ensaio local específico. |
| `cali-profile-report-email` | Handler entrega bytes do arquivo privado e encerra a reserva. | Geração e arquivamento com Deno e `pdf-lib` real seguem no ensaio local específico. |
| `cali-profile-invites` | Convite conserva link e opt-out. Recusa registrada evita novo envio. | Lembretes, renovações e envio focal precisam de fixtures próprias de DISC e Mailpit. |
| `workspace-admin-daily-summary` | Corte de Brasília, agrupamento, apresentação e idempotência em `admin-daily-summary.test.mjs`. | Cron e destinatários com Mailpit seguem no ensaio local específico. |
| `workspace-daily-chat-digest` | Agrupamento de conversas, destinatário ativo e registro de envio das notificações entregues. | Execução com cron, PostgREST e Mailpit juntos exige notificações de teste. |
| `workspace-notification-email-hook` | Handler processa o outbox do cronômetro uma vez com destinatário ativo. `timer.sql` cobre produção do alerta e aprovação. | Demais templates e notificações seguem nos ensaios específicos de movimento. |
| `workspace-staff-invite` | Admin, cadastro ativo e destinatário permitido. | Confirmação de entrega com ficha Partner e Mailpit. |
| `google-calendar-oauth` | Destinos, PKCE, vínculo de state, replay e lease. `session-http.mjs` obtém a URL PKCE do fake Google. | Exchange, eventos e Meet completos seguem no ensaio local específico com provedor de teste. |
| `google-drive-oauth` | Destinos, state, replay e lease compartilhados. | Exchange, sync e desconexão precisam de pastas/credenciais do provedor de teste. |
| `workspace-google-calendar-read` | Sessão Cliente autorizada, conta por usuário/empresa, escopo de leitura, cor do evento e exclusão de cancelados com provedor interceptado. | Disponibilidade, paginação e credenciais no provedor real. |
| `google-calendar-refresh-event` | Recusa vínculo divergente. Atualiza Meet e presença e limita a lista de convidados ao escopo Cliente com provedor interceptado. | Evento e presença reais no provedor de teste. |
| `workspace-sync-scheduled-event` | Consulta o evento com a sessão do Cliente antes do acesso privilegiado, recusa convidado externo, cria Meet sem notificar convidados e reutiliza o ID remoto no retry com provedor interceptado. | RLS efetiva e corrida de cancelamento e sincronização com agenda real. |

O [README dos contratos](../contracts/README.md) descreve a execução com Auth, PostgREST, Storage, Realtime e Mailpit locais.
