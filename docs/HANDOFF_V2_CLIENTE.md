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

### 10/10 — administradora: Contas e clientes (segunda página migrada)

A proprietária informou que "Contas e clientes" do protótipo está 100% aprovada, com uma exceção: os motivos de bloquear, arquivar e encerrar abriam em painel lateral e devem abrir em diálogo central na identidade aprovada.

- `/admin/clientes` entrou em `migratedAdminRoutes`. `AdminClientsPageV3.tsx`: lista (`ap-client-data`) com filtro de situação e busca; "Nova conta" (`ap-registration-modal`, 4 etapas); gestão da conta (`ap-account-modal`, 8 abas: Dados cadastrais, Contrato, Frentes, Agenda do contrato, Financeiro, Operação, Comunicações, Histórico); motivo de bloquear/arquivar/encerrar/reativar em diálogo central (`ap-status-confirm`), com data do distrato e projeção financeira no encerramento.
- Todos os campos, cálculos e gravações são os de antes; só a moldura mudou. Os campos internos mantêm as classes oficiais (`stacked-label`, `form-grid`, `check-line`…) e recebem o visual pelo escopo `.v2-admin-form` em `operational.css`. `ContractFrontsAdmin` e `ContractAgendaSettings` não foram alterados, só estilizados por esse escopo.
- Removidos: dados de demonstração da página (`previewClients`, modo `cali-preview-role`) e as folhas `page2-client-management.css`, `page2-account-tabs.css`, `page2-client-management-v3.css` com `styles/routes/clients.ts`.
- Diferenças em relação ao protótipo, por serem regra do sistema oficial:
  1. Ações da linha: Editar, Bloquear (ou Reativar), Arquivar, Encerrar. O protótipo tem "Pausar" e "Bloquear" separados; no oficial existe um só estado (bloqueado).
  2. Filtro de situação: Ativo, Bloqueado, Arquivado, Encerrado (os estados reais). O protótipo lista Standby, Inativo e Cancelado, que não existem no banco.
  3. Cadastro sem a etapa "Decisores e acessos": vários decisores/acessos por empresa exigem mudança de banco e de permissões (ver `HANDOFF_ADMIN_CLIENTES_DECISORES_2026-10-10.md` no repositório V2). Hoje a lista mostra o decisor principal e a situação do acesso dele.
- Conferência: `scripts/v2-admin-clients-check.cjs` abre cadastro (4 etapas), gestão (8 abas) e os diálogos de motivo. `npm run check` passou; varredura do cliente 105/0.
- Não testado: gravações (cadastrar, salvar, bloquear, arquivar, encerrar, enviar logo e documentos) contra o banco real.
- Pendência técnica: `dashboard-overview-live.css` ainda é carregada na Visão geral só por causa do documento de exportação; podar para as regras `.overview-export-*`.

### 10/10 — Nova conta no padrão do protótipo, acessos e "Solicitar acesso"

Orientação da proprietária: nas telas aprovadas é copiar o padrão desenhado, sem "design parecido"; liberdade criativa só quando ela disser.

- **Nova conta** (`AdminClientsPageV3.tsx`): refeita com a marcação do protótipo (`ap-registration-hint`, `ap-registration-fields`, `ap-decision-*`), 5 etapas: Dados cadastrais, Decisores e acessos, Contrato, Financeiro, Documentos. Todos os campos oficiais continuam (inclusive multa de encerramento, regra de vencimento, filiais, logo, contrato e aditivo com data).
- **Decisores e acessos:** o decisor principal grava como antes. Decisores/acessos adicionais (até 3, total de 4 por empresa, todos com a mesma visão) têm os campos na tela mas **ainda não são gravados** — há um aviso na própria etapa. Depende da mudança de banco abaixo.
- **Solicitar acesso (cliente):** botão em Ocorrências, ao lado de "Nova ocorrência". Diálogo com as condições, ciência obrigatória e campos (nome, cargo, e-mail, telefone/WhatsApp, observações). Vira uma ocorrência do tipo `request` com os dados e a data da ciência; sem mudança de banco. O texto das condições é rascunho: **valor do acesso adicional ainda não definido** pela proprietária.
- Campos do protótipo que não existem no oficial e não entraram (precisam de coluna nova): tipo de contrato, modelo, prazo para pagamento (financeiro), link do Drive, observação documental, responsável documental.

Supabase: acesso confirmado ao projeto `kqtbfeeqbcllwvlkbrkq` (leitura do esquema feita; nada alterado). O que existe hoje:
- `companies.status` aceita só `active`, `paused`, `closed`, `archived`. No app, `paused` aparece como "Bloqueado" e desativa os perfis da empresa.
- `client_invites` já aceita mais de um convite por empresa (único por empresa + e-mail, com `is_primary`); não há limite de quantidade nem papel (decisor/acesso).

Mudanças de banco propostas, **aguardando "pode aplicar"**:
1. Situação "Pausado" separada de "Bloqueado": novo valor em `companies_status_check` (ex.: `blocked`), mantendo `paused` como pausa. Falta a proprietária definir a diferença prática (o cliente pausado continua entrando?).
2. Acessos adicionais: coluna de papel em `client_invites` (principal / decisor adicional / acesso adicional), limite de 4 acessos ativos por empresa e função para a administradora criar/remover convites; revisar o gatilho de aceite do convite e as políticas de RLS antes.

