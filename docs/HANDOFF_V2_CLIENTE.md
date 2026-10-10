# Handoff — interface V2 no cliente do CALI Workspace

Registro cronológico do que foi feito no repositório. Acrescentar uma entrada por sessão de trabalho,
no topo, com data, commits, verificação e pendências. Detalhe técnico e mapa V2 → oficial em
`docs/V2_SUBSTITUICAO_ESTRUTURAL_2026-10-09.md`.

- Branch: `feat/client-visual-v2-inplace-20261008` (30+ commits à frente de `main`; `main` sem commits novos).
- Referência visual: `patricia258/cali-workspace-v2@7c0a232`.
- Produção (`main` → app.calirh.com): **não alterada** até esta data.

## 09/10/2026 — Claude (Opus 5.5), com Patricia

### Commits desta sessão (do mais antigo ao mais recente)
- `a4cd864` refactor(client): V2 shell on verbatim approved CSS, legacy styles isolated from client
- `dfd2b0e` refactor(client): align home JSX to approved composition; V2 dialog, notification and account surfaces
- `3dd9961` refactor(client): calendar follows the approved single control row and business-week grid
- `0b0102e` refactor(client): follow the approved topbar and sidebar in full; client is day-only
- `8d0abfe` docs: record owner decisions on topbar, sidebar and day-only client
- `33dfb56` refactor(client): occurrences list follows the approved summary, status segments and tags
- `19fe2bf` refactor(client): team directory follows the approved context strip and toolbar
- `ca864af` fix(client): remove demo preview mode from deliverables and documents

### O que mudou
1. **Uma só identidade visual no cliente.** As rotas `/cliente` usam o CSS da V2 gerado literalmente do
   repositório aprovado (`scripts/port-v2-css.cjs` → `src/v2/v2.generated.css`) e não carregam mais
   nenhuma das 45 folhas anteriores. Essas folhas ficam em `src/styles/legacy`, montadas só na landing, login,
   administradora e impressão de relatório.
2. **Shell do cliente** (`src/v2/ClientShell.tsx`): topbar e sidebar da V2 por inteiro — marca, busca
   de módulos (⌘/Ctrl+K), notificações, menu de conta; 9 itens de menu incluindo Avisos.
3. **Páginas alinhadas ao JSX aprovado:** Visão Geral, Calendário, Ocorrências, diretório de Equipe.
4. **Decisões da proprietária aplicadas:** cliente somente diurno (alternador removido); botões remanejados
   para fora da topbar; “Abrir backoffice Admin” era só do ambiente de teste e não existe no cliente.
5. **Sem demonstração no cliente:** removido o “modo preview” de Projetos/Entregáveis e Documentos (dados
   fictícios e mensagens de sucesso sem gravação).
6. **Removido:** `styles/client-modules.css`, `styles/client-home.css`, shell intermediário do cliente,
   atalhos de frentes/relatórios da topbar.

### Verificação desta sessão
- `npm run check` (TypeScript + build): aprovado.
- 9 rotas do cliente e 8 diálogos renderizam sem erro, em ambiente local com backend simulado e host do
  banco inacessível. **Nenhum teste com sessão real nem de gravação foi feito.**
- Comparação com a V2 a 1440 px: shell idêntico em posição e tamanho; Visão Geral idêntica em toolbar,
  saudação, contratação e colunas.
- Nenhuma consulta, mutação, permissão ou política de banco alterada.

### Divisão de trabalho combinada em 09/10
- **Cliente:** continua nesta frente (arquivos `src/v2/**`, `src/pages/client/**`, e os ramos de cliente
  em `src/pages/team/**` e `src/pages/records/**`).
- **Administradora:** frente separada, sobre a referência administrativa da V2 (`AdminPreview.tsx` /
  `admin-preview.css` do repositório `cali-workspace-v2`). Arquivos: `src/pages/admin/**`, o ramo de
  administradora em `WorkspaceShell.tsx` e `src/styles/legacy/**`.
- Arquivos compartilhados (`WorkspaceShell.tsx`, `CompanyTeamPage.tsx`, `WorkspaceRecordsPage.tsx`,
  `WorkspaceChrome.tsx`, `DirectProfileControl.tsx`, `App.tsx`): alterar em commits pequenos e sincronizar
  antes de começar, para não gerar conflito.
