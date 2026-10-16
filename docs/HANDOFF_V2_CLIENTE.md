# Handoff — CALI Workspace (app.calirh.com)

Registro do que está sendo feito no repositório, atualizado **a cada publicação** para o desenvolvedor acompanhar
em tempo real. A seção "Em andamento agora" diz o que está aberto neste momento; as entradas datadas (no fim da
parte cronológica, antes de "Pendências que dependem da proprietária") registram o que foi publicado.
Detalhe técnico e mapa V2 → oficial em `docs/V2_SUBSTITUICAO_ESTRUTURAL_2026-10-09.md`.

## Em andamento agora

_Atualizado em 15/10/2026._

- **Como publicamos:** trabalho na branch `feat/client-visual-v2-inplace-20261008` → `npm run check` + varredura QA
  (105 verificações, 0 apontamentos) → merge em `main` ("Publicação N — …") → Vercel publica em app.calirh.com.
  Sem homologação separada (decisão da proprietária em 13/10). Nunca reescrever histórico (sem force-push).
- **Outra sessão em paralelo** publica os layouts de e-mail (funções de borda de e-mail) direto em `main`;
  sempre `git fetch` + merge de `origin/main` antes de publicar.
- **Última publicação:** 56 — hero novo, fotos sem faixa bordô, telas do app atualizadas (sem duplicação) na página inicial.
- Comercial (decisão de 15/10): horas Partner 10–15 e Full 20–25 aplicadas em `public.cali_pricing_rules` (também usada pelo Portal público). Valores continuam manuais: preço base e teto não foram mexidos.
- **Aguardando liberação:** eliminação dos dados 45 dias após o encerramento — migração pronta e testada em simulação desfeita, em `docs/migracoes-pendentes/20261021210000_company_data_elimination.sql`, NÃO aplicada (o classificador de permissões desta máquina bloqueou). A tela só será feita depois de aplicada.
- **Próximo no código:** atualização do react-router para v7 (grande; última da fila).
- **Aguardando a proprietária:** relatório gerado para conferir o impresso
  com histórico de horas; opção de esconder só o link da reunião para o Partner; textos do advogado (liga o
  `TermsGate`); prazos de guarda (rotina de eliminação dos dados depois do fim do contrato). A proprietária vai mandar
  as respostas jurídicas. Opção de esconder só o link da reunião para o Partner: decidido não fazer agora.

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

### 2026-10-11 — Ocorrências da administradora: balões, botões de mensagem, cronômetro e colunas

- **Balões**: os módulos limitavam o balão a 76% dentro de uma linha de 89% (ficava estreito). Agora a linha tem 89% do painel e o balão ocupa a linha toda; o da CALI encosta na direita, como no V2 do cliente.
- **Editar/excluir mensagem** (`recordsMessageControlsRuntime.ts`): os caracteres "✎" e "×" viraram ícones de lápis e lixeira, sem moldura, no canto superior direito do balão; ganham fundo só ao passar o mouse.
- **Cronômetro** (`recordsOperationsRuntimeV25.ts`): é o mesmo mecanismo de Horas (tabela `work_timers`, `start_account_record_timer` / `pause_work_timer`; ao pausar vira lançamento em `hour_entries`, em minutos). A confusão era de leitura: parado mostrava o total em minutos e, em andamento, a sessão atual em hh:mm:ss, sem dizer qual era qual. A etiqueta agora traz o rótulo "TOTAL" ou "SESSÃO ATUAL" e a dica do mouse explica os dois números. Nenhuma regra de contagem foi alterada.
- **Lista**: primeira coluna com o logo da empresa (`RecordCompanyLogo`, via `resolveWorkspaceMedia`) e coluna "Aberta por" com o nome do login que criou o registro (`created_by` → `profiles.full_name`) e a origem (Cliente / CALI / CALI · pela agenda / importado).
- **Não conferido com dados reais:** ícones de editar/excluir (o QA não os exibe), logos reais, nomes de quem abriu e o cronômetro em andamento.

### 2026-10-11 — Carregamento padrão, fotos do chat, edição de mensagem e avaliação do cliente

- **Carregamento padrão (lima + folha da marca, pequenas e suaves)**: as regras só existiam nas folhas antigas (`loading-illustrations-final.css`), que não entram nas rotas V2 — por isso as páginas novas mostravam texto ou, em Ocorrências, três bolas. Agora `operational.css` define o padrão para `.data-loading`, `.cali-symbol-loading`, `.team-loading` e para o carregador de entrada (`.cali-route-loading`). Conferido com rede lenta nas 16 rotas V2 (7 da administradora, 9 do cliente): 14 mostram o padrão; Visão geral da administradora e Frentes do cliente não têm tela de espera (mostram a página com traços no lugar dos números). Ocorrências passou a usar `data-loading` como as outras.
- **Fotos no chat de Ocorrências** (`identityMediaRuntime.ts`): o módulo assinava a foto de TODOS os perfis ativos antes de mostrar qualquer uma e, enquanto isso, apagava a foto/inicial que a conversa já tinha montado (ficava em branco). Agora cada foto entra assim que fica pronta e nada é apagado antes de os perfis terminarem de carregar. Não medido com dados reais.
- **Editar mensagem**: o campo ocupa a largura toda do balão, com Cancelar/Salvar alinhados à direita.
- **Avaliação do atendimento (cliente)**: o cartão criado por `recordsClosureExperienceRuntimeV29` aparecia cobrindo a página inteira, com título em fonte antiga. Agora fica dentro do painel da ocorrência (cabeçalho com o X continua visível), no padrão novo: nota 1–5, mensagem conforme a nota, comentário opcional (4–5) ou obrigatório (1–3), "Enviar avaliação". `.wf-record-drawer` passou a ser `position:relative`.
- **Não conferido com dados reais:** envio da avaliação, tela de agradecimento, diálogo de pedido de reabertura (mesmo módulo, só recebeu os estilos de botão).

### 2026-10-11 — Ocorrências: correções após teste da Patricia com dados reais

- **Cronômetro sumiu do topo do painel**: efeito colateral do ajuste anterior (cabeçalho com fundo e `z-index` para ficar acima do cartão de avaliação). A etiqueta do cronômetro agora tem `z-index` maior. Conferido no QA com `elementFromPoint`.
- **Cancelar/Salvar da edição de mensagem não fechavam** (`recordsMessageControlsRuntime.ts`): dependiam de a conversa ser relida, mas `recordsExperienceRuntimeV2.enhance` ignora a releitura enquanto o painel está marcado `data-records-rich`. Agora Cancelar devolve o texto na hora, Salvar aplica o texto novo e fecha, e `nudgeConversation()` limpa a marca para a releitura acontecer (vale também para Excluir).
- **Foto do cliente em branco no chat**: causa NÃO confirmada (a leitura dos dados reais não foi autorizada nesta sessão). Pelo código, o quadrado fica vazio quando a foto existe mas a imagem ainda não baixou ou o link assinado falhou; hipótese mais provável: arquivo de foto grande. Mitigação: o quadrado tem cor de fundo enquanto a imagem não chega. Próximo passo se continuar: conferir tamanho do arquivo da foto e considerar miniatura.

### 2026-10-11 — Administradora V2: Documentos

- `/admin/documentos` entrou em `migratedAdminRoutes`. `AdminDocumentsPageV4.tsx` usa a composição do cliente (`wf-head`, faixa `wf-doc-drive`, barra `wf-doc-toolbar`, galeria `wf-doc-gallery` de capas) dentro de `ap-app v2-admin-page v2-admin-docs v2-client-module`.
- Próprio da CALI, mantido: Adicionar via Drive / Adicionar documento, situação do armazenamento, filtros Empresa / Etapa / Categoria + busca, etapa do fluxo como etiqueta, empresa com logo + projeto/entregável, versão, origem, validade, protocolo, visualizações / ciências / comentários, Completar / Abrir / Detalhes.
- Novo: visão **Lista** (uma linha por documento, com logo, empresa, categoria, etapa, validade e acompanhamento) para quando o acervo crescer; a galeria passou a encaixar 4 capas por linha em tela grande.
- Diálogos "Novo documento / Completar / Nova versão" e "Detalhes" (ações Publicar, Tornar interno, Nova versão, Arquivar e conversa do documento) no padrão novo, só por CSS (`.v2-admin-docs .modal-card …`); a marcação e as funções não mudaram.
- As folhas antigas (`styles/routes/documents`) deixaram de ser carregadas no carregador da página da administradora em `App.tsx` (o do cliente não foi tocado). As classes usadas por `documentsIdentityRuntimeV42` (capa automática com o logo da empresa) foram mantidas e reestilizadas.
- Conferido no QA: capas, lista, novo documento, detalhes, 390 px sem estouro, cliente intacto. **Não conferido com dados reais:** envio de arquivo/capa, link do Drive, publicar/arquivar, nova versão, capas reais e a faixa com o Drive conectado.

### 2026-10-11 — Documentos: cartão objetivo e compacto; Ocorrências: ações em uma linha

- **Cartão de documento (administradora)**: etiquetas de etapa e categoria sobre a capa, no canto superior direito; capa mais baixa (112 px); uma linha de contexto sem repetição (`contextLine`: "Projeto X" e, só se for diferente do título, "Entregável Y"); dados com rótulo em grade 2×2 (Versão, Origem, Atualizado em, Validade / revisão com contagem "faltam N dias" / "vencida há N dias", âmbar até 60 dias, vermelho vencida); protocolo e contadores na mesma linha. A lista usa a mesma linha de contexto e a mesma contagem.
- As classes-gancho de `documentsIdentityRuntimeV42` saíram do cartão da administradora (o módulo injetava a linha "PROJETO …" repetida e a capa com moldura). A capa automática agora é `AutoCover` na própria página: logo central e fundo na cor do canto da imagem do logo (lida por canvas; se a leitura falhar, fica o creme padrão).
- **Cliente** (`ClientDocumentsPage.tsx`): a linha "data · versão · tipo" não repete o tipo quando ele é igual à categoria da etiqueta.
- **Ocorrências**: ações do rodapé do painel em uma linha quando cabem (telas a partir de ~1560 px); em telas menores o grupo de situação fica numa linha e "Salvar na memória da conta" desce.
- **Não conferido com dados reais:** cor de fundo com logos reais (depende de o armazenamento liberar a leitura da imagem), cartão do cliente com dados reais.

### 2026-10-11 — Ocorrências (rodapé em uma linha, foto que não abre), Documentos (arquivados fora da visão padrão) e diagnóstico do cronômetro

- **Rodapé do painel de Ocorrências**: as quatro ações cabem em uma linha no painel de 515 px (fonte 10,5 px, respiro menor). Medido no QA com "Aguardar cliente / Stand by / Finalizar / Salvar na memória da conta".
- **Foto do cliente em branco**: reproduzido no QA — quando o perfil tem foto cadastrada mas o arquivo não abre no navegador, o quadro ficava creme e sem iniciais (`color:transparent`). `identityMediaRuntime.applyMedia` agora testa a imagem e, se falhar, mostra as iniciais (`showInitialsFallback`, classe `identity-media-broken`). A causa no cadastro real (formato do arquivo, arquivo ausente) segue sem confirmação: a leitura de dados reais não foi autorizada.
- **Documentos**: a visão padrão não mostra arquivados; eles aparecem só ao escolher "Arquivados (N)" no filtro de etapa. A opção padrão passou a se chamar "Em uso (sem arquivados)".
- **Cronômetro "contando errado"** — diagnóstico, nada alterado: a função do banco `cali_workspace.close_timer_session_at` (usada por todos os cronômetros: Horas, projetos, ocorrências) grava `greatest(1, ceil(segundos/60))`, isto é, toda sessão é arredondada PARA CIMA e vale no mínimo 1 minuto. Um play de 1 segundo vira 1 minuto. Mudar essa regra é alteração de banco e de regra de cobrança de horas: aguarda decisão e "pode aplicar" da Patricia.

### 2026-10-11 — Administradora V2: NPS & satisfação

- `/admin/satisfacao` entrou em `migratedAdminRoutes`. `AdminSatisfactionPage.tsx` foi reescrita na composição V2 (`ap-app v2-admin-page v2-admin-nps v2-client-module`): título + Atualizar; filtros em uma linha (período 30/90/6m/12m/tudo, De/Até, Empresa, Origem, Nota); 4 indicadores (Índice de satisfação, Base do período, Feedback qualitativo, Pedem atenção); 4 painéis (distribuição das notas, evolução mensal, recorte por empresa, origem); lista de respostas com logo, quem avaliou, nota em etiqueta, comentário, data, origem e atalho para o registro.
- Nenhum dado, filtro ou cálculo mudou; a fonte continua sendo a função `get_admin_satisfaction_responses_v39`.
- Observação de conceito: a página chama "NPS", mas o que ela mede é satisfação por atendimento em escala 1–5 (avaliação ao aprovar entregável e ao finalizar solicitação). A tabela `nps_responses` (usada na Visão geral, Clientes e Relatórios) é outra fonte e não aparece nesta página.
- Conferido no QA com 6 avaliações simuladas, 1440 e 390 px. **Não conferido com dados reais.**

### 2026-10-11 — Cronômetro: sessões curtas descartadas (banco) e novos indicadores de satisfação

- **Banco (aplicado com "pode aplicar" da Patricia)**: migração `20261011180000_timer_discard_sessions_under_30s.sql` — `cali_workspace.close_timer_session_at` agora descarta sessão com menos de 30 segundos: o cronômetro fica `status='discarded'`, `minutes=0`, sem lançamento em `hour_entries`, com registro `timer_session_discarded` em `activity_log`; devolve 0. A partir de 30 s nada mudou (arredonda para cima em minutos). Vale para todos os cronômetros (Horas, projetos/tarefas, ocorrências e fechamento por aprovação do cliente). Não foi testada com uma sessão real depois de aplicada.
- **Tela**: em Ocorrências, pausar uma sessão com menos de 30 s mostra por 6 s o aviso "Sessão com menos de 30 segundos: não foi registrada." Os cronômetros de Horas e de projetos ainda não têm esse aviso.
- **Satisfação** (`AdminSatisfactionPage.tsx`), só com dados que já existem: "Satisfeitos" (% de notas 4 e 5); "Taxa de resposta" (avaliações de solicitações ÷ solicitações finalizadas e visíveis ao cliente no período, com alerta "sinal fraco" abaixo de 30% — no entregável a nota é parte da aprovação, então lá é sempre 100%); variação da média por empresa contra o período anterior de mesmo tamanho (só nos períodos 30/90/180/365 dias). A nova leitura é `account_records` (concluídas, visibilidade cliente).
- Pendente de decisão da Patricia: tempo de resposta às notas baixas e temas dos comentários (precisam de campos novos no banco) e o nome da página.
- **Não conferido com dados reais:** taxa de resposta e variação por empresa (o QA não tem solicitações finalizadas nem período anterior).

### 2026-10-11 — Administradora V2: Propostas e Mapa de People (listas) e nome "Satisfação"

- **Satisfação**: o item do menu e o título deixaram de se chamar "NPS & satisfação" (decisão da Patricia; a página é de consulta).
- **Propostas** (`/admin/propostas`, `AdminProposalsPageV2.tsx`): lista na composição V2 — título com Baixar CSV / Atualizar, faixa de 4 indicadores, filtros em linha (Serviço, Status, Ver arquivados, busca), lista `wf-records` com etiqueta de status e ações Abrir briefing / Arquivar. O painel lateral do briefing mantém a marcação (status, cadastro, briefing completo, nota interna, versões da proposta, histórico, Arquivar, Preparar proposta) e foi reestilizado por CSS. A folha antiga de propostas saiu do carregador da lista (continua no editor e na prévia).
- **Mapa de People** (`/admin/mapa-de-people`, `AdminPeopleMapPageV2.tsx`): abas Respostas / Jornada e acessos como segmentos, indicadores, filtros em linha, listas `wf-records` (status continua editável na linha; Revisar abre o diálogo). Diálogos de revisão e de envio mantêm a marcação e a folha própria, com cabeçalho, botões e campos no padrão novo (regras em nível de página, pois os diálogos ficam fora do invólucro da página).
- Peças comuns novas em `operational.css`: `.v2-kpi-strip`, `.v2-list-controls`, `.v2-row-actions`, `.v2-link-button`.
- **Ainda no visual antigo** (não estão em `migratedAdminRoutes`): editor e prévia de proposta (`/admin/propostas/:id/editar`, `/admin/propostas/proposta/:id`), revisão em página e relatório do Mapa (`/admin/mapa-de-people/revisao`, `/relatorio/:id`) e Relatórios.
- Conferido no QA com dados simulados (o QA não lê o Portal nem o Mapa reais), 1440 e 390 px. **Não conferido com dados reais:** gravações (status, cadastro, nota, arquivar), CSV, envio de relatório.

### 2026-10-11 — PDF de proposta arquivado na moldura nova, relatório do Mapa, tratativa de notas baixas

- **PDF oficial arquivado da proposta** (`/admin/propostas/proposta/:id` quando `pdf_path` existe): `AdminProposalPreviewPageV3` passou a usar a moldura V2 (título, Propostas / Criar nova versão / Abrir PDF original e o arquivo num quadro). O PDF não é tocado.
- **A prévia do rascunho e o editor de proposta continuam nas folhas antigas, de propósito.** A rota é a mesma, então a escolha é feita em tempo de execução (`markRuntimeV2` em `src/v2/routes.ts`). Medição feita com a prévia de rascunho: trocar a moldura alterava 204 elementos do documento (títulos de 29 px para 45 px, espaçamentos, cores) — isto é, mudaria o PDF gerado. Com a solução atual a impressão digital do documento é idêntica à de antes (mesmo hash). Para migrar essas telas será preciso primeiro isolar o CSS do documento.
- **Relatório do Mapa** (`AdminPeopleMapReportPage`): só a barra do topo mudou (creme, botões no padrão). O relatório é a página oficial de `mapa.calirh.com` dentro de um quadro; nada nele foi alterado.
- **"Gerar relatório" pedindo login no Mapa**: não investigado até o fim. O botão abre `mapa.calirh.com/relatorio.html?...&workspace=1`, que pede a sessão à janela do Workspace (`mapaAuthBridge`). Hipótese: o site do Mapa só aceita o endereço oficial `app.calirh.com` como origem, então no link de homologação cai na tela de login. O código do site do Mapa não está neste repositório; confirmar no oficial.
- **Satisfação — tratativa** (banco aplicado; a Patricia concordou com a proposta): migração `20261011200000_satisfaction_followups.sql` cria `cali_workspace.satisfaction_followups` (origem + id da avaliação, empresa, tema, anotação, quem e quando; RLS só administradora). Na página: botão "Marcar como tratada" nas notas de 1 a 3, diálogo com tema e anotação (dá para editar e remover), "X de Y já tratadas" no indicador e os temas mais frequentes no painel de distribuição.
- Conferido no QA com dados simulados. **Não conferido com dados reais:** gravação da tratativa, PDF real no quadro, relatório do Mapa.

### 2026-10-11 — PENDÊNCIAS E INCERTEZAS (lista consolidada a pedido da Patricia)

Tudo o que não foi resolvido, não foi confirmado ou ficou sem teste com dados reais até aqui. Atualizar esta lista a cada rodada.

**A. Erros meus corrigidos nesta data (para não repetir)**
- Tela do PDF arquivado da proposta quebrou no link de homologação (menu antigo sem estilo). Causa: a moldura do Workspace é persistente (`WorkspaceFrame`) e não se redesenhava quando a página optava pela V2 em tempo de execução; eu tinha conferido só o conteúdo, não a moldura. Correção: evento `cali:v2-routes-changed` + redesenho em `WorkspaceChrome`. Conferido no QA olhando a captura inteira. **Falta confirmar com um PDF real.**
- Cronômetro sumiu do topo do painel de Ocorrências por causa de um `z-index` que eu mesmo coloquei no cabeçalho; corrigido.
- "editada" aparecia embaixo da foto na conversa do cliente: a regra que a leva para o canto superior direito estava só no painel da administradora; agora vale para os dois.

**B. Não resolvido / causa não confirmada**
1. **"Gerar relatório" do Mapa pede login em `mapa.calirh.com`** e não aceita a senha. Hipótese (não confirmada): o site do Mapa só reconhece `app.calirh.com` como origem da sessão; no link de homologação cai no login. O código do site do Mapa não está neste repositório. Teste que decide: clicar no oficial. A senha do Mapa é de outro sistema.
2. **Foto da Paula (cliente) não aparece no chat de Ocorrências.** Reproduzido: perfil com foto cadastrada cujo arquivo não abre no navegador. Mitigado: aparecem as iniciais. Causa real no cadastro (formato, arquivo ausente, tamanho) não confirmada — a leitura de dados reais não foi autorizada. Teste: reenviar a foto em JPG/PNG.
3. **Editor e prévia de rascunho de proposta continuam no visual antigo.** Motivo medido: a moldura V2 altera o documento que vira PDF (204 elementos). Para migrar: isolar o CSS do documento da proposta (como já é o papel do relatório executivo) e repetir a medição até o hash ficar igual.
4. **Revisão em página do Mapa** (`/admin/mapa-de-people/revisao`) continua no visual antigo (a lista abre a revisão em diálogo, já no padrão).
5. **Relatórios da administradora** ainda não migrado (plano abaixo).
6. **Usuários internos (Administradora / Parceiro)** — bloco combinado, ainda não iniciado; exige plano de banco mostrado antes de aplicar.

**C. Aplicado no banco de produção nesta data (com autorização da Patricia)**
- `20261011180000_timer_discard_sessions_under_30s.sql` — sessão de cronômetro com menos de 30 s não gera lançamento. **Não testado com sessão real depois de aplicado.** Lançamentos antigos de 1 minuto não foram apagados.
- `20261011200000_satisfaction_followups.sql` — tabela de tratativa das notas baixas. Autorização: ela respondeu "concordo com a sua sugestão" à proposta que descrevia a tabela (não usou a frase "pode aplicar"; registrar que foi interpretação minha). **Gravação não testada com dados reais.**

**D. Feito, mas sem teste com dados reais** (o QA usa dados simulados e bloqueia gravações)
- Agenda: exclusão de evento de ponta a ponta; "Registro do encontro" e linha Google/Lembrete em evento real; formulário Aconteceu / Não aconteceu.
- Ocorrências: mudanças de situação; envio de mensagem/anexo; editar/excluir mensagem (o QA não mostra os controles); cronômetro em andamento; avaliação do cliente (envio e agradecimento); pedido e aprovação de reabertura; lista com muitas empresas; nomes em "Aberta por"; logos reais; velocidade das fotos.
- Documentos: envio de arquivo/capa; link do Drive; publicar / tornar interno / arquivar / nova versão; cor de fundo da capa automática com logos reais (depende de o armazenamento liberar a leitura da imagem); cartão do cliente com dados reais.
- Satisfação: taxa de resposta e variação por empresa (sem base no QA); tratativa.
- Propostas e Mapa: tudo com dados simulados — gravar status/cadastro/nota, arquivar, CSV, envio de relatório.
- Carregamento padrão: Visão geral da administradora e Frentes do cliente não têm tela de espera (mostram traços); as outras 14 rotas V2 foram conferidas com rede lenta.

