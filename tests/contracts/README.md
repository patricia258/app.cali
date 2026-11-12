# Contratos do Workspace

Os testes SQL exercitam o Postgres real no stack local com migrations aplicadas e as cinco identidades sintéticas da seed. Cada cenário usa uma transação revertida. O smoke HTTP verifica GoTrue, Edges de acesso e de OAuth, Mailpit, Storage e WebSocket no loopback. Cria uma identidade sintética durante a execução e limpa a identidade e os vínculos no fim.

```sh
npm run test:contracts
```

Execute em sequência com o stack de QA isolado. O teste HTTP usa as variáveis locais `CALI_QA_PUBLISHABLE_KEY`, `CALI_QA_SERVICE_ROLE_KEY` e `CALI_QA_TEST_PASSWORD`. O cenário do timer usa a configuração local `partner_timer_admin_email` com o Admin sintético.

Os cenários cobrem sessão revogada, MFA vinculado, aceite e isolamento, reemissão de link e bloqueio de acesso sem contrato, avaliação por encerramento e revisão, presença e aprovação de horas, preço e recibo do pedido de reunião extra, revisão de aviso com publicação restrita aos destinatários, PDF oficial do Mapa e manifestos de eliminação de propostas e devolutivas. Os testes SQL de eliminação simulam o retorno da API de Storage para metadados criados na própria transação. Cobrem duas empresas com jobs concorrentes e um arquivo vizinho preservado.

O comando roda o smoke de entrega após o smoke de sessão. Mantenha as Edges comerciais do laboratório atualizadas e conectadas ao Mailpit. Para rodar apenas a entrega:

```sh
node --env-file .cali-db-schema.local/qa/stack.env tests/contracts/commercial-http.mjs
```

O teste usa sessão AAL2 sintética do Admin de QA com aceite vigente, confere a rede interna, rejeita destinatário e versão divergentes e verifica a negativa de envio com revisão Partner pendente. Comprova recibo idempotente para os três materiais e reaproveitamento do PDF oficial no reenvio deliberado do Mapa. Remove os registros e arquivos que criou e preserva as mensagens sintéticas no Mailpit para inspeção.
