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

## Regra permanente (Pati, 26/09/2026)

Qualquer ajuste visual/funcional feito numa "view" (tela, componente ou padrão) que exista replicada nos diferentes perfis (admin e cliente) precisa ser aplicado de forma **idêntica** nos dois lados — mesma regra, mesmo comportamento. Não vale corrigir só a versão do admin e deixar a do cliente com o bug antigo (ou vice-versa). Antes de marcar uma correção como concluída, checar explicitamente se existe uma versão da mesma tela/componente no outro perfil e replicar lá também, ou registrar por que não se aplica (ex.: a tela só existe em um dos perfis).

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

---

## 2026-09-26 — Claude (piloto: remover card de título duplicado)

- **Superfície/escopo:** Workspace (`app.cali`). Layout — remoção do card de identidade da página (ícone + categoria + h1 + descrição) que se repetia por baixo do topbar, que já mostra o nome da página. Piloto de um padrão a aplicar em todas as páginas depois de validado.
- **Mudança e copy:** Pati mandou print da página Projetos (admin) e pediu para remover esse card duplicado em todas as páginas, admin e cliente, preservando qualquer botão de ação que exista nele (reposicionado dentro da página). Pediu para testar primeiro numa página do lado do cliente antes de tentar em Projetos, que ela marcou como mais complexa. Escolhi `src/pages/records/WorkspaceRecordsPage.tsx` — é o único componente que já serve tanto o admin ("Registros e solicitações") quanto o cliente ("Ocorrências e solicitações") a partir do mesmo arquivo, então o teste cobre os dois papéis de uma vez. Removido o bloco `.workspace-page-identity` (ícone, categoria, h1, parágrafo) e o card visual ao redor (`.records-v13-heading`: fundo em gradiente, sombra, decoração circular, variante modo noite, responsivo). O botão de ação ("Novo registro"/"Nova solicitação") foi preservado, movido para uma linha própria (`.records-v13-actions`) acima da barra de busca/filtros, sem card ao redor.
- **Ponto que a Pati levantou e que confirma um padrão real:** ela notou que ajustes anteriores pareciam "empilhar" código sem apagar o anterior. Confirmado neste caso: a mesma classe `.records-v13-heading` tinha regras definidas em 3 arquivos CSS diferentes (`records-v12.css`, `records-v20-conversation-polish.css`, `uxui-shell-dashboard-preview.css`), cada um de uma leva de mudanças. Removi as três, não apenas a mais recente — é o cuidado que vou manter daqui pra frente em qualquer ajuste.
- **Entrega:** Commit `ca40014`, em `main`. `npm run check` validado localmente.
- **Aprovação:** Pati pediu o piloto nesta mensagem (26/09/2026, 21:36) e disse explicitamente que ainda não ia ler a resposta agora. `aguardando avaliação`.
- **Limites:** Não testei visualmente. Só a página de Registros/Ocorrências foi alterada — nenhuma outra página (incluindo Projetos) foi tocada ainda; isso espera aprovação do piloto. Não mexi no topbar/Shell (já mostrava o nome da página corretamente, sem necessidade de mudança).

---

## 2026-09-26 — Claude (rollout completo: remover card de título duplicado de todas as páginas)

- **Superfície/escopo:** Workspace (`app.cali`). Layout — mesma remoção do piloto anterior, agora estendida a todas as páginas restantes do admin e do cliente que tinham o card duplicado.
- **Mudança e copy:** Pati aprovou o piloto e pediu para seguir com as demais páginas ("pode seguir com as demanis paginas... sempre pensando em como pode impactar a experiencia do cliente/adm/usuario e o visual"). Levantei todas as páginas efetivamente roteadas em `src/App.tsx` (não as versões antigas/sem uso que ainda existem no repositório) e conferi uma a uma quais tinham o card. Removido nas seguintes, sempre preservando e reposicionando qualquer botão/controle funcional do card:
  - **Admin:** Clientes (botão "Cadastrar cliente"), Calendário ("Novo evento"), Documentos ("Adicionar via Drive" / "Adicionar documento"), Horas (seletor de período + "Iniciar timer"), Relatórios (filtros de Cliente/Tipo/Período), NPS & satisfação ("Atualizar"), Mapa de People ("Atualizar" / "Abrir Mapa público"), Projetos ("Novo cronograma" — a página que ela usou de referência no print original, tratada por último por ser a mais complexa, como ela pediu).
  - **Cliente:** Agenda e próximos passos (`ClientTimelinePage`, sem botão de ação, o bloco saiu por completo). As demais páginas do cliente (Início, Entregáveis, Horas, Documentos, Relatórios) já não tinham esse card — conferido antes de tocar em qualquer arquivo.
  - Registros/Ocorrências (`WorkspaceRecordsPage`) já tinha sido tratada no piloto.