### 10/10 — banco: Bloqueado, papéis de acesso e campos do cadastro (APLICADO em produção, com "pode aplicar" da proprietária)

Migração `supabase/migrations/20261010230000_account_blocked_status_access_roles_contract_fields.sql`, aplicada no projeto `kqtbfeeqbcllwvlkbrkq`. Só acrescenta; nenhum dado existente foi alterado além de marcar o convite principal como `primary`.

- `companies.status` passou a aceitar `blocked`; colunas `blocked_at`, `blocked_reason`. **Pausado** (`paused`) = contrato em espera, cliente continua entrando; **Bloqueado** (`blocked`) = perfis do cliente desativados. Confirmado pela proprietária.
- `companies`: `contract_type`, `contract_model`, `payment_term_days`, `document_notes`, `document_owner`. O link do Drive usa a coluna que já existia (`drive_folder_url`).
- `client_invites`: `access_role` (`primary` / `decision_maker` / `additional`), `platform_access`, e gatilho `client_invites_limit` que recusa o 5º acesso ativo da empresa.
- **Correção (10/10, mesma data):** a afirmação anterior de que um convite não cria login estava errada. A função `workspace-access` (Edge Function publicada no Supabase, fora do repositório) cria usuário e perfil para **qualquer convite com `active = true`** quando a pessoa pede o código na tela de acesso. Por isso o app grava `active = platform_access`: sem "Liberar acesso à plataforma" a pessoa fica só registrada. Remover a pessoa apaga o convite e desativa o perfil dela. Nenhum acesso adicional havia sido criado no banco antes da correção.
- Atenção: a versão em produção (`main`) ainda chama `paused` de "Bloqueado" e desativa os perfis ao pausar. Isso só muda quando esta branch for publicada.

No app (`AdminClientsPageV3.tsx`): ações Pausar e Bloquear separadas (lista, rodapé da gestão, diálogo de motivo com a explicação de cada uma), filtro com Pausado e Bloqueado, campos novos no cadastro e na gestão (Contrato, Modelo, Prazo para pagamento, Link do Drive, Responsável e Observação documental), decisores/acessos adicionais gravados em `client_invites` no cadastro e editáveis em Gestão da conta → Dados cadastrais. Não testado contra o banco real.

### 10/10 — administradora: Equipe (terceira página migrada)

Pedido da proprietária: a Equipe da administradora é a mesma tela aprovada do cliente; a única diferença é o filtro de empresa. Dados de empresas diferentes nunca se misturam.

- `/admin/equipe` entrou em `migratedAdminRoutes`. `CompanyTeamPage.tsx` passou a usar para a administradora os mesmos ramos visuais do cliente (Diretório, Estrutura, Movimentações, Indicadores, colunas, exportação, planilha, cadastro em formulário único, ficha em diálogo central).
- Filtro de empresa no início da faixa de contexto. A página carrega **uma empresa por vez** (`companyId`); não existe visão somada.
- O que continua exclusivo da administradora: remuneração e dados restritos no cadastro e na ficha, identificação de gênero na ficha, colunas padrão completas.
- Pendência de limpeza: os ramos do visual anterior ficaram desligados por `const v1=false` no arquivo. Removê-los (e as folhas `team-*` que só eles usam) numa passada própria, com a tela conferida antes e depois.
- Conferência com dados fictícios: quatro abas e "Adicionar pessoa" abrem sem erro, sem rolagem horizontal em 1440. `npm run check` passou; varredura do cliente 105/0. Não testado contra o banco real.

### Como nasce um acesso hoje (levantado em 10/10)

- **Cliente:** não há tela de "criar acesso" nem e-mail de convite. O acesso existe quando há um convite ativo em `client_invites` (criado em Clientes → Nova conta, ou nos acessos adicionais). A pessoa entra em `/login`, informa o e-mail e recebe o código de 6 dígitos (Resend, remetente patricia@calirh.com). No primeiro código a função `workspace-access` cria o usuário e o perfil.
- **Administradora:** está fixa no banco: `cali_workspace.is_admin()` compara o e-mail do login com `patricia@calirh.com`. Não é possível criar outra administradora geral pela tela; exige mudar essa função (usada nas políticas de acesso de todas as tabelas).
- **Partner com visão própria:** não existe. `profiles.role` só aceita `admin` e `client`.
- **Boas-vindas / primeiro acesso guiado:** não encontrado no código do app oficial (nem tela, nem tour). A aba Comunicações grava a opção de e-mail de boas-vindas, mas não foi localizado no repositório o serviço que envia a fila `communication_outbox`.
- Valor do acesso adicional definido pela proprietária: R$ 59,00/mês por acesso (texto em Ocorrências → Solicitar acesso).

### 10/10 (noite) — ajustes pedidos e decisões da proprietária

Feito:
- **Despesas das visitas extras** (`ExtraVisitExpenses.tsx`): botão do topo virou "Despesas"; "Adicionar linha" fica acima e a linha nova entra no topo (as preenchidas descem); o aviso sobre carro próprio foi para depois das linhas, com respiro; botões no tamanho padrão dos diálogos V2. Regras em `operational.css` (bloco "Despesas das visitas extras").
- **Ficha da pessoa:** etiquetas (tempo de casa, identificação de gênero) com respiro em relação à linha das abas.
- **Equipe (administradora):** o filtro é só "Empresa" + caixa de seleção, sem a miniatura do logo.
- **Solicitar acesso:** valor definido em **R$ 59,90/mês por acesso**. Limite é sempre 4 acessos por empresa (não existe pacote de 5).

