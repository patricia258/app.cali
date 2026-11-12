# Testes de navegador do CALI Workspace

```sh
npm ci
npm run test:e2e
```

O runner compila em pasta temporária com endpoint Supabase sintético. Chrome roda contra servidor HTTP no loopback. O proxy nega tráfego externo e os contextos bloqueiam service workers e WebSockets. As fixtures usam dados fictícios. Versão e hash de termos vêm do texto legal versionado.

Use Chrome instalado no macOS, Chromium do Playwright ou indique o binário em `CALI_E2E_CHROME`. Para instalar Chromium do Playwright, execute `npx playwright-core install chromium`.

```sh
npm run test:e2e -- --suite journeys
npm run test:e2e -- --suite guards --suite design-browser
npm run test:e2e -- --dist /tmp/cali-build-sintetico --output /tmp/cali-e2e-pass
```

Um build fornecido por `--dist` deve usar `VITE_SUPABASE_URL=https://cali-local-qa.supabase.co`. O runner imprime o caminho da evidência fora do código. Para repetir apenas um caso, execute a suíte com `node tests/e2e/journeys.cjs --dist /tmp/cali-build-sintetico --output /tmp/cali-e2e-case --case 17-public`.

## Cobertura no navegador

A [matriz de ações](COVERAGE.md) vincula cada fluxo às provas de interface e de contrato e registra lacunas.

`routes.cjs` valida URLs diretas, papéis, callbacks, parâmetros repetidos, fragmentos, menu, histórico e recarga. `guards.cjs` injeta falhas de MFA, versão, hash, aceite e endpoints de identidade. Exercita cadastro/verificação do fator, montagem privada e impressão por papel. `interactions.cjs` cobre carrossel e ajuste de Entregáveis com teclado, clique e toque. `design-browser.cjs` verifica foco, fechamento, retorno de foco, seletor, estado vazio, botão e rótulo de formulário.

| Fluxo | Jornada principal |
| --- | --- |
| 01 · Login e sessão | Deep link anônimo, callback, MFA e termos pelas guardas |
| 02 · Empresa e acessos | Busca, novo link, retry, Partner de apoio, upload de contrato, liberação e pré-cadastro público |
| 03 · Proposta | Editor com URL preservada e reenvio de PDF arquivado com dupla confirmação |
| 04 · Início Cliente e Visão Admin | Responsáveis no Início, CTA de Ocorrências e Visão geral Admin |
| 05 · Projeto e cronograma | Projeto selecionado, entregáveis, dependências e histórico de execução |
| 06 · Entregáveis | Deep link, arquivo publicado, ajuste, ciclo Admin/Cliente e revisão obsoleta |
| 07 · Horas e timer | Extrato, confirmação de presença, recuperação, pausa, dupla confirmação e edição por ID |
| 08 · Equipe | Indicadores, período, URL e proteção de dados privados por papel |
| 09 · Agenda | Semana, mês, navegação, virada de mês em Brasília e retorno OAuth |
| 10 · Ocorrências | Histórico por empresa e conversa de uma ocorrência |
| 11 · Documentos | Lista, conexão Drive, download privado, recuperação e ciência |
| 12 · Relatório e PDF | Impressão A4, protocolo e PDF com múltiplas páginas |
| 13 · Avisos | Comunicado por deep link e preservação dos demais parâmetros ao fechar |
| 14 · Minha conta | Painel por perfil, gravação, recuperação e releitura do perfil |
| 15 · Equipe CALI e Partner | Módulo atribuído e redirecionamento do Partner sem módulo |
| 16 · Satisfação e auditoria | Coorte, paginação, impressão, trilha por protocolo, filtro e recuperação |
| 17 · DISC, Forms e Mapa | Envio e restauração Forms, DISC legado, opt-out e reenvio de PDF Mapa |
| 18 · Frentes, ajuda e legal | Rotas auxiliares e prazo de 30 dias nos textos |

As jornadas validam a interface e os argumentos de chamadas simuladas. RLS, Storage, Realtime, Auth, cron, idempotência persistida e envio exigem as provas de contrato do stack isolado. O aceite completo segue [a matriz](../../docs/CONSOLIDATION_ACCEPTANCE.md).
