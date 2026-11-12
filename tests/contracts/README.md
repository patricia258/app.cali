# Contratos do Workspace

Os testes SQL exercitam o Postgres real no stack local com migrations aplicadas e as cinco identidades sintéticas da seed. Cada cenário com fixtures usa uma transação revertida. O smoke HTTP verifica GoTrue, Edges de acesso e de OAuth, Mailpit, Storage e WebSocket no loopback. Cria uma identidade sintética durante a execução e limpa a identidade e os vínculos no fim.

```sh
npm run test:contracts
```

Execute em sequência com o stack de QA isolado. O teste HTTP usa as variáveis locais `CALI_QA_PUBLISHABLE_KEY`, `CALI_QA_SERVICE_ROLE_KEY` e `CALI_QA_TEST_PASSWORD`. O cenário do timer usa a configuração local `partner_timer_admin_email` com o Admin sintético.

Os cenários cobrem sessão revogada, MFA vinculado, aceite e isolamento, reemissão de link e bloqueio de acesso sem contrato, avaliação por encerramento e revisão, presença e aprovação de horas, preço e recibo do pedido de reunião extra, revisão de aviso com publicação restrita aos destinatários, PDF oficial do Mapa e manifestos de eliminação de propostas e devolutivas. Os testes SQL de eliminação simulam o retorno da API de Storage para metadados criados na própria transação. Cobrem duas empresas com jobs concorrentes e um arquivo vizinho preservado.

## Catálogo e comportamento dos RPCs

O runner compara as chamadas do frontend com as funções do banco local. Valida schema, `USAGE`, `EXECUTE` para o papel do transporte e nomes de argumentos literais obrigatórios e opcionais. Para consultar o inventário por assinatura e arquivo:

```sh
node tests/contracts/frontend-rpc-catalog.mjs --list
```

O inventário inclui `.rpc`, os dispatchers legados com chamadas literais e `anonPublicRpc`. `api/form-preview.ts` chama o mesmo `public.cali_form_public` como `anon`. Argumentos calculados aparecem como `null` e recebem verificação de schema, nome e grant. `client_request_online_extra_v1` tem execução direta revogada. O teste de agenda prova a negativa no v1 e usa v2 com ciência e preço. O inventário verifica o catálogo. Papéis de negócio e efeitos exigem os testes comportamentais.

| Cenário | Efeito exercitado no Postgres local | Casos adicionais sem prova comportamental nesta suíte |
| --- | --- | --- |
| `session`, `onboarding` | Acesso, termos, sessão, MFA, empresa, pré-cadastro, link reemitido e bloqueio sem contrato. | Todos os tipos de convites antigos, recuperação de MFA e colisões de liberação simultânea. |
| `calendar`, `timer` | Pedido online extra, ciência/preço, isolamento e recibo. Timer, presença, alerta, pausa, justificativa e aprovação. | Cancelar, remarcar, resultado, transcrição, agenda contratual e operadores de horas legados. |
| `feedback`, `legacy-record-tasks` | Ciclos de avaliação, status e revisão do entregável, histórico paginado, nota interna, respostas, encerramento Partner, exclusão antes de leitura, conversa e aprovação de subtarefa, limite de ajustes. | Edição/reação de mensagens, decisões de reabertura e ciclo completo de cronograma, dependências e frentes de projeto. |
| `team` | Clientes equivalentes, importação inválida/repetida, snapshot, campos privados, arquivamento e trilha de correção de métricas. | Vagas, gestor e corrida de importações no mesmo mês. |
| `legacy-reports-notifications`, `notice` | Ciência legada, contagem de abertura/PDF, dúvida, retirada antes de leitura, revisão oculta, marcação de notificação própria e publicação de aviso após revisão. | Readiness de relatório, modelos de notificação, resumos e alertas de cada movimento. |
| `public-forms-disc` | Ramo de Forms calculado no servidor, anexos A/B, recibo idempotente, restore preservando IDs, e convite DISC com progresso, prazo, consentimento, recusa e agradecimento sem resultado público. | Gestão de campanhas, renovação e envio focal DISC. Storage neste SQL usa metadados sintéticos. |
| `mapa-delivery`, `material-review` | Revisão do Partner, destinatário, PDF oficial, versão obsoleta e idempotência. | Provedor de produção e destinatários reais de homologação. |
| `privacy`, `commercial-retention`, `mapa-retention` | Pedidos LGPD, resposta, exportação A/B, manifesto de PDFs, dois jobs intercalados e preservação de arquivos vizinhos no catálogo. | Prova de bytes do Storage e cópias Google e externas sob controle do destinatário. |

Leituras auxiliares de capacidade, satisfação, identidades, Dashboard e perfil, variantes do protocolo e chamadas `.from()` têm cobertura de catálogo ou nas suítes de adapters e browser conforme o caso. Ainda precisam de prova SQL específica para seus efeitos e escopos.

O comando roda o smoke de entrega após o smoke de sessão. Mantenha as Edges comerciais do laboratório atualizadas e conectadas ao Mailpit. Para rodar apenas a entrega:

```sh
node --env-file .cali-db-schema.local/qa/stack.env tests/contracts/commercial-http.mjs
```

O teste usa sessão AAL2 sintética do Admin de QA com aceite vigente, confere a rede interna, rejeita destinatário e versão divergentes e verifica a negativa de envio com revisão Partner pendente. Comprova recibo idempotente para os três materiais e reaproveitamento do PDF oficial no reenvio deliberado do Mapa. Remove os registros e arquivos que criou e preserva as mensagens sintéticas no Mailpit para inspeção.