- **Quem começar a administradora precisa partir desta branch já com os commits desta sessão.** Partir da
  versão anterior recria as duas identidades visuais sobrepostas.
- Método para a administradora: mesmo do cliente — gerar o CSS aprovado pelo script, compor o shell e as
  páginas com as classes da referência, manter consultas e gravações, e retirar de `styles/legacy` as
  folhas que deixarem de ser usadas. Ao final, `styles/legacy` deve deixar de existir.

### Continuação em 09/10 (depois do primeiro envio ao GitHub)
- Equipe: Movimentações, Estrutura (organograma por área com painel de exploração) e Indicadores (quatro
  cartões, evolução, composição por área, entradas e saídas) na composição aprovada; menu lateral do módulo
  com links `?aba=diretorio|estrutura|movimentacoes|indicadores`.
- Documentos e Relatórios: linha de ações e painéis de versões no ritmo aprovado.
- Telas estreitas: nenhuma das 10 rotas estoura a largura em 390 ou 1024 px.
- Identidade dos commits desta pasta: `CALI RH <patricia@calirh.com>` (a configuração global da máquina
  apontava para outra empresa; não usar).
- Envio ao GitHub: a máquina não guarda credencial da conta `patricia258`. O envio é feito com um token
  pessoal copiado pela proprietária no momento do push.

### Auditoria final do cliente (09/10)
Folhas de estilo ainda carregadas nas rotas `/cliente`, medidas no navegador:
- `v2/v2.generated.css`, `v2/operational.css`, `v2/calendar.css` — a interface V2.
  `calendar.css` perdeu 221 de 332 regras, que citavam classes inexistentes no código.
- `components/extra-visit-request.css` — diálogo de agendamento (componente oficial).
- **Sobras a eliminar na migração da administradora, por serem compartilhadas com ela:**
  `pages/team/company-team.css` (ficha, cadastro e assistente mensal de Equipe),
  `records-v28-closure-experience.css` e `records-v30-final-polish.css` (encerramento de ocorrência),
  `client-approval-highlight-v50.css` e `hours-company-logo-v41.css` (blocos inseridos por runtimes),
  `components/extra-visit-expenses.css` (importado pelo shell compartilhado).
- Diálogos conferidos abrindo um a um: cadastro e ficha de pessoa, nova ocorrência, conversa, comentário de
  documento, agendamento, histórico de reuniões, detalhe de entregável. Todos renderizam sem erro; os que
  vêm de componentes compartilhados (ficha, cadastro, encerramento) ainda usam a folha própria listada acima
  e recebem o padrão aprovado junto com a administradora.
- Runtimes que inserem HTML nas páginas (`src/lib/*Runtime*.ts`, 65 arquivos) continuam ativos e são a
  principal dívida técnica: escrevem marcação fora do React. Substituí-los por componentes é trabalho da
  etapa da administradora, módulo a módulo.

### Pente fino do cliente (09/10, a pedido da proprietária)
Revisão visual tela a tela (10 rotas) e diálogo a diálogo (8) a 1440 px. Corrigido:
- Equipe: as colunas do diretório voltavam ao conjunto antigo depois de carregar; agora abrem nas aprovadas.
- Equipe: cadastro de colaborador com campos, cabeçalho, fechar e rodapé no padrão de diálogo aprovado.
- Horas: rótulo do mês duplicado na faixa de contexto.
- Relatórios: lista de versões com espaçamento e etiquetas de estado coloridas.
- Projetos: seletor de projeto e aviso de execução (inserido por runtime) no padrão aprovado; cabeçalho do
  detalhe do entregável com o fechar à direita.
Observado e não alterado: o diálogo de agendamento usa a folha própria do componente (cabeçalho bordô);
a ficha da pessoa abre em gaveta lateral. Ambos funcionam e ficam para os ajustes pontuais da proprietária.

## 10/10/2026 — ajustes pedidos pela proprietária depois de ver o link de homologação
1. Visão Geral: a capa do documento mais recente (logo da empresa) estourava o cartão — a folha da capa só
   existia no conjunto anterior. Capa contida na miniatura aprovada.
