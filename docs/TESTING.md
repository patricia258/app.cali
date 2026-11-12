# Testes do CALI Workspace

Use Node 22 atualizado ou mais recente e instale as versões do lockfile com `npm ci`.

| Comando | Superfície |
| --- | --- |
| `npm run check` | TypeScript e build de produção. |
| `npm test` | Regras de domínio, componentes de apresentação, APIs do frontend, handler Vercel e Edge Functions com transporte controlado. Descobre arquivos de teste em subdiretórios. |
| `npm run test:components` | Montagem direta dos componentes do DS e de componentes compartilhados. Chrome exercita clique, teclado, foco, refs, submissão, estados e acessibilidade. |
| `npm run test:e2e` | Navegação de todas as rotas registradas, guardas de acesso e jornadas com ações verificadas. |
| `npm run test:contracts` | SQL com rollback e smoke HTTP contra Auth, API, Edge, Storage e Mailpit da QA local. |
| `npm run test:local` | Tipos, build, lógica, componentes, jornadas e contratos na mesma árvore. |
| `npm run test:coverage` | Cobertura de linhas, funções e branches que o runner Node consegue instrumentar. |

## O que cada camada prova

- **Componentes.** O [teste direto](../tests/ds/design-system.test.mjs) exercita todas as primitivas do DS, incluindo gerenciamento de foco. Também monta a finalização do cronômetro, a fronteira de erro, o tour, solicitação e despesas de visita extra e a navegação. Os [componentes de apresentação](../tests/unit/presentation-components.test.mjs) verificam relatório, assinatura, capacidade, complementos, texto legal, capa e nota de privacidade. Os [componentes do workspace](../tests/e2e/workspace-components.cjs) são exercitados nas páginas que usam a barra do cronômetro, a edição de perfil, o sino e os controles de Horas.
- **Páginas.** A [matriz de rotas](../tests/e2e/routes.cjs) verifica navegação e renderização. Um [teste de arquitetura](../tests/unit/architecture.test.mjs) acusa rotas registradas sem caso na matriz. As [jornadas](../tests/e2e/journeys.cjs) verificam pré-cadastro público e administrativo, upload de contrato, liberação, acesso a materiais, revisão de entregáveis, cronômetro e histórico do projeto. A suíte de [Satisfação](../tests/e2e/satisfaction.cjs) cobre coorte, paginação, impressão e encerramento da espera. [Comportamentos de página](../tests/e2e/page-behaviors.cjs) cobrem filtros e recuperação da Auditoria, restauração no Forms e download autenticado. A suíte de [Equipe e DISC](../tests/e2e/people-behaviors.cjs) prova privacidade por perfil e opt-out com confirmação e proteção contra duplo envio.
- **Módulos.** Regras exercitadas incluem navegação e idempotência de Forms, pontuação DISC, fuso da Agenda, progresso, aprovação de entregáveis, capacidade, proposta comercial, composição de relatório, coorte de Satisfação e resumo diário. Os casos verificam limites, erros e dados legados quando pertinentes à regra.
- **APIs.** Os testes de [acesso](../tests/unit/access-api.test.mjs), [Workspace](../tests/unit/workspace-api.test.mjs) e [Portal](../tests/unit/commercial-api.test.mjs) carregam os adaptadores reais e interceptam o HTTP. Verificam destino, esquema, sessão, payload e resposta. A [prévia Vercel](../tests/unit/form-preview-api.test.mjs) é chamada como handler HTTP. O [inventário das Edges](../tests/unit/EDGE_FUNCTIONS.md) registra o cenário coberto e as dependências externas por endpoint.
- **Integração local.** O [README dos contratos](../tests/contracts/README.md) lista os casos que usam PostgreSQL e serviços reais. Esses testes verificam as garantias que dependem de RLS, transação, Storage, entrega e Realtime.

O relatório de cobertura Node tem como denominador os arquivos instrumentados. A matriz de navegação e os testes de navegador têm resultados próprios. Componentes internos podem ser exercitados pela página que os monta. Cada contrato SQL identifica as operações de banco e os perfis exercitados. Consulte as fichas de fluxo e o inventário das Edges para os cenários que exigem homologação com provedores externos.

## Ambiente

Use o Chrome instalado ou execute `npx playwright-core install chromium`. O runner E2E gera um build com endpoint sintético e inicia um servidor loopback. Os testes diretos dos componentes montam fixtures locais. Ambos bloqueiam rede externa. [Opções do Playwright](../tests/e2e/README.md)

Para os contratos, suba o [banco e os serviços de QA](RUNBOOK.md#ambiente-local-desta-consolidação) e aplique as migrations da revisão. A suíte confere o destino local antes de rodar. A [matriz de aceite](CONSOLIDATION_ACCEPTANCE.md) inclui comparações visuais e ensaios de recuperação e entrega. Mantenha capturas, logs, dumps e dados descartáveis fora da branch.