Decisões registradas, **não construídas**:
- **Boas-vindas e primeiro acesso.** Fluxo desejado: conta criada → algumas horas depois ou no dia seguinte a pessoa recebe um e-mail de boas-vindas com o link do primeiro acesso → no primeiro acesso aparece a experiência de boas-vindas (menu interativo). Hoje nada disso existe: a pessoa só entra se souber o endereço e pedir o código. Ao construir: fila de envio com atraso, modelo do e-mail, marca de "primeiro acesso concluído" por perfil, e o termo de adesão previsto no handoff mestre do V2 (onboarding da conta).
- **Usuários internos da CALI.** A proprietária quer criar, numa tela da administradora, pessoas internas escolhendo o perfil: **Administradora** ou **Parceiro**. Ela deu "pode aplicar", mas **não foi aplicado**: é mudança de permissão em todas as tabelas e precisa de um bloco próprio. O que envolve:
  1. hoje `is_admin()` reconhece só `patricia@calirh.com`; passar a reconhecer uma lista de administradoras;
  2. novo papel `partner` em `profiles.role` e tabela de atribuição parceiro → empresas;
  3. regra já escrita em `docs/EQUIPE_EMPRESA_SPEC_2026-10-01.md`: o parceiro vê somente as empresas atribuídas (projetos, ocorrências, calendário, ficha de pessoas e remuneração dessas empresas) e não vê contratos nem financeiro;
  4. revisar políticas de RLS, funções (RPC), Storage, exportações e relatórios para o papel novo, com teste de isolamento empresa A × B;
  5. a função de login `workspace-access` só cria perfis de cliente; precisa aceitar convites internos;
  6. tela "Equipe CALI / Acessos internos" na administradora.
- **Indicadores por plano (módulos).** Regra oficial (`docs/PRODUCT_RULES.md`): CALI Partner = leitura mensal de indicadores-chave; CALI Full = People Analytics nível 3. O catálogo de frentes já tem `people_analytics` (núcleo do Full, contratável à parte no Partner). Pedido: o cliente vê só o que contratou; o restante aparece esfumado, com chamada para contratar. A administradora vê tudo.
- **Estrutura de People Analytics** enviada pela proprietária (planilha `People_Analytics_Estrutura_de_Indicadores.xlsx`, 42 indicadores): três camadas — Básico (18), Tático (11), Estratégico (13); três visões — Panorama (6 a 8 números para diretoria, trimestral), Gestão (12 a 18, mensal, com filtro por área), Analítica (catálogo completo); seletor de período no topo (Mês / Quarter / YTD / 12M); todo número com comparação (mês anterior, ano anterior, meta) e gráfico conforme a família (linha para evolução, barras horizontais ordenadas para áreas, empilhadas 100% para composição, Pareto para motivos, funil para recrutamento). Boa parte depende de dados que o Workspace ainda não recebe: folha e custo, ponto/absenteísmo/horas extras, recrutamento (vagas e funil), desempenho, clima/eNPS, receita.

### 10/10 (noite) — indicadores por plano: módulo People Analytics travado para quem não contratou

Divisão aprovada pela proprietária. Em Equipe → Indicadores (`CompanyTeamPage.tsx`):
- Todos os clientes veem os sete números (quadro ativo, admissões, desligamentos, variação líquida, rotatividade, permanência média, movimentações internas).
- Os gráficos (movimento do quadro, tempo de permanência, evolução, composição por área) só ficam legíveis quando `analytics` é verdadeiro: plano `full`, **ou** frente `people_analytics` ativa em `company_fronts`, **ou** administradora. Para os demais aparecem esfumados (`v2-module-gate locked`, `v2-module-blur`, com `inert`) e um cartão "People Analytics" com botão para falar com a CALI.
- O mesmo padrão (`v2-module-gate` + `v2-module-lock`) deve ser reutilizado em outros módulos vendidos à parte.
- A trava é de apresentação: os dados são da própria empresa e continuam chegando ao navegador. Se um dia o módulo precisar esconder dados de fato, a regra tem de ir para o banco.
- Usuários internos (Administradora / Parceiro): a proprietária decidiu fazer **dentro desta construção da administradora**, em bloco próprio (plano descrito acima).

### 10/10 (noite) — indicadores essenciais com comparativo; cartão do People Analytics como frente adicional

- Equipe → Indicadores: seletor "Comparar com" (mês anterior, mesmo mês do ano anterior ou qualquer mês confirmado). Quadro ativo, admissões, desligamentos, variação líquida, rotatividade e movimentações internas mostram a variação em relação ao mês escolhido; os três primeiros mostram também uma série curta dos últimos meses confirmados (mês atual em bordô, mês comparado em dourado). Sem mês confirmado na referência, o cartão diz isso em vez de inventar número. Permanência média não tem comparativo (é calculada na data de hoje, não há histórico guardado).
- O cartão sobre os gráficos travados passou a apresentar o People Analytics como **frente adicional**, com o texto do catálogo de frentes, e leva para `/cliente/frentes` ("Conhecer esta frente") e para Ocorrências.
- Pendente (pedido da proprietária): criar onde os dados que faltam são inseridos — absenteísmo e clima fazem parte dos "Indicadores essenciais" prometidos no catálogo de frentes e ainda não têm entrada de dados. Proposta em discussão: lançamento mensal por empresa (planilha ou formulário), com tabela nova no banco.

