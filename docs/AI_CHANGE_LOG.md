# Log de mudanças entre agentes (Claude + Codex)

Registro contínuo, por ordem cronológica, de toda mudança feita por qualquer um dos dois agentes neste repositório. Formato herdado do handoff `docs/HANDOFF-CODEX-CALI-2026-09-26.md` (seção 8), para manter os dois agentes na mesma referência.

| Campo | Registrar |
| --- | --- |
| Agente/data | Nome de quem fez, data e qual solicitação da Pati atendeu. |
| Superfície/escopo | Site, Portal, Mapa ou Workspace; visual, conteúdo ou funcionalidade. |
| Mudança e copy | Arquivos, componentes, trechos de texto antes/depois quando relevante, comportamento. |
| Entrega | Repositório/branch/commit/PR, deploy e verificação realizados. |
| Aprovação | Frase ou pedido expresso da Pati; marcar `aprovado`, `ajustes pedidos` ou `aguardando avaliação`. |
| Limites | O que não foi testado ou depende de inspeção; conflitos conhecidos. |

---

## 2026-09-26 — Claude

- **Superfície/escopo:** Workspace (`app.cali`). Funcionalidade — geração da imagem de logo do cliente. Sem alteração visual de layout, texto, cor de tela, e-mail ou Resend.
- **Mudança e copy:** `src/lib/companyWorkspaceLogo.ts`, função `createWorkspaceLogoBlob`. Antes: todo pixel de primeiro-plano detectado na logo original era pintado com a cor sólida da marca CALI (`WORKSPACE_MARK #5A1E2D`), produzindo uma silhueta monocromática sobre fundo marfim. Depois: os mesmos pixels de primeiro-plano mantêm sua cor original (`pixels.data[i/i+1/i+2]`); o recorte automático do fundo, o enquadramento centralizado e o preenchimento da moldura (tile 256px, padding, fit por bounding box) continuam idênticos. Removida a função auxiliar `rgb()` e a variável `mark`, que ficaram sem uso.
- **Entrega:** Commit `9d08117`, enviado a `main` (`patricia258/app.cali`). `npm run check` (typecheck + build) executado localmente — passou sem erros.
- **Aprovação:** Pati descreveu o problema e pediu explicitamente a remoção da recoloração, mantendo a moldura, em mensagem de 26/09/2026 às 21:00 ("ok" ao resumo do escopo). `aprovado` para este escopo específico.
- **Limites:** Só corrigia a geração de **novas** logos Workspace. Ver entrada seguinte (mesmo dia) — havia um segundo sistema, independente, que ainda aplicava a versão gerada/recolorida por cima do que a tela já renderizava corretamente. Nenhuma alteração em Supabase, Edge Functions, e-mail/Resend ou banco de dados.

---

## 2026-09-26 — Claude (2ª correção, mesmo dia)