2. Visão Geral: etiquetas de prazo de “Em movimento” com as cores aprovadas, por situação real da entrega
   (creme em andamento, bordô não iniciada/ajuste, lilás em validação, verde aprovada).
3. Visão Geral: barra “Área da empresa / Início” retirada; agenda e Frentes foram para a topbar.
4. Equipe: “Cadastrar todos via planilha” ao lado de “Adicionar pessoa”, no cabeçalho.
5. Equipe → Estrutura: painel da área completo como na V2 — quatro números (ativos, entradas e saídas no
   mês de referência, permanência média), tabela de colaboradores, “Exibir desligamentos na estrutura” e os
   cartões de pessoas. Linha do organograma liga apenas as áreas existentes. Filtros mantidos.

### 10/10 — segunda rodada de ajustes da proprietária (Equipe)
- Indicadores: incluídos os blocos de `IndicatorExtras` da V2 que faltavam — três cartões (rotatividade,
  permanência média, movimentações internas), “Movimento do quadro” com alternância quadro/entradas-saídas e
  mês selecionável, e “Tempo de permanência” por faixa com filtro por área. Tudo com dados reais.
  **Rotatividade usa uma fórmula provisória (saídas do mês ÷ quadro ativo do mês)**; a regra oficial de
  turnover continua pendente de aprovação, como registra o handoff mestre da V2.
- Diálogos de Equipe (cadastro, planilha, atualização mensal, confirmações): cabeçalho, fechar, corpo e
  rodapé alinhados no padrão aprovado de diálogo.

### 10/10 — terceira rodada de ajustes da proprietária (Equipe)
- Regra registrada: **cartões nunca se tocam** — espaçamento mínimo e bordas alinhadas em toda tela.
  Indicadores: 16 px entre os blocos empilhados.
- Cadastro de colaborador no cliente: as cinco etapas viraram **um único formulário** em seções
  (Identificação, Área e liderança, Vínculo e jornada, Situação, dados opcionais), com as mesmas validações
  antes de salvar e os mesmos campos condicionais. A administradora mantém as cinco etapas até ser migrada.
- Ficha da pessoa: sai a gaveta lateral, entra o diálogo central aprovado (`.enh-person`), com as abas
  oficiais Dados / Liderados / Histórico e as ações de sempre (férias, desligar, editar, arquivar).
  Observação da proprietária: as abas do protótipo (Visão geral, Movimentações, Vínculos) ainda não estão
  100% aprovadas.

### 10/10 — quarta rodada de ajustes da proprietária
- **Regras gerais registradas:** barras de rolagem nunca aparentes (a rolagem continua funcionando);
  avisos e notas sempre no fim da página, afastados do último cartão; nada de botões, campos ou fontes
  do formato anterior dentro dos diálogos.
- Ficha da pessoa: “Tempo de casa” virou uma etiqueta discreta; Histórico em linha do tempo alinhada à
  esquerda; botões de rodapé com os valores exatos de `.enh-person footer button`.
- Meu perfil: cabeçalho e ações fixos, conteúdo rolando por dentro; botões de foto no formato aprovado.
- Assinatura: um título só, campo, envio de imagem e nota cada um em sua linha. A proprietária ainda não
  bateu o martelo sobre o desenho final desta aba.

### 10/10 — quinta rodada de ajustes da proprietária
- **Padrão de moldura (regra geral):** toda foto de pessoa e todo logo usa moldura quadrada com cantos
  arredondados (raio 7 px). Nunca circular. Vale para topbar, menu de conta, ficha, perfil, cartões da
  Visão Geral, conversa e qualquer tela nova, cliente ou administradora.
- Horas: coluna “Frente” no extrato com etiqueta colorida; painel lateral “Distribuição por frente” com a
  bolinha da cor de cada frente e o percentual; a origem do lançamento continua no detalhe da linha.
  A frente vem do entregável vinculado (`deliverables.workstream`, coluna acrescentada à leitura já
  existente); lançamentos sem entregável aparecem como “Assessoria geral”.