### 11/10 — dados do mês (absenteísmo, horas extras, quadro aprovado, clima) e empresa fictícia de demonstração

Banco (APLICADO, com autorização da proprietária): `supabase/migrations/20261011010000_team_month_metrics.sql` cria `cali_workspace.team_month_metrics` — uma linha por empresa e mês com horas previstas, horas de ausência por motivo (atestado, licença, falta injustificada, acidente), horas extras, saldo do banco de horas, quadro aprovado por área (JSON área → posições), eNPS, nota de clima e participação. Leitura e gravação por `can_access_company` (administradora e cliente da própria empresa).

App (`CompanyTeamPage.tsx`, Equipe → Indicadores):
- Cartão **Dados do mês** com "Lançar dados do mês" / "Editar lançamento" (diálogo `v2-month-form`), para administradora e cliente.
- Indicadores essenciais novos (todo cliente vê): **Absenteísmo** (ausências ÷ horas previstas) e **Sinais de clima** (eNPS / nota), com comparativo.
- People Analytics (Full, frente contratada ou administradora): absenteísmo por motivo, absenteísmo e horas extras mês a mês, quadro aprovado × ocupado por área, desligamentos em 12 meses por iniciativa e motivo. Motivo e iniciativa do desligamento já existiam no cadastro (`termination_initiative`, `termination_reason`).
- Ainda sem entrada de dados: folha e custo, receita, recrutamento, desempenho, treinamento, sucessão, SST detalhado.

**Empresa fictícia no banco real** (pedido da proprietária, para ver o relatório completo na administradora):
- `Empresa Demonstração (fictícia)`, id `1b9ff082-cde9-4fb5-8feb-2ffb1f44eaa0`, plano CALI Full, 28 pessoas fictícias (24 ativas, 4 desligadas), 12 meses confirmados (nov/2025 a out/2026), 37 movimentações e 12 lançamentos mensais. Todos os nomes trazem "(fictícia/fictício)".
- **Não tem convite nem usuário**: ninguém consegue entrar como cliente dessa empresa.
- Ela aparece também no app oficial (`app.calirh.com`) para a administradora e entra nas contagens da Visão geral (contas ativas, horas contratadas).
- Sem remuneração nem dados restritos (a tabela restrita tem gatilho de auditoria; não foi usada).
- Para remover: apagar as linhas de `team_changes`, `team_month_snapshots`, `team_months`, `team_month_metrics`, `team_members` com esse `company_id` e depois a linha de `companies`. Só com pedido da proprietária.

### 11/10 — ajustes da proprietária nos Indicadores

- Diálogo "Dados do mês": estava sem respiro lateral e cortado; agora tem cabeçalho fixo, corpo rolável com margem e rodapé fixo.
- Indicadores essenciais deixaram de ser três fileiras de cartões: quatro números do topo, uma fileira com cinco cartões (rotatividade, permanência, movimentações internas, absenteísmo, clima), uma faixa "Dados de <mês>" com o botão de lançar/editar e o painel **Evolução dos indicadores essenciais** — gráfico de até 12 meses confirmados com seletor (quadro ativo, admissões, desligamentos, rotatividade, absenteísmo, eNPS), mês de referência em bordô e mês comparado em dourado.
- Sem mês de comparação confirmado, aparece um aviso único ao lado de "Comparar com" (antes repetia em todos os cartões). O comparativo volta para "Mês anterior" ao trocar de empresa.
- O lembrete "Hora de atualizar o quadro!" aparece **só para o cliente** (é ele quem alimenta o quadro). Consequência: a administradora não abre mais o assistente mensal por ali.
- O assistente "O que mudou neste mês?" (`TeamMonthWizard.tsx`) usa sempre o diálogo V2.
- Pedidos registrados, não construídos: (1) gerar relatório/PDF organizado da visão de Indicadores; (2) no futuro, leitura de diagnóstico automática da empresa a partir desses dados; (3) a proprietária ainda acha a tela com cartões demais — revisar a hierarquia visual junto com o relatório.

### 11/10 — administradora: Projetos e entregáveis (quarta página migrada, ETAPA 1)

Projetos é a página mais instrumentada do sistema. Além do React (`AdminProjectsPageV3.tsx`), seis módulos automáticos e três pontes inserem partes da tela procurando classes específicas (cerca de 170 KB de código): carteira por cliente (`projectsClientPortfolioRuntimeV39`), inteligência de prazos e catálogo de frentes (`projectsPlanningIntelligenceRuntimeV36`), aprovação de cronograma (`projectApprovalWorkflowRuntimeV38`, `projectApprovalRulesRuntimeV39`), ciclo de vida do projeto (`projectExecutionLifecycleRuntimeV44`, `projectLifecycleRecalcUxV45`), timer (`ProjectTimerBridge`, `GlobalTimerBar`), histórico de entregas (`ProjectDeliveryHistoryBridge`) e travas operacionais (`OperationalSafetyBridgeV2`).

