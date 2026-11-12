# Testes do CALI Workspace

Use Node 22 atualizado ou mais recente e instale as versões do lockfile com `npm ci`.

| Comando | Superfície |
| --- | --- |
| `npm run lint` | ESLint para JavaScript e TypeScript no repositório, com zero warnings. |
| `npm run lint:fix` | Aplica as correções automáticas do ESLint e verifica o resultado. |
| `npm run check` | Lint, TypeScript e build de produção. O CI executa esse comando. |
| `npm test` | Regras de domínio, componentes de apresentação, APIs do frontend, handler Vercel e Edge Functions com transporte controlado. Descobre arquivos de teste em subdiretórios. |
| `npm run test:components` | Montagem direta dos componentes do DS e de componentes compartilhados. Chrome exercita clique, teclado, foco, refs, submissão, estados e acessibilidade. |
| `npm run test:e2e` | Navegação de todas as rotas registradas, guardas de acesso e jornadas com ações verificadas. |
| `npm run test:visual:pages` | Comparação de páginas inteiras e estados entre a referência Git e o candidato. |
| `npm run test:visual:components` | Comparação de componentes montados pelas duas versões em temas e larguras equivalentes. |
| `npm run test:contracts` | Catálogo de RPCs do frontend, SQL com rollback e smoke HTTP contra Auth, API, Edge, Storage e Mailpit da QA local. |
| `node tests/contracts/browser-local.cjs` | Playwright com Vite, Auth, Mailpit e Postgres locais. OTP, termos, dados legados, isolamento entre duas empresas e logout. |
| `npm run test:local` | Lint, tipos, build, lógica, componentes, jornadas e contratos na mesma árvore. |
| `npm run test:coverage` | Cobertura de linhas, funções e branches que o runner Node consegue instrumentar. |

## Lint

O ESLint usa configuração plana com as regras recomendadas de JavaScript, TypeScript e React, além das regras de Hooks, acessibilidade JSX, imports não usados, asserções de tipo, tipos genéricos, recarga de página e chaves de listas. A configuração atribui os globals de navegador, Node e Deno conforme a superfície. Os arquivos CommonJS usam `require`. [Configuração](../eslint.config.mjs)

`npm run lint` verifica todos os arquivos JavaScript e TypeScript do repositório, incluindo testes, scripts, APIs e Edge Functions. Qualquer erro ou aviso bloqueia a integração. O projeto roda sem baseline. `npm run lint:fix` aplica as correções automáticas. Revise o diff e confirme o resultado com `npm run lint`.

- Modele respostas e dados persistidos com tipos de domínio, guardas ou decodificadores. Declare o tipo de objetos e arrays na atribuição.
- Use chaves estáveis para listas React. Em coleções editáveis, derive a chave da identidade do registro.
- Use mensagens e confirmações da interface. Após mutações, atualize os dados da tela. A fronteira de erro pode navegar novamente para carregar a versão publicada quando o bundle fica indisponível.
- Valide atributos ARIA, texto alternativo, ordem dos Hooks e imports e variáveis sem uso. A configuração define o ambiente de cada superfície e as regras próprias dos testes.

`npm run test:local` reúne lint, tipos, build, unitários, componentes, jornadas Playwright e contratos no banco local restaurado. Registre o resultado antes de publicar o Preview.

## O que cada camada prova

- **Componentes.** O [teste direto](../tests/ds/design-system.test.mjs) exercita todas as primitivas do DS, incluindo gerenciamento de foco. Também monta a finalização do cronômetro, a fronteira de erro, o tour, solicitação e despesas de visita extra e a navegação. Os [componentes de apresentação](../tests/unit/presentation-components.test.mjs) verificam relatório, assinatura, capacidade, complementos, texto legal, capa e nota de privacidade. Os [componentes do workspace](../tests/e2e/workspace-components.cjs) são exercitados nas páginas que usam a barra do cronômetro, a edição de perfil, o sino e os controles de Horas.
- **Páginas.** A [matriz de rotas](../tests/e2e/routes.cjs) verifica navegação e renderização. Um [teste de arquitetura](../tests/unit/architecture.test.mjs) acusa rotas registradas sem caso na matriz. A [matriz de ações e contratos](../tests/e2e/COVERAGE.md) liga cada fluxo às jornadas de browser, às provas no stack local e às lacunas remanescentes. Inclui criação e publicação de Forms, histórico de Ocorrências paginado, edição de mensagens com foco, lançamento e capacidade de Horas, revisão de Avisos, manutenção de Partner e envio de versão congelada de relatório.
- **Módulos.** Regras exercitadas incluem navegação e idempotência de Forms, pontuação DISC, fuso da Agenda, progresso, aprovação de entregáveis, capacidade, proposta comercial, composição de relatório, coorte de Satisfação e resumo diário. Os casos verificam limites, erros e dados legados quando pertinentes à regra.
- **APIs.** Os testes de [acesso](../tests/unit/access-api.test.mjs), [Workspace](../tests/unit/workspace-api.test.mjs) e [Portal](../tests/unit/commercial-api.test.mjs) carregam os adaptadores reais e interceptam o HTTP. Verificam destino, esquema, sessão, payload e resposta. A [prévia Vercel](../tests/unit/form-preview-api.test.mjs) é chamada como handler HTTP. O [inventário das Edges](../tests/unit/EDGE_FUNCTIONS.md) registra o cenário coberto e as dependências externas por endpoint.
- **Integração local.** O [README dos contratos](../tests/contracts/README.md) lista os casos que usam PostgreSQL e serviços reais. Esses testes verificam as garantias que dependem de RLS, transação, Storage, entrega e Realtime.

O relatório de cobertura Node tem como denominador os arquivos instrumentados. A matriz de navegação e os testes de navegador têm resultados próprios. Componentes internos podem ser exercitados pela página que os monta. Cada contrato SQL identifica as operações de banco e os perfis exercitados. Consulte as fichas de fluxo e o inventário das Edges para os cenários que exigem homologação com provedores externos.

A [comparação visual](VISUAL_QA.md) documenta os dois workflows locais, a referência e as jornadas adicionais de componentes de fluxo.

## Ambiente

Use o Chrome instalado ou execute `npx playwright-core install chromium`. O runner E2E gera um build com endpoint sintético e inicia um servidor loopback. Os testes diretos dos componentes montam fixtures locais. Ambos bloqueiam rede externa. [Opções do Playwright](../tests/e2e/README.md)

Para os contratos, suba o [banco e os serviços de QA](RUNBOOK.md#ambiente-local-desta-consolidação) e aplique as migrations da revisão. A suíte confere o destino local antes de rodar. A [matriz de aceite](CONSOLIDATION_ACCEPTANCE.md) inclui comparações visuais e ensaios de recuperação e entrega. Mantenha capturas, logs, dumps e dados descartáveis fora da branch.