- Horas: aviso de andamento do mês no topo da página, sem tom de bloqueio — perto de 50% (≥45%), 50%,
  perto de 70% (≥65%), 70% e 100%. Pedido futuro da proprietária: enxergar esses marcos na administradora
  para analisar a distribuição (já existe a tabela `hour_alerts`; avaliar na migração da administradora).
- Agenda com a Pati (encontro extra): diálogo no formato novo, com herói bordô e ícones ilustrativos; o
  passo de endereço e datas cabe numa visualização só, sem rolagem. Lógica e campos inalterados.
- Calendário: removido do cliente o bloco “Selecionar horário para solicitar um encontro”. Era a grade de
  horas do calendário anterior, que as tentativas passadas tinham guardado num bloco recolhível; ficou sem
  estilo quando o CSS anterior saiu do cliente. O pedido de encontro continua pelo botão “Solicitar
  agendamento”. A seleção de horário clicando na grade deixou de existir no cliente.

### 10/10 — sexta rodada de ajustes da proprietária
- Moldura de foto na topbar continuava redonda: `src/lib/identityMediaRuntime.ts` injeta
  `border-radius:14px!important` em qualquer foto de perfil, o que num avatar de 27 px vira círculo. A folha
  V2 passa a vencer essa regra (único `!important` de `operational.css`). **Ao migrar a administradora,
  corrigir o runtime na origem** em vez de sobrescrever.
- Agenda com a Pati, passo de datas: grade de quatro colunas com ordem fixa nos dois modos (visita e
  online). Bordas esquerda e direita de todas as linhas coincidem; empresa como campo de leitura no padrão
  `.enh-fields`; opções de data no padrão `.enh-kpis`. Sem rolagem.

### 10/10 — sétima rodada: conversa da ocorrência igual à gaveta aprovada
- Cabeçalho “OCORRÊNCIA · protocolo”, etiqueta de situação colorida + tipo + atualização, “Contexto inicial ·
  ver detalhes”, título “Conversa e encaminhamentos”, balões (CALI à esquerda em creme, cliente à direita em
  rosado, foto e nome no topo, horário embaixo) e resposta no rodapé com “Anexar” e “Enviar”.
- Mantidos: link e emoji ao lado de “Anexar”, anexos pendentes, bloqueio de conversa encerrada, pedido de
  reabertura e avaliação do atendimento.
- **Atenção para qualquer mudança nesta gaveta:** os runtimes de conversa
  (`recordsExperienceRuntimeV2`, `recordsMessageControlsRuntime`, `recordsOperationsRuntimeV25`,
  `recordsClosure*`) identificam o registro lendo o texto do elemento `.section-kicker` e exigem que comece
  por `CALI-REG-`. O protocolo precisa continuar sozinho dentro desse elemento, senão mensagens e
  ferramentas não carregam.

### 10/10 — oitava rodada: nova ocorrência e documentos
- Nova ocorrência: diálogo no formulário aprovado (`.wf-modal` + `.wf-form`) — “NOVA OCORRÊNCIA”, “O que você
  precisa acompanhar?”, Tipo de ocorrência, Assunto, Descreva a situação. O campo oficial “Data e horário”
  foi mantido ao lado do tipo. Mesmo envio e mesmas validações.
- Documentos, visualização Lista: linhas aprovadas (título, tipo, data, etiqueta de situação, seta) com a
  borda colorida por categoria.
- Documentos, ficha de informações (abre pela capa ou pela linha da lista): tipo, versão, publicação,
  validade / próxima revisão, prazo restante, elaboração e ciência; ações Fechar, Comentar, Registrar ciência
  e **Abrir documento**, que abre o arquivo em nova aba (o botão “Abrir” do cartão também).
- Aviso de validade: um único aviso no formato aprovado quando há documento vencido ou com validade nos
  próximos 60 dias; a mesma informação aparece como etiqueta na lista e na ficha.
- **Pendências que dependem de banco (não feitas):** o cadastro de documentos só guarda uma data
  (`files.valid_until`, usada como validade e próxima revisão) e quem enviou (`uploaded_by`). Não existem
  campos para **coautores** nem para **data de revisão separada da validade**; “Elaborado por” mostra
  “CALI · Assessoria”. Criar esses campos exige migração e ajuste no cadastro da administradora.