- **Limpeza de código (o ponto que a Pati pediu para manter sempre):** cada card tinha CSS decorativo próprio (gradiente, sombra, decoração circular, variantes de modo noite e responsivo) espalhado por `uxui-shell-dashboard-preview.css` e, em alguns casos, também em arquivos específicos da página (`page4-calendar.css`, `client-timeline-v2.css`, `client-timeline-v3.css`). Toda essa CSS foi apagada por completo, não sobreposta. Ao final, com nenhuma página mais usando o ícone/kicker do card, as classes globais compartilhadas (`.workspace-page-identity`, `.workspace-page-icon`, `.workspace-page-copy`, `.workspace-page-kicker`) ficaram sem nenhum uso — confirmado por busca em `src/pages` antes de remover — e foram excluídas também.
- **Entrega:** 3 commits em `main`: `79c4667` (Clientes/Calendário/Documentos/Horas/Relatórios), `daecd9f` (NPS/Mapa de People/Agenda), `998f98f` (Projetos + limpeza final das classes compartilhadas). `npm run check` (typecheck + build) validado localmente após cada commit, sem erros.
- **Aprovação:** Pedido explícito da Pati em 26/09/2026 ("pode seguir com as demanis paginas"). `aguardando avaliação` — ainda não confirmou visualmente.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build. Não toquei em nenhuma página que já não tivesse o card (Visão Geral/Dashboard, Propostas, editor/preview de proposta, revisão/relatório do Mapa de People, impressão de relatório, Início/Entregáveis/Horas/Documentos/Relatórios do cliente) — nenhuma dessas tinha o padrão de card duplicado. Também não toquei em nenhum arquivo de versão antiga/sem uso que ainda existe no repositório (ex.: `AdminDocumentsPage.tsx`, `AdminReportsPageV3`–`V16`, `ClientReportsPageV4`) — não estão roteados em `App.tsx`, então ficaram fora do escopo; a CSS ainda compartilhada com esses arquivos mortos foi deixada intacta para não arriscar quebrar algo fora do meu campo de visão.
  - **Correção (mesmo dia):** a afirmação acima de que Início/Entregáveis/Horas/Documentos/Relatórios do cliente "já não tinham esse card" estava errada — a varredura que fiz buscava só os nomes de classe usados no admin (`page-heading`/`workspace-page-identity`); essas 5 páginas do cliente tinham o mesmo card com nomes de classe próprios, que passaram batido. Corrigido na entrada seguinte, depois da Pati apontar que ficaram pendentes.

---

## 2026-09-26 — Claude (correção: páginas do cliente que ficaram pendentes)

- **Superfície/escopo:** Workspace (`app.cali`). Layout — mesma remoção do rollout anterior, agora nas 5 páginas do cliente que a varredura anterior não pegou (ver correção acima).
- **Mudança e copy:** Pati avisou que algumas páginas do cliente não tinham recebido a atualização. Removido o card duplicado em:
  - Início (`ClientDashboard`): cabeçalho "Olá, {nome}" + eyebrow + descrição removidos; card de contratação (horas do ciclo/status) preservado, reposicionado em linha de ações própria; função `firstName` removida por ficar sem uso.
  - Entregáveis (`ClientDeliverablesPage`): eyebrow + h1 + descrição + ícone removidos; seletor de projeto (quando há mais de um) preservado.
  - Horas do ciclo, Documentos e Relatórios (`ClientHoursPage`, `ClientDocumentsPage`, `ClientReportsPageV5`): removidos por completo, sem botão de ação para preservar.
