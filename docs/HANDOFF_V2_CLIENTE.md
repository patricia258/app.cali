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