- **Pendência da administradora:** o mesmo aviso de 60 dias precisa aparecer para a administradora, na
  página de Documentos dela; fica para a migração dessa página.

### 10/10 — nona rodada: Relatórios em página única
- A página abre no relatório mais recente, lido no próprio documento oficial (`ExecutiveReportPaperV17`,
  o mesmo da impressão), com o cartão “Sobre a leitura” ao lado.
- Relatório ainda não visualizado aparece desfocado atrás do convite “Novo relatório disponível”;
  “Visualizar relatório” registra a abertura (`record_report_client_event_v55`, evento `opened`) e libera a
  leitura. Depois de aberto, o cartão lateral mostra **Dar ciência** (`acknowledge_report_v55`, com a mesma
  confirmação de antes) e **Imprimir / salvar PDF**.
- Aba “Todos os relatórios”: lista com período, publicação e situação (novo/visualizado, ciência); escolher um
  relatório o abre na mesma leitura. Filtro de período mantido nessa aba.
- Página de impressão (`/cliente/relatorios/impressao/:id`) passou a usar o shell aprovado; antes aparecia
  com a topbar quebrada porque misturava o shell novo com as folhas anteriores.
- As folhas do documento (`styles/routes/reports`) são carregadas na página de Relatórios do cliente. Medido:
  não alteram as demais telas depois de visitadas.

### 10/10 — impressão do relatório
- “Imprimir / salvar PDF” na página de Relatórios abre a caixa de impressão do navegador ali mesmo, sem
  segunda página, e registra o evento `pdf_opened`. A rota `/cliente/relatorios/impressao/:id` continua
  existindo para links diretos.
- **Causa da página em branco:** as folhas de versões antigas do relatório (`reports-v7/v8/v9.css`) escondem
  tudo na impressão com `body *{visibility:hidden!important}`; quem reexibia o documento era uma folha do
  conjunto anterior, que o cliente não carrega mais. O bloco de impressão de `v2/operational.css` devolve a
  visibilidade ao documento, achata o shell e fixa o palco em 210 mm. Verificado gerando o PDF: 2 páginas com
  conteúdo, na largura inteira, pelos dois caminhos.
- **A limpar na migração da administradora:** `reports-v3` a `reports-v15` são de telas que não existem mais
  no fluxo atual (V17) e ainda são carregadas por `styles/routes/reports`.

### 10/10 — páginas em branco na impressão e página de Frentes
- Impressão: cada parte do documento tinha altura fixa de uma folha (297 mm). Quando o conteúdo passava disso,
  transbordava para uma página só com o fundo — e, na rota antiga, o excedente era cortado. Na impressão a
  parte agora cresce com o conteúdo e a última não força quebra. Verificado com relatório de teste longo:
  3 páginas, todas com texto, pelos dois caminhos (antes: página vazia num caminho e texto cortado no outro).
- Frentes: sem carrossel (as frentes incluídas ficam em grade de três colunas, todas à vista), cartões
  compactos, sem a faixa bordô; “Falar com a Pati” foi para o cabeçalho, ao lado do plano. “Outras
  possibilidades” em duas colunas que não se esticam quando um item é aberto.

### 10/10 — marca e varredura de fechamento do cliente
- Sidebar: a folha oficial (`/brand/cali-oak-mark.svg`) no lugar da palavra CALI. Projetos → Entregáveis: cada
  frente mostra a folha ou a lima (`cali-lime-mark.svg`), alternando, como no aplicativo oficial. **Regra da
  proprietária: essas marcas são obrigatórias nesses lugares.**
- Varredura automática (`scripts/v2-client-sweep.cjs`, dados fictícios em `scripts/v2-qa-fixtures.cjs`):
  35 telas, abas e diálogos do cliente em 1440, 1024 e 390 px = 105 verificações. Procura botões e campos
  sem estilo, cartões colados ou sobrepostos, molduras redondas, diálogo fora da tela, estouro de largura e
  erros de execução. Primeira passada: 4 apontamentos (botão sem estilo no histórico de reuniões, frentes de
  Projetos coladas, estouro de 3 a 5 px no celular na Visão Geral e na busca). Corrigidos; segunda passada:
  **0 apontamentos**.