- **Superfície/escopo:** Workspace (`app.cali`). Funcionalidade — de onde vem a imagem de logo do cliente exibida em toda a aplicação (admin e cliente). Sem alteração de layout, texto, e-mail ou Resend.
- **Mudança e copy:** Depois do primeiro deploy, a Pati relatou (26/09, 21:20) que ao dar refresh a logo aparecia em 3 estágios ("logo azul, logo maior, logo menor"). Investigando, encontrei a causa real: existem dois sistemas independentes escrevendo na mesma imagem — (1) cada página React já resolve e mostra a logo original (`logo_url`) corretamente; (2) um conjunto de rotinas de fundo que rodam em paralelo (`companyWorkspaceIdentityRuntimeV39.ts`, `hoursCompanyLogoRuntimeV41.ts`, `documentsIdentityRuntimeV42.ts`, `identityMediaRuntime.ts`, e o registro central em `companyWorkspaceLogo.ts`) — essas ainda buscavam e sobrescreviam a imagem pela versão gerada/recortada em tile (`logo_workspace_url`), assíncrona e depois do primeiro render, causando a troca visível. Mudei a ordem de preferência nesses 5 arquivos para sempre usar `logo_url` (original) primeiro, com `logo_workspace_url` só como reserva se não houver original. Removidas as chamadas que geravam a versão em tile sob demanda (`ensureCompanyWorkspaceLogo`) em `hoursCompanyLogoRuntimeV41.ts` e `projectsClientPortfolioRuntimeV39.ts`, já sem uso. Nenhuma mudança na moldura/CSS de enquadramento.
- **Entrega:** Commit `828f64c`, enviado a `main` (`patricia258/app.cali`). `npm run check` (typecheck + build) passou sem erros.
- **Aprovação:** Pati relatou o sintoma pós-deploy e pediu explicitamente "apareça apenas a logo azul... foto original da logo em todos os lugares" (26/09/2026, 21:20). Confirmou em seguida (21:28) que funcionou: "Deu certo agora". `aprovado`.
- **Limites:** Empresas que já têm `logo_workspace_url` gravado no banco (da geração antiga, recolorida) não foram limpas/regeneradas; como `logo_url` agora tem prioridade em todos os pontos de leitura, isso não deveria mais aparecer na tela, mas a coluna antiga continua no banco até uma limpeza futura, se a Pati quiser. Não toquei em `src/components/reports/ExecutiveReportPaperV16.tsx` (PDF de relatório) nem em nada de e-mail/Resend — fora do escopo pedido.

---

## 2026-09-26 — Claude (3ª e 4ª correções, mesmo dia)

- **Superfície/escopo:** Workspace (`app.cali`). Duas correções visuais/performance separadas, pedidas juntas na mesma mensagem (21:28).
- **Mudança e copy (1 — enquadramento da logo):** Logo confirmada funcionando, mas Pati notou que uma logo retangular real (cadastrada num cliente) aparecia "encolhida" dentro da moldura quadrada de cantos arredondados, em vez de preencher completamente (como uma foto de perfil recortada). Causa: `object-fit: contain` em vez de `cover` em 7 arquivos CSS (`dashboard-overview-live.css`, `documents-v3.css`, `global-timer.css`, `page2-account-tabs.css`, `page4-calendar.css`, `project-approval-workflow-v38.css`, `project-client-portfolio-v39.css`), cobrindo Visão Geral admin, Documentos, timer global, Calendário, Satisfação, Projetos e o editor de logo da conta. Trocado para `cover` e removido padding que deixava vão entre imagem e borda.
- **Mudança e copy (2 — sidebar lento):** Pati relatou que o menu lateral abre/fecha devagar no hover ("tempo demais"). Causa: `src/uxui-shell-dashboard-preview.css` tinha 3 blocos duplicados/conflitantes controlando a mesma transição de largura (.34s → .46s "refinamento final" → .34s "última palavra de especificidade") mais um quarto bloco em .32s — sobras de iterações anteriores não consolidadas, sem relação com este pedido, encontradas ao investigar. Reduzidas as 4 ocorrências para .18s, no mesmo ritmo já usado nos links do menu.
- **Entrega:** Commits `0e05c6f` (logo/moldura) e `e31a480` (sidebar), ambos em `main`. `npm run check` validado localmente nos dois.
- **Aprovação:** Pati pediu ambas explicitamente na mensagem de 26/09/2026 21:28. `aguardando avaliação` — ainda não confirmou visualmente nenhuma das duas.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build. Não toquei em `people-map-report.css` (`.pmr-logo`, capa do relatório do Mapa de People) nem em `reports-v14-clarity.css` (`.reports-v14-official-logo`) — são contextos de documento/impressão, fora do que a Pati descreveu como "telas com foto do cliente"; se ela quiser o mesmo tratamento lá, preciso de confirmação explícita antes, por tocarem em material que pode ser exportado/enviado ao cliente.
