# Testes do CALI Workspace

Use Node 22 ou mais recente e instale as versões do lockfile com `npm ci`.

| Comando | Superfície |
| --- | --- |
| `npm run check` | TypeScript e build de produção. |
| `npm test` | Regras de Forms, prazos, datas, resumo, isolamento de ambiente, publicação dos termos, primitivas e convenções de arquitetura. |
| `npm run test:e2e` | Playwright em Chrome/Chromium. Jornadas dos 18 fluxos, rotas, guardas, teclado, toque e estados do DS. |
| `npm run test:contracts` | SQL com rollback e smoke HTTP contra Auth, API, Edge, Storage e Mailpit da QA local. |
| `npm run test:local` | Tipos, build, lógica, jornadas e contratos na mesma árvore. |

Para o navegador, use o Chrome instalado ou execute `npx playwright-core install chromium`. O runner gera um build com endpoint sintético e inicia um servidor loopback. As fixtures são fictícias e o navegador bloqueia destinos externos. Opções e cobertura por fluxo ficam no [README do Playwright](../tests/e2e/README.md).

Para os contratos, suba o [banco e os serviços de QA](RUNBOOK.md#ambiente-local-desta-consolidação) e aplique as migrations da revisão. A suíte confere o destino local antes de rodar. Os scripts e pré-requisitos ficam em [tests/contracts](../tests/contracts/README.md).

A [matriz de aceite](CONSOLIDATION_ACCEPTANCE.md) inclui as comparações visuais e os ensaios de recuperação e entrega que acompanham a base recorrente. Registre revisão, cenário e resultado sem dados de clientes. Mantenha capturas, logs, dumps e dados descartáveis fora da branch.