- **Limpeza de código:** CSS decorativa (gradiente, sombra, decoração, ícone, variantes de modo noite e responsivo) apagada por completo em `uxui-shell-dashboard-preview.css`, `client-deliverables-v33.css` e `client-home-v2.css` (incluindo trechos embutidos em linhas minificadas). Preservadas as regras ainda compartilhadas com páginas antigas/sem uso (ex.: `.hours-connect-header`, usado por `AdminHoursPageV2.tsx`, não roteado).
- **Entrega:** Commit `bffe2d4`, em `main`. `npm run check` validado localmente.
- **Aprovação:** Pati apontou a pendência em 26/09/2026, 22:16 — segue o mesmo pedido já aprovado de remover o card em todas as páginas. `aguardando avaliação`.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build.

---

## 2026-09-26 — Claude (correção: saudação removida por engano + logo do cliente não replicada + regra permanente)

- **Superfície/escopo:** Workspace (`app.cali`). Duas correções pedidas juntas na mesma mensagem (26/09, 22:2x).
- **Mudança e copy (1 — saudação removida por engano):** Pati apontou que a entrada anterior (`bffe2d4`) removeu "Olá, {nome}" do Início do cliente por engano — não é um título duplicado, é uma saudação pessoal exibida quando o cliente entra na plataforma, e não podia sair. Restaurado por completo: cabeçalho original (`<header className="client-home-heading">`, eyebrow + h1 "Olá, {nome}." + parágrafo + aside "contract-card"), a função `firstName()`, e toda a CSS correspondente (`client-home-v2.css` inteiro restaurado a partir do commit anterior à remoção; blocos específicos de `.client-home-v3 .client-home-heading` reinseridos em `uxui-shell-dashboard-preview.css`).
- **Mudança e copy (2 — logo do cliente, `object-fit`):** Pati confirmou o ajuste `contain` → `cover` (moldura da logo) em 7 lugares do admin e perguntou se havia sido replicado no cliente. Investigado: o portal do cliente não renderiza a própria logo em nenhuma tela própria (Visão Geral/Início, Documentos, etc. do cliente não mostram a logo da empresa), exceto no componente compartilhado `ExecutiveReportPaperV17` (preview de relatório, usado tanto pelo admin quanto pelo cliente), que usa `object-fit: contain` por ser um contexto de "papel timbrado" (logo retangular no cabeçalho de um documento formal), diferente da moldura quadrada tipo avatar usada nas demais telas. Além disso, encontrado (não relatado pela Pati) um bug do mesmo tipo em `src/components/GlobalTimerBar.tsx`: a logo do timer global tinha `object-fit: contain` fixado inline no `style` do `<img>`, sobrescrevendo silenciosamente a regra CSS já corrigida em `global-timer.css` — corrigido para `cover`.
- **Regra permanente registrada:** a Pati pediu para memorizar que qualquer ajuste feito numa view replicada entre admin e cliente precisa ser aplicado de forma idêntica nos dois lados — texto adicionado no topo deste arquivo ("Regra permanente", linha 14).
- **Entrega:** Commits `72e0af9` (restauração da saudação) e `8ce815a` (fix do GlobalTimerBar + regra permanente), ambos em `main`. `npm run check` validado localmente nos dois.
- **Aprovação:** Pati corrigiu explicitamente o erro da saudação e pediu a memorização da regra (26/09/2026). `aprovado` para a restauração; regra do `object-fit: contain` do relatório respondida na entrada seguinte, a pedido dela.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build.

---

## 2026-09-26 — Claude (redesign: página Início do cliente)