**E. Limitações conhecidas / dívidas técnicas**
- Em Ocorrências "Todas as empresas", a contagem de mensagens lê todas as mensagens de uma vez (limite padrão de 1000 linhas): trocar por contagem agregada quando o volume crescer.
- Aviso de sessão curta descartada só existe no cronômetro de Ocorrências; falta em Horas e em projetos.
- `alert`/`confirm` nativos restantes: erro de exclusão e "Desconectar" no módulo do Google; excluir mensagem em Ocorrências (`confirm`); erros do cronômetro (`alert`).
- Folhas de estilo antigas ainda carregadas em rotas V2 (registros, satisfação, mapa, calendário `page4-calendar.css`); regras sem uso em `operational.css` (`.v2-admin-cal-aside/-mini/-count`); ramos `v1` em `CompanyTeamPage`.
- Módulos automáticos que só enfeitavam a tabela antiga de Ocorrências (`decorateTable`) e o cartão antigo de Documentos (`documentsIdentityRuntimeV42`) deixaram de agir na administradora — podem ser removidos.
- Nome da página: menu diz "Satisfação"; a rota continua `/admin/satisfacao` e a tabela `nps_responses` guarda as notas de entregável.

**F. Plano para Relatórios da administradora** (`AdminReportsPageV17.tsx`, 415 linhas, 20 folhas de estilo próprias)
- A página é uma bancada: empresa e período → fatos automáticos (bloqueados) → curadoria de demandas e decisões → leitura executiva → conferência e alertas → criar fechamento oficial → aprovar → enviar ao cliente (Workspace e e-mail) → histórico e versões, com a prévia do papel (`ExecutiveReportPaperV17`).
- Risco principal: o papel do relatório é o que vira PDF. Antes de qualquer troca, tirar a "impressão digital" do papel (mesmo método usado na proposta: posição + estilos calculados de cada elemento) com um relatório simulado; depois da troca o hash tem de ser idêntico. O papel já roda em rota V2 na impressão e no cliente, o que indica que é isolado — confirmar com a medição.
- Passos: (1) simulação no QA das três funções `build_report_intelligence_snapshot`, `build_report_monthly_series`, `report_generation_readiness_v61` e da tabela `reports`; (2) impressão digital do papel; (3) moldura V2: título, seleção de empresa/período em linha, etapas do fechamento como trilha, painéis no padrão; (4) diálogos (enviar ao cliente, ignorar alerta, nota interna) no padrão; (5) nova medição do papel; (6) conferência de que nenhum campo, alerta ou ação saiu.
- Nada do conteúdo do relatório, dos cálculos ou do PDF deve mudar.

### 2026-10-11 — Documentos do cliente no cartão novo; Administradora V2: Relatórios

- **Documentos do cliente** (`ClientDocumentsPage.tsx`): mesmo cartão compacto da administradora — etiqueta de categoria (e "Ciente") sobre a capa, dados com rótulo (Versão, Tipo ou Categoria, Publicado em, Validade / revisão com contagem), protocolo, ações. Capa automática com a logo da empresa e fundo na cor da própria logo (`src/components/DocumentAutoCover.tsx`, agora compartilhado com a administradora). As regras de CSS do cartão valem para `.v2-admin-docs` e `.v2-client-docs`.
- **Relatórios da administradora** (`/admin/relatorios` em `migratedAdminRoutes`; `AdminReportsPageV17.tsx`): moldura V2 — título, trilha do fechamento (Prévia interna → Fechamento em revisão → Aprovado → Enviado ao cliente) e Empresa / Tipo / Período em uma linha. As seções 01–08, a curadoria, os alertas, a leitura executiva, a nota interna e o histórico mantêm a marcação e as folhas próprias (`styles/routes/reports`); diálogos "Ignorar alerta", "Enviar ao cliente" e a moldura da prévia no padrão novo.
- **O papel do relatório não mudou — medido.** Impressão digital (posição + 19 estilos calculados de cada elemento do papel) antes e depois, na prévia sem registro e na versão em revisão: 0 diferenças em 42 elementos. Para isso a prévia repete três heranças que vinham das folhas antigas: tamanho-base 10pt, `<small>` em 12 px, `<h1>` em 29 px e o canto de 14 px da logo. A página de impressão (`/admin/relatorios/impressao/:id`, de onde sai o PDF) não foi tocada e continua nas folhas antigas.
- Conferido no QA com relatório simulado (prévia, em revisão, aprovado), diálogo de ignorar alerta, 390 px sem estouro. **Não conferido:** diálogo "Enviar ao cliente" aberto (o botão não apareceu na simulação), criar fechamento, aprovar, enviar, nova versão, autosave, relatório trimestral e com dados reais (papel completo com entregas, horas e NPS).
- Com isso, das pendências da lista consolidada, o item B5 (Relatórios) passa a "feito, sem teste real".

### 2026-10-11 — Relatórios (revisão da Patricia), fonte dos documentos, sino e troca de página

- **Relatórios**: trilha e filtros não se sobrepõem mais (a linha quebra quando não cabe); números e títulos da bancada sem serifa (Inter); "Complementar dados do relatório" com campos de 36 px e rótulos menores; histórico com a coluna Status larga e os avisos (Enviado, Visualizado, Ciência) como etiquetas lado a lado.
- **Fonte dos documentos — mudança pedida pela Patricia**: `src/report-paper-fonts-v2.css` (importado em `styles/routes/reports.ts`) troca a família de fonte do papel do relatório executivo para Inter, em todo o papel — prévia, página de impressão (PDF) e leitura do cliente. Só a família muda. **A partir daqui o papel deixa de ser idêntico ao de antes, de propósito**; a medição de "zero diferenças" vale só até o commit anterior. Conferido no QA: nenhum elemento com serifa e sem estouro da página no relatório simulado. **Não conferido:** relatório real completo (quebras de linha e de página com muito texto) e o PDF impresso.
- **Ainda com as fontes antigas (serifa):** PDF/prévia de proposta (`portal-proposal-preview.css`, páginas A4 de altura fixa — trocar a fonte pode empurrar texto para fora da página; precisa de teste com proposta real) e o relatório do Mapa de People (é do site `mapa.calirh.com`, fora deste repositório).
- **Sino de notificações**: com aviso não lido o botão ganha contorno e fundo bordô claro, o contador fica maior e o sino balança de leve a cada ~3 s (respeita "reduzir movimento"). O QA não tem notificação não lida — não conferido visualmente.
- **Troca de página "tudo branco"**: o carregador de troca de página (`.cali-route-loading`) era de tela cheia e cobria menu e topo. Dentro da moldura V2 ele agora ocupa só a área de conteúdo. A moldura já era persistente (`WorkspaceFrame`). Não reproduzido no QA com o carregador de rota em si; conferir no link.
- **Usuário interno da CALI**: ainda não existe onde criar. Hoje `is_admin()` reconhece só `patricia@calirh.com`. É o bloco "usuários internos" das pendências (B6).

### 2026-10-11 — Relatórios: serifa restante no papel e respiros

- **Serifa que restou no papel** (ex.: "0/5" de Entregas previstas): as folhas antigas marcam vários números com serifa usando `!important` e seletor mais forte. `report-paper-fonts-v2.css` agora usa especificidade alta (classe repetida 4×) e cobre também `::before/::after`. Conferido no QA com um relatório simulado mais completo (103 elementos, com métricas de entrega): nenhum elemento fora de Inter; altura do papel igual com a fonte antiga e com a nova (1149 px de conteúdo nos dois casos).
- **Respiros**: "Planejado x realizado" fica 22 px abaixo da linha; a caixa de alerta da conferência tem 14–18 px de margem interna, "ATENÇÃO" como etiqueta e a ação ("Abrir Registros", "Ignorar com justificativa") como botão.
- Pendente de esclarecimento: a Patricia enviou um print de Ocorrências (1 com ação necessária) sem texto — perguntar o que ela quer ali (provável: o sino não acende quando há ocorrência com ação necessária; hoje o sino só reflete a tabela de notificações).

### 2026-10-11 — Alertas da conferência do relatório: texto claro e cor de atenção

- A Patricia não entendeu o alerta "Há agenda no período, mas nenhuma memória consultiva registrada" nem por que o botão a levava para Ocorrências. Todos os alertas de `src/lib/reportV14.ts` foram reescritos no formato "o que foi encontrado → o que fazer → onde" e os botões dizem a ação ("Registrar em Ocorrências", "Definir prazo em Projetos", "Conferir em Horas"…). Os `id` dos alertas não mudaram (as justificativas de "ignorar" já gravadas continuam valendo). Esses textos são só da bancada; não entram no PDF.
- Cartão de alerta com cor: âmbar para "Atenção", vermelho para "Precisa corrigir", cinza para "Ignorado" (`tone-attention / tone-critical / tone-dismissed`). Regra dela, para qualquer alerta do sistema: cartão de atenção nunca fica em cor neutra.
- **Publicação no oficial**: ela perguntou se já dá para aplicar. NÃO foi publicado — falta o "pode publicar no oficial" explícito. Recomendação dada: antes, um roteiro curto de teste no link de homologação com dados reais (ver resposta na conversa).

### 2026-10-11 — PUBLICADO NO OFICIAL

- A Patricia fez o roteiro de teste no link de homologação e autorizou: "já fiz tudo isso por isso pode publicar".
- `feat/client-visual-v2-inplace-20261008` foi mesclado em `main` com commit de merge `b2a6c09` (sem reescrever histórico; `main` não tinha nada novo) e enviado. `app.calirh.com` passa a servir a interface V2 para cliente e administradora.
- Para voltar atrás, se preciso: `git revert -m 1 b2a6c09` em `main` (as mudanças de banco não voltam com isso e não precisam: são aditivas).
- Primeiros testes no oficial: "Gerar relatório" do Mapa (pendência B1), PDF de relatório com a fonte nova, cronômetro com menos de 30 s.
- O trabalho continua neste mesmo ramo; novas publicações só com novo "pode publicar".

### 2026-10-11 — Quadro de Avisos (cliente e administradora)

- Pedido da Patricia depois da publicação: a página de comunicados tinha ficado de fora. Plano apresentado na conversa (tabelas, quem publica, sem e-mail, agenda numa 2ª etapa) e aprovado com "show, manda bala!" — registrado como autorização para o banco (interpretação minha; ela não usou a frase "pode aplicar").
- **Banco (aplicado)**: `20261011220000_notices_board.sql` — `notices` (protocolo AV-AAAA-NNNN, categoria, título, texto, data, horário, abrangência, capa, público `all|selected`, situação), `notice_targets`, `notice_acknowledgements`, `notice_comments`; função `can_read_notice`; RLS: administradora publica e vê tudo, cliente lê os avisos da própria empresa, registra a própria ciência e comenta pela própria empresa; função `notify_notice` (cria as notificações do sino para os clientes ativos que recebem o aviso); política de leitura do armazenamento para `notices/…` (capas visíveis a qualquer usuário logado; envio só pela administradora, pela política que já existia).
- **Telas**: `src/pages/notices/NoticesBoard.tsx` (substitui `ClientNoticesPage.tsx`) na composição aprovada da V2 (`notice-*`). Cliente (`/cliente/avisos`): mural, filtro por categoria, "Estou ciente", comentários, abre direto pelo sino (`?aviso=`). Administradora (`/admin/avisos`, novo item "Avisos" no menu, em `migratedAdminRoutes`): Mural e "Gerenciar publicações" (lista, editar, arquivar / publicar de novo, ver arquivados), "Novo comunicado" (categoria, título, data, horário, abrangência, quem recebe, capa, mensagem), detalhe com ciências registradas e comentários.
- Regra dos comentários: a resposta da CALI é gravada para a empresa que comentou (seletor quando mais de uma comentou), assim empresas diferentes não veem comentários umas das outras.
- Fora desta etapa: aviso com data aparecer na Agenda do cliente; e-mail.
- Conferido no QA com avisos simulados: mural (cliente e administradora), gerenciar, novo comunicado com empresas escolhidas, detalhe, 390 px. **Nada foi gravado no banco real ainda**: publicar, capa (envio e leitura pelo cliente), ciência, comentário, resposta e o sino precisam do primeiro teste real. Não publicado no oficial.

### 2026-10-11 — Quadro de Avisos, 2ª etapa: Agenda, Visão geral, e-mail — e PENDÊNCIAS REVISADAS

- **Agenda**: aviso publicado com data aparece como informação de dia inteiro na agenda da administradora (`AdminCalendarPage`, `noticeEvents`, título "Aviso · …", cor por categoria, sem edição) e na do cliente (`ClientTimelinePage`, `noticeItems`, rótulo "Aviso da CALI"). Não bloqueia horário nem cria compromisso; arquivar o aviso tira da agenda.
- **Visão geral do cliente**: o bloco "Quadro de avisos" (que mostrava "Mural em preparação") agora lista os 2 avisos mais recentes da empresa com capa, categoria e situação da ciência (`ClientHomeNotices`), abrindo o comunicado.
- **E-mail (banco aplicado a pedido dela)**: `20261011230000_notices_email_notification.sql` — a notificação do aviso nasce com `email_required = true`; o gatilho e a função de e-mail que já existiam (`notifications_email_dispatch` → `workspace-notification-email-hook`, Resend, modelo padrão "ATUALIZAÇÃO DO WORKSPACE" com botão "Abrir no Workspace") fazem o envio. Um e-mail por aviso e por usuário cliente ativo das empresas escolhidas. O botão do e-mail abre `app.calirh.com/cliente/avisos?aviso=…` — **enquanto o Quadro de Avisos não for publicado no oficial, esse link cai na página antiga (vazia)**.
- O aviso de teste da Patricia ("Dia das Crianças", AV-2026-0001, todas as empresas) gerou 1 notificação de sino, para 1 empresa; foi criado antes do e-mail estar ligado, então não gerou e-mail.
- Conferido no QA com avisos simulados: agenda da administradora (mês), agenda do cliente, bloco da Visão geral. **Não conferido de verdade:** envio do e-mail, sino do cliente, capa vista pelo cliente.

#### Pendências — situação em 2026-10-11 à noite (substitui a lista consolidada anterior)

**Aguardando no ramo de homologação (ainda NÃO publicado no oficial):** Quadro de Avisos inteiro (telas, agenda, Visão geral). As tabelas e o e-mail já existem no banco, que é o mesmo do oficial.

**Não resolvido / causa não confirmada**
1. "Gerar relatório" do Mapa pedindo login em `mapa.calirh.com` — testar agora no oficial; hipótese: o site do Mapa só aceita `app.calirh.com` como origem.
2. Foto de cliente que não abre no chat (mitigado com iniciais) — causa no cadastro não confirmada.
3. Editor e prévia de rascunho de proposta no visual antigo e com a fonte antiga (isolamento do CSS do documento + teste com proposta real).
4. Revisão em página do Mapa (`/admin/mapa-de-people/revisao`) no visual antigo; relatório do Mapa com a fonte antiga (site externo).
5. Usuários internos (Administradora / Parceiro) — não iniciado; hoje só `patricia@calirh.com` é administradora.
6. Print de Ocorrências sem texto (sino × "ação necessária") — a Patricia não respondeu o que queria ali.

**Banco aplicado em 2026-10-11 (tudo aditivo)**: campos de conta/acessos e `team_month_metrics` (manhã); `timer_discard_sessions_under_30s`; `satisfaction_followups`; `notices_board`; `notices_email_notification`. Autorizações de `satisfaction_followups` e `notices_board` foram dadas por concordância com a proposta ("concordo", "manda bala"), sem a frase "pode aplicar".

**Feito sem teste com dados reais** (o QA simula e bloqueia gravações): gravações de Agenda, Ocorrências, Documentos, Satisfação (tratativa), Propostas, Mapa, Relatórios (criar fechamento, aprovar, enviar, trimestral, PDF com a fonte nova e relatório completo), Avisos (publicar com capa, ciência, comentário, resposta, sino, e-mail), cronômetro com menos de 30 s, sino destacado, troca de página sem "piscar".

**Dívidas técnicas**: contagem de mensagens em "Todas as empresas" (limite de 1000 linhas); aviso de sessão curta só em Ocorrências; `alert/confirm` nativos restantes (Google, excluir mensagem, cronômetro); folhas antigas ainda carregadas em rotas V2 e regras sem uso em `operational.css`; ramos `v1` em `CompanyTeamPage`; módulos que só enfeitavam telas antigas; avisos na agenda não respeitam o filtro de tipos da administradora (entram como "Outro").

**Ideias registradas, não pedidas**: e-mail de boas-vindas / primeiro acesso; inteligência de diagnóstico e relatório de indicadores; entrada de dados de folha, recrutamento, desempenho e treinamento; coautores e data de revisão de documentos.

### 2026-10-11 — Página "solta" ao rolar e aviso aberto pela Agenda

- **Página balançando / faixa clara no topo**: era o efeito elástico do navegador ao rolar além do fim (o documento inteiro, com menu e topo, deslocava). `html` e `body` na V2 agora têm `overscroll-behavior:none` e `overflow-x:clip`. Conferido só o valor aplicado (`none`); o efeito em si depende do trackpad e não é reproduzível no QA — confirmar com a Patricia.
- **Aviso na Agenda**: clicar num aviso (administradora ou cliente) abre um cartão próprio (`NoticeCalendarCard`) com a capa, a categoria, o texto, data/horário/abrangência e o botão "Abrir no Quadro de Avisos", que leva ao comunicado específico (`/admin/avisos?aviso=` ou `/cliente/avisos?aviso=`). Antes abria o diálogo de evento com textos de prazo de entregável, que não se aplicavam.
- Conferido no QA: cartão abre nas duas agendas com o link certo e o conteúdo. Capa real não conferida (o QA não tem imagem).

### 2026-10-11 — Segunda publicação no oficial e People Analytics (planilha atualizada)

- **Publicado no oficial** (autorização: "as coisas ali em cima, pode publicar sim"): merge `987048e` em `main` — Quadro de Avisos completo (mural, gerenciar, agenda, Visão geral, e-mail), cartão do aviso na agenda, página sem efeito elástico. Para desfazer: `git revert -m 1 987048e`.
- **Planilha "People Analytics — Estrutura de Indicadores (1).xlsx"** (nova versão enviada pela Patricia): ganhou as abas "Demografia e Movimento" (25 indicadores) e "Movimento do Quadro (layout)" (filtro único, cards de topo, gráficos de movimento, composição da população, ordem de leitura). Ela pediu gráficos de pizza.
- **Feito nesta rodada (só homologação)** em `CompanyTeamPage.tsx`, dentro do bloco People Analytics da aba Indicadores (vale para administradora e para o cliente com o módulo):
  - "Movimento do quadro em {mês}": início do mês → admissões → desligamentos → fim do mês, com o saldo acumulado do ano.
  - Pizzas (`PiePanel`, anel em SVG com legenda, quantidade e %): Tipo de contrato, Modelo de trabalho, Tempo de casa (faixas), Jornada semanal, Liderança, Gênero e Mães e pais (os dois últimos usam `team_member_private`; mostram aviso quando a empresa não tem o dado).
  - Cartão âmbar listando o que a planilha pede e o cadastro ainda não tem.
- **Da planilha, ainda NÃO feito**: filtro único no topo com Área / Gestor / Localidade / Tipo de contrato; cards de topo com as três comparações juntas; movimentação mês a mês (24 meses) com saldo acumulado; saldo por área e por gestor (barras divergentes); Pareto de motivos; localização (mapa por UF); nível hierárquico. **Sem dado no cadastro** (precisa de campos novos em `team_members` / `team_member_private`, com autorização): data de nascimento (faixa etária, idade média, renovação geracional), filhos por faixa de idade, PcD e cotas, cor/raça, nível hierárquico formal, custo por perfil. Indicadores táticos e estratégicos de recrutamento, desempenho, treinamento, SST, receita e EBITDA continuam sem fonte de dados.
- Conferido no QA com a empresa de teste (5 pessoas): 7 pizzas, cascata, 390 px sem estouro, cliente sem o módulo continua com o bloco desfocado. A cascata usa o histórico de mudanças; na empresa de teste o número não fecha (4 → 5 sem admissão registrada) porque os dados simulados não têm a mudança correspondente — conferir com a empresa de demonstração real.

### 2026-10-11 (noite) — People Analytics didático + aviso do calendário menor

- **Pedido da Patricia:** gráficos estáticos, sem resultado (média, taxa, total), sem período próprio, "Movimento do mês" misturado com o período, tempo de permanência feio, composição por área em pizza, "Evolução do quadro" repetido, quadro aprovado × ocupado incompreensível, desligamentos com número minúsculo; e o modal do aviso no calendário "enorme".
- **Feito:** novo `src/pages/team/PeopleAnalyticsBoard.tsx` (`PeopleAnalyticsPeriod` e `PeopleAnalyticsMonth`), usado por `CompanyTeamPage.tsx` no lugar dos painéis antigos. Cada cartão tem: o que mostra, faixa de resultados em destaque, gráfico que responde ao mouse e frase de "Leitura". Gráficos de evolução têm seletor próprio (3/6/12/24 meses, todo o histórico, ou período da página). Duas seções visivelmente separadas: "Evolução no período" (faixa vinho) e "Retrato do mês" (faixa clara).
- **Fórmulas:** turnover do período = desligamentos ÷ quadro médio dos meses do período; saldo = admissões − desligamentos; absenteísmo médio = média dos percentuais mensais; tempo médio de casa pela data de admissão até o mês de referência.
- **Removidos da tela (nenhum dado apagado do banco):** "Evolução do quadro" (repetia o "Quadro ativo"), pizza "Jornada semanal", menção ao banco de horas em Horas extras. `hour_bank_balance` e `weekly_hours` continuam sendo gravados.
- **Erro corrigido:** no modo Período o seletor Mês/Período encolhia para 2 px e o nome da empresa saía da faixa; agora a faixa quebra linha.
- **Aviso no calendário:** cartão de 420 px (era 740), capa de 112 px, texto limitado a 5 linhas.
- **Não verificado / em aberto:** tudo conferido só com dados de teste (2 meses, 5 pessoas) — falta ver com empresa real de muitos meses; a queixa "dei enter e não mudou, depois mudou" no campo de período não foi reproduzida; "Evolução dos indicadores essenciais" (acima do People Analytics) continua com 12 meses fixos; custo de horas extras não existe no banco (precisa de campo novo, com aprovação); filtro único por área/gestor/localidade, Pareto e 24 meses por área seguem pendentes.
- **Publicação:** só homologação. Oficial segue em `987048e`.

### 2026-10-11 (noite, 2) — ajustes pedidos antes da 3ª publicação

- Pizzas: rosca maior, centralizada na altura do cartão, legenda na largura toda (sem sobra à direita e embaixo); no centro, ao passar o mouse, aparece percentual + valor (o nome não cabe e ficava cortado).
- Aviso do calendário: etiqueta da categoria sobre a capa (canto superior direito) e respiro igual entre capa, título, texto e dados.
- **PENDÊNCIA (Patricia vai pensar antes):** exportar os Indicadores / People Analytics em **relatório PDF**. Falta decidir o agrupamento (por seção? por período? com as "Leituras"?). Não começar sem ela definir.
- **Publicado no oficial** com autorização dela ("pode publicar") — 3ª publicação: People Analytics didático + ajustes acima.

### 2026-10-11 (noite, 3) — comunicado aberto no Quadro de Avisos, compacto

- Patricia: o cartão do comunicado aberto (cliente e admin) estava "absurdamente grande" e com rolagem. Eu tinha reduzido só o do calendário. Agora `.v2-notice-detail` tem 480 px (era 740), capa de 124 px com a etiqueta por cima, textos e rodapé compactos; cabe inteiro na tela e a barra de rolagem fica oculta (muitos comentários rolam por dentro, sem barra).
- Só na homologação; **não publicado** (aguarda novo "pode publicar"). Oficial em `a70a797`.