- Como rodar a varredura: `VITE_SUPABASE_URL=https://qa-isolated.invalid` em `.env.local`, `npx vite --host
  127.0.0.1 --port 5173`, e `node scripts/v2-client-sweep.cjs` com `playwright-core` instalado e o Chrome do
  sistema. Todas as respostas de backend são simuladas; nada sai da máquina.
- **O que a varredura não cobre:** fidelidade fina de cada tela à V2 (isso foi feito por comparação com os
  prints da proprietária), dados reais com textos longos e listas grandes, e qualquer gravação no banco.
- Observação da proprietária: achou o aplicativo “um pouquinho lento” no link de homologação. Não medido.
  Suspeitos a investigar com dados reais: os 65 runtimes que observam e reescrevem a página
  (`src/lib/*Runtime*.ts`), as consultas repetidas de perfil/empresa em cada página e o próprio ambiente de
  prévia da Vercel.

### 10/10 — diálogo do entregável igual ao V2 (quatro abas)

Pedido da proprietária: o diálogo aberto em Projetos → Entregáveis deve ser exatamente o do V2 nas abas Visão geral, Etapas, Conversas e Histórico.

- `ClientDeliverablesPage.tsx`: cabeçalho (protocolo · complexidade, título, frente · ciclo), abas com os nomes do V2, resumo em quatro colunas (Prazo, Situação, Versão, Frente de atuação), "Sobre esta entrega", arquivo publicado com botão Abrir, "O que precisa acontecer agora"; Etapas com andamento, barra e lista numerada; Histórico com introdução e linha do tempo; Conversas com balões e campo fixo acima do rodapé.
- Funções oficiais mantidas: Solicitar ajuste, Aprovar entrega (com avaliação), envio de mensagem, anexo, link e emoji, abertura do arquivo publicado. O prazo original, quando diferente, aparece em "Sobre esta entrega".
- Atenção técnica: os runtimes da conversa (`deliverableChatStandardRuntimeV35` e afins) procuram a lista e o campo **dentro** de `[data-v2-operation~="conversation-pane-v2"]`, como descendente do diálogo. O invólucro `.dv-pane` (display: contents) existe só para isso — não remover. O protocolo precisa continuar sozinho em `span.section-kicker` dentro de `deliverable-title-v2`.
- Os runtimes injetam regras com `!important` nos balões; as regras do diálogo em `operational.css` (bloco "Diálogo do entregável") usam `!important` nos três pontos necessários.
- Conferência: `~/CALI/qa/dv.cjs` fotografa as quatro abas no oficial e no V2 lado a lado. Varredura do cliente: 105 verificações, 0 apontamentos. `npm run check` passou.
- Não testado: envio real de mensagem, aprovação e pedido de ajuste contra o banco (o ambiente de conferência bloqueia gravações).

### 10/10 — administradora: shell V2 e Visão geral (primeira página migrada)

Como a migração da administradora acontece:

- **Página a página.** `src/v2/routes.ts` tem a lista `migratedAdminRoutes`; só as rotas listadas usam a V2 (hoje: `/admin`). As demais continuam com o shell e as folhas anteriores até serem migradas — ao navegar entre uma página migrada e uma não migrada o visual muda; isso some quando a última página entrar na lista. `usesClientV2` passou a se chamar `usesV2`.
- **Shell.** `AdminShell` em `src/v2/WorkspaceShellV2.tsx`: mesma barra lateral e barra superior do cliente, com os menus oficiais da administradora (Visão geral, Clientes, Equipe, Projetos, Horas, Calendário, Ocorrências, Documentos, Relatórios, NPS & satisfação). Propostas e Mapa de People ficam na barra superior. Timer global, despesas de visita, notificações, perfil e sair continuam os componentes oficiais.
- **Estilo.** `scripts/port-v2-css.cjs` agora também copia `admin-preview.css` e `project-admin-dialogs.css` da branch `feat/admin-v2-design-prototype-20261009` do repositório V2 (regras `.ap-*`). Nas páginas oficiais o invólucro é `<div className="ap-app v2-admin-page">`; os ajustes ficam no bloco "Administradora na identidade V2" de `operational.css`.
- **Visão geral (`AdminDashboard.tsx`).** Mesmos dados e consultas de antes (contas, ações pendentes, horas do mês, NPS, consumo por cliente, status dos entregáveis, compromissos de 15 dias, próximos prazos, carteira com horas/projetos/NPS/próximo passo, exportação em PDF). Os dados de demonstração (`createPreviewDashboardData`, modo `cali-preview-role`) foram removidos da página.
- **Decisões tomadas que a proprietária precisa confirmar:**
  1. O mini calendário do mês, o botão "Cores" e a alternância Mês/Semana do bloco de agenda saíram da Visão geral. As cores escolhidas ali não eram salvas e a visão Semana só mostrava um aviso; a lista de compromissos e o link para o Calendário permanecem.
  2. As páginas migradas da administradora ficam só no tema dia (a V2 não tem tema noturno); o botão de tema continua nas páginas ainda não migradas.
  3. O bloco "Quadro de avisos" do protótipo não entrou: depende do backend de Avisos (ver pendências).