- **Superfície/escopo:** Workspace (`app.cali`), `ClientDashboard.tsx` (Início do cliente). Layout e conteúdo — não é mais remoção do card duplicado, é redesenho do topo da página a partir de um print real (`app.calirh.com/cliente`, modo escuro) que a Pati anexou.
- **Decisão comunicada (pedida explicitamente pela Pati):** sobre a logo do "papel timbrado" em `ExecutiveReportPaperV17` (pergunta em aberto da entrada anterior) — mantive `object-fit: contain`, minha recomendação, porque ali a logo funciona como marca d'água/timbre de um documento formal e pode ser um wordmark retangular; cortar para preencher (`cover`) arriscaria cortar texto/logotipo em clientes com logo não-quadrada. Nas demais telas (avatar-like, moldura quadrada pequena) `cover` continua sendo a regra certa, como já estava.
- **Mudança e copy:**
  - Removida a moldura/card ao redor de "Olá, {nome}." e o parágrafo descritivo abaixo ("Seu acompanhamento executivo..."); a saudação continua como texto simples (eyebrow + h1), sem card ao redor.
  - Adicionada a logo da empresa do cliente dentro do card "Sua contratação", em moldura quadrada com `object-fit: cover` — mesma regra do lado admin. Antes, essa logo era injetada por um runtime paralelo baseado em `MutationObserver` (`clientHomeCompanyIdentityRuntimeV40.ts`), que tentava casar o nome da empresa por texto e claramente não estava aparecendo no print da Pati; removido por completo (arquivo deletado, chamada removida de `RouteRuntimeManager.tsx`) e substituído por renderização direta de `data.company.logo_url`.
  - Nome do plano em "SUA CONTRATAÇÃO" agora passa por um rótulo de marca: "partner" vira "Cali Partner"; qualquer outro valor cai num fallback "Cali <Valor>" em vez de mostrar o dado cru do banco (ex.: era só "partner" no print).
  - Card "Sua contratação" agora mostra duas métricas lado a lado — horas consumidas no mês e total de horas do contrato — em vez de um único número no canto.
  - "STATUS DO CICLO" deixou de ser banner de largura total: agora é um card do mesmo tamanho/alinhamento de "Sua contratação", empilhado logo abaixo dele, na mesma coluna. Botão "Ver entregas"/"Revisar agora" reduzido para um CTA menor e mais discreto.
  - Avaliada a redundância pedida pela Pati entre os 4 cards pequenos: removido "Horas do ciclo" (repetia a informação que passou a viver em "Sua contratação"); mantidos Entregas do ciclo, Percepção das entregas e Conclusão das entregas — medem coisas diferentes entre si (contagem/status, nota de avaliação, percentual de aprovação), não são redundantes uns com os outros. Grade passou de 4 para 3 colunas.
- **Limpeza de código:** `client-home-v2.css` reescrito por extenso (deixou de ser uma única linha minificada, ficando legível para futuras edições); removidas por completo (não sobrepostas) as regras antigas de `.client-home-heading > div:first-child` (moldura do header, incl. variantes de modo noite e responsivo), `.contract-metric` e `.client-contract-logo-v40` em `uxui-shell-dashboard-preview.css`.
- **Entrega:** Commit `57aee9e`, em `main`. `npm run check` (typecheck + build) validado localmente, sem erros.
- **Aprovação:** Pedido detalhado e explícito da Pati nesta mensagem (26/09/2026), com print anexado, restrito a esta página ("MAS VAMOS AJUSTAR PRIMEIRO AQUI NESSA PAGINA"). `aguardando avaliação`.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build. A discussão mais ampla que a Pati sinalizou — reduzir o excesso de cards em geral pela aplicação, citando o "espaço compartilhado" como exemplo — não foi iniciada; ela pediu explicitamente para resolver esta página primeiro. Não toquei em nenhuma outra página nem no componente `ExecutiveReportPaperV17`.

---

## 2026-09-26 — Codex (revisão da home do cliente após print 2)