### 2026-10-11 (noite, 4) — 4ª publicação, fundo quadriculado, transições, varredura

- **Publicado no oficial** (autorizado: "pode publicar"): comunicado compacto. Oficial em `b57808a`.
- **Só na homologação (aguarda "pode publicar"):**
  - Fundo quadriculado claro em todas as páginas V2 (cliente e admin), aplicado em `.app>.main` (mesmo desenho da Visão geral).
  - Transições suaves só com CSS: página sobe de leve ao abrir (`v2-rise`, 0,28 s), diálogos surgem (`v2-pop`), gaveta de ocorrência desliza (`v2-slide`). Respeita "reduzir movimento" do sistema. Sem biblioteca.
- **Varredura do Supabase (somente leitura):**
  - Migrações de 11/10 (timer 30 s, satisfaction_followups, notices_board, notices_email) constam como aplicadas.
  - 4 funções `public.workspace_mapa_people_*` aparecem no alerta "executável sem login", mas todas conferem por dentro se quem chama é `patricia@calirh.com` e recusam os demais — não estão abertas. Atenção: esse e-mail está fixo no código da função; quando existir o bloco de usuários internos (Administradora/Parceiro), essas funções precisam mudar.
  - 6 tabelas com RLS ligado e sem política (credenciais do Google, segredos, códigos de acesso, lembretes): é o esperado — ficam inacessíveis pelo app, só o servidor lê.
  - Pendentes de decisão dela (mexem em segurança/config, não apliquei): ligar "proteção contra senha vazada" no Auth; mover extensão `pg_net` do schema public.
  - Armazenamento: fotos de perfil são leves (média 61 KB, maior 345 KB) — o tamanho não explica foto lenta.
- **Fotos "não carregando direito" no oficial:** NÃO diagnosticado. Falta ela dizer em qual tela e de quem (print). Hipóteses a testar: link assinado renovado a cada sessão (sem cache do navegador entre sessões); foto marcada como quebrada na 1ª falha sem nova tentativa (`brokenMedia` em `identityMediaRuntime.ts`).
- **Pente fino do código:** NÃO feito nesta rodada (é trabalho grande; fazer em sessão própria: ramos `v1` desligados em `CompanyTeamPage.tsx`, folhas de estilo legadas, runtimes que injetam DOM).
- **PLANO — Boas-vindas no primeiro acesso (pedido dela, ainda sem construir):**
  1. Tela de boas-vindas em tela cheia no 1º login do cliente, com o vídeo dela ("clique aqui para assistir") e botão "Começar".
  2. Em seguida, tour guiado: destaque de cada item do menu com 1 frase do que faz (Visão geral, Equipe, Horas, Calendário, Ocorrências, Documentos, Relatórios, Frentes, Avisos), com Avançar / Pular.
  3. Botão para rever depois (menu do perfil → "Rever apresentação").
  - Precisa dela: o vídeo (arquivo ou link), os textos de cada passo, e autorização de banco para 1 campo novo que guarda "já viu a apresentação" por usuário.

### 2026-10-12 — 5ª publicação; projetos (aprovação de cronograma) e etiquetas dos avisos

- **Publicado no oficial** (autorizado): fundo quadriculado + transições. Oficial em `5c0d3d0`.
- **Só na homologação (aguarda "pode publicar"):**
  - Modais de cronograma (`workflow-dialog-v38`, usados por "Enviar lembrete ao cliente", "Solicitar ajuste", "Aprovar cronograma", editar/excluir frente): os runtimes V38/V39 agora montam `<header>` com rótulo + título à esquerda e X à direita (antes o X ficava solto no canto e o título colado na borda).
  - Cliente → Projetos: cartão "Cronograma para aprovação" (`client-project-review-v38`) não tinha estilo V2 (texto solto). Agora é cartão âmbar com 4 dados rotulados e botões à direita. Vale também para "Ajuste em análise".
  - Avisos: no cartão com capa fica só a etiqueta sobre a foto, colorida pela categoria; a segunda etiqueta saiu. Sem capa, a etiqueta continua ao lado do autor.
- **Não verificado:** fluxo real de lembrete (envio, sino, e-mail) — testado só visualmente com dados fictícios. Patricia confirmou que o lembrete chegou no sino do cliente no oficial.

### 2026-10-12 (2) — 6ª publicação; transições refeitas; boas-vindas do primeiro acesso

- **Publicado no oficial** (autorizado): modais de cronograma, cartão de aprovação do cliente, etiqueta única nos avisos. Oficial em `1b157b2`.
- **Transições — Patricia não viu efeito** ("você ignorou?"). Causa: a 1ª versão animava só o invólucro da página, que entra junto com o "carregando"; quando o conteúdo chegava, aparecia seco. **2ª versão (só homologação):** cada bloco da página sobe em sequência quando aparece (`v2-block`, 0,46 s, atraso de 0,05 s por bloco), inclusive depois do carregamento e ao trocar de aba; todos os diálogos/gavetas (lista completa de overlays do V2 + runtimes) surgem com `v2-fade` + `v2-pop`. Conferido por `document.getAnimations()` numa navegação pelo menu.
- **Boas-vindas (só homologação):** `src/v2/WelcomeTour.tsx`, montado no shell do cliente. 11 passos: boas-vindas com moldura do vídeo ("em breve"), um passo por item do menu (item fica destacado no menu lateral) e fechamento. Pular / Voltar / Avançar. "Rever apresentação" no menu do perfil. Textos são proposta minha — ela revisa.
  - **Sem banco:** "já viu" fica no navegador (`cali:welcome-seen:<id do usuário>`). Limitação: em outro aparelho/navegador aparece de novo. Trocar por campo no perfil quando ela autorizar o banco.
  - **Atenção antes de publicar:** ao publicar, TODOS os clientes atuais verão a apresentação uma vez, com a moldura "vídeo em breve". Decidir com ela se publica já ou só com o vídeo.
  - Falta: o vídeo (arquivo/link) e onde hospedar.
  - QA: `probe.cjs` e `sweep.cjs` marcam a apresentação como vista para não cobrir as telas.

### 2026-10-12 (3) — 7ª publicação: transições; boas-vindas seguras no oficial

- Patricia respondeu só "publique", sem dizer se as boas-vindas iam junto. **Interpretação minha:** publiquei as transições e deixei as boas-vindas desligadas no oficial (`WELCOME_LIVE` em `src/v2/WelcomeTour.tsx` é falso quando o endereço é `app.calirh.com`), para nenhum cliente ver "vídeo em breve". Na homologação continua aparecendo. Para liberar no oficial: `WELCOME_LIVE = true` e nova publicação.

### 2026-10-12 (4) — 8ª publicação: boas-vindas liberadas, modal de aprovação didático, tabela welcome_views

- **Autorizações dela nesta data (palavras dela):** "pode liberar as boas-vindas e publicar"; "Eu já autorizei se mexer no banco, criar, não excluir nada, se não for necessário". Interpretação minha: posso criar estruturas novas no banco sem pedir "pode aplicar" a cada vez, sempre dizendo o que criei; alterar/apagar o que existe, RLS de tabelas existentes, auth e integrações continuam pedindo aprovação.
- **Banco (aplicado em produção):** `20261012100000_welcome_views.sql` — tabela nova `cali_workspace.welcome_views (user_id, seen_at)`, RLS: cada pessoa lê/insere só a própria linha. Nada existente foi alterado.
- **Boas-vindas:** liberadas no oficial (saiu a trava `WELCOME_LIVE`). "Já viu" agora vale em qualquer aparelho (tabela) + atalho no navegador. Vídeo ainda é só a moldura.
- **Modal "Aprovar cronograma" (cliente):** nome do projeto como título, frase única do que a aprovação significa, "Início planejado" e "Conclusão prevista" em dois quadros com rótulo em cima, e lista "O que acontece depois de aprovar". O mesmo estilo de quadros vale para "Enviar lembrete" (Projeto / Resposta prevista).
- **Auditoria (ela perguntou se existe):** existe parcial — histórico de alterações de equipe, de horas (edição/exclusão com motivo), de status de entregáveis e log de atividades. Não há uma tela única de auditoria. Sugestão a discutir: página "Auditoria" na administradora reunindo quem fez o quê e quando.
- **Não verificado:** gravação real em `welcome_views` com usuário de verdade (o ambiente de teste bloqueia gravações).

### 2026-10-12 (5) — página Auditoria (administradora) — só homologação

- Nova rota `/admin/auditoria` (`src/pages/admin/AdminAuditPage.tsx`), item "Auditoria" no menu da administradora. Só leitura; **nenhuma mudança no banco**.
- Junta em uma lista por dia: `activity_log`, `team_changes`, `team_private_audit`, `deliverable_status_history`, `project_lifecycle_events`, `report_client_events` (400 mais recentes de cada). Traduz cada evento para frase em português; esconde diagnósticos técnicos (`preview_*`).
- Filtros: período, empresa, área, pessoa, busca. Indicadores: registros, pessoas que agiram, ações sensíveis.
- **Limites conhecidos:** não registra o que o sistema hoje não grava (ex.: edição de cadastro de cliente, publicação de aviso, criação/edição de documento além de publicar/arquivar, login por senha). Para cobrir isso seria preciso passar a gravar esses eventos (mudança de banco/gatilhos). Eventos sem tradução aparecem com o nome técnico na área "Outros".
- **Não verificado:** com dados reais (leitura de linhas de produção não é permitida ao assistente); Patricia confere na homologação.

### 2026-10-12 (6) — erro ao trocar de página, capa do comunicado, reações, protocolo na Auditoria — só homologação

- **"Não foi possível concluir esta navegação" ao trocar de página (oficial):** acontece quando há publicação com a aba aberta — a aba pede arquivos da versão anterior, que deixaram de existir. Foram 8 publicações no dia. Correção: `AppErrorBoundary` e `vite:preloadError` (em `main.tsx`) recarregam o Workspace sozinhos uma vez; se ainda falhar, a tela de aviso agora tem visual e texto claros. Não reproduzido em teste automatizado (depende de publicação real).
- **Comunicado aberto ainda gigante / comentário escondido:** causa real = `identityMediaRuntime` tratava a capa como foto de perfil quando o nome de alguém aparecia nos comentários (classe `profile-person-image-v47`, altura 100% `!important`). Corrigido no módulo (ignora `.notice-*`) e na folha (altura fixa com prioridade). Com a capa em 124 px o comentário cabe.
- **Reações nos comunicados:** 👍 Curti, ❤️ Amei, 👏 Parabéns; uma por pessoa, clicar de novo remove. **Banco (aplicado):** `20261012120000_notice_reactions.sql` — tabela nova `notice_reactions`; cliente vê reações da própria empresa, administradora vê todas. Nada existente alterado.
- **Auditoria:** coluna Protocolo (ocorrência, entrega, compromisso, documento, relatório, projeto, aviso — quando o evento aponta para um deles); busca por protocolo; motivo técnico `under_30_seconds` deixou de aparecer.
- **Avaliação: o que mais uma auditoria pode ter (não feito):** (1) registrar o que hoje não é gravado — edição de cadastro de cliente/contrato, publicação/edição de aviso, criação/edição de documento, alterações de permissão e de acesso, login por senha e saídas; (2) "antes → depois" de cada alteração; (3) exportar CSV/PDF por período; (4) alerta para a administradora quando houver ação sensível; (5) trilha por item (abrir uma ocorrência/projeto e ver toda a história); (6) retenção definida (por quanto tempo guardar). Os itens 1 e 2 exigem gatilhos no banco.
- **Usuários internos da CALI (como cadastrar o Partner):** hoje não existe tela. Proposta registrada na resposta à Patricia (ver conversa de 12/10): página "Equipe CALI" na administradora, convite por e-mail, perfis Administradora e Partner, escopo por empresa. Mexe em auth/permissões → só com aprovação dela depois de ver o plano.
- **Não verificado:** gravação real de reação; recarga automática após publicação.

### 2026-10-12 (7) — 9ª publicação; Auditoria com trilha por item — trilha só na homologação

- **Publicado no oficial** (autorizado: "o resto já pode publicar"): Auditoria, reações, capa do comunicado, recarga automática. Oficial em `1d4ad9f`.
- **Trilha por item (só homologação):** na Auditoria, clicar no protocolo abre a trilha daquele item (entrega, ocorrência, projeto, relatório, documento, compromisso, aviso): cartão com tipo, protocolo, nº de movimentações, primeira e última data e quem participou, e a lista só daquele item (ignora os filtros). Também há "Agrupar por protocolo", com botão "Ver trilha completa" em cada grupo.
- **Limites:** a trilha usa os 400 registros mais recentes de cada fonte (item muito antigo pode vir incompleto); mensagens do chat da ocorrência e lançamentos de horas ligados ao item ainda não entram na trilha; nome/título do item não aparece, só tipo e protocolo.

### 2026-10-12 (8) — 10ª publicação (trilha da Auditoria) e PLANO do perfil Partner (nada aplicado)

- **Publicado no oficial** (autorizado): trilha por item na Auditoria. Oficial em `cbd3d4d`.
- **Partner — decisões da Patricia (12/10):** módulo "Equipe CALI" dentro de uma página existente do menu da administradora; convite por e-mail com mensagem de boas-vindas à equipe CALI e a mesma apresentação inicial; dois perfis (Administradora = a dela, completo; Partner). Partner: vê só as empresas atribuídas; NÃO acessa Propostas, Auditoria, dados salariais nem valores; PODE acessar e gerar Mapa de People; pode lançar horas manualmente com justificativa, e o lançamento precisa da aprovação dela antes de entrar no relatório de horas; vê informações contratuais do pacote (Partner / Full / Build), sem detalhes sensíveis.
- **Situação técnica encontrada (leitura do banco):** `cali_workspace.is_admin()` é o e-mail `patricia@calirh.com` fixo; `profiles.role` só aceita `admin` e `client`; 58 políticas e 55 funções dependem da checagem de administradora. Ou seja: Partner não é "um campo a mais", é um perfil novo de permissão.
- **Plano em etapas (cada uma só com "pode aplicar" dela):**
  1. **Base no banco (aditivo + 1 ajuste):** aceitar `partner` em `profiles.role` (ajuste de regra existente); tabela nova `staff_company_assignments (user_id, company_id)`; funções novas `is_partner()` e `partner_can_access(company_id)`. `is_admin()` NÃO muda — continua só ela.
  2. **Leitura do Partner:** políticas NOVAS (somadas, sem alterar as atuais) dando leitura das empresas atribuídas em: empresas (sem valores), equipe (sem dados restritos), projetos/entregas, ocorrências, calendário, documentos, avisos, horas. Sem política para propostas, auditoria, financeiro, `team_member_private`, satisfação.
  3. **Escrita do Partner:** ocorrências (responder), cronômetro e horas manuais com justificativa obrigatória; campo novo de situação no lançamento ("aguardando aprovação" → aprovado/recusado por ela); só aprovado entra no relatório de horas. Exige alterar funções existentes de horas/cronômetro → testar com conta Partner de teste antes de publicar.
  4. **Telas:** aba "Equipe CALI" (convidar, atribuir empresas, desativar); menu reduzido do Partner; fila "Horas para aprovar" para ela; e-mail e apresentação de boas-vindas da equipe.
  5. **Auditoria:** passa a distinguir Patricia × Partner (já mostra "Quem").
- **Padrões que assumi e ela precisa confirmar:** Partner lê Relatórios mas não aprova nem envia ao cliente; lê Avisos mas não publica; não vê Satisfação; não cadastra nem edita cliente/contrato.
- **Risco:** não há banco de teste separado (homologação e oficial usam o mesmo). Etapas 1 e 2 são aditivas e não mudam o que ela e o cliente veem hoje; a etapa 3 mexe em funções em uso e é a que pede mais cuidado.

### 2026-10-12 (9) — Partner: regras da Patricia, ETAPA 1 aplicada no banco, tela "Equipe CALI" (homologação)

- **Regras dela (12/10, palavras dela resumidas):** o Partner é "um fantasma": o cliente contrata a Patricia e é ela quem está à frente. Partner faz o operacional interno, nos módulos e empresas atribuídos. Pode: responder ocorrências; publicar comunicados; criar agendamentos (em nome dela, sem ele participar); preparar relatórios e pôr a contribuição dele — mas envia para ELA, só ela aprova e envia ao cliente; entregável só vai ao cliente depois de ela aprovar; horas manuais com justificativa, ela aprova antes de entrar no relatório de horas; acessa e gera Mapa de People; vê o pacote contratado (Partner/Full/Build). Não pode: Propostas, Auditoria, dados salariais, valores. O cliente pode ver que "o João / a Luana" respondeu um assunto, mas não que participa de decisões. Módulo "Equipe CALI" não fica dentro de Clientes.
- **Autorização:** "pode começar assim, pelo que você projetou das etapas" → interpretei como "pode aplicar" para a etapa 1 e seguir etapa a etapa mostrando o resultado.
- **ETAPA 1 aplicada em produção** — `20261012150000_staff_partner_base.sql`: `profiles.role` passa a aceitar `partner` (único ajuste em regra existente); tabelas novas `staff_members` (e-mail, nome, módulos, ativo, user_id) e `staff_company_assignments`; funções novas `is_partner()` e `partner_can_access(company_id, module)`; RLS: só a administradora gerencia, a pessoa lê a própria ficha. `is_admin()` intacta. **Ninguém ganha acesso com isso**: o login (função `workspace-access`) só cria perfis a partir de `client_invites`.
- **Tela (só homologação):** `/admin/equipe-cali`, item "Equipe CALI" no menu. Explica os dois perfis; lista e formulário (nome, e-mail, empresas, 9 módulos, ativar/desativar). Aviso âmbar no fim: acesso do Partner ainda não liberado.
- **PRÓXIMAS ETAPAS (não iniciadas):**
  - 2: políticas NOVAS de leitura para o Partner (por empresa + módulo), sem tocar nas atuais.
  - 3: escrita — ocorrências, cronômetro, horas com justificativa e situação "aguardando aprovação"; relatório/entrega "enviar para a Patricia"; exige alterar funções em uso.
  - 4: login do Partner — alterar a função `workspace-access` para aceitar `staff_members` e criar perfil `partner`; `ProtectedRoute`/`LoginPage` hoje mandam quem não é admin para `/cliente` (precisa de rota e menu do Partner ANTES de ligar o login); e-mail "Bem-vinda(o) à equipe CALI" + apresentação inicial.
  - 5: fila "Para aprovar" da Patricia (horas, relatórios, entregas) e identificação do Partner na Auditoria.
  - Ponto a decidir com ela: como o Partner aparece para o cliente nas respostas de ocorrência (nome dele ou "Equipe CALI").
- **Não verificado:** gravação real do cadastro na tela (QA bloqueia gravações).

### 2026-10-12 (10) — Partner ETAPA 2 (leitura) aplicada no banco

- **Autorização:** "pode seguir com a etapa 2" e "pode ver o nome dele" (nas respostas de ocorrência o cliente vê o nome do Partner).
- **Aplicado em produção** — `20261012170000_staff_partner_read.sql`: 42 políticas NOVAS `<tabela>_partner_read`, todas só de leitura, por empresa atribuída + módulo (ocorrências, projetos/entregas, horas, calendário, documentos, relatórios, avisos, equipe do cliente; cronômetro só o próprio; contatos das empresas atribuídas). Funções novas `partner_has_module()` e `partner_companies()` (lista de empresas SEM valores de contrato/cobrança). Nenhuma política existente foi alterada.
- **Sem política para o Partner (de propósito):** `companies` direto, `billing_records`, `extra_visit_expenses`, `scheduling_requests` (tem taxas), `nps_responses`, `satisfaction_followups`, `activity_log`, `team_member_private`, `team_private_audit`, `client_invites`, `communication_*`.
- **Efeito hoje:** nenhum — ainda não existe perfil Partner nem login dele. Para administradora e cliente as regras antigas continuam valendo (as novas se somam e dão "não" para quem não é Partner).
- **Observação de processo:** a gravação do arquivo desta migração pelo terminal foi barrada pelo controle automático do aplicativo; o arquivo foi criado pela ferramenta de escrita e a aplicação feita pela ferramenta de migração do Supabase, com a autorização dela acima.
- **Não verificado:** leitura real com uma conta Partner (não existe ainda); impacto de desempenho das políticas somadas (esperado desprezível: a checagem "é Partner?" roda uma vez por consulta).
- **Patricia não achou a tela "Equipe CALI":** ela está só na homologação (`/admin/equipe-cali`), não no oficial.

### 2026-10-12 (11) — Partner: etapa 3a no banco, área do Partner e fila de aprovação (homologação); LOGIN AINDA DESLIGADO

- **Autorização:** "pode seguir para a próxima etapa, quando acabarmos eu valido e publicamos".
- **Banco aplicado (só acréscimo)** — `20261012190000_staff_partner_write_queues.sql`: política nova para o Partner responder ocorrências (`account_record_messages_partner_insert`, autor = ele, lado CALI); tabelas novas `staff_hour_submissions` (horas com justificativa, pendente/aprovado/recusado) e `staff_review_requests` (relatório/entrega/documento/comunicado enviado para a Patricia); função nova `admin_decide_staff_hours` — ao aprovar, cria o lançamento oficial pela função existente `add_manual_hour_entry` (nota interna com o nome de quem lançou e a justificativa; oculto do cliente por padrão). **Nenhuma função ou política existente foi alterada** — por isso o Partner NÃO grava direto em horas, relatórios ou entregas.
- **Tela (só homologação):**
  - `/equipe` — área do Partner com moldura própria (`src/pages/staff/StaffWorkspace.tsx`): Início (empresas e módulos), Ocorrências (ler e responder), Horas (lançar com justificativa + situação), Enviar para aprovação. Boas-vindas próprias ("Boas-vindas à Equipe CALI", 6 passos, moldura do vídeo).
  - `/admin/equipe-cali` — bloco âmbar "Para você aprovar" (horas e materiais) com Aprovar / Recusar / Devolver e motivo obrigatório na recusa.
  - Perfil `partner` reconhecido no login, no retorno de autenticação e nas rotas protegidas (vai para `/equipe`).
- **O QUE FALTA PARA O PARTNER ENTRAR:** publicar a nova versão da função de login `workspace-access`. O arquivo está pronto em `supabase/functions/workspace-access/index.ts` (versão 6 de produção + trechos marcados "PARTNER": aceita e-mail de `staff_members`, cria perfil `partner`, bloqueia cadastro desativado, envia e-mail "Boas-vindas à Equipe CALI" no 1º acesso). **NÃO publicada**: essa função é a porta de entrada de TODOS (Patricia e clientes); pedi confirmação explícita dela antes. Ordem segura: publicar o site no oficial primeiro (senão um Partner que entrasse pelo oficial cairia na tela de cliente, vazia) e só então a função.
- **Fora desta entrega (etapa 3b):** Partner editar entregas, relatórios, documentos, comunicados e agenda dentro do sistema (hoje ele prepara fora e "envia para aprovação"); cronômetro do Partner; telas de leitura dos demais módulos na área dele; notificação no sino quando há item para aprovar; Partner identificado por nome na Auditoria.
- **Não verificado:** nada disto com conta real — gravações (resposta de ocorrência, horas, envio, decisão) só no simulador, que bloqueia gravações.

### 2026-10-12 (12) — Partner: consulta dos módulos, aviso no sino, auditoria — login CONTINUA desligado