- Conferência: `/admin` em 1440, 1024 e 768 sem rolagem horizontal; diálogo de exportação abre com o documento; `/admin/clientes` segue no visual anterior, funcionando. `npm run check` passou; varredura do cliente 105/0.
- Não testado: impressão do PDF da exportação em janela nova e qualquer gravação contra o banco real.
- Próximas páginas, nesta ordem: Clientes, Projetos, Horas, Calendário, Ocorrências, Documentos, Relatórios, NPS & satisfação, Equipe (admin), Propostas, Mapa de People.

### 10/10 — Visão geral da administradora alinhada ao protótipo revisado pela proprietária

A proprietária mostrou a Visão geral do protótipo (`?area=admin`) como base e avisou: barra lateral e barra superior do oficial estão aprovadas (não mudar); o protótipo não está 100% aprovado; não repetir informação.

- Blocos na ordem do protótipo: Prioridades de hoje, Agenda da CALI, Consumo de horas por cliente, Status dos entregáveis, NPS e satisfação, Próximos prazos, Carteira de clientes.
- Carteira virou cartões (logo, nome, serviço · horas · projetos · NPS, situação). A situação é calculada dos dados reais: Ajuste solicitado, Aguardando cliente, Sem projeto ativo, Em execução, Em dia.
- Para não repetir: "Pontos de atenção" do protótipo mostra o mesmo que "Prioridades de hoje" e não entrou; a tabela antiga da carteira repetia horas e próximo prazo e saiu.
- "Quadro de avisos" segue fora até existir o backend de Avisos.

### 10/10 — Visão geral da administradora: filtros e prioridades com prazo (aprovado pela proprietária)

- Filtros no topo: conta (todas ou uma) e mês (atual e 11 anteriores). A conta recorta tudo o que a página mostra; o mês muda apenas as horas (indicador, consumo por cliente, alerta de 80%). Agenda e prazos mostram sempre o que vem pela frente; NPS não é recortado por mês. A exportação mantém o recorte próprio.
- Prioridades de hoje: além dos alertas (cronograma aguardando cliente, ajuste solicitado, horas ≥ 80%), entram até 4 entregáveis não concluídos vencidos ou com prazo nos próximos 7 dias, com etiqueta de data. Esses itens **não** aparecem em "Próximos prazos", que lista os seguintes.
- "Próximos prazos" passou a considerar só entregáveis ainda não aprovados.

### Link de homologação (o mesmo para cliente e administradora)

`https://app-cali-git-feat-client-visual-v2-inplace-20261008-cali11.vercel.app/login` — acompanha esta branch e usa o banco real. O que aparece depende do login: usuária cliente vê a área da empresa; a administradora vê `/admin`. Confirmado pela proprietária em 10/10: agenda da Visão geral sem mini calendário/cores/semana, e administradora só no tema dia.

## Pendências que dependem da proprietária (consolidado em 10/10)
Itens pedidos que **não foram feitos porque exigem mudança no banco ou decisão**:
1. **Avisos (Quadro de Avisos):** não existe tabela de comunicados. Falta criar a tabela, a ciência por
   usuário, as regras de acesso por empresa e a tela de publicação na administradora.