- **Superfície/escopo:** Workspace (`app.cali`), somente a home `/cliente`. Continuação do ajuste visual pedido pela Pati após avaliar o redesign de Claude (`57aee9e`).
- **Mudança e copy:** removido o eyebrow genérico “ESPAÇO COMPARTILHADO · CALI WORKSPACE”; preservada a saudação “Olá, {nome}” fora de qualquer card. “Sua contratação” e “Status do ciclo” ocupam duas colunas iguais, com altura igual no desktop e empilhamento no celular. A logo da empresa permanece diretamente no card, recortada com `cover`. Nome do serviço com CALI em caixa alta; números e rótulos maiores. O dado `monthly_hours_contracted` passou de “total do contrato” para “contratadas no mês”, pois é uma franquia mensal no banco. No status, removida a afirmação genérica “Seu trabalho com a CALI está em movimento” e corrigida a contagem que antes chamava entregáveis de “frentes”: agora diz “X entregas para acompanhar”, mantendo a CTA discreta. Nenhuma query, cálculo ou regra de horas/validação mudou.
- **Hierarquia:** Entregas, percepção/NPS e percentual de conclusão passaram de três cards com sombra para indicadores abertos separados por linhas. “Dado real do ciclo” e texto explicativo redundante foram substituídos por percentual direto. Projetos e agenda perderam as molduras pesadas; as quatro caixas de resumo repetidas abaixo foram substituídas por um link simples com contagem de relatórios. Navegação para entregas, relatórios e conversa preservada.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/client-home-v2.css`, `src/client-home-v5.css`, `src/styles/routes/clientExperience.ts` e este registro. O CSS novo entra somente na rota do cliente, depois dos estilos anteriores, sem editar o arquivo compartilhado `uxui-shell-dashboard-preview.css`. Não se aplica ao administrativo: a saudação, o bloco de contratação do cliente e as métricas desta home são exclusivos de `/cliente`.
- **Entrega/verificação:** desenvolvido sobre `b99ff484`; publicado no commit [`cc1c704`](https://github.com/patricia258/app.cali/commit/cc1c704a0100dfc82b418d9bbb57b671f8ffe6dd), com deploy de produção `READY`. `npm run check` (typecheck + build) e `git diff --check` passaram. O layout autenticado não foi validado visualmente com uma sessão de cliente.
- **Aprovação:** Pati rejeitou o print 2 e pediu correção. Estado desta revisão: `aguardando avaliação` após publicação. Não confundir pedido de conserto com aprovação da nova composição.
## 2026-09-28 — Codex (perfil do cliente: linha do tempo e molduras)

- **Superfície/escopo:** home autenticada do cliente `/cliente`, painel “Em movimento”, molduras dos painéis e indicadores da mesma página. Pedido da Pati: print 1 é a tela existente; print 2 do MatDash é referência apenas de estrutura/layout, adaptada à CALI. O arquivo MatDash gratuito enviado não contém o componente “Weekly Schedules” do print; usei o print como referência visual, sem importar dados ou conteúdo demonstrativo.
- **Mudança:** as quatro entregas visíveis do projeto atual agora aparecem em trilhas horizontais, ordenadas pelo prazo real, com cápsulas posicionadas em um eixo calculado com `due_at`. O estado real fica junto ao título; prazos ausentes aparecem como “Prazo a definir”, sem sugerir data ou duração. Em telas pequenas, cada trilha vira uma linha legível com prazo ao lado. O link “Ver projeto” e a origem dos dados permanecem iguais.
- **Molduras:** restaurada uma linha dourada fina ao redor de “Em movimento”, “Agenda compartilhada”, conjunto dos três indicadores e link de relatórios, com contraste próprio nos temas dia e noite. Sem sombra pesada.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/client-home-v5.css` e este registro. Sem alterações de query, status, permissões ou cálculos financeiros.
- **Entrega/verificação:** publicado no commit `41e4776d4f3344560d3a23508b03e330ee595998` em `main`, deploy de produção `READY`. `npm run check` (typecheck e build) e `git diff --check` passaram. A tela autenticada ainda precisa ser conferida visualmente com uma conta cliente nos dois temas e no celular.
- **Aprovação:** solicitado pela Pati em 28/09/2026; `aguardando avaliação`. Não confundir a referência MatDash com aprovação final da adaptação.

---