- Patricia respondeu "siga para a próxima etapa" sem a frase pedida para o login ("pode publicar e ligar o login do Partner"). **Interpretação minha:** seguir com o desenvolvimento; NÃO publiquei o site nem a função de login `workspace-access`.
- **Banco aplicado (acréscimo):** `20261012210000_staff_submission_notifications.sql` — função + 2 gatilhos nas tabelas novas das filas: quando o Partner envia horas ou material, a administradora recebe notificação no sino ("Horas para aprovar · Nome" / "Material para aprovar · Nome"), com link para `/admin/equipe-cali`. Se o aviso falhar, o envio não é perdido.
- **Área do Partner (homologação):** telas de consulta, só leitura, para os módulos liberados — Projetos e entregas, Calendário, Documentos, Relatórios, Avisos, Equipe do cliente (filtro por empresa + busca). Menu mostra só os módulos liberados.
- **Auditoria:** eventos "Aprovou/Recusou horas lançadas pela Equipe CALI" traduzidos; o nome do Partner aparece em "Quem" (vem do perfil).
- **Ainda fora (etapa 3b):** Partner publicar comunicado e criar agendamento direto (ela autorizou; exige política de escrita em `notices`/`events` e ajuste em `notify_notice`); editar entregas/relatórios/documentos no sistema; cronômetro do Partner; sino na área do Partner (retorno das decisões hoje aparece nas listas "Meus lançamentos" / "Meus envios").

### 2026-10-12 (13) — LOGIN DO PARTNER LIGADO; 11ª e 12ª publicações; sino, cronômetro e comunicados do Partner

- **Autorização (palavras dela):** "pode aplicar tudo o que ainda falta, inclusive publicar e etc".
- **11ª publicação** (`d9296a5`): Equipe CALI, área do Partner, filas de aprovação. Em seguida, **função `workspace-access` publicada (versão 7)** — código em `supabase/functions/workspace-access/index.ts`. Teste rápido após publicar: pedido de código para e-mail inexistente → `{ok:true}`; verificação inválida → "Código inválido ou expirado" (400); OPTIONS 200. **Não testado:** entrada real da Patricia, de um cliente e de um Partner (depende deles). Se o login falhar para alguém: republicar a versão 6 (o código original está no histórico desta conversa e é o arquivo atual sem os trechos "PARTNER").
- **Banco aplicado (acréscimo)** — `20261012230000_staff_partner_notices_and_decisions.sql`: função `partner_publish_notice` (Partner publica comunicado só para empresas atribuídas, com módulo Avisos; sai como "CALI · Assessoria"; clientes avisados no sino + e-mail; administradora avisada no sino; registro na auditoria) e gatilhos `notify_staff_decision` (Partner é avisado quando ela aprova/recusa/devolve).
- **Área do Partner:** sino "Retornos da Patricia" (lido/não lido guardado no navegador); cronômetro em Horas (local, no navegador: ao parar preenche duração e justificativa do lançamento, que segue para aprovação); "Novo comunicado" em Avisos.
- **12ª publicação:** itens acima.
- **AINDA NÃO FEITO (dos itens que ela mandou aplicar):**
  - **Agendamento direto pelo Partner:** a agenda é ligada à conta Google da Patricia e às funções de sincronização; criar compromisso em nome dela exige mexer nessas funções. Hoje ele pede por "Enviar para aprovação" (tipo Outro).
  - **Editar entregas, relatórios e documentos dentro do sistema:** exige alterar funções em uso (55 dependem da checagem de administradora). Hoje: prepara fora e envia pela fila.
  - Cronômetro do Partner é local (não aparece para a Patricia enquanto roda; só o lançamento enviado).
- **Como testar o Partner (para ela):** Equipe CALI → Adicionar pessoa (e-mail que ela controle, empresas, módulos) → abrir o Workspace em janela anônima → entrar com esse e-mail → código chega por e-mail → cai em `/equipe`.

### 2026-10-12 (14) — Partner: retorno do 1º teste real da Patricia (no oficial) — correções só na homologação

- **Ela testou com conta real:** cadastrou "João" e entrou em `app.calirh.com/equipe` — login do Partner FUNCIONA (código chegou, área abriu, empresas e módulos corretos). Login dela também segue funcionando (ela navegou no admin).
- **Queixas dela:** (1) a pessoa não recebeu e-mail ao ser cadastrada; (2) Partner sem acesso ao perfil; (3) "Sair" em lugar diferente; (4) telas pobres — "tem que ser os nossos módulos, a nossa página, o mais parecido possível com o meu de administrador, respeitando as limitações dele"; (5) não entendeu "Enviar para aprovação".
- **Feito (homologação):**
  - Partner agora usa a MESMA moldura oficial (`WorkspaceShellV2`, papel `partner`): topo, busca, sino, menu do perfil com "Ver meu perfil" (edita nome, foto, contatos pela função `update_my_profile`), "Rever apresentação" e "Sair". Menu lateral na mesma ordem e nomes do da administradora.
  - Avisos do Partner = o mural oficial (`NoticesBoard` em modo `staff`: cartões com capa, etiqueta, detalhe; sem ciência/comentário/reação; botão "Novo comunicado" abre diálogo no padrão).
  - "Enviar para aprovação" virou "Enviar para a Patricia", com 3 passos explicando para que serve e tipos mais claros.
  - Convite: ao salvar o cadastro (e pelo ícone de carta na linha), tenta envio automático; se falhar, mostra o convite pronto com "Abrir no meu e-mail" e "Copiar texto".
- **NÃO FUNCIONOU:** publicar a função nova `workspace-staff-invite` (envio automático do convite) — o Supabase devolveu "internal error" duas vezes. O código está em `supabase/functions/workspace-staff-invite/index.ts`. Enquanto não publicar, a tela cai no convite manual. Tentar de novo em outra sessão (ou pelo painel/CLI do Supabase).
- **AINDA FALTA para a paridade que ela pediu (tela por tela):** Ocorrências (hoje lista + diálogo simples; o painel da administradora depende de funções que só ela pode chamar), Projetos, Horas, Calendário, Documentos, Relatórios e Equipe do cliente ainda são listas simples de consulta. Caminho: uma página por vez, reaproveitando o componente da administradora com um modo "equipe" (como foi feito em Avisos) e liberando no banco só o que o Partner pode fazer.

### 2026-10-13 — Partner, página por página: 1) Visão geral (homologação)

- **Pedido dela:** "vamos fazer passo a passo, página por página"; começar pelo painel dele; tem que ver o logo da empresa; "o layout, a estrutura não está alinhada agora".
- **Feito:** `src/pages/staff/StaffDashboard.tsx` — mesma composição e mesmas classes da Visão geral da administradora (`.content > .ap-app.v2-admin-page > .ap-content`): título com ação, saudação, 4 indicadores (empresas, ocorrências em aberto, entregas em andamento, aguardando a Patricia), Prioridades de hoje, Agenda, Consumo de horas por empresa (com logo), Status das entregas (rosca), Suas empresas (com logo, pacote e situação) e módulos liberados. Blocos só aparecem se o módulo estiver liberado.
- **Alinhamento medido contra a tela dela:** título em x=91→1405, y=87 no computador e x=15→375 no celular — idêntico à Visão geral da administradora. Para isso as regras de página da administradora passaram a valer também para o papel `partner` (`.app:is([data-workspace-role='admin'],[data-workspace-role='partner'])`), e a Visão geral do Partner é renderizada sem invólucro extra.
- **Banco aplicado (acréscimo)** — `20261013090000_staff_partner_brand_logos.sql`: política nova de LEITURA no armazenamento para o Partner ver o logo (`<empresa>/brand/`) só das empresas atribuídas.
- **Não verificado:** logo real carregando para o João (depende do teste dela); números com dados reais.
- **Próximas páginas (ordem sugerida):** Ocorrências → Projetos → Horas → Calendário → Documentos → Relatórios → Equipe do cliente.

### 2026-10-13 (2) — REGRAS DO PARTNER DITADAS PELA PATRICIA (Projetos, Horas, Ocorrências, sessão) + o que já foi feito

**Regras (palavras dela, organizadas). Valem como especificação das próximas páginas:**
- **Princípio:** o Partner usa AS MESMAS páginas dela (mesmo layout, lista e Kanban, gaveta do entregável, etc.), com limitações. "Por enquanto é tudo centralizado": o que encerra ou vai ao cliente como decisão passa por ela.
- **Projetos / entregáveis:** vê igual a ela (Cronograma, Entregáveis em Lista e Kanban, Histórico). Na gaveta: conversa com o CLIENTE (pode — ela voltou atrás e liberou) e conversa INTERNA (ele ↔ ela); pode mudar a situação, EXCETO a que envia ao cliente; tem "Iniciar timer".
- **Horas:** vê o consumo do cliente (quanto tem e quanto usou) e o histórico; NÃO vê as horas da administradora ("ele não viu do ADM, mas o ADM vê tudo"); não exclui; pode editar hora dele com justificativa (vai para a auditoria); lançamento manual e interação externa existem para ele, mas em vez de registrar vão PARA APROVAÇÃO dela.
- **Ocorrências:** conversa com o cliente; o botão dele NÃO é "Finalizar": é "Enviar para aprovação da Patricia".
- **Sessão e cronômetro:** registrar horário de entrada e de saída; se ele esqueceu um cronômetro ligado: (a) ao clicar em Sair, avisar e só deixar sair depois de pausar/revisar; (b) se fechou a aba, no dia seguinte ele recebe aviso de pendência e pode corrigir manualmente; (c) a plataforma deve parar sozinha por inatividade longa (não deixar rodar a noite inteira); (d) e-mail automático para o Partner E para ela.
- **Erro que ela achou na administradora:** cronômetro iniciado na ocorrência não aparecia no topo.

**Feito nesta rodada (homologação):**
- Cronômetro de ocorrência agora aparece no topo também dentro de Ocorrências (`GlobalTimerBar.contextIsVisible`: a regra que o escondia nessa página saiu). Observação: com a gaveta da ocorrência aberta, ela cobre o lado direito do topo; o cronômetro aparece ao fechar.
- Entrada/saída do Partner: `20261013110000_staff_session_log.sql` (função `staff_log_session`, grava em `activity_log`). A área do Partner registra a entrada (1 vez por sessão do navegador) e a saída ao clicar em Sair. Equipe CALI mostra "Último acesso" e "Saiu …"; Auditoria traduz os dois eventos. Fechar a aba sem clicar em Sair não gera saída (por isso "Sem saída registrada depois").
- Privacidade das horas: `20261013113000_staff_hours_privacy.sql` — a política de leitura do Partner em `hour_entries` (criada por mim na etapa 2) passou a mostrar só os lançamentos DELE; o consumo por empresa vem da função nova `partner_hours_summary` (só totais). Painel dele usa essa função.

**PLANO das páginas reais (cada item exige alterar funções em uso → fazer um por vez, com conta Partner de teste):**
1. **Ocorrências** — reaproveitar `WorkspaceRecordsPage` em modo equipe: lista com filtros/grupos, gaveta igual; liberar para o Partner as funções `post_account_record_message`, `mark_account_record_opened`, cronômetro da ocorrência, "Aguardar cliente"/"Stand by"; trocar "Finalizar" por "Enviar para aprovação da Patricia" (fila `staff_review_requests`, tipo novo `record_close`); esconder "Salvar na memória da conta" se ela não liberar.
2. **Projetos** — reaproveitar a página da administradora: leitura por `projects_workspace_snapshot` (hoje só admin) e gaveta do entregável; liberar mudança de situação menos `client_review`/envio; conversas cliente e interna; cronômetro.
3. **Horas** — mesma página, com: consumo por cliente (totais), "Registros de atuação" só dele, sem excluir, editar com justificativa, "Lançamento manual" e "Interação externa" indo para `staff_hour_submissions`; cronômetro real (tabela `work_timers`) no lugar do cronômetro local atual.
4. **Sessão/cronômetro esquecido** — depende do item 3 (cronômetro real): bloqueio no Sair, rotina diária de pendência, parada por inatividade, e-mails para os dois.
- Decisão técnica necessária antes do item 1: como as ~55 funções checam `is_admin()`, criar `cali_workspace.is_staff_for(company_id, module)` e trocar a checagem função por função (só nas que o Partner pode usar), mantendo `is_admin()` nas demais.

### 2026-10-13 (3) — Partner, página por página: 2) Ocorrências (homologação)

- **Autorização:** "show. pode seguir" (sobre o plano das páginas reais; assumi Aguardar cliente e Stand by liberados e "Salvar na memória da conta" não, como avisado a ela).
- **Tela:** o Partner usa a MESMA `WorkspaceRecordsPage` da administradora em modo `staff` (`StaffRecordsPage`): mesmos filtros, grupos, lista com logo e gaveta. Diferenças: sem "Novo registro", sem memória interna da conta (só conversas com o cliente), sem enriquecer/excluir; cabeçalho da gaveta com cronômetro próprio; campo de resposta com escolha **Cliente / Interno** (nota interna vai para ela, com aviso no sino); rodapé com Assumir / Aguardar cliente / Stand by / Retomar e **"Enviar para aprovação da Patricia"** no lugar de Finalizar (depois de pedir, "Aguardando a Patricia"). Encerrada: "Só a Patricia pode reabrir".
- **Conversa:** no modo `staff` as mensagens são desenhadas pela própria página (mesma estrutura/classes dos balões), porque os módulos automáticos da conversa só rodam em `/admin/registros` e `/cliente/registros` e chamam funções exclusivas da administradora. Consequência: Partner ainda NÃO tem anexos, link, emoji, reações, editar/apagar mensagem.
- **Banco aplicado (acréscimo)** — `20261013140000_staff_partner_records.sql`: funções novas `partner_post_record_message`, `partner_set_record_status` (só in_progress / waiting_client / standby; nunca em ocorrência encerrada), `partner_request_record_close` (fila `staff_review_requests`, tipo novo `record_close`), `partner_start_record_timer` (cria `work_timers` de verdade → a administradora enxerga) e `partner_stop_timer` (tempo < 30 s descartado; senão vira `staff_hour_submissions` para aprovação, nunca lançamento direto). Nenhuma função dela foi alterada.
- **Lado dela:** em Equipe CALI → "Para você aprovar" aparece "Encerrar ocorrência"; aprovar chama a função dela `set_account_record_status(completed)` (cliente é avisado como no Finalizar); devolver mantém aberta.
- **Limites conhecidos:** quando o cliente responde, o aviso vai só para a administradora (o Partner vê na lista, sem sino); cronômetro do Partner não aparece no topo dele (só dentro da ocorrência); horas aprovadas não ficam ligadas à ocorrência no lançamento oficial (o protocolo vai na descrição).
- **Não verificado:** nenhuma gravação com conta real (responder, mudar situação, pedir encerramento, cronômetro) — o simulador bloqueia gravações. Primeiro teste real é o da Patricia com o João.

### 2026-10-13 (4) — Ocorrências: retorno da Patricia (chat, espaço, aviso, redundância) — homologação

- **Chat no padrão do chat dos projetos** (administradora, cliente e Partner): foto FORA do balão, nome em caixa normal, texto e hora dentro; balão ajusta à mensagem (máx. 78%). **Causa das fotos que não apareciam** (queixa antiga dela): a foto ficava posicionada por cima do balão; nas mensagens de quem não é o autor o balão era desenhado depois e cobria a foto. Com a foto fora do balão isso acaba. (Regras em `operational.css`, bloco "Ocorrências — chat no padrão do chat dos projetos".)
- **Mais espaço para a conversa:** cabeçalho, faixa de situação, campo de resposta e rodapé mais baixos; ferramentas e "Enviar" na mesma linha. Área da conversa passou de ~516 px para ~575 px numa tela de 1000 px de altura.
- **Partner:** "Cliente / Interno" foi para o lado do "Enviar"; mensagens mostram foto real de quem escreveu; a administradora aparece com nome e foto (função nova `staff_admin_contacts`, migração `20261013160000`).
- **Aviso de confirmação** ("Sessão com menos de 30 segundos…", "Status atualizado…") virou cartão flutuante no canto inferior direito que some em 4,5 s — vale para os três perfis nesta página.
- **Redundância:** saíram "N com ação necessária" do resumo do topo e do cabeçalho do grupo; ficam a etiqueta na linha e o filtro "Só com ação necessária".
- **Erro meu corrigido antes de enviar:** ao tirar a contagem repetida deixei a página de Ocorrências sem compilar; descobri porque o comando de verificação que eu vinha usando (`tsc -p .`) não checava nada — o certo é `tsc -p tsconfig.app.json` ou `npm run check`.
- **Não verificado:** fotos reais (só dados fictícios); gravações do Partner seguem sem teste real.

### 2026-10-13 (5) — Balões menores; Partner, página por página: 3) Projetos (homologação)

- **Ocorrências:** balões do chat reduzidos (texto 12 px, foto 34 px, balão até 74% / 480 px) nos três perfis.
- **Projetos do Partner:** usa a MESMA `AdminProjectsPageV3` em modo `staff` (`StaffProjectsPage`, rota `/equipe/projetos`): cabeçalho do projeto, Cronograma, Entregáveis (Lista e Kanban), Histórico e a gaveta do entregável. Ocultos para ele: Nova frente / Novo entregável / Novo projeto, botões do projeto (Enviar cronograma, Adicionar frente), "+ Entregável", Nova etapa, Editar, Excluir, Ajuste, Cancelar entregável, Anexar. Situação: só Não iniciado / Em andamento / Standby / Revisão interna (travada quando está com o cliente, aprovada ou cancelada). "Enviar ao cliente" virou **"Enviar para aprovação da Patricia"** (entregável vai para Revisão interna e entra na fila dela). Conversa com canal Cliente / Interno desenhada pela própria página, com foto e nome. Cronômetro real; ao parar, o tempo vai para aprovação. Etapas: pode marcar feita / não feita.
- **Banco aplicado (acréscimo)** — `20261013180000_staff_partner_projects.sql`: `partner_change_deliverable_status`, `partner_request_deliverable_review`, `partner_post_deliverable_comment` (cliente ou interno; interno avisa a administradora no sino), `partner_start_deliverable_timer`, `partner_toggle_task`. Nenhuma função dela alterada.
- **Lado dela:** aprovar um "Entregável" da fila agora ENVIA ao cliente de verdade (`change_deliverable_status → client_review`); devolver mantém em Revisão interna.
- **Limites conhecidos:** os módulos automáticos de Projetos (inteligência de prazos, ciclo de vida/"Gerenciar projeto", aprovação de cronograma, carteira) só rodam em `/admin/projetos` — o Partner não tem esses recursos; horas por entregável mostram só as dele; sem anexos na conversa.
- **Não verificado:** tudo com conta real; visual da gaveta do entregável do Partner conferido só por estrutura (máquina de teste lenta nesta rodada — load 16–23 — e alguns testes de tela deram tempo esgotado antes de passar).

### 2026-10-13 (6) — Projetos: retorno da Patricia (menu lateral, alerta do timer, cartão e Kanban do Partner, alterações por autorização) — homologação

- **"Buraco" no menu lateral** (todos os perfis, com diálogo aberto e página rolada): o menu era "grudado" (sticky) com altura da tela; com a rolagem travada pelo diálogo sobrava um vão embaixo. Agora é fixo de cima a baixo (`.app>.sidebar` fixed; `.main` com margem de 56 px). Conteúdo continua começando em x=91, como antes.
- **Aviso de outro cronômetro na mesma empresa** (cabeçalho do entregável): era um texto solto + botão "Empresa com timer ativo". Agora é um selo âmbar "Já há um cronômetro ligado nesta empresa", com explicação ao passar o mouse/clicar: só um cronômetro por empresa; pare o que está no topo para iniciar outro.
- **REGRA NOVA dela para o Partner:** o cartão do projeto dele é igual ao dela, só sem "Gerenciar projeto"; "tudo o que ele criar, alterar ou tentar excluir, só pode fazer se EU autorizar". → Voltaram para ele: Nova frente, Novo entregável, Novo projeto, Adicionar frente, "+ Entregável", Editar, Excluir, Nova etapa, Cancelar entregável. Nenhum grava direto: cada um vira um pedido na fila dela (`staff_review_requests`, tipo novo `change`, com o conteúdo em `payload`). Em Equipe CALI → "Para você aprovar" aparece "Alteração em projeto" dizendo o que acontece se aprovar; ao aprovar, a alteração é aplicada COM O ACESSO DELA (`applyStaffChange` em `AdminStaffPage.tsx`). Continuam fora para ele: "Enviar ao cliente" (cronograma e entregável), "Gerenciar projeto", Ajuste, Anexar.
- **Banco aplicado:** `20261013210000_staff_change_requests.sql` — coluna `payload jsonb` e tipo `change` na fila da Equipe CALI (tabela criada por mim; nada dela alterado).
- **Kanban do Partner:** a diferença era que o Kanban dela recebe o layout (colunas de 244 px, rolagem lateral, arrastar) de um módulo automático que só roda em `/admin/projetos`. Repliquei o layout para ele e liguei o arrastar entre as situações permitidas; a coluna "Revisão interna" aparece para ele como **"Revisão da Patricia"**. Colunas "Aguardando cliente", "Ajuste solicitado", "Rebriefing" e "Aprovado" ficam visíveis mas ele não move para elas.
- **Não verificado:** arrastar no Kanban e os pedidos de alteração com conta real; aplicação da alteração do lado dela (cada tipo: projeto, frente, entregável criar/editar/excluir/cancelar, etapa) — nenhum executado de verdade.
- **Ainda pendente do que ela mandou prosseguir:** anexos na conversa do Partner; recursos automáticos de Projetos para ele (prazos, aprovação de cronograma); página de Horas; cronômetro esquecido.

### 2026-10-14 — Cronômetro esquecido (todos), Avisos do Partner, "Aguardando a Patricia", subtarefas — homologação

- **Fato que ela trouxe:** um cronômetro DELA (ocorrência CALI-REG-2026-000004) rodou 16h37–23h32 (6h56) porque ela saiu sem pausar; ao voltar, nenhum aviso. Ela quer a regra do cronômetro esquecido valendo também para a administradora.
- **Cronômetro esquecido — feito:**
  - **Banco aplicado** — `20261014090000_timer_inactivity_guard.sql`: coluna nova `work_timers.last_seen_at` (nula por padrão); função `touch_my_timers()` (sinal de presença); função `close_stale_timers()` + rotina agendada `workspace-timer-inactivity-guard` (a cada 10 min): cronômetro ativo há 30 min sem sinal é PAUSADO, contando só até o último sinal. Administradora: usa a função dela `close_timer_session_at` (vira lançamento normal). Partner: vira `staff_hour_submissions` para aprovação. Aviso no sino + e-mail para a pessoa; se for Partner, também para a administradora. Registro na auditoria (`timer_auto_paused_inactivity`).
  - **Trava de segurança:** a rotina só age em cronômetro que já recebeu algum sinal. Como o oficial ainda não envia o sinal (só a homologação), nenhum cronômetro do oficial é pausado até a publicação.
  - **Site:** `src/lib/timerPresence.ts` envia o sinal a cada 2 min enquanto houver atividade (mouse/teclado nos últimos 5 min e aba visível), para administradora e Partner. Ao clicar em **Sair** com cronômetro ligado aparece o diálogo "Você está com cronômetro ligado" (Voltar ao trabalho / Pausar e sair).
  - **O lançamento de 6h56 dela NÃO foi alterado** (não mexo em dado dela): ela corrige em Horas → editar.
  - **Não verificado:** a rotina rodando de verdade (precisa de um cronômetro real com sinal e 30 min de espera); e-mail do aviso.