O que foi feito:
- `/admin/projetos` entrou em `migratedAdminRoutes`. A página foi reescrita na composição do protótipo (título com Nova frente / Novo entregável / Novo projeto; quatro indicadores; busca e filtro; contexto do projeto selecionado; abas **Visão do projeto** (nova), **Cronograma**, **Entregáveis** (lista e kanban) e **Histórico**; diálogos `ap-pd-modal` para projeto, frente, entregável e gestão do entregável; confirmação de status e exclusão em `ap-status-confirm`).
- **As classes antigas foram mantidas ao lado das novas** em cada ponto de encaixe (`projects-flow-page`, `project-kpis-v2`, `project-tools-v2`, `project-selector-v2`, `project-hero-v2 > div > span` com o protocolo, `project-hero-buttons`, `roadmap-v2`, `front-section-v2 / front-header-v2 / front-copy-v2 / front-monthbar-v2 / front-deliverables-v2`, `front-deliverable-row-v3`, `deliverable-list-row-v3`, `kanban-v2`, `project-history-v2`, `project-modal-v2`, `deliverable-workspace-modal-v2` e filhos). Há um comentário no arquivo. Não remover sem migrar o módulo correspondente.
- Saíram as folhas `page5-projects*.css` e, do carregador da rota, as folhas de chat/horas antigas. **Continuam carregadas** as folhas dos módulos (`projects-planning-intelligence-v36`, `project-approval-workflow-v38`, `project-approval-rules-v39`, `project-client-portfolio-v39`, `admin-projects-stability-v62`), porque estilizam o que eles inserem.
- O "Histórico do projeto" tinha três itens fixos de exemplo; foram removidos. O conteúdo vem da ponte de histórico de entregas quando há dados.
- Conferido com dados fictícios (`scripts/v2-admin-projects-check.cjs`): os módulos continuam inserindo a faixa de clientes, o catálogo de frentes no novo projeto, o timer no cabeçalho e nas subtarefas, e o chat com canais Cliente/Interno. `npm run check` passou; varredura do cliente 105/0.

O que falta (ETAPA 2), **não conferido**:
- Diálogos e faixas criados pelos módulos ainda estão no visual anterior: revisão/aprovação de cronograma (`workflow-dialog-v38/v39`, `project-review-banner-v38`), gerenciar ciclo de vida (`project-lifecycle-dialog-v44/v45`, botão "Gerenciar"), projetos por cliente (`project-client-modal-v39`), avisos (`workflow-toast-v40`), ações da frente em rascunho (`front-admin-actions-v38`). Só aparecem com dados reais em certos estados (rascunho, em revisão do cliente, pausado).
- O protótipo escolhe o projeto por uma caixa de seleção e muda o status do projeto por outra; no oficial isso é feito pela faixa de clientes e pelo "Gerenciar" dos módulos. Unificar exige reescrever esses módulos em React.
- Nenhuma gravação testada contra o banco real.

### 11/10 — Projetos da administradora, ETAPA 2: janelas e faixas dos módulos no padrão V2

- Causa do "vidro transparente": os módulos de Projetos (e outros componentes operacionais) pintam com as variáveis `--theme-*` do tema anterior, que não existiam no V2. `operational.css` agora define essas variáveis com a paleta aprovada dentro de `html[data-workspace-ui='v2']`. Isso também alcança componentes do cliente que usavam essas variáveis.
- Mesma moldura dos diálogos V2 (cabeçalho em degradê claro, corpo rolável, rodapé com botões padrão) para: **Gerenciar projeto** (`project-lifecycle-dialog-v44/v45`), **Projetos da conta** (`project-client-modal-v39`) e as janelas de aprovação/ajuste de cronograma (`workflow-dialog-v38/v39`). Campos ocultos pelos módulos (`hidden`) continuam ocultos.
- Estilizados na página: faixa de clientes, previsão (meta desejada / previsão CALI), faixas de revisão e de ciclo de vida, ações da frente e dos entregáveis em rascunho, ajuda "como ler o cronograma", avisos (`workflow-toast-v40`).
- Conferido com dados fictícios em três estados do cronograma (rascunho, em revisão do cliente, aprovado): "Gerenciar projeto" e "Projetos da conta" abertos e fotografados.
- **Não foi possível abrir no teste** (dependem de pedidos reais do cliente): janelas de aprovação/ajuste de cronograma e as faixas de revisão. Receberam a moldura por regra geral, sem conferência visual.
- Continua diferente do protótipo: escolher o projeto e mudar o status por caixas de seleção no topo. No oficial isso é a faixa de clientes + "Gerenciar projeto".
- Fixtures de teste: `QA_PLAN=draft|client_review|approved` muda o estado do cronograma fictício.

### 11/10 — Projetos da administradora: revisão da proprietária aplicada

