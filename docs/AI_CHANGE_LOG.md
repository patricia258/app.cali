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
- **Entrega:** Commit pendente de push nesta mensagem, `main` (`patricia258/app.cali`). `npm run check` (typecheck + build) passou sem erros.
- **Aprovação:** Pati relatou o sintoma pós-deploy e pediu explicitamente "apareça apenas a logo azul... foto original da logo em todos os lugares" (26/09/2026, 21:20). `aguardando avaliação` — ainda não confirmou visualmente após este segundo deploy.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build. Empresas que já têm `logo_workspace_url` gravado no banco (da geração antiga, recolorida) não foram limpas/regeneradas; como agora `logo_url` tem prioridade em todos os pontos de leitura, isso não deveria mais aparecer na tela, mas a coluna antiga continua no banco até uma limpeza futura, se a Pati quiser. Não toquei em `src/components/reports/ExecutiveReportPaperV16.tsx` (PDF de relatório) nem em nada de e-mail/Resend — fora do escopo pedido.