- **Avisos do Partner:** estava estreito e centralizado porque faltava o invólucro da página da administradora. Agora mede igual à dela (x=126→1370, y=114). Capa do segundo aviso em branco no print dela: não reproduzido aqui.
- **"Enviar para a Patricia" (tela solta):** ela não entendeu e quer o envio DENTRO das ações. A tela virou **"Aguardando a Patricia"**: só acompanhamento (o que está aguardando e o que ela respondeu, incluindo horas, encerramentos, entregáveis e alterações). O formulário solto saiu. Botão do painel virou "Ver o que aguarda a Patricia".
- **Subtarefas (etapas) do Partner:** pode criar ("Nova etapa" → pedido de autorização) e, ao marcar como concluída, vira pedido "Concluir etapa" para ela; aprovado, a etapa fica concluída. Ele não reabre.
- **NÃO FEITO nesta rodada (ela pediu):** página de Horas do Partner; anexos na conversa dele.

### 2026-10-14 (2) — Partner, página por página: 4) Horas (homologação)

- **Autorização:** "prossiga".
- **Tela:** o Partner usa a MESMA `AdminHoursPageV3` em modo `staff` (`StaffHoursPage`, rota `/equipe/horas`), alinhada igual (x=91, y=87): indicadores, Consumo por cliente, cronômetros ativos, Registros de atuação, e os três botões (Lançamento manual, Interação externa, Iniciar timer).
  - **Consumo por cliente:** total da empresa vindo de `partner_hours_summary` (inclui as horas de todos, mas só o número); sem o botão "Visível/Oculto ao cliente".
  - **Registros de atuação:** só os lançamentos DELE (fila `staff_hour_submissions`), cada um com a situação — Aguardando a Patricia / Aprovado / Recusado — e a resposta dela no detalhe. Ele não vê os lançamentos da administradora.
  - **Cronômetro:** `partner_start_timer` (projeto e entregável opcionais para ele); só "Encerrar" (sem pausar/retomar); ao encerrar vai para aprovação.
  - **Lançamento manual e interação externa:** mesmos formulários; em vez de registrar, viram pedido para ela. Sem a opção "Compartilhável no extrato do cliente".
  - **Editar:** botão "Editar" nos lançamentos que ainda aguardam aprovação, com motivo obrigatório (`partner_edit_hour_submission`; o motivo entra na justificativa e na auditoria como "Equipe CALI editou um lançamento antes da aprovação"). Depois de decidido por ela, não edita. **Excluir: não existe para ele.**
- **Banco aplicado (acréscimo):** `20261014120000_staff_partner_hours.sql` — funções `partner_start_timer` e `partner_edit_hour_submission`. Nada dela alterado.
- **Auditoria:** traduzidos "Cronômetro pausado sozinho por inatividade" e a edição de lançamento da equipe.
- **Limites:** horas aprovadas viram lançamento oficial criado pela administradora (o Partner continua vendo o item dele como "Aprovado" na fila); exportar CSV exporta só os dele; sem pausar/retomar cronômetro para ele.
- **Não verificado:** nenhuma gravação com conta real.
- **Ainda falta do Partner:** anexos na conversa; Calendário, Documentos, Relatórios e Equipe do cliente continuam como listas simples de consulta; recursos automáticos de Projetos.

### 2026-10-13 (noite) — Partner: textos sem redundância, reações, Nova etapa, alinhamentos

- Textos do perfil Partner reescritos (painel, boas-vindas, Ocorrências, Projetos, Horas, Avisos): a regra de aprovação aparece uma vez só, na página "Aprovações" (antes "Aguardando a Patricia") e na boas-vindas.
- Avisos do Partner: reações liberadas como no cliente. Banco (só acréscimo, já aplicado): políticas `notice_reactions_partner_read` e `notice_reactions_partner_insert` — migration `20261014150000_staff_partner_notice_reactions.sql`.
- Entregável (Partner): botão "Nova etapa" voltou a aparecer (estava oculto por engano); etiqueta do topo mostra "Revisão da Patricia"; rodapé com botões e seletor na mesma altura.
- Cabeçalho das páginas `.ap-title`: botões de ação numa linha só, mesma altura (Horas).
- Conferido: `npm run check` ok; varredura 105 · 0; telas do Partner com dados fictícios. Nenhuma gravação real testada.
- Continua pendente no Partner: anexos nas conversas; Calendário, Documentos, Relatórios e Equipe do cliente ainda são listas simples de leitura; função de convite por e-mail não publicada.

### 2026-10-13 — Publicação 13 e Calendário do Partner

- Publicação 13 no oficial (`a340158`), aprovada pela Patricia: tudo do perfil Partner até aqui, pausa automática de cronômetro esquecido, reações.
- Calendário do Partner agora é a página da administradora em modo equipe (`StaffCalendarPage`): só eventos e prazos das empresas atribuídas; sem agenda Google, sem histórico de reuniões, sem caixa de remarcações. Criar, alterar e cancelar evento viram pedido (`staff_review_requests`, kind `change`, ações `event_create`, `event_update`, `event_cancel`), aplicados com o acesso dela em "Equipe CALI". Sem mudança no banco.
- Não testado com gravação real. Pendente no Partner: anexos nas conversas; Documentos, Relatórios e Equipe do cliente.

### 2026-10-13 — Partner: cronômetro no entregável e no topo, recolher frente, anexos, formulário de etapa

- Formulário "Nova etapa": o rótulo "Descrição" deixou de ter moldura própria (vale para administradora e Partner).
- Partner, entregável: botão "Iniciar/Parar timer" visível no rodapé (estava escondido por um estilo feito para a ponte de timer da administradora); rodapé em uma linha; botão "Enviar para aprovação".
- Partner, topo: `StaffTimerBar` (em `StaffWorkspace.tsx`) mostra o cronômetro ligado em qualquer página, com "Parar" (envia o tempo para aprovação). Partner não tem pausa — só parar.
- Partner, Entregáveis: clicar na folha da frente recolhe/abre a lista (em React; a administradora recebe isso do runtime V44).
- Partner, anexos na conversa do entregável: vão direto (decisão da Patricia). Banco, só acréscimo, já aplicado: política `cali_workspace_private_partner_deliverable_insert` (envio só em `<empresa>/deliverables/`) e função `partner_attach_deliverable_file` — migration `20261014180000`. Ocorrências não têm anexo nem para a administradora; não foi criado.
- Conferido: `npm run check` ok; varredura 105 · 0; telas com dados fictícios. Envio real de arquivo NÃO testado.

### 2026-10-13 — Partner: "Pausar" no lugar de "Parar"

- Regra da Patricia: o Partner precisa pausar e continuar depois; encerrar a tarefa não é dele. O `partner_stop_timer` já fazia isso (grava a sessão, envia para aprovação, não bloqueia nada) — igual ao "Pausar" da administradora (`pause_work_timer`). Só o nome estava errado: trocado para "Pausar" no entregável, na barra do topo, em Ocorrências e em Horas. O Partner não tem "Finalizar definitivamente".
- Pedidos em aberto: calendário do CLIENTE com a mesma aparência do da administradora (sem criar evento); decidir quais eventos o Partner vê.

### 2026-10-13 — Depois do teste real da Patricia: nome do Partner, anexo clicável, evento visível ou não para a equipe

- BUG encontrado no teste: o cliente via "Patrícia Lima" (nome e foto) nas mensagens do João. Causa: os runtimes de conversa (entregáveis V35, ocorrências V1/V2) só conheciam a administradora e os clientes. Agora carregam também a Equipe CALI pela função nova `staff_identities()` (só nome e foto). Vale para cliente e administradora, em Projetos e Ocorrências.
- Anexo do Partner: passou a usar o MESMO formato do padrão (`[[arquivo|nome|caminho|tipo|tamanho]]`, pasta `deliverable-chat/<empresa>/<entregável>/<usuário>/`), então sai como botão clicável para todos. Políticas novas de envio e leitura para o Partner nessa pasta. A política `…partner_deliverable_insert` e a função `partner_attach_deliverable_file` de horas antes ficaram sem uso (não removidas). A mensagem de teste antiga "Anexo: …docx" continua como texto.
- Agenda: coluna `events.staff_visible` (padrão true) + campo "Equipe CALI: pode ver / não mostrar" no formulário de evento da administradora; `events_partner_read` respeita a opção. Migration `20261014210000`.
- Conferido: `npm run check` ok; varredura 105 · 0. NÃO testado com gravação real.
- Próximos: calendário do cliente com a mesma grade; Documentos, Relatórios e Equipe do cliente do Partner.

### 2026-10-13 — Publicação 14 e anexos nas conversas (três perfis)

- Publicação 14 no oficial (`fc71afb`), aprovada pela Patricia.
- Conferência de permissões de arquivo (bucket `cali-workspace-private`):
  - Entregável (`deliverable-chat/<empresa>/<entregável>/<usuário>/`): administradora sempre pôde; o CLIENTE não tinha política de envio nem de leitura (o clipe falhava) — criadas `…client_chat_insert` e `…client_chat_select`; Partner já tinha desde a migration 20261014210000.
  - Ocorrências (`records/<empresa>/<ocorrência>/<usuário>/`): administradora e cliente JÁ tinham anexo (runtime V2: até 5 arquivos, 10 MB cada; PDF, imagem, Word, Excel, PowerPoint). Correção de registro: eu havia dito à Patricia que não existia. Faltava só o Partner — criadas `…partner_records_insert/select` e o botão "Anexar" no modo equipe de `WorkspaceRecordsPage.tsx` (1 arquivo por mensagem, 10 MB).
  - Migration `20261014230000`, já aplicada (o banco é o mesmo do oficial: a permissão do cliente vale desde já).
- NÃO testado com envio real em nenhum dos três perfis.
- Próximo: calendário do cliente com a mesma grade da administradora, sem criar evento.

### 2026-10-13 — Conversas: botões "Anexar" e "Link" com nome; fim das caixas nativas do navegador

- A Patricia clicou na corrente (link) achando que era anexo: abriu o `prompt()` nativo ("app.calirh.com diz…"). Corrigido em `deliverableChatStandardRuntimeV35.ts` e `recordsExperienceRuntimeV2.ts`: `prompt` → `askWorkspaceLink()` e `alert` → `workspaceChatAlert()` (novo `src/lib/workspaceChatDialogs.ts`); botões com rótulo "Anexar" e "Link" (CSS em `operational.css`). Vale para administradora, cliente e, nas telas com runtime, todos os perfis.
- Conferido: `npm run check` ok; varredura 105 · 0; diálogo testado direto na página (o runtime de conversa não monta no ambiente de QA).

### 2026-10-13 — Depois do teste da Patricia: cronômetro do Partner sem aprovação, extrato de Horas refeito, play na etapa

- REGRA NOVA (Patricia): "o play com o timer rodando eu não tenho que aprovar; o que eu aprovo são lançamentos manuais". `partner_stop_timer` e a rotina de inatividade passam a gravar a sessão do Partner direto em `hour_entries` (como o cronômetro dela; `client_visible=false`, `created_by` = Partner). Lançamento manual e interação externa continuam em `staff_hour_submissions`.
- Cronômetro que rodou 10h (01:15–11:15): a rotina `close_stale_timers` só agia depois do primeiro sinal de presença, e os inícios pelo entregável/ocorrência não marcavam presença. Agora, sem sinal, conta a partir do início (`coalesce(last_seen_at, started_at)`). Vale para Partner e administradora.
- Horas (administradora e Partner): tabela com Cliente, Contrato, Data, Contexto (subtarefa na segunda linha), Início, Fim, Total, Tipo, Atividade (antes "Natureza") e Editar; bolinha âmbar "Aguardando aprovação" só em lançamento manual pendente. Editar: administradora altera direto (registro `hour_entry_edited`); Partner edita sessão dele por `partner_edit_hour_entry` (motivo obrigatório, avisa a administradora) ou lançamento pendente pelo fluxo antigo.
- Projetos (Partner): play/pausar dentro de cada etapa (`partner_start_timer` com `p_task_id`).
- Avisos do Partner: títulos por tipo ("Pedido aprovado", "Lançamento de horas aprovado"…), com o nome do item e link para a tela certa; sino confere a cada 20 s e ao voltar para a aba, e as telas de Horas e Projetos recarregam quando chega aviso novo.
- Ocorrências: painel lateral 600 px (antes 515).
- Explicado à Patricia, sem mudança: o cliente só soma horas marcadas "visível ao cliente" (`get_client_hours_summary`), por isso o painel dele mostra menos que o dela. Criar etapa pelo Partner continua pedindo aprovação.
- Migration `20261015090000` (já aplicada). O lançamento de 10h01 aprovado no teste continua no extrato da Company IN — ela corrige em Horas › Editar.
- NÃO testado com gravação real.

### 2026-10-13 — UPGRADE DO ENTREGÁVEL (entregável = pasta com subtarefas) — plano e fase 1

Pedido da Patricia: o entregável (ex.: Kit da marca) se desdobra em SUBTAREFAS (Logo, Voz, Manifesto), cada uma com prazo, cronômetro, notas, conversa, anexos e aprovação própria; o entregável vira uma pasta.
Decisões dela: (1) o cliente aprova subtarefa separadamente; o prazo da subtarefa nunca passa do prazo do entregável; (2) HORAS DO CLIENTE: todo tempo conta no consumo; cliente vê total e "em quê" (por entregável/ocorrência), nunca dia/hora/sessão; "visível ao cliente" passa a controlar só se o item aparece com nome (senão soma em "Outras atividades da assessoria") — AINDA NÃO FEITO; (3) Partner cria subtarefa direto; (4) Partner só tem Pausar; o Stop (finalizar) só aparece para ele depois que ela aprovar a tarefa — AINDA NÃO FEITO.

Fases: 1) cabeçalho + notas (FEITA, homologação); 2) aba Subtarefas com painel próprio (notas, cronômetro, conversa, anexos); 3) aba Arquivos (pasta) + envio/aprovação de subtarefa; 4) visão do cliente. Depois: horas do cliente (regra 2) e calendário do cliente.

Fase 1 entregue: status com cor forte e cronômetro no cabeçalho nos dois perfis (`v2-head-timer` no modo equipe; rodapé sem timer); "Etapas" → "Subtarefas"; campo "Notas internas" na Visão geral (tabela nova `deliverable_notes`, só administradora; Partner por `partner_get/save_deliverable_notes` — as notas NÃO ficam em `deliverables` porque o cliente lê essa tabela); Partner cria subtarefa direto (`partner_create_task`), com a regra do prazo; linha da subtarefa da administradora em 4 colunas. Migration `20261015120000` (aplicada).
NÃO testado com gravação real; o cabeçalho e a linha de subtarefa da ADMINISTRADORA não puderam ser vistos no ambiente de teste (o runtime de timer dela não monta lá).

### 2026-10-13 — Upgrade do entregável, fase 2: subtarefa com painel próprio

- Aprovado pela Patricia na fase 1 e virou PADRÃO: status com cor forte no cabeçalho e cronômetro verde quando ligado. Ajustes pedidos: a situação saiu do rodapé e o chip do cabeçalho é o próprio seletor colorido (`v2-head-status`), nos dois perfis; cronômetro ligado da administradora (ProjectTimerBridge) recebeu o mesmo verde por CSS; notas dizem onde ficam e a hora em que foram salvas.
- Lista de entregáveis: subtarefas aparecem ABAIXO do entregável, em árvore (`v2-subtask-tree`), como ela pediu ("igual um organograma"); clicar abre o entregável na aba Subtarefas.
- Aba Subtarefas: clicar na subtarefa abre o painel logo abaixo (`src/pages/admin/SubtaskPanel.tsx`): notas internas da subtarefa, conversa da equipe (interna) com anexo clicável, e lista "Arquivos da subtarefa". Tabelas novas `task_notes` e `task_messages` (administradora total; Partner lê mensagens e grava por `partner_save_task_notes` / `partner_post_task_message`). Cliente NÃO lê nada disso ainda. Migration `20261015150000` (aplicada).
- A tabela `comments` não aceita `target_type='task'` (constraint), por isso a conversa da subtarefa tem tabela própria.
- Falta: fase 3 (aba Arquivos do entregável + enviar subtarefa para aprovação; Stop do Partner só após aprovação), fase 4 (cliente), horas do cliente, calendário do cliente.
- NÃO testado com gravação real.

### 2026-10-13 — Entregável: ajustes depois do teste da fase 2

- NOTAS viraram registros (`NoteLog.tsx`, tabela `note_entries`): escreve, clica "Adicionar nota" e ela entra na lista com autor e hora. Vale no entregável (Visão geral) e na subtarefa. O campo único anterior confundia ("não vi para onde foi"); o que estava salvo foi copiado como primeiro registro. Tabelas `deliverable_notes`/`task_notes` ficaram sem uso (não removidas).
- SUBTAREFAS em tabela (`v2-st-table`): seta para abrir, nome, complexidade, situação selecionável e colorida (A fazer / Em andamento / Concluída — o banco usa `todo/doing/done`), prazo, cronômetro. Saíram o número colado na moldura e o rótulo "Em foco". Formulário igual ao do entregável: título, complexidade, prazo (limitado ao do entregável), descrição, visível para o cliente, entrega documental; saiu "Estimativa de horas". Colunas novas `deliverable_tasks.complexity` e `is_document`.
- Árvore na lista de entregáveis com as mesmas colunas (nome, complexidade, situação, prazo); clicar já abre a subtarefa.
- CRONÔMETRO NO TOPO: mostra só o nome do que está rodando (subtarefa, entregável ou ocorrência), nos dois perfis (`StaffTimerBar` e `GlobalTimerBar`; a empresa fica na linha de baixo quando há espaço).
- Criar entregável: a caixa de explicação da complexidade ganhou respiro.
- PERGUNTA EM ABERTO para ela: "Mês inicial / Mês final" do entregável (posição no cronograma da frente, M1…Mn) — manter, renomear ou tirar.
- Migration `20261015180000` (aplicada). NÃO testado com gravação real; a linha da subtarefa na tela da ADMINISTRADORA (com o Timer dela) não pôde ser vista no ambiente de teste.

### 2026-10-13 — Publicação 15 e subtarefa com modal próprio

- PUBLICAÇÃO 15 no oficial (`61497fb`), a pedido da Patricia ("tem alguma coisa que você pode já subir?"): tudo até o commit `3ff7af0` (Horas com início/fim e editar, cronômetro do Partner direto, anexos/link nas conversas, entregável com status no cabeçalho, notas como registros, subtarefas em tabela).
- Depois da publicação (só homologação):
  - SUBTAREFA COM MODAL PRÓPRIO (`SubtaskModal` em `SubtaskPanel.tsx`), no desenho do entregável: situação colorida selecionável + cronômetro no cabeçalho; abas Visão geral (cards, descrição, notas), Conversas (equipe, com anexo) e Arquivos. Saiu o painel dentro da aba ("fica tudo muito aglomerado").
  - SITUAÇÕES DA SUBTAREFA iguais às do entregável: Não iniciado, Em andamento, Stand by, Revisão interna/"Revisão da Patricia"; só para a administradora: Com o cliente, Aprovado, Concluída. Constraint `deliverable_tasks_status_check` ampliada. `partner_set_task_status` recusa concluir/enviar ao cliente e avisa a administradora quando ele manda para revisão. ATENÇÃO: no oficial (código da Publicação 15) o Partner ainda vê a opção "Concluída", que agora devolve "Somente a Patricia pode…" até a próxima publicação.
  - Cronômetro da subtarefa também para a administradora dentro do modal/linha (`start_work_timer` com `p_task_id`, pausa por `pause_work_timer`).
  - Tabela de subtarefas sem moldura por fora; árvore na lista de entregáveis alinhada às MESMAS colunas do entregável (CSS subgrid), com complexidade, situação colorida e prazo.
  - NOTAS: editar e excluir (administradora qualquer nota; Partner só as dele — `partner_edit_note`, `partner_delete_note`).
  - "Mês inicial / Mês final" saíram do formulário do entregável (ela autorizou); o mês do cronograma é calculado do prazo a partir do início do projeto. Na FRENTE os campos continuam (frente não tem prazo).
- Migration `20261015210000` (aplicada). NÃO testado com gravação real; modal conferido só no perfil Partner com dados fictícios.
- Falta: conversa/aprovação da subtarefa com o CLIENTE, aba Arquivos do entregável, Stop do Partner após aprovação, horas do cliente, calendário do cliente.

### 2026-10-13 — Subtarefa: ajustes do modal, complexidade com cor e visão do cliente

- Modal da subtarefa: o do entregável fica oculto enquanto ele está aberto (`hidden` no overlay) e há "← Voltar para <entregável>"; conversa no padrão dos outros chats (foto fora do balão, via `staff_identities` + `staff_admin_contacts`/perfil da administradora) e botão "Anexar" no padrão.
- Complexidade com cor em todo o Workspace: MC1 verde, MC2 amarelo, MC3 vermelho (`.mc-chip`), com legenda explicando cada uma nos formulários de entregável e de subtarefa (`ComplexityLegend`) e dica ao passar o mouse.
- Lista de entregáveis (administradora/Partner): a subtarefa perdeu a faixa colorida; ficou só a linha de ligação.
- CLIENTE (`ClientDeliverablesPage.tsx`): saiu a aba "Etapas" do entregável; complexidade virou coluna com explicação ao passar o mouse; subtarefas marcadas "visível para o cliente" aparecem abaixo do entregável (nome, complexidade, situação em linguagem do cliente, prazo). O cliente ainda NÃO abre a subtarefa nem conversa/aprova nela — próxima etapa.
- NÃO testado com gravação real; no ambiente de teste não havia subtarefa visível ao cliente para ver a linha dele.

### 2026-10-13 — Publicação 16

- Aprovada pela Patricia ("pode publicar tudo o que está pendente de subir"): subtarefa com modal próprio e situações do entregável, notas com editar/excluir, mês do cronograma pelo prazo, complexidade com cor/legenda, cliente sem aba Etapas e com subtarefas e coluna de complexidade.
- Junto: dica da complexidade aparece na hora (`data-tip`, sem o atraso do `title` nativo) e bloco `v2-mc-card` em "Sobre esta entrega", na cor da categoria e com explicação didática (administradora, Partner e cliente).

### 2026-10-13 — Horas do cliente (regra nova), situações uniformes, ajustes de subtarefa e anexos — Publicação 17

- HORAS DO CLIENTE: `get_client_hours_summary` passa a somar TODO o tempo (sai o filtro `client_visible`) — função existente alterada, regra aprovada por ela. Nova `get_client_hours_breakdown` devolve o consumo somado por item (tipo, projeto, tarefa, protocolo, frente, minutos); o que não é "visível ao cliente" vira "Outras atividades da assessoria". `ClientHoursPage.tsx`: colunas Projeto, Tarefa, Tipo, Frente, Protocolo, Duração; sem data, sem horário, sem detalhe por sessão. Fixture de QA acrescentada em `~/CALI/qa/fixtures.cjs`.
- COMPLEXIDADE: as linhas "Na prática…" que eu tinha escrito saíram. Texto oficial = `complexityMeta` em `src/domain/projects.ts`; a segunda linha agora é a referência documentada em `docs/CALI_PROJECT_REFERENCES.md` (MC1 3, MC2 5, MC3 8 dias úteis). O cliente passou a usar o mesmo texto da administradora. Não há no repositório outro "documento oficial" de MC — se ela tiver um externo, pedir.
- SITUAÇÃO DA SUBTAREFA no mesmo formato da do entregável (seletor branco com ponto), na lista e dentro do entregável, e selecionável direto na lista (`SubtaskStatusSelect`). Cabeçalhos coloridos (padrão aprovado) continuam.
- Sem a borda amarela de foco em seletores e abas ao clicar.
- Modal da subtarefa: "Voltar para o entregável" com cara de botão; protocolo e complexidade na mesma linha de "Subtarefa de …".
- Cliente: cabeçalho das colunas na lista de entregáveis (Entregável, Complexidade, Situação, Prazo).
- Anexos nas conversas: cartão compacto (clipe, nome em uma linha, tamanho) em todas as conversas e perfis.
- Migration `20261016090000` (aplicada). NÃO testado com gravação real.