Pedidos dela, print a print, e o que foi feito em `AdminProjectsPageV3.tsx`:
- **Sem os quatro cartões de indicadores** (ocupavam espaço e não são úteis agora). O elemento `project-kpis-v2` fica oculto porque um módulo atualiza a contagem.
- **Seleção compacta, como na Equipe:** "Empresa" + "Projeto" em caixas de seleção (o projeto mostra mês/ano de início), filtro de status e busca pequena na mesma linha. A faixa "Contas ativas" e o navegador de contas dos módulos ficam ocultos por CSS; os botões `project-selector-v2` continuam no DOM, ocultos, porque os módulos e a ponte de histórico leem o projeto ativo por eles.
- **Cartão do projeto em bordô**, com situação, andamento e ações. Datas uma única vez: etiqueta "Início" + "Meta desejada" e "Previsão CALI" (do módulo de prazos). O parágrafo que o módulo reescrevia com início/meta fica oculto, para não haver datas repetidas ou divergentes.
- **Aba "Visão do projeto" removida.**
- **Cronograma** virou linha do tempo (mesmo componente visual do "Em movimento" da home do cliente, classes `ch-gantt`): cada entrega no ponto do período em que está prevista.
- **Entregáveis** passou a mostrar frentes com seus entregáveis (acordeão) e a alternância Lista / Kanban. A lista plana foi retirada.
- **Diálogo do entregável** no mesmo desenho aprovado do cliente (`dv-modal`): Visão geral, Etapas (andamento, barra, etapas numeradas), Conversas (balões e campo fixo embaixo, com os canais Cliente / Interno) e Histórico (introdução + linha do tempo). Controles de gestão no rodapé. Os encaixes dos módulos foram mantidos (`conversation-pane-v2` no invólucro `dv-pane`, `task-list-v2 article`, `deliverable-head-actions-v2`, etc.).
- Conferido com dados fictícios nos estados rascunho e aprovado: módulos continuam inserindo "Gerenciar projeto", timer, chat e previsão. `npm run check` passou; varredura do cliente 105/0.
- Não incluído: filtro "Ativos / Inativos" de contas (o tipo de projeto no app não traz a situação da conta; hoje o filtro de status do cronograma cobre encerrados).

### 11/10 — Projetos aprovado pela proprietária; cliente com as mesmas abas

- A proprietária aprovou Projetos da administradora ("super aprovado"). Dois ajustes aplicados: a moldura do seletor de situação fica do tamanho da caixa; a etiqueta de situação do projeto vai para o canto superior direito do cartão bordô.
- **Cliente (`ClientDeliverablesPage.tsx`)**: a pedido dela, as abas passaram a ser **Cronograma** (linha do tempo `ch-gantt`, igual à da administradora), **Entregáveis** (sem mudança) e **Histórico** (mudanças de situação das entregas do projeto, vindas de `deliverable_status_history`). Saíram "Visão do projeto" e o cronograma em lista. O aviso de validação pendente ("Há uma validação aguardando você") ficou acima do conteúdo, porque era a única chamada para a ação do cliente na aba removida.
- Varredura do cliente 105/0 (inclui 390 px); `npm run check` passou.

### 11/10 — administradora: Horas e contratos (quinta página migrada)

- `/admin/horas` entrou em `migratedAdminRoutes`. `AdminHoursPageV3.tsx` na composição do protótipo: título com mês de referência, "Lançamento manual", "Interação externa" e "Iniciar timer"; três indicadores (capacidade contratada, utilizadas, disponíveis); "Em andamento" (timers ativos, quando houver); "Consumo por cliente"; "Registros de atuação" (filtros, tabela com detalhe, exportar CSV).
- Mudanças de composição: iniciar timer, lançamento manual e interação externa abrem em **diálogos** (`ap-pd-modal`) em vez de blocos na página; a seção "Visibilidade para clientes" virou um botão em cada linha do consumo ("Visível ao cliente" / "Oculto ao cliente"), com a mesma confirmação.
- Pontos de encaixe mantidos (auditoria de lançamentos em `OperationalSafetyBridgeV2`, ciclo de vida dos timers em `HoursLifecycleBridge`, logos em `hoursCompanyLogoRuntimeV41`): `hours-connect`, `hours-connect-period input`, `hours-v13-timer-row`, `hours-v13-timer-actions .primary`, `hours-v13-usage-list > article`, `hours-v13-logo`, `hours-v13-usage-name strong`, `hours-v13-extract-head`, `hours-connect-filters select`, `hours-connect-table`, `tr.hours-connect-detail`.
- Removido o carregador `styles/routes/hours.ts` (folhas `hours-v12/v13/v14/final-responsive/client-portfolio-v40` não são mais carregadas na rota).
- Conferido com dados fictícios: página, três diálogos, botões de auditoria (editar/excluir lançamento e "Auditoria") inseridos. `npm run check` passou; varredura do cliente 105/0.
- Não conferido: timer em andamento (sem timer no teste), janelas da auditoria abertas, gravações contra o banco real.

### 11/10 — Horas: ajustes da proprietária (timers em destaque, encerramento, densidade)

- **Timer no diálogo do entregável** (`project-header-timer.active`) e **na barra superior** (`global-timer-chip`): passam a ser um bloco bordô com relógio branco e controles claros, para se destacarem. O chip da barra superior usa estilos em linha no componente; as regras em `operational.css` usam `!important` por isso.
- **Propostas e Mapa de People** na barra superior da administradora viraram botões só com ícone (rótulo no `title`/`aria-label`), para não disputar espaço com o timer.
- **Confirmação de encerramento** (`TimerFinalizationDialog`, classes `timer-finalize-*`): estava sem estilo no V2 e empurrava a página; agora é um diálogo central no padrão `ap-status-confirm`, nas duas etapas.
- **Densidade da página de Horas**: "Consumo por cliente" em cartões compactos (grade), ordenados pelo maior uso, com busca, filtro "Acima de 80%" e os 8 primeiros visíveis até "Ver todas"; "Registros de atuação" mostra 15 por vez com "Mostrar mais".
- Fixtures: `QA_MANY=1` cria 30 contas, 40 lançamentos e um timer ativo para revisar densidade.
- Não conferido visualmente: o chip do timer na barra superior e o timer ativo no cabeçalho do entregável (o teste não reproduz o timer global), e a confirmação de encerramento aberta.