2. **Documentos — coautores e data de revisão separada da validade:** hoje há uma única data
   (`files.valid_until`) e nenhum campo de coautores. Falta criar os campos e incluí-los no cadastro da
   administradora. “Elaborado por” mostra “CALI · Assessoria”.
3. **Documentos — aviso de 60 dias para a administradora:** depende da migração da página de Documentos dela.
4. **Horas — marcos de 50% e 70% visíveis na administradora:** o cliente já vê o aviso; a visão administrativa
   da distribuição fica para a migração da administradora (avaliar a tabela `hour_alerts`).
5. **Rotatividade (Equipe → Indicadores):** fórmula provisória (saídas do mês ÷ quadro ativo). A regra oficial
   precisa ser definida.
6. **Assinatura (Meu perfil):** layout organizado, desenho final ainda não decidido.
7. **Ficha da pessoa:** abas do protótipo (Visão geral, Movimentações, Vínculos) ainda não aprovadas; a ficha
   usa as abas oficiais.
8. **Empresa e usuário de teste** para validar gravações com sessão real (nenhum fluxo de escrita foi testado
   contra o banco).
9. **Calendário:** a escolha de horário clicando na grade foi retirada do cliente a pedido; o pedido de
   encontro segue pelo botão “Solicitar agendamento”.

### Administradora — decisão da proprietária em 09/10 e plano
Regra: a identidade é a V2 aprovada do cliente; **nenhum dado, campo, função ou fluxo do administrador
oficial muda**. O protótipo em `cali-workspace-v2@feat/admin-v2-design-prototype-20261009` é só referência
de direção, não especificação. Ordem de trabalho:
1. Shell: mesma sidebar e topbar do cliente, com os menus da administradora (Visão geral, Clientes, Equipe,
   Projetos, Horas, Calendário, Ocorrências, Documentos, Relatórios, NPS & satisfação, Propostas, Mapa de
   People), timers ativos e despesas de visita preservados.
2. Diálogos, gavetas, tabelas, abas, filtros e formulários no padrão aprovado (`.enh-*`, `.wf-*`,
   `.data-grid`, `.section-tabs`, `.toolbar`).
3. Páginas, uma por vez, na ordem de uso: Visão geral, Clientes, Projetos, Horas, Calendário, Ocorrências,
   Documentos, Relatórios, Equipe, Satisfação, Propostas, Mapa de People.
4. A cada página migrada, retirar de `src/styles/legacy` as folhas que deixarem de ser usadas; ao final a
   pasta deixa de existir e os runtimes de DOM viram componentes.
5. Teste com sessão real, depois merge na `main`.

### Pendências do cliente
- Equipe: tabela do diretório ainda com colunas configuráveis (a V2 tem seis fixas); ficha da pessoa em
  gaveta lateral (a V2 mostra um diálogo central); revisão fina do formulário de cadastro em cinco passos.
- Projetos: o aviso “itens do cronograma interrompidos” aparece mesmo com zero itens — conferir com sessão real.
- Conferência visual tela a tela em 390 px (só o estouro de largura foi medido).
- Fluxos de gravação com sessão real, numa empresa de teste.
- Avisos: não existe origem de dados no banco; a página mostra estado vazio. Ligar exige criar tabela,
  ciência por usuário, regras de acesso por empresa e a publicação pela administradora (mudança de banco,
  precisa de autorização).
- `scripts/verify-v2-operation.cjs` precisa ser reescrito para a nova estrutura.

### Pontos de atenção antes de publicar no oficial
- A branch também contém a reestilização da administradora feita nas tentativas anteriores
  (`styles/workspace-admin-v2.css`). Publicar a branch muda a aparência da administradora.
- Entrada sem login removida (decisão da proprietária em 09/10: nada oficial entra sem login): `ProtectedRoute`
  exige sessão em qualquer endereço e a tela de login não oferece mais “Prévia de desenvolvimento”. Restam
  leituras mortas de `cali-preview-role` em páginas da administradora, a limpar na migração dela.
- Reversão: `main` permanece no commit `a04c056`; voltar é reverter o merge.