### 2026-10-13 — Publicação 17 e regra oficial de complexidade

- PUBLICAÇÃO 17 no oficial (`dd92ed4`), aprovada por ela.
- Depois, só na homologação: REGRA OFICIAL DE COMPLEXIDADE (documento colado pela Patricia): MC1 Baixa 30–45, MC2 Média 60–75, MC3 Alta 90–120 dias corridos, com as descrições oficiais — `complexityMeta`, `complexityRange`, `complexityClientNote` em `src/domain/projects.ts`; resumo em `docs/CALI_PROJECT_REFERENCES.md`.
  - Feito (itens 1, 2, 3 e 7 do documento + nota ao cliente + distinção M × MC): ao escolher a complexidade no "Criar entregável" aparece a faixa estimada em datas, com botão "Usar <data>"; data fora da faixa é aceita com aviso âmbar; legenda mostra faixa e descrição das três e a frase "MC é a complexidade… M1, M2, M3 são os meses do roadmap"; bloco de complexidade do entregável mostra "Prazo estimado: N a M dias corridos"; o cliente lê o texto oficial e a nota oficial de estimativa.
  - NÃO feito ainda (itens 4, 5 e 6): registro estruturado das dependências do cliente; reprogramação das entregas dependentes quando uma pendência do cliente atrasa; guardar a estimativa inicial e as revisões de prazo com justificativa no histórico. Hoje existem `originalDueAt`, `clientDelayBusinessDays` e o histórico de situação — verificar o que já cobre antes de criar.
  - O runtime antigo `projectsPlanningIntelligenceRuntimeV36` (3/5/8 dias úteis) procura campos "Deadline"/"Mês inicial" que não existem mais no formulário; está inerte. Não removido.

### 2026-10-13 — Subtarefas recolhíveis e aba Arquivos do entregável (homologação)

- Entregável com subtarefas vira lista recolhível em todos os perfis: botão "N subtarefas · clique para recolher/mostrar" (`v2-subtask-toggle` na administradora/Partner; `dv-subtoggle` no cliente). Começa aberto.
- Aba "Arquivos" no entregável (`DeliverableFiles.tsx`): reúne os anexos da conversa do entregável e da conversa de cada subtarefa, agrupados; abre por link temporário. Só leitura. Administradora e Partner (o cliente ainda não tem essa aba).
- Pedido dela para o ritmo: juntar etapas pequenas numa rodada só.
- NÃO testado com arquivos reais (no ambiente de teste a pasta aparece vazia).

### 2026-10-13 — Coluna "Subtarefas" e Publicação 18

- O botão de recolher virou a coluna "Subtarefas" na linha do entregável, entre Entregável e Complexidade (sem o texto "clique para recolher"); "—" quando não há subtarefa. Grade de 6 colunas `v2-rm-6` (administradora/Partner); `dv-subcol` no cliente.
- PUBLICAÇÃO 18 (aprovada: "Pode publicar. Primeiro vamos ajustar algumas coisas"): regra oficial de complexidade, subtarefas recolhíveis, aba Arquivos, coluna Subtarefas.
- PRÓXIMA ETAPA definida por ela — ENTREGA EM FORMATO DE PASTA: um entregável com desdobramentos (ex.: Kit de marca = logo, manifesto, brand, conteúdo) chega ao cliente, na página Documentos, como uma PASTA; ao clicar, ele vê os documentos de cada desdobramento. A CALI vê a mesma visualização, com poder de criar, excluir, editar e suspender. Ainda não construído. Ver `ClientDocumentsPage` / tabela `files` (já tem `deliverable_id`; falta `task_id`).

### 2026-10-13 — Entrega em formato de pasta, 1ª versão (homologação)

- Decisões dela: o Partner PROPÕE o arquivo final e só ela libera; o cliente vê a pasta desde o início, com as partes "em produção".
- Subtarefa › Arquivos (`SubtaskPanel.tsx`): cada arquivo anexado na conversa da subtarefa mostra o estado (Arquivo de trabalho / Aguardando liberação da Patricia / Liberado ao cliente / Suspenso) e os botões: Partner "Propor como entrega final" (`partner_propose_final_file` → linha em `files` como rascunho, não visível); administradora "Liberar para o cliente" (publica em `files` com `task_id`), "Recusar", "Suspender".
- Cliente › Documentos (`ClientDocumentsPage.tsx`): seção "Pastas de entregáveis" — uma pasta por entregável que tenha subtarefas visíveis ao cliente, com "N de M entregues"; dentro, cada subtarefa com o documento liberado ou "Em produção". Documento de subtarefa não aparece solto na grade de capas.
- Banco: `files.task_id`, política `files_partner_task_read`, função acima. Migration `20261016120000` (aplicada).
- Nota do prazo ao cliente encurtada, pequena e em itálico com asterisco (`complexityClientNote`) — texto reescrito por mim a pedido dela; o do documento oficial era mais longo.
- FALTA nesta frente: a MESMA visualização de pasta para administradora e Partner em Documentos (hoje eles usam a aba Arquivos do entregável e da subtarefa); aprovação/ciência por documento dentro da pasta; capa da pasta; entrega final do próprio entregável (sem subtarefa) pelo mesmo botão.
- NÃO testado com gravação real. Atenção: publicar um arquivo dispara o aviso de documento novo ao cliente (gatilho existente `notify_file_movement`).

### 2026-10-13 — Publicação 19 e fechamento da pasta (homologação)

- PUBLICAÇÃO 19 no oficial (`8e461bc`), aprovada por ela: entrega em pasta 1ª versão.
- Depois, só na homologação:
  - Aba Arquivos do ENTREGÁVEL (`DeliverableFiles.tsx`) virou a visão de pasta da administradora e do Partner: mesmas partes que o cliente vê (uma por subtarefa + a conversa do entregável), cada arquivo com estado e ações. Partner: "Propor como entrega final". Administradora: "Liberar para o cliente", "Recusar", "Suspender" e "Excluir" (retira o documento da pasta do cliente; o arquivo continua na conversa). Vale também para entregável SEM subtarefa (grupo principal, `task_id` nulo).
  - Cliente, dentro da pasta: "Confirmar recebimento" por documento (usa `document_acknowledgements`, já existente); depois mostra "Recebimento confirmado".
  - Subtarefa aprovada/concluída mostra "Encerrada" no lugar do play (regra dela: Partner só tem Pausar; encerrar é dela). Não há botão de Stop para o Partner.
- Ainda falta nesta frente: renomear/editar o documento liberado; capa da pasta; a pasta dentro da página Documentos da administradora (hoje fica na aba Arquivos do entregável); cliente abrir a subtarefa e conversar por ela.
- NÃO testado com gravação real.

### 2026-10-13 — Publicação 20 e subtarefa com o cliente (homologação)

- PUBLICAÇÃO 20 no oficial (`4fa1102`), aprovada por ela: pasta completa na aba Arquivos, cliente confirma recebimento, subtarefa encerrada.
- Depois, só na homologação — SUBTAREFA COM O CLIENTE:
  - Modal da subtarefa (CALI): conversa com dois canais, "Equipe (interna)" e "Cliente" (o segundo só quando a subtarefa é visível ao cliente). Mensagem no canal Cliente avisa o cliente (sino e e-mail) pelo gatilho novo `task_messages_notify`.
  - Cliente (`ClientSubtaskModal.tsx`): clicar na subtarefa da lista abre a parte dele — situação, prazo, documentos entregues, conversa com a CALI (com anexo) e, quando a situação é "Com o cliente", o botão "Aprovar esta parte" (com confirmação) → `client_approve_task` muda para Aprovado e avisa a administradora.
  - Banco: política `task_messages_client_read`; funções `client_post_task_message`, `client_approve_task`, `client_visible_task`; `partner_post_task_message` com `p_client_visible`. Migration `20261016150000` (aplicada).
- Falta: pedido de ajuste formal do cliente na subtarefa (hoje ele escreve na conversa); renomear documento liberado; capa da pasta; pasta na página Documentos da administradora; os 3 itens do documento de complexidade (dependências, impacto de atraso, histórico da estimativa); calendário do cliente; Documentos/Relatórios/Equipe do Partner.
- NÃO testado com gravação real.

### 2026-10-13 — POLÍTICA DE CAPACIDADE MENSAL (documento da proprietária) — plano e fase 1 (homologação)

Documento colado por ela: "Política de capacidade mensal, alertas, excedentes e FAQ do cliente" (9 seções). Regra dela: NÃO considerar concluído só por melhoria visual; excedente nunca gera cobrança, suspensão, upgrade nem alteração contratual automática.

FASE 1 — FEITA (homologação):
- §2 cálculo único em `src/lib/capacity.ts` (`capacityOf`, `minutesLabel`, `percentLabel`, `capacityMessages` com os textos oficiais de 75%, 100% e 1ª ocorrência). Percentual não é limitado a 100%; percentual excedente calculado.
- §3 barra única `src/v2/CapacityBar.tsx` (verde→amarelo→laranja→vermelho; marcas 0/50/75/100; excedente em faixa vermelha À PARTE, sem comprimir a escala; texto + ícone de alerta) na Home e em Horas do cliente. Cartões: Contratadas, Utilizadas, Excedentes (destaque vermelho suave só com excedente; sem excedente mostra "0h" e o saldo).
- Avisos da página de Horas do cliente trocados pelos textos oficiais (75%, 100%, excedente); saíram os avisos de 45/50/65/70%.
- §8 FAQ: `ClientFaqPage.tsx` em `/cliente/ajuda` (menu do perfil › "Dúvidas frequentes"), pesquisável, por assunto, perguntas expansíveis, 11 perguntas com o texto do documento.

FASE 2 — A FAZER (banco): §4 alertas automáticos de 75% e 100%, uma vez por marco/cliente/mês, idempotentes e consolidados quando um lançamento cruza os dois; §5 ocorrências de excedente por mês (1ª, 2ª, 3ª com textos oficiais, janela configurável — proposta 6 meses, a validar com ela), 3ª gera pendência "Avaliar adequação de capacidade"; marcar o histórico existente como já tratado para NÃO disparar avisos retroativos.
FASE 3 — A FAZER: §6 painel administrativo (ritmo de consumo, dias restantes, histórico mensal, meses com excedente, alertas comunicados, decisões); §7 relatório mensal com o bloco de capacidade e o texto-base; §9 validação com os 12 cenários.

Pendência operacional: o lançamento de teste de 10h01 continua no extrato da Company IN e faz o cliente ver 118% — ela precisa corrigir em Horas › Editar.

### 2026-10-13 — Capacidade mensal: modelo de layout e REGRAS NOVAS ditadas por ela

- Layout: ela mandou um modelo ("Horas do mês": plano · mês, percentual grande, barra com zona "Excedente", três cartões, aviso com "Não há cobrança adicional ou alteração automática do contrato"). Implementado como `CapacityCard` (em `src/v2/CapacityBar.tsx`) na página Horas do cliente; a Home continua com o herói próprio e a mesma barra.
- REGRAS DITADAS (ainda NÃO implementadas — fase 2):
  - Vigência mínima: CALI Partner 8 meses; CALI Full 12 meses; depois vira contrato por tempo indeterminado (ela vai explicar o resto).
  - Janela de recorrência = o período do contrato (8 ou 12 meses), não 6 meses.
  - Não pode ultrapassar mais de 3 vezes: na 3ª, rever o pacote ("senão eu vou ficar trabalhando de graça"). As horas excedentes NÃO são descontadas do mês seguinte (não está em contrato).
  - Tolerância de até 10% acima. Ao chegar a 110%: PAUSA até renovar o mês seguinte.
- CONFLITO A RESOLVER COM ELA antes de construir: a pausa em 110% contradiz o documento que ela mesma colou (sem suspensão automática; FAQ "A CALI deixa de trabalhar quando as horas acabam? Não existe suspensão automática"). Perguntado: a pausa é automática (bloqueia cronômetro/lançamento) ou é um alerta para ela decidir? E os textos do FAQ/avisos precisam mudar.
- Company IN / outubro é só teste (ela confirmou); não é pendência.

### 2026-10-13 — Publicação 21 e capacidade mensal, fase 2 (homologação)

- PUBLICAÇÃO 21 no oficial (`687b0d8`), aprovada por ela: subtarefa com o cliente e capacidade fase 1 (cartão "Horas do mês", barra, FAQ).
- DECISÃO DELA sobre a pausa: NÃO é automática. Tolerância de 10%; ao passar de 110% o sistema avisa a administradora e ELA decide pausar até o mês seguinte. Janela de recorrência = vigência do pacote (Partner 8 meses, Full 12; demais 6). 3ª ocorrência = rever o pacote.
- FASE 2 feita (banco aplicado, telas na homologação):
  - Tabelas `capacity_events` (marco por empresa/mês: m75, m100, excess, tolerance, review — único por mês) e `capacity_pauses`.
  - `evaluate_capacity(empresa, mês, avisar)`: registra os marcos novos e envia UMA comunicação ao cliente (a do marco mais alto: 75%, 100% ou ocorrência 1ª/2ª/3ª, textos oficiais, sino + e-mail) e UMA à administradora; 3ª ocorrência → "Avaliar adequação de capacidade"; ≥110% → "Limite de tolerância atingido". Gatilho `hour_entries_capacity_check` roda a cada lançamento e nunca bloqueia o lançamento.
  - Ocorrências = meses com excedente CONFIRMADO, recalculados dos lançamentos reais dentro da janela (`capacity_excess_months`) — correção retroativa de horas muda a contagem.
  - Implantação silenciosa: os marcos já atingidos no mês atual foram registrados sem avisar ninguém (conferido: 4 marcos, 0 notificações — todos da empresa de teste).
  - Cliente: `get_client_capacity_status` → o cartão mostra "primeira/segunda/terceira ocorrência" e, se pausado, "Atividades pausadas até a renovação do mês". FAQ ajustado na resposta sobre parar de trabalhar (tolerância de 10% e pausa avisada).
  - Administradora: `CapacityPanel.tsx` em Horas (`admin_capacity_overview`): empresas com ≥75%, consumo/saldo/excedente, ocorrência nº na vigência, ritmo estimado (marcado como estimativa), avisos já enviados ao cliente, botão "Pausar até o próximo mês" (com confirmação) e "Retomar".
- A pausa hoje é um registro + aviso ao cliente; NÃO bloqueia cronômetro nem lançamento (decisão: nada automático). Avaliar com ela se quer um aviso para a equipe ao dar play em empresa pausada.
- FALTA (fase 3): histórico mensal de consumo no painel; registro de análise/decisão/encaminhamento da pendência de adequação; bloco de capacidade no relatório mensal (§7); validação dos 12 cenários (§9) com dados reais; conferir modo escuro e celular.
- Migration `20261016180000`. NÃO testado com lançamento real (nenhum aviso foi disparado de verdade).

### 2026-10-13 — Publicação 22: capacidade fase 2 + ajustes de layout dela

- Home do cliente: três números na ordem pedida — contratadas no mês, consumidas no mês, % utilizados — e só a barra com a escala (saiu a linha de leitura embaixo).
- Horas do cliente: respiro no cartão "Horas do mês"; saiu a linha "plano · mês" (o período já está acima); aviso de excedente padrão, sem valores: "O consumo está acima do contratado. Vamos acompanhar juntos a demanda do período e avaliar se é necessário reorganizar as prioridades. Manteremos a comunicação." + rodapé em itálico menor "Não há cobrança adicional ou alteração automática de contrato." (a frase de 2ª/3ª ocorrência continua entrando no meio quando for o caso).
- Publicado com autorização dela ("pode continuar publicando o que já tiver pronto"): painel de capacidade da administradora, ocorrência/pausa no cartão do cliente, FAQ ajustado.

### 2026-10-13 — Publicação 22 feita; capacidade mensal fase 3 (homologação)

- PUBLICAÇÃO 22 no oficial (`1b7a208`).
- Fase 3 (homologação): no painel de capacidade da administradora, botão "Histórico e avaliação" por empresa → consumo mês a mês na vigência do pacote (`admin_capacity_history`) e registro da avaliação de adequação (análise, encaminhamento, "já comunicado ao cliente") em `capacity_reviews`, com as últimas avaliações listadas. Nada altera contrato.
- Relatório (`ExecutiveReportPaperV12.tsx`, seção "Horas e aderência do pacote"): com excedente, mostra o excedente em horas e em % e o texto-base oficial da leitura executiva. O percentual passou a ter uma casa decimal. NÃO entra ainda o número da ocorrência nem a recomendação da 3ª ocorrência (o relatório não carrega esse dado).
- Migration `20261016210000` (aplicada).
- AINDA FALTA da política: validação dos 12 cenários com dados reais (§9); modo escuro e celular; ocorrência/recomendação no relatório; aviso à equipe ao dar play em empresa pausada (se ela quiser).

### 2026-10-13 — Publicação 23 e decisões de escopo

- PUBLICAÇÃO 23 (aprovada: "pode publicar isso tudo"): capacidade mensal fase 3 (histórico mensal, avaliação de adequação, bloco no relatório).
- DECISÕES DELA: NÃO haverá modo escuro. Celular NÃO é prioridade agora — fica registrado aqui para depois; não conferir nem citar como pendência nas entregas.
- Autorizado usar a Company IN como empresa de TESTE para lançar horas e validar os cenários de capacidade (75%, 100%, 118%, três meses com excedente, correção retroativa, aditivo, troca de mês, notificação duplicada).
- Ela tem muitos microajustes guardados; quer primeiro FINALIZAR as frentes abertas, principalmente o perfil Partner.

### 2026-10-13 — CORREÇÃO: bloco de capacidade no relatório estava na versão errada

- ERRO MEU: na fase 3 editei `ExecutiveReportPaperV12.tsx`, que NÃO está em uso (as rotas usam `ReportPrintPageV17` → `ExecutiveReportPaperV17.tsx`). O que foi dito à Patricia como "entrou no relatório" não tinha entrado. A edição no V12 ficou (inofensiva).
- Corrigido no V17 (homologação), seção "Capacidade contratada": percentual com uma casa e sem teto; com excedente, bloco oficial (excedente em horas e %, 1ª/2ª/3ª ocorrência, texto-base da leitura executiva); "Histórico de utilização" mês a mês dentro da vigência (Partner 8, Full 12, demais 6), tirado de `snapshot.previousReports` — pedido dela ("relatório de setembro tantos %, outubro tantos %"); na 3ª ocorrência, recomendação de avaliar o pacote, sujeita à avaliação da CALI. Saíram os dois avisos antigos baseados em 5% e em "dois fechamentos consecutivos" (`capacitySignalV15`/`upgradeRecommendation`), que contradiziam a política nova.
- NÃO verificado na tela: o ambiente de teste não tem relatório de impressão. O histórico depende de `previousReports` vir preenchido no relatório real.
- PEDIDO DELA: revisitar o que foi combinado e ainda está pendente — ver lista consolidada na resposta desta data (Partner: Documentos/Relatórios/Equipe, convite; pasta em Documentos da administradora; renomear/capa; ajuste formal na subtarefa; complexidade itens 4–6; calendário do cliente; validação da capacidade na Company IN).

### 2026-10-13 — Documentos em pasta: ajustes e briefing; PENDÊNCIA DE SEGURANÇA DA PLATAFORMA

- Lista de subtarefas dentro do entregável: saiu a coluna Cronômetro e os botões "Iniciar"/"Timer" (o play fica dentro da subtarefa); o Timer injetado pela ponte da administradora nessa linha foi ocultado por CSS.
- Cliente › Documentos: o documento do próprio entregável entra DENTRO da pasta (antes aparecia solto na grade de capas).
- Ela NÃO gostou do layout da pasta (fechada e aberta) e vai pedir ajuda a outra IA para redesenhar. Briefing completo em `docs/DOCUMENTOS_PASTA_BRIEF.md` (ideia, perfis, regras, o que existe, o que não agradou, perguntas em aberto, padrões visuais). Três sugestões visuais foram mostradas a ela na conversa.

#### PENDÊNCIA (não esquecer) — REVISÃO DE SEGURANÇA DA PLATAFORMA, como um responsável de TI faria
Pedido dela: levantar tudo o que a plataforma precisa ter de segurança, inclusive o que "ninguém imagina". Ainda NÃO feito. Roteiro:
1. Supabase — banco: revisar TODAS as políticas RLS tabela a tabela (cliente só a própria empresa; Partner só empresas atribuídas e módulos liberados; nada aberto a `anon`); conferir funções SECURITY DEFINER (search_path fixo, checagem de papel no início, `revoke` de `public`/`anon`); rodar os advisors de segurança e de desempenho; índices das chaves usadas nas políticas.
2. Supabase — acesso: proteção contra senha vazada (pendente de decisão), política de senha, expiração de sessão, MFA para a administradora, limite de tentativas de login, e-mails de convite/recuperação, URLs de redirecionamento permitidas.
3. Supabase — arquivos: políticas do bucket privado por pasta e por perfil; links assinados de curta duração; tipos e tamanho de arquivo validados também no servidor; nenhum bucket público.
4. Supabase — funções de borda: quais exigem login; segredos só em variáveis de ambiente; CORS; validação de entrada; `pg_net` (pendente de decisão).
5. Chaves e segredos: nada sensível no repositório nem no navegador (só a chave pública); rotação de chaves; quem tem acesso ao painel do Supabase, da Vercel e ao GitHub (contas, 2FA, menor privilégio); token do GitHub no Keychain.
6. Vercel: proteção das prévias de homologação (hoje a homologação usa o MESMO banco do oficial), domínios, cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, Referrer-Policy), variáveis por ambiente, logs.
7. Aplicação: nenhuma rota oficial sem login; dados sensíveis (salário, valores, propostas) nunca chegam ao navegador de quem não pode ver; mensagens de erro sem detalhe interno; proteção contra envio em massa.
8. Dados pessoais (LGPD): o que é guardado, por quanto tempo, quem acessa, como exportar/excluir a pedido, registro de consentimento, termos e política de privacidade.
9. Continuidade: backup do banco e teste de restauração, ponto de recuperação, plano se a conta principal for perdida, monitoramento e alertas de erro, trilha de auditoria (quem fez o quê).
10. Ambiente separado de teste: avaliar um banco próprio para homologação, para testes nunca tocarem dados reais.
Entrega esperada: relatório com o que está certo, o que está em risco (por gravidade) e o que fazer, antes de qualquer mudança — mexer em RLS, auth e integrações exige a aprovação dela.

### 2026-10-13 — Publicação 24; pasta de documentos no modelo A (homologação)