### 11/10 — alinhamento (regra permanente) e faixa "Dados do mês"

Regra da proprietária, repetida com exemplos: **controles do mesmo grupo ficam numa única linha e centrados na vertical** — ícone e rótulo do botão, texto e botões do timer, seletor e busca. Nada torto, nada quebrando para a linha de baixo, nada amassado.

- Timer do cabeçalho do entregável e chip do timer na barra superior: todos os itens com `inline-flex; align-items:center; line-height:1` e alturas iguais (30 px). O ícone de cronômetro solto ao lado do chip (`global-timers-mark`) foi ocultado.
- Botões com ícone nos rodapés de diálogo (`timer-finalize-dialog`, `ap-status-confirm`, `ap-pd-footer`, `dv-actions`): `inline-flex` centrado.
- Contas e clientes: filtro de status e busca na mesma linha, mesma altura (40 px).
- Equipe (administradora): a faixa "Dados do mês / Lançar dados do mês" aparece **só para o cliente**; quem alimenta é o cliente.
- Ao entregar qualquer tela: conferir cada botão com ícone, cada barra de ferramentas e cada cabeçalho; elementos inseridos pelos módulos automáticos precisam de regra explícita de alinhamento.

### 11/10 — administradora: Agenda da CALI (sexta página migrada)

Pedido: replicar o comportamento do calendário do cliente, lembrando que a conta da proprietária é conectada ao Google Agenda nos dois sentidos.

- `/admin/calendario` entrou em `migratedAdminRoutes`. `AdminCalendarPage.tsx` reorganizado na composição do cliente: título com "Alterações de reuniões", "Histórico de reuniões" e "Novo evento"; faixa do Google; linha de controle (Semana / Mês / Lista, navegação, Hoje, busca e Filtros); corpo com a **faixa bordô** à esquerda (título da visão, mês, legenda dos tipos + Google Agenda, mini calendário e contagem do período) e a visão à direita.
- As três visões são as do calendário oficial (semana com grade de horas e arraste para criar, mês, lista) — a grade de horas foi mantida na administradora porque os horários do Google Agenda ocupam a agenda. A visão padrão continua a que o componente já usava.
- Integração com Google intacta: `calendar-workspace-strip`, `calendar-connection-status` e os diálogos (`calendar-event-modal`, `calendar-detail-modal` e filhos) são os pontos lidos por `googleCalendarRuntime`, `calendarSyncGuard` e pelos módulos de agendamento; não foram alterados.
- Saiu o carrossel "Próximos compromissos" (a visão Lista mostra os mesmos itens) e a coluna lateral do mini calendário (foi para a faixa bordô).
- A folha `page4-calendar.css` continua carregada nesta rota para as visões e os diálogos; as cores vêm das variáveis de tema já mapeadas para a paleta V2. Regras de ajuste em `operational.css`, bloco "Agenda da CALI" (algumas com `!important` por causa da folha antiga).
- Conferido com dados fictícios: semana, mês e diálogo "Novo evento". `npm run check` passou; varredura do cliente 105/0.
- Não conferido: sincronização real com o Google (o teste não tem credenciais), diálogo de detalhe de evento, histórico de reuniões e caixa de alterações abertos.

### 2026-10-11 — Agenda da administradora: ajustes após a revisão da Patricia

- **Botões do evento Google** (antes três ícones minúsculos sem texto): agora "Editar no Google", "Enviar por e-mail" e "Abrir no Google Agenda", com ícone + texto na mesma linha.
- **Diálogos da agenda no padrão novo** (detalhe do evento, novo/editar evento, histórico de reuniões, caixa de cancelamento): cabeçalho creme com chamada dourada e título bordô, botão fechar quadrado, resumo Quando/Formato/Convidados em faixa única (como o resumo do entregável), campos de 38 px, rodapé padrão. Só CSS em `src/v2/operational.css`; todas as classes usadas pelos módulos automáticos foram mantidas.
- **Excluir evento**: `deleteEvent()` em `src/lib/googleCalendarRuntime.ts` usava `window.prompt` + `window.confirm` do navegador. Agora abre `askDeleteReason()` — diálogo `ap-status-confirm` com motivo obrigatório e botão "Excluir definitivamente". A chamada `delete_event` é a mesma.
- **Semana**: eventos com 3–4 px de respiro em cada lado da coluna (não encostam mais no evento do dia vizinho).
- Conferido no QA com eventos Google simulados. **Não conferido com dados reais:** exclusão de ponta a ponta (precisa da conta Google conectada). Ainda restam `alert`/`confirm` nativos no módulo do Google para erro de exclusão e desconectar.

### 2026-10-11 — Agenda da administradora: coluna lateral removida (pedido da Patricia)

- Saiu a coluna bordô (legenda, mini calendário e contador) porque apertava o calendário e deixava a letra dos compromissos minúscula. O calendário ocupa a largura toda.
- A legenda de cores e o total de compromissos do período foram para uma linha única no rodapé do calendário (`v2-admin-cal-foot`). O mini calendário saiu; a navegação segue pelas setas, "Hoje" e as visões Semana/Mês/Lista.
- Letra maior nos compromissos nas três visões (semana 12 px, mês 11,5 px, lista 13 px). As regras antigas `.v2-admin-cal-aside/-mini/-count` em `operational.css` ficaram sem uso — limpar depois.

### 2026-10-11 — Agenda: botões do evento Google colados na linha

- A folha antiga (`page4-calendar.css`, regra com `:has(.calendar-google-detail)`) zerava o respiro de baixo da linha de ações. Regra mais específica em `operational.css` devolve 14 px em cima e embaixo. Lição: nos diálogos da agenda, conferir a medida real até a linha divisória, não só o CSS escrito — há regras antigas com `:has` e `!important`.

### 2026-10-11 — Agenda: convidados, registro do encontro e linha do Google no padrão novo

- Blocos do detalhe do evento que ainda estavam no visual antigo: lista de convidados (`calendar-attendee-list`), "Registro do encontro" (`v69-admin-outcome`, criado por `schedulingPostConfirmationV69.ts`) e a linha Google/Lembrete (`google-calendar-runtime-event-meta`). Só CSS; situação vira etiqueta, botões e campos no padrão.
- O diálogo cresce até 92% da altura da tela antes de rolar e os blocos não encolhem mais.
- Conferido com marcação simulada; **não conferido com evento real** (os dois últimos blocos dependem de dados reais e do Google conectado), nem o formulário "Aconteceu / Não aconteceu" aberto.

### 2026-10-11 — Administradora V2: Ocorrências

- `/admin/registros` entrou em `migratedAdminRoutes`. `src/pages/records/WorkspaceRecordsPage.tsx` agora usa a MESMA composição do cliente para a administradora (cabeçalho, resumo em linha, segmentos + filtros em uma linha, lista `wf-records`, painel lateral `wf-record-drawer`, formulário `wf-modal`), dentro de `ap-app v2-admin-page v2-admin-records v2-client-module`.
- Próprio da CALI, mantido: filtro Empresa (junto de Tipo/Situação/Busca), etiqueta "Ação necessária" na lista e no painel, contagem "com ação necessária", bloco de tempo de acompanhamento, rodapé com as ações de situação (Assumir, Aguardar cliente, Stand by, Finalizar, Reabrir), "Enriquecer memória" e Excluir, e todos os campos do formulário (Cliente, Projeto, Reunião do calendário, Tipo, Data, Impacto, Título, Contexto, Pessoas, Transcrição, Decisões, Pontos de atenção, Próximas ações, 3 opções).
- A tabela antiga (`records-v13-table`) saiu. Os módulos automáticos que só enfeitavam a tabela (logo por linha em `recordsExperienceRuntimeV2.decorateTable`, `recordsExperienceRuntime` linha ~405) deixam de agir; os do painel continuam porque usam `data-v2-operation` e `.records-v13-drawer-actions` (classe mantida no rodapé).
- Balões da conversa: os módulos pintavam bordô/dourado com `!important` só para a administradora; regras em `operational.css` igualam ao cliente (creme / rosado).
- Conferido no QA: lista, painel com conversa, formulário, 390 px sem estouro, cliente intacto (105/0). **Não conferido com dados reais:** mudanças de situação, envio de mensagem/anexo, encerramento com avaliação, registro só de memória (sem conversa) e pedido de reabertura.
- Pendente: folhas antigas de registros ainda são carregadas na rota; limpar depois.

### 2026-10-11 — Ocorrências da administradora: revisão da Patricia (lista escalável e painel)

- **Lista** (`WorkspaceRecordsPage.tsx`, só administradora): Empresa agora abre em **"Todas as empresas"** (`companyId === 'all'`; `loadContext` lê sem filtro de empresa via `scoped()`, a RLS continua valendo; o realtime fica sem filtro nesse modo). Filtros todos em listas suspensas numa linha: Empresa, Situação, Tipo, **Agrupar por** (situação / empresa / tipo / sem agrupamento), botão "Só com ação necessária" e busca (também por nome da empresa). Saíram os segmentos, que repetiam o filtro de situação.
- **Grupos recolhíveis** (`adminGroups`): cada grupo tem cabeçalho com contagem e "N com ação necessária"; históricos (stand by, finalizadas, canceladas, memória) começam fechados; 8 linhas por grupo + "Mostrar mais". Ordem dentro do grupo: ação necessária primeiro, depois a mais recente. Na visão de todas as empresas a linha mostra a etiqueta da empresa.
- **Painel**: o cronômetro de acompanhamento virou etiqueta compacta no canto superior direito (tempo + Iniciar/Pausar/Encerrado), como o das tarefas; o bloco grande saiu de cima da conversa. A avaliação do cliente virou faixa de uma linha. Só CSS sobre o que `recordsOperationsRuntimeV25` e `recordsClosureExperienceRuntimeV28/29` criam; o texto "N min registrados · N sessões" do bloco antigo não aparece mais (o total continua na etiqueta).
- Atenção: em "Todas as empresas" a contagem de mensagens lê todas as mensagens de uma vez (limite padrão de 1000 linhas do banco) — quando o volume crescer, trocar por contagem agregada.
- Conferido no QA com 1 empresa/1 registro (dados de teste), 1440 e 390 px, cliente intacto. **Não conferido com dados reais:** muitas empresas/ocorrências, cronômetro em andamento, faixa de avaliação.

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