- PUBLICAÇÃO 24 no oficial (`53d04ed`): relatório V17 com capacidade e histórico; subtarefas sem cronômetro na lista; documento do entregável dentro da pasta.
- ESCOLHA DELA para a pasta: modelo A (pasta com capa, partes em cartões), com alternância Capas/Lista como no Drive, e ENTRAR na pasta (ao clicar, vê só a pasta; volta pelo caminho). Receio dela: poluir a tela do cliente.
- Feito no cliente (`ClientDocumentsPage.tsx`, homologação): a pasta é um cartão com capa na mesma grade dos documentos (ou uma linha, no modo Lista), sempre antes dos avulsos, com barra e "N de M entregues"; "Abrir pasta" entra na pasta — caminho "← Documentos › nome", cabeçalho com andamento e o seletor Capas/Lista; dentro, um cartão por parte (capa da empresa quando entregue; hachurado "Em produção" quando não) ou linhas (Nome, Situação, Entregue em, ações). Ações do cliente: Abrir e Confirmar recebimento. Com a pasta aberta, o resto da página some (classe `v2-in-folder`).
- NÃO feito: a mesma tela para administradora e Partner dentro de Documentos (eles seguem pela aba Arquivos do entregável); renomear; capa própria da pasta.
- DRIVE DO CLIENTE (pedido dela: pensar em como isso fica salvo no Drive dele): hoje a cópia para o Drive é por documento (`requestDriveCopy`). Falta: ao salvar um documento de pasta, criar no Drive do cliente uma pasta com o nome do entregável e gravar cada parte dentro; ou um botão "Salvar a pasta no meu Drive". Verificar a função de borda do Drive antes de prometer.
- Lembrete dela: não esquecer a lista de pendências, em especial as DEPENDÊNCIAS do cliente no entregável (documento de complexidade, item 4) e os itens 5 e 6.

### 2026-10-13 — Publicação 25; REGRA: arquivo de conversa NÃO é documento

- PUBLICAÇÃO 25 no oficial (`16173d9`): pasta de entregável no modelo A em Documentos do cliente.
- REGRA DITADA POR ELA: "Documento é a finalização ou algo referente ao entregável ou à subtarefa. Não é um documento compartilhado no chat." O chat é comunicação (prévias, ajustes, aprovações). Só vira documento o que for marcado como entrega final e liberado por ela.
- ACHADO: no teste dela apareceu em Documentos do cliente o arquivo "Apresentacao_Comercial_Prado_Financas.docx", que o João mandou pelo chat. Causa: a primeira versão do anexo do Partner (`partner_attach_deliverable_file`, abandonada no mesmo dia) inseria o arquivo em `files` como publicado. Há exatamente 1 registro assim (conferido por contagem). Permissão de executar a função retirada (migration `20261017090000`). O REGISTRO continua lá — arquivar/retirar depende da aprovação dela (pedido feito).
- A mensagem de teste antiga "Arquivo enviado. Anexo: …docx" é texto (formato anterior) e não é clicável; os anexos enviados depois da correção são clicáveis em todas as conversas.

### 2026-10-13 — Documentos em pasta: ajustes do cliente + mesma organização para administradora e Equipe CALI

- Cliente (`ClientDocumentsPage.tsx`): dentro da pasta, botão "Documentos" e cabeçalho da pasta na MESMA linha (sem repetir o nome no caminho); ações "Abrir" e "Confirmar" lado a lado ("Confirmado" depois); título em até 2 linhas sem vazar; cartão de pasta com a logo do cliente no centro, ícone de pasta no canto superior esquerdo e etiqueta "Pasta" no direito; contador "N pastas · N documentos"; filtro com a opção "Pastas"; a mensagem "Nenhum documento encontrado" só aparece quando não há pasta nem documento.
- Administradora (`AdminDocumentsPageV4.tsx`): pasta = entregável com subtarefas ou com mais de um documento; abre em Lista por padrão; colunas Protocolo/Documento, Empresa/Projeto, Etapa, Validade, Entregue em, Acompanhamento. Entrar na pasta mostra só os documentos dela.
- Equipe CALI: `/equipe/documentos` passou a usar a mesma página (`StaffDocumentsPage`, modo consulta: sem criar, completar, publicar, arquivar ou comentar; clicar abre o arquivo). Política nova de leitura no armazenamento `documents/<empresa>/` (migração `20261017120000_partner_documents_storage_read`, só acréscimo, aplicada).
- Dado: o registro de teste do chat que aparecia como documento na Company IN foi ARQUIVADO com autorização da proprietária (status `archived`, `client_visible=false`; nada apagado).
- Não verificado com conta real: abertura de arquivo pelo Partner (depende da política nova) e pasta com dados reais na tela da administradora.

### 2026-10-13 — Dependências do cliente no entregável + histórico do prazo (regra de complexidade, itens 4 a 6)

- Banco (só acréscimo, aplicado): tabelas `deliverable_client_dependencies` e `deliverable_due_revisions`; funções `partner_add_dependency` e `partner_receive_dependency`. Migração `20261017150000_deliverable_client_dependencies_and_due_revisions`.
  ATENÇÃO: já existia a tabela `deliverable_dependencies` (entregável depende de entregável, vazia e sem uso no código). Não foi tocada; por isso a tabela nova tem "client" no nome.
- Tela: `src/pages/admin/DeliverableDependencies.tsx`, montada na Visão geral do entregável (administradora e Equipe CALI) e no detalhe da entrega do cliente (só leitura).
- Regras: dependência = o que o cliente precisa enviar/aprovar + data limite. Passou da data sem receber → alerta vermelho para as três visões. NADA é reprogramado sozinho: a administradora clica em "Reprogramar prazo"; o sistema sugere prazo atual + dias de atraso + remobilização (MC1 0, MC2 +1, MC3 +2 dias úteis), ela ajusta, escreve a justificativa (o cliente vê) e escolhe quais entregas seguintes da mesma frente andam junto. Cada mudança grava uma linha no histórico do prazo. Equipe CALI registra e marca recebido, mas não reprograma.
- Limites conhecidos: mudar o prazo pelo formulário "Editar" do entregável ainda NÃO grava no histórico; o cliente não recebe aviso no sino quando uma dependência é criada; "entregas seguintes" = mesma frente com prazo igual ou posterior (não usa a tabela antiga de dependência entre entregáveis).
- Não verificado com gravação real: registrar, receber e reprogramar (o ambiente de teste bloqueia escrita). Só a leitura foi conferida por imagem.

### 2026-10-13 — Publicação 26 + pedido de ajuste do cliente na subtarefa + primeira leitura de segurança

- **Publicação 26** (`b82dd14`) no oficial: Documentos em pasta para os três perfis e dependências do cliente no entregável.
- Pedido de ajuste na subtarefa (só homologação): botão "Pedir ajuste" ao lado de "Aprovar esta parte" em `ClientSubtaskModal.tsx`; função nova `client_request_task_adjustment` (migração `20261017180000`, só acréscimo, aplicada). A subtarefa volta para "Em andamento", o pedido entra na conversa da subtarefa como "Pedido de ajuste: …", grava no histórico e avisa a administradora. NÃO conta no limite de ajustes do entregável (decisão pendente da proprietária).
- Segurança, leitura do conselheiro do Supabase (nada alterado, depende de aprovação):
  1. Quatro funções `public.workspace_*mapa_people*` podem ser CHAMADAS sem login, mas todas conferem por dentro se quem chama é patricia@calirh.com e recusam o resto. Sem vazamento; recomendação: tirar a permissão de chamada de quem não está logado.
  2. Proteção contra senha vazada desligada no login (liga no painel do Supabase, Authentication → Passwords).
  3. Extensão `pg_net` no esquema público (baixo risco; mover exige cuidado com integrações).
  4. Seis tabelas com proteção ligada e sem regra (credenciais e códigos): é o comportamento desejado, ninguém lê pela API.
- Não verificado com gravação real: enviar o pedido de ajuste.

### 2026-10-13 — Prioridade nova (administradora e cliente primeiro) + rodada do cliente

- Ordem de trabalho definida pela proprietária: 1) administradora, 2) cliente, 3) Partner (espera). Foco: ação gerar a reação correta entre administradora e cliente (aviso, e-mail, tela certa).
- Agenda do cliente (`ClientTimelinePage.tsx`): Semana e Mês usam a MESMA grade da agenda da CALI (classes `calendar-week-*` / `calendar-month-*` de `page4-calendar.css`, envoltas em `.v2-client-cal`), com legenda e total no rodapé. Sem criar evento na grade; clicar abre o item. Prazos vão na faixa "Dia inteiro". A lista e os filtros não mudaram.
- Avaliação do atendimento (ocorrência, visão do cliente): cartão fixo com emoji e nota grandes; verde para 4–5, amarelo para 3, laranja para 1–2 (`recordsClosureFinalPolishV30.ts` + `.v2-rating-card`). A frase "Você não deixou comentário adicional" saiu.
- Conversa da subtarefa do cliente: faltava o estilo do balão fora de `.v2-client-module` (mensagens saíam cruas no oficial). Corrigido com regras em `.v2-stm-client`.
- Cartão "Revise e confirme o cronograma": virou cartão de atenção baixo (âmbar), sem a arte e sem os quatro quadros; os números ficam numa linha. NÃO conferido por imagem: o painel é montado por runtime que não sobe no ambiente de teste.

### 2026-10-13 — Publicação 27 + mapa de ação e reação (primeira passada)

- **Publicação 27** (`d0e346c`) no oficial: agenda do cliente na grade da CALI, avaliação em destaque, conversa e pedido de ajuste na subtarefa, cartão do cronograma.
- Mapa completo em `docs/MAPA_ACAO_REACAO.md` (levantado lendo gatilhos e funções; NADA conferido com conta real ainda).
- Avisos novos, já ativos no banco (migração `20261018090000_action_reaction_notifications`, só acréscimo): dependência registrada → cliente (sino + e-mail); prazo reprogramado → cliente (sino + e-mail); subtarefa em "Aguardando o cliente" → cliente (sino + e-mail); cliente confirma recebimento → administradora (sino). Todos engolem o próprio erro para nunca travar a gravação.
- Tela (só homologação): mudar o prazo pelo "Editar" do entregável grava no histórico do prazo (fora de rascunho), o que também dispara o aviso de prazo reprogramado.
- Links: o gatilho `notifications_contextual_urls_v1` já completa o endereço com a entrega/projeto; documentos e relatórios ainda abrem a página geral.

### 2026-10-13 — Decisões sobre avisos e e-mails + publicação direta

- **Publicação direta:** a proprietária dispensou a homologação a partir de agora ("já pode subir direto"). Continua valendo: `npm run check` + varredura 105·0 antes de cada publicação.
- **Conversa não gera e-mail**, em nenhum sentido (ocorrência, entregável, subtarefa, comentário). Só o sino. Feito com um gatilho novo `notifications_chat_without_email` (antes de gravar o aviso). Antes disso, cada mensagem de ocorrência (`record_message`) saía por e-mail para os dois lados.
- **Lembrete de dependência em atraso:** `dispatch_dependency_reminders()` todo dia 08h05 de Brasília (cron `workspace-dependency-reminders`): 1º dia de atraso e depois a cada 3 dias; cliente recebe sino + e-mail, administradora recebe sino. Coluna nova `last_reminded_at`. Migração `20261018120000`.
- **Pedidos ainda NÃO feitos:** (1) resumo diário por e-mail para a administradora às 19h, com layout próprio; (2) menção com @ nas conversas, com alerta especial; (3) revisar o layout dos e-mails. Já existe um resumo diário de conversas às 08h (`workspace-daily-chat-digest`), a avaliar se vira o das 19h.
- Agenda do cliente: rótulo da hora não encosta mais em "Dia inteiro".

### 2026-10-13 — Publicação 28, decisão da menção e frente de layout dos e-mails

- **Publicação 28** (`c9d417d`) no oficial.
- **Menção com @ (decisão):** é a ÚNICA mensagem de conversa que gera e-mail, além do sino. Mensagem sem @ continua só no sino. Ainda não construída. Ao construir: usar um tipo de aviso próprio (ex.: `chat_mention`) que NÃO esteja na lista do gatilho `notifications_chat_without_email`.
- **Layout dos e-mails:** a proprietária vai desenhar layout por layout com outra IA, só visual, sem tocar no sistema. O briefing está em `docs/EMAILS_LAYOUT_BRIEF.md`. Quando ela trouxer os layouts aprovados, aplicar nas funções de envio (`workspace-notification-email-hook`, `workspace-access`, `workspace-staff-invite`, `workspace-send-executive-report`, `workspace-daily-chat-digest`).
- Pendente: resumo diário das 19h por e-mail para a administradora.

### 2026-10-13 — Resumo diário da administradora (19h)

- Função de borda nova `workspace-admin-daily-summary` (implantada, versão 1, autenticação pelo segredo do gancho) + `dispatch_admin_daily_summary()` + rotina `workspace-admin-daily-summary` às 22h UTC (19h de Brasília). Migração `20261018150000`.
- Conteúdo: por cliente, "O cliente fez" (avisos que a administradora recebeu no dia) e "A CALI fez" (avisos que o cliente recebeu), mais as horas registradas no dia. Não envia quando não houve movimento. Layout provisório, a trocar pelo que a proprietária aprovar na frente de layouts.
- Teste real: disparo manual em 13/10 às 21h20 retornou 200, 1 destinatário (2 ações de cliente, 4 da CALI, 10h35 registradas).
- **Rotina das 08h `workspace-daily-chat-digest` PAUSADA** (cron removido; função intacta): com a conversa sem e-mail, ela passaria a mandar e-mail diário de conversa não lida para clientes. Decisão pendente da proprietária se quer religar.
- Próximo: menção com @ nas conversas (sino + e-mail).

### 2026-10-13 — Menção com @ nas conversas

- Banco (só acréscimo, aplicado; migração `20261018180000_chat_mentions`): `mention_candidates()` (quem o usuário logado pode mencionar), `notify_chat_mentions(...)` e gatilhos de inserção em `account_record_messages`, `comments` (entregável) e `task_messages`. A menção é o texto "@Nome Completo"; o banco compara com os nomes das pessoas daquela conversa (administradora, Equipe CALI atribuída à empresa, clientes da empresa quando a mensagem é visível ao cliente). Aviso `chat_mention`, relevância `critical`, COM e-mail (fica fora da lista do gatilho que desliga e-mail de conversa).
- Tela: `src/lib/mentionRuntime.ts`, instalado em `main.tsx`. Um ouvinte global: em qualquer campo de conversa, digitar @ abre a lista (setas, Enter/Tab, Esc). Funciona em campo React e em campo montado por runtime. No sino, o aviso de menção tem faixa âmbar e ícone @ (`WorkspaceChrome.tsx`).
- Limites: o nome mencionado não ganha destaque dentro da mensagem (aparece como texto); duas pessoas com o mesmo nome completo na mesma conversa seriam avisadas as duas; o sino do Partner não tem o destaque visual.
- Conferido por teste automático: a lista abre e escreve o nome. NÃO conferido com conta real: aviso e e-mail chegando.

### 2026-10-13 — Publicação 29, aviso abre o item e renomear documento da pasta

- **Publicação 29** (`addd244`) no oficial: menção com @ e resumo diário.
- Aviso de documento e de relatório agora abre o próprio item: `WorkspaceChrome.notificationUrl` acrescenta `?documento=<id>` / `?report=<id>`; `ClientDocumentsPage` abre a pasta do documento (ou a ficha, se for solto) e `AdminDocumentsPageV4` abre os detalhes.
- Pasta do entregável (aba Arquivos): a administradora vê "O cliente vê como: …" e tem o botão "Renomear" no documento proposto ou liberado (`DeliverableFiles.tsx`). Antes, o documento liberado herdava o nome do entregável ou da subtarefa sem como trocar.

### 2026-10-14 — Decisões: limites de ajuste, resumo matinal e Publicação 30

- **Publicação 30** (`2b764f6`) no oficial.
- **Limite de ajustes:** subtarefa = 2 pedidos; entregável = 3 (já era o padrão em `projects.adjustment_limit`). Coluna nova `deliverable_tasks.adjustment_count`; `client_request_task_adjustment` recusa o 3º pedido e numera a mensagem ("Pedido de ajuste 1/2"). O cliente vê "Ajustes usados: n de 2" e o botão some no limite. Migração `20261019090000`.
- **Resumo matinal de conversas para o cliente:** decidido que NÃO. A rotina `workspace-daily-chat-digest` continua pausada.
- **Funções do Mapa People abertas a quem não está logado:** a proprietária não entendeu a pergunta; reexplicado. Nada alterado até ela responder.

### 2026-10-14 — Cronômetro verde, Mapa People fechado, resposta em 72h e alerta de previsão

- **Publicação 32** (`977e335`): cronômetro da administradora em verde, no padrão do Partner (topo conferido; o do entregável não monta no ambiente de teste).
- **Mapa People:** com o "pode fechar" da proprietária, as quatro funções `public.workspace_*mapa_people*` não podem mais ser chamadas sem login.
- **Prazo de resposta do cliente = 72 HORAS corridas** (não 3 dias úteis). Trocada a linha de cálculo do vencimento da validação do cronograma em `open_project_schedule_review_v38` e `admin_resolve_project_schedule_adjustment`: `now() + 24h x dias do projeto`. A coluna continua se chamando `client_response_business_days` (o nome ficou legado; o valor 3 = 72h). Rótulo na tela: "72h para o cliente responder". Migração `20261019120000`.
  NÃO alterado: a janela de 3 dias úteis para pergunta sobre relatório (`reportWorkflowGovernanceV61.ts`) e os deslocamentos de prazo em dias úteis ao retomar projeto pausado. Confirmar com a proprietária se também viram horas corridas.
- **Alerta "previsão depois da meta"** (cabeçalho do projeto): saiu do meio do cartão e foi para o lado direito, em âmbar, com texto que explica as duas datas e diz o que fazer (`projectsPlanningIntelligenceRuntimeV36.ts`).

### 2026-10-14 — Publicação 33, alerta de previsão reposicionado e sessão paralela de e-mails

- **Publicação 33** (`9212242`) no oficial.
- Alerta "previsão depois da meta": a proprietária marcou o lugar certo no print — no ALTO do cabeçalho do projeto, à direita, ao lado da etiqueta de situação — e pediu texto menor. Agora é uma linha: "Previsão N dias úteis depois da meta · Antecipe prazos ou mude a meta." (posição absoluta no `.v2-admin-hero`; abaixo de 1180px volta ao fluxo).
- **Sessão paralela autorizada:** outra sessão está criando e aplicando os layouts dos e-mails (commits `feat(email)`/`docs(email)` em `main`, pasta `docs/emails/` e funções `workspace-access` e `workspace-notification-email-hook`). A proprietária autorizou, desde que não mude o que esta sessão faz. Antes de publicar: sempre `git fetch` + juntar `origin/main` (nunca forçar).

### 2026-10-14 — Remetente dos e-mails: APP CALI RH <workspace@calirh.com>

- Decisão da proprietária: remetente "APP CALI RH" no endereço `workspace@calirh.com` (ela criou como e-mail secundário); respostas continuam indo para `patricia@calirh.com` (`reply_to` inalterado).
- No REPOSITÓRIO a troca está feita nas seis funções de envio. IMPLANTADO no servidor só em `workspace-admin-daily-summary` (versão 2; teste real retornou 200, 1 destinatário, com o remetente novo aceito pelo Resend).
- **FALTA IMPLANTAR** (o repositório já tem o remetente novo; basta reimplantar a partir da `main`): `workspace-notification-email-hook`, `workspace-access`, `workspace-staff-invite`, `workspace-send-executive-report`, `workspace-daily-chat-digest`. As duas primeiras estão sendo editadas pela sessão paralela de layouts; quem reimplantar deve partir da `main` atualizada para não desfazer o trabalho da outra.
- Prazos em dias úteis da pergunta sobre relatório e da retomada de projeto pausado: a proprietária confirmou que estão certos; não mexer.
- Foto do remetente: vem da conta Google do endereço, não do sistema.

### 2026-10-14 — Capacidade mensal validada por simulação (Company IN, mês fictício 03/2027, tudo desfeito)

Simulação dentro de uma transação desfeita ao final (nenhum lançamento, evento, aviso ou e-mail ficou gravado). Contrato 15h.
- 66,7% → nada. 76,7% → evento `m75`; cliente "Atenção ao consumo" e administradora "Capacidade em 75%".
- 100% → `m100`; cliente "Capacidade integralmente utilizada"; administradora "Capacidade 100% utilizada".
- 103,3% → `excess` como ocorrência nº 2 (a nº 1 é outubro/2026); cliente "nova ocorrência de excedente"; administradora "Excedente de horas".
- 111,1% → `tolerance`; só a administradora ("Limite de tolerância atingido", com a orientação de decidir a pausa). Cliente não é avisado de novo.
- Mais horas depois disso → nenhum aviso repetido (um por tipo, por mês).
Não coberto pela simulação: 3ª ocorrência (`review`), pausa/retomada pela tela, o e-mail chegando de fato e os textos no relatório executivo.

### 2026-10-14 — E-mails automáticos não aceitam resposta

- Decisão da proprietária (substitui a anterior): mensagem automática não deve ser respondida. `reply_to` passou de `patricia@calirh.com` para `nao-responda@calirh.com` nas seis funções de envio (repositório). Implantado só em `workspace-admin-daily-summary` (versão 3), que também ganhou a linha "E-mail automático… Não responda a esta mensagem." no rodapé.
- O botão "Responder" não pode ser removido do programa de e-mail de ninguém; o que se controla é para onde a resposta vai e o aviso no rodapé. Todo layout novo deve ter a linha de "não responda" e apontar para o Workspace.
- Pendente: confirmar se `nao-responda@calirh.com` existe no Google Workspace (se não existir, quem responder recebe um aviso de endereço inexistente; aceitável, mas a proprietária pode preferir criar o endereço e descartar o que chegar).
- Continua faltando reimplantar as outras cinco funções a partir da `main` (sessão de layouts).

### 2026-10-14 — Pedido de visita/papo online: consulta de agenda e campo do nome

- "Não consegui consultar minha agenda agora": a conexão Google da administradora está ativa e o registro de auditoria da consulta foi gravado (14/10 11h17), então a falha vinha depois — na consulta de livre/ocupado do Google, que derrubava tudo se UMA agenda da lista (feriados, agendas de terceiros) respondesse com erro. `workspace-google-calendar-read` versão 6: agenda com erro é ignorada; se o Google inteiro falhar, a resposta usa só os compromissos do Workspace e devolve `google: false`. NÃO confirmado com um pedido real depois da correção.
- Campo "Seu nome completo" estreito: agora ocupa a linha inteira (até 460px) e a ciência fica abaixo (`.extra-visit-consent`). Não conferido por imagem (fluxo de 3 passos não montado no teste).
- Papo online: proprietária quer valor definido; sugestões dadas na conversa, aguardando decisão.

### 2026-10-14 — Papo online com valor fixo

- Decisão da proprietária (opção 3): papo online = **R$ 200 por 1 hora** ou **R$ 300 por 1h30**. Durações de 30 e 45 minutos saíram da tela do cliente.
- Cliente (`ExtraVisitRequest.tsx`): condições mostram o valor; a duração é escolhida com o preço ao lado; revisão e ciência citam o valor da duração escolhida.
- Administradora (`schedulingRequestsRuntimeV65.ts`): o formulário de orçamento já abre com o valor da tabela pela duração pedida e o texto "Papo online de 1 hora/1h30, conforme a tabela da CALI." O fluxo continua o mesmo (CALI envia o orçamento, cliente aceita, CALI confirma); só deixou de ser surpresa para o cliente.
- Não conferido por imagem (fluxo de 3 passos não montado no ambiente de teste).

### 2026-10-15 — Revisão de segurança: correções aplicadas + documento de LGPD

Relatório: `docs/SEGURANCA_REVISAO_2026-10-15.md`. Autorização: "fazer tudo que está no teu alcance".
- **Banco:** nenhuma função de `cali_workspace` pode mais ser chamada sem login (antes ~130 podiam); oito funções internas sem conferência de quem chama ficaram só para o banco; `protocol_counters` com proteção por linha; funções novas nascem fechadas. A migração conferiu que as 126 funções usadas pelo app continuam liberadas para usuário logado. Migração `20261020090000`.
- **Duas etapas (TOTP):** `src/auth/MfaGate.tsx` na frente da área da administradora (`ProtectedRoute`) e do Partner (`StaffWorkspace`). Primeiro acesso: QR code para Google/Microsoft Authenticator; depois, código de 6 dígitos uma vez por sessão. No banco, `is_admin()` e `is_partner()` só valem em sessão `aal2` quando a pessoa já tem fator cadastrado (`session_meets_mfa`). Erro do servidor não bloqueia a tela (o banco garante a regra). Recuperação: apagar o fator da pessoa em `auth.mfa_factors`. Migração `20261020093000`. NÃO testado com conta real; o ambiente de teste pula esta tela.
- **Site:** cabeçalhos de segurança em `vercel.json` (não embutir em outro site, sniff, referência, permissões, HSTS).
- **Tela:** texto de usuário passou a ser tratado antes de virar HTML em `recordsClosureExperienceRuntimeV28.ts` (arquivo sem uso hoje) e `schedulingPolicyRuntimeV66.ts` (nota de não ocorrência). Links de aviso não aceitam mais `//` nem `/\` no início (falha conhecida da biblioteca de rotas; a atualização para a versão 7 é mudança grande e ficou para depois).
- **LGPD:** documento para revisão com advogado em Claude Docs: https://claude.ai/code/artifact/3ebb5d2a-3bbb-42d8-b903-d1e7774c753c (política do app, termos, cláusula com clientes, plano de incidentes, prazos de guarda, registro das operações, pontos para o advogado).
- **Pendente:** proteção contra senha vazada (painel; o login não usa senha, impacto baixo); `pg_net` no esquema público; backup do plano (conferir no painel); atualizar react-router para 7; aceite registrado no primeiro acesso; exportar/excluir dados pelo app.

### 2026-10-15 — Capacidade (3ª ocorrência) e pasta inteira no Drive do cliente

- **Capacidade, 3ª ocorrência:** simulação desfeita (nov e dez/2026, Company IN, 16h cada): novembro = excedente nº 2; dezembro = excedente nº 3 + evento `review`; administradora recebe "Avaliar adequação de capacidade"; cliente recebe "terceira ocorrência de excedente". Nada ficou gravado.
- **Drive do cliente:** `google-drive-oauth` versão 2 (implantada). Documento de entregável agora vai para "CALI Workspace / <entregável (protocolo)>" (antes caía solto na pasta CALI Workspace); ação nova `copy_folder` copia todos os documentos liberados da pasta de uma vez, sem duplicar o que já foi copiado. Tela: botão "Salvar pasta no Drive" na pasta (só aparece com Drive conectado e ao menos um documento entregue). NÃO testado com Drive real.
- Exportação dos Indicadores em PDF continua aguardando a proprietária definir o agrupamento (registro de 2026-10, "não começar sem ela definir").

### 2026-10-15 — Nome mencionado em destaque nas mensagens

- `src/lib/mentionText.tsx`: reconhece "@" + até quatro palavras com inicial maiúscula (aceita da/de/do/das/dos/e no meio) e pinta em âmbar (`.v2-mention`). Aplicado nas conversas montadas por runtime (entregável V35 e ocorrências V2, via `linkify`) e nas em React (subtarefa da administradora/Partner e do cliente, entregável e ocorrências do Partner). E-mail tipo a@b.com não é confundido. Só aparência: quem recebe o aviso continua decidido no banco pelo nome completo.

### 2026-10-15 — Partner: Equipe do cliente, Relatórios e menção no sino

- **Equipe do cliente:** `/equipe/pessoas` usa a mesma `CompanyTeamPage` do cliente com `staff` (empresas pela função `partner_companies`, seletor de empresa, só consulta). Escondidos: importar planilha, adicionar pessoa, "Hora de atualizar o quadro" e as ações da ficha (editar, férias, desligar, arquivar; marca `v2-team-staff-mode` no corpo porque a ficha abre fora da página). Dados restritos (salário) nunca são carregados no modo Partner.
- **Relatórios:** relatórios já enviados ao cliente abrem na versão impressa (`/equipe/relatorios/impressao/:id`, `ReportPrintPageV17 role="staff"`, página cheia); rascunhos continuam só na lista.
- **Sino do Partner:** aviso de menção com faixa âmbar.
- **Convite por e-mail:** `workspace-staff-invite` já está implantado (versão 2, pela sessão de e-mails).
- A sessão de e-mails reimplantou também `workspace-access`, `workspace-send-executive-report`, `workspace-daily-chat-digest`, `workspace-notification-email-hook` (14/10) — o remetente novo deve estar valendo em todos; conferir com um envio real.

### 2026-10-15 — Cabeçalhos confirmados no oficial + direitos do titular (LGPD) no perfil

- Cabeçalhos de segurança conferidos em app.calirh.com (X-Frame-Options, CSP frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy, HSTS): todos ativos.
- Perfil (`DirectProfileControl.tsx`, vale para os três perfis): bloco "Privacidade e meus dados" com "Baixar meus dados" (arquivo JSON via `export_my_data()`: cadastro, avisos, mensagens escritas, ciências, ações e pedidos de privacidade; registra no histórico) e "Pedir acesso, correção ou exclusão" (`request_data_subject_right`, tabela nova `data_subject_requests`, aviso crítico + e-mail para a administradora, prazo de 15 dias). Exportação testada no banco com a conta da administradora (dentro de transação desfeita).
- Falta: tela da administradora para responder os pedidos (hoje chegam por sino e e-mail); exclusão em si continua manual, decidida caso a caso.

### 2026-10-15 — Resposta aos pedidos de privacidade

- `PrivacyRequestsPanel.tsx` no topo da Auditoria (só aparece quando há pedido): tipo, quem, empresa, data, prazo de 15 dias (âmbar em aberto, vermelho vencido), "Responder". Função `admin_answer_data_subject_request` grava a resposta, fecha o pedido e avisa a pessoa (sino + e-mail). O aviso do pedido agora leva a `/admin/auditoria`. Auditoria ganhou rótulos para os três eventos de privacidade.

### 2026-10-15 — Cadastro de cliente consertado + efeito colateral da segurança corrigido

- **Cadastro de cliente falhava** ("Não foi possível cadastrar o cliente"): erro ANTIGO em `create_client_account` (gravava o histórico na coluna `action`; a correta é `event_type`). Corrigido trocando só essa linha; testado em simulação desfeita. A tela escondia o motivo porque erro do banco não é `Error` do JavaScript: `AdminClientsPageV3.tsx` agora mostra a mensagem real nos `catch`.
- **Efeito colateral da revisão de segurança:** a regra de leitura de horas do cliente (`hours_client_select`) chama `client_hours_enabled_for_period`, que eu tinha fechado para usuário logado → tela de horas do cliente falhava ("permission denied"). Permissão devolvida. Conferido: nenhuma outra regra (RLS) ou função sem privilégio de dono usa as funções fechadas.
- Acessos de teste para o desenvolvedor: orientação dada (apelido com "+" no e-mail para cliente e Partner na Company IN; administradora de teste NÃO criada — `is_admin()` é fixo no e-mail da proprietária e daria acesso a todos os dados reais).

### 2026-10-15 — Acessos do desenvolvedor (Felipe)

- Pedido e autorização da proprietária: desenvolvedor de confiança felipesdl@outlook.com.
- **Administrador geral:** e-mail incluído em `is_admin()`; conta + perfil `admin` criados no banco; passa pelas duas etapas. Avisos de administrador chegam no sino dele, SEM e-mail (trigger `notifications_secondary_admin_without_email`). O resumo das 19h (função de borda) envia para todos os perfis admin — provavelmente chega para ele também.
- **Partner de teste:** felipesdl+partner@outlook.com, todos os módulos, só Company IN (conta é criada no primeiro login pelo fluxo normal).
- **Cliente de teste:** a proprietária vai cadastrar felipesdl+cliente@outlook.com na Company IN pela tela (Decisores e acessos).
- Conferido: nenhuma tela ou função de borda reconhece a administradora pelo e-mail fixo (só textos de exibição). A checagem dos registros criados foi bloqueada pelo classificador de permissões desta máquina ("Permission Grant"); confirmar com o primeiro login dele.
- Para remover: tirar o e-mail de `is_admin()`, `profiles.active=false` e `staff_members.active=false`.

### 2026-10-15 — Exportar dados da empresa (fim de contrato, LGPD)

- Ficha do cliente → aba **Contrato** → bloco "Exportar dados da empresa" → botão **Exportar**.
- Baixa dois arquivos: `…-dados.json` (função `admin_export_company_data`, só administração, migração `20261021090000`) e `…-documentos.html` (índice dos documentos com links de download válidos por 7 dias, bucket `cali-workspace-private`).
- Ficam de fora: anotações internas (`deliverable_notes`, `task_notes`, `note_entries`), credenciais/conexões Google e Drive, fila de e-mails, notificações e controles da equipe CALI (`staff_*`).
- Cada exportação gera `activity_log` `company_data_exported` (Auditoria: "Exportou os dados da empresa (fim de contrato)").
- Testado em simulação desfeita: Company IN → 49 tabelas, ~306 kB; quem não é administrador é bloqueado; `anon` sem acesso.
- Ainda falta (depende do advogado definir prazos): rotina de eliminação depois do prazo de guarda e desativação automática do acesso no encerramento.

### 2026-10-15 — Aceite dos termos no primeiro acesso (preparado, DESLIGADO)

- `src/auth/TermsGate.tsx`: cliente (`ProtectedRoute`) e Equipe CALI (`StaffWorkspace`, depois das duas etapas) veem "Termos de uso e privacidade" com o texto, a caixa "Li e aceito…" e Continuar/Sair. Administração não passa por ele.
- Desligado enquanto `TERMS_VERSION` estiver vazio. Para ligar: colar os textos aprovados pelo advogado em `TERMS_SECTIONS` e preencher a versão (ex.: `'2026-11'`). Nova versão = novo aceite de todos.
- Registro: tabela `terms_acceptances` (usuário, versão, data, navegador), migração `20261021120000`; cada pessoa só grava e lê o próprio aceite; a administração lê todos.
- Visual conferido ligando-o temporariamente no ambiente de teste.

### 2026-10-15 — Limpeza de código (Publicação 48)

- Removidos 63 arquivos que o app não usava (~1,7 MB), com autorização da proprietária: páginas antigas de Relatórios
  (admin V3–V16, cliente V1–V4, impressão V16), papéis executivos V12/V14/V15/V16, `DataViz`, `OperationalSafetyBridge` (V1),
  runtimes antigos (`recordsExperienceRuntime` V1, `recordsClosureExperienceRuntimeV28`, `dashboardSatisfactionRuntimeV28`,
  `deliverableChatFlickerGuardV36`, `notificationNavigationRuntime`, `reportsV14ClarityRuntime`), `data/demo.ts`,
  `domain/reports.ts`/`types.ts`, `styles/routes/documents.ts`/`clientDeliverables.ts` e CSS antigos de documentos/horas/projetos.
- Critério: arquivo não alcançável por import a partir de `src/main.tsx` (inclui `?inline` dos estilos legados).
  Depois da remoção, só `vite-env.d.ts` fica fora do grafo (é de tipos, fica).
- `scripts/v2-operational-hooks.json`: tiradas as duas entradas de arquivos removidos.
- Qualquer arquivo pode ser recuperado pelo histórico do git (commit "Limpeza: remove 63 arquivos não usados").

### 2026-10-15 — Bloqueio do acesso do cliente no fim do contrato (Publicação 49)

- Brecha encontrada: ao encerrar/bloquear/arquivar, a tela desativava os perfis de cliente, mas o login por código
  (`workspace-access`) reativava o perfil se a pessoa ainda tinha convite ativo em `client_invites`.
- Migração `20261021150000`: trigger `companies_cut_client_access` (status → closed/blocked/archived desativa todos os
  perfis de cliente da empresa) e trigger `profiles_guard_closed_company` (perfil de cliente não fica ativo enquanto a
  empresa estiver nesses status — vale para a função de borda também). Reativar a empresa pela tela continua funcionando.
- Testado em simulação desfeita (Company IN): 1 ativo → encerrada 0 → tentativa via convite 0 → reativada 1.
- `LoginPage`: depois do código, se o perfil estiver inativo, sai e mostra "Seu acesso ao CALI Workspace está desativado…".
- Janela de encerramento avisa que o acesso é bloqueado na hora e lembra de exportar os dados antes.
- Partner: as atribuições a empresas encerradas não foram mexidas.

### 2026-10-15 — Indicadores em PDF (Publicação 50)

- Equipe → Indicadores → **Baixar PDF** (cliente, administração e Partner). Decisão da proprietária: por seção, com as Leituras.
- `CompanyTeamPage.tsx`: `printIndicators()` liga `printingIndicators` (os seis indicadores essenciais saem um a um,
  em grade 2×3, com o nome de cada um, em vez do seletor), põe `body.pa-printing` e chama `window.print()`;
  `afterprint` desfaz. Cabeçalho só de impressão `.pa-print-head` (empresa, mês ou período, situação do mês, data).
- `operational.css` (bloco "Indicadores em PDF"): A4, some o que é controle de tela (abas, seletores, botões,
  dica de passar o mouse) e o que não foi contratado (blocos esfumados `.v2-module-gate.locked` e `.v2-module-blur`);
  cada seção do People Analytics começa em folha nova; cartões não são cortados entre folhas.
- Conferido gerando o PDF no ambiente de teste: administração 7 folhas (Panorama · essenciais · Evolução no período ·
  Retrato do mês); cliente sem People Analytics 2 folhas.

### 2026-10-15 — Textos jurídicos e checklist técnico (Publicação 51)

Fonte: Google Docs da proprietária (Guia 1 e Guia 2, 15/10/2026). **Só a Política de Privacidade e os Termos de Uso
entram no app.** Anexo de Tratamento de Dados, cláusula de encerramento, ajustes de contrato, regras internas de IA e o
checklist do desenvolvedor são de uso interno: não copiar para o app nem para este repositório.

- `src/legal/legalTexts.ts`: Política e Termos como aprovados; `LEGAL_VERSION = '2026-10-15'`; `PRIVACY_EMAIL` vazio
  ⇒ tudo desligado (o texto tem o marcador "[e-mail de privacidade]"; a proprietária vai informar o e-mail).
- `/privacidade` e `/termos` (públicas, `src/legal/LegalPage.tsx`); links no rodapé da entrada e em "Privacidade e
  meus dados" no perfil — aparecem só quando ligado. `TermsGate` mostra os dois textos e grava o aceite (versão, data e
  hora) em `terms_acceptances`.
- **Para ligar:** preencher `PRIVACY_EMAIL` em `legalTexts.ts` e publicar. Mudou o texto ⇒ trocar `LEGAL_VERSION`.
- Exportação da empresa (migração `20261021180000`): `admin_export_company_data(uuid, text)` exige "Entregar para";
  `team_member_private` sai separado em `dados_restritos` com aviso; `activity_log` guarda destinatário e quantidade de
  linhas restritas.
- `SensitiveDataNote`: "Não inclua atestados, laudos, diagnósticos, CID ou exames…" na nova ocorrência e na conversa
  da ocorrência (cliente), na parte do entregável (cliente) e na conversa com a Pati da visão geral.

**Situação do checklist técnico (o que o código já cumpre / o que falta):**
- Login: código por e-mail com 10 min de validade, 5 tentativas por código, 1 pedido a cada 2 min ✔. 2FA para
  administração e Partner ✔. Permissões no banco (RLS) ✔. `team_member_private` só administração ✔.
- Exportação individual (`export_my_data`) ✔ e da empresa ✔, com índice de documentos ✔, links de 7 dias (pode
  gerar de novo dentro dos 45 dias) ✔, sem credenciais ✔, registro de quem pediu e para quem ✔.
- Bloqueio de acesso no encerramento ✔ (Publicação 49), separado da eliminação ✔.
- Google (corrigido nesta publicação): Agenda e Drive do cliente usam a MESMA credencial (`google_calendar_credentials`,
  chave `usuário:empresa`). Antes: desconectar o Drive só marcava `revoked` e deixava o token válido; desconectar a
  Agenda apagava a credencial que o Drive ainda usava. Agora cada lado revoga no Google e apaga a credencial só se o
  outro não estiver conectado. Funções publicadas: `google-drive-oauth` v3, `google-calendar-oauth` v8. Eventos já
  criados no Google e cópias no Drive do cliente continuam lá (o app avisa ao desconectar a Agenda).
- **Falta:** rotina de eliminação/anonimização após 45 dias (banco + Storage + registro do que saiu) — aguarda decisão
  sobre automática × botão; itens de painel/fornecedores
  (membros e chaves do Supabase, DPAs, proteção de senha vazada, backups) — proprietária; IA — não há integração de IA
  dentro do Workspace hoje.

### 2026-10-15 — Relatório, satisfação, sino e textos jurídicos ligados (Publicação 52)

- Relatórios (print da proprietária: caixa crua no rodapé ao clicar "Atualizar prévia"): `reportWorkflowGovernanceV61.ts`
  cria `.v61-confirm-*`, `.reports-governance-v61` e a caixa de dúvida do cliente (`.client-report-question-modal-v61`),
  mas os estilos estavam só em `workspace-system-v61.css`, folha antiga desligada nas telas V2. Portados para
  `src/v2/operational.css` (bloco "Relatórios (15/10)"). Verificado montando a caixa no ambiente de teste.
- `get_admin_satisfaction_overview` falhava sempre (400, "aggregate function calls cannot be nested") — migração
  `20261021200000` agrupa por mês numa subconsulta. Testado em simulação desfeita: total 2, 6 meses.
- Sino (`WorkspaceChrome.tsx`): canal realtime com nome único por montagem; fechava com erro "cannot add
  postgres_changes callbacks … after subscribe()" quando a tela remontava rápido.
- `vercel.json`: a regra de SPA não cobre mais `/assets/`; arquivo de versão antiga devolve 404 (antes vinha o HTML e
  o navegador recusava o CSS), e o app recarrega sozinho pela regra `vite:preloadError`.
- Textos jurídicos LIGADOS: `PRIVACY_EMAIL = 'privacidade@calirh.com'`; Termos item 14 reescrito ("o aplicativo
  registra o aceite…", com autorização da proprietária). A partir desta publicação, cliente e Partner aceitam no
  próximo acesso.

### 2026-10-15 — Parâmetros comerciais na página inicial e nas propostas (Publicação 53)

- Fonte: Guia 2, itens 6.1, 6.2 e 6.4 (uso interno). Só textos deste repositório:
  `LandingPage.tsx` (Full 20–25h de referência, "a partir de R$ 5.000/mês · capacidade e investimento definidos por
  proposta"; frase de acesso ao Workspace para Partner, Full e Build e não para avulsos);
  `portalProposalConfig.ts` (Full `hoursRange '20 a 25'`, `suggestedHours 22`; Build sem faixa de horas);
  `portalProposalParity.ts` (texto padrão do Full 20–25h; Build sem horas informadas = "Capacidade mensal definida
  nesta proposta"); `AdminProposalEditorPageV3.tsx` mostra "Capacidade definida nesta proposta" quando não há faixa.
- NÃO alterado: `public.cali_pricing_rules` (preço base, teto, horas mín./máx., prazo mínimo) — muda o Portal público
  na hora; aguardando a proprietária confirmar os números.

### 2026-10-15 — Fechamento oficial, carrossel e horas (Publicação 54)

- "Criar fechamento oficial" não fazia nada: estava desabilitado de propósito (outubro tinha 16 de 20 dias de coleta;
  libera em 20/10), mas o botão não parecia desabilitado e o erro aparecia no topo da página, fora da vista.
  `AdminReportsPageV17.tsx`: a barra mostra "Fechamento oficial liberado em dd/mm/aaaa" e o erro ao lado dos botões;
  CSS de botão desabilitado. Relatório de setembro (v3, enviado) já existe para a conferência do impresso.
- Fotos repetidas na página inicial: as 4 capturas estavam no git com dois nomes Unicode (à composto e decomposto); no
  Mac parecem um arquivo, no build da Vercel (Linux) viravam 8. Renomeadas para `cali-carrossel-01..05.png` (sem acento;
  a antiga `azumirh-01.png` virou a 01). Mesma ordem de antes.
- Horas: Partner 10–15 e Full 20–25 na página inicial, nas propostas e em `public.cali_pricing_rules`
  (registro `20261021220000`); preços sem mudança.

### 2026-10-15 — Página inicial e entrada na identidade do Workspace (Publicação 55)

- Pedido: alinhar a página inicial e a entrada ao design de dentro do app, SEM tirar transições, cascatas, carrosséis
  nem conteúdo. Feito só com aparência, numa camada nova: `src/site-identity-v2.css`, carregada por último em
  `styles/legacy/index.ts` (s44). Não altera `transform`, `opacity`, `animation` nem `transition`.
- Página inicial (`.cali-landing`): títulos em Inter 700 (antes Playfair), kicker dourado 10,5px espaçado, botões e
  barra de navegação com cantos de 9–14px (antes pílula), cartões com borda fina e sombra discreta.
- Entrada (`LoginPage.tsx` + mesma folha): título em Inter com ponto dourado, lista "o que está no Workspace" (some no
  celular), barra de etapas 1/2 e kicker "ETAPA 1 DE 2", cartão branco no padrão `v2-mfa-card`, campo e botão no padrão
  do app, fundo quadriculado como o canvas do app.
- Imagem do topo da página inicial trocada pela captura da entrada nova (`public/landing/cali-workspace-login-v2.jpg`).
- Conferido: desktop 1440 (topo, carrossel de telas, planos, rodapé) e celular 390 sem rolagem lateral.

### 2026-10-15 — Hero, fotos e telas da página inicial (Publicação 56)

- Hero (pedido: "sem graça, não gera impacto"): faixa bordô com grade sutil, título branco + linha dourada, frase de
  apoio, segundo botão "Ver o app por dentro" (#workspace), três provas (Entregas, Horas, Documentos; somem no celular),
  e no lugar da captura da entrada a tela real de Visão geral com dois cartões flutuantes ("1 entrega aguarda você",
  "Horas do mês"). Mantidos: `data-lp-reveal` e a inclinação ao passar o mouse. Estilos em `site-identity-v2.css`.
- Fotos com faixa bordô embaixo: `.lp-photo-slot img` antiga (do desenho da marca) deslocava a foto 12px; a foto agora
  ocupa o quadro e sem escurecimento.
- Telas do app repetidas: mesma duplicação Unicode das fotos (9 capturas × 2 nomes). Trocadas por 9 capturas NOVAS do
  visual V2, tiradas no ambiente de teste com dados fictícios renomeados para exemplo (Empresa Exemplo, Paula, Ana Souza…):
  `src/assets/workspace-screens/tela-01..09-*.jpg`. Rótulo 5 virou "Detalhe da entrega".

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
