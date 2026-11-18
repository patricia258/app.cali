# Design system

A interface publicada fornece a referência de composição, tipografia, cores e estados. Os temas Dia e Noite usam a mesma estrutura de componentes. Formulários públicos, impressão e PDFs preservam a apresentação de seus fluxos.

## Tokens e Tailwind

[Paleta CALI](../public/brand/color-palette.css) define os canais sRGB. Cada família usa até sete tons, na ordem `lightest`, `lighter`, `light`, `base`, `dark`, `darker` e `darkest`. Inclua os tons que têm uso. A marca usa `burgundy-base`. [Tokens base](../src/styles/tokens.css) ligam os tons aos papéis de pintura e concentram as dimensões dos controles e do carregamento. [Tokens de tema](../src/styles/theme-tokens.css) selecionam os tons de superfície, texto, destaque, borda e estado em Dia e Noite.

[Configuração Tailwind](../src/styles/tailwind.css) expõe esses valores com `@theme inline`. Escreva layout, aparência, responsividade e estados com utilitários `tw:` no JSX do componente que possui a marcação. Use tokens semânticos para os temas e variantes de estado para foco, seleção, espera e erro. Agrupe classes repetidas por variante em um componente que represente a mesma interação.

Quando o padrão inclui marcação e comportamento, extraia o componente e exponha suas variantes por props. Mantenha as classes de layout no JSX que as usa. Primitivas compartilhadas podem agrupar apenas as classes que formam suas variantes. [Exemplo de título de grupo](../src/components/ds/WorkflowGroupHeading.tsx)

Use tokens pelo papel da cor. `cali-text`, `cali-muted`, `cali-surface` e `cali-line` seguem o tema. `cali-brand` representa a cor fixa da marca. Estados usam as famílias `cali-success`, `cali-warning`, `cali-danger`, `cali-info` e `cali-scheduled`, com variantes `-surface` e `-line`. A mesma família atende avisos, badges e controles de estado.

Elementos que mantêm fundo claro nos dois temas, como o formulário de acesso, usam os papéis próprios de superfície clara também no texto. O teste de superfície mede contraste de pelo menos 4,5:1 em título, instrução, placeholder e link do rodapé do login com a preferência Noite ativa.

Use o token do papel na marcação e a família de pintura para composições que precisam de cor fixa, como uma série de gráfico, uma capa ou um degradê. Use `rgb(var(--cali-rgb-…) / alfa)` em superfícies rasterizadas pelo exportador do DISC. Depois de editar a paleta, rode `node scripts/sync-cali-palette.mjs`. O comando atualiza os valores resolvidos usados por e-mail, PDF, QR Code e Canvas e sincroniza a cor inicial do navegador. O [contrato da paleta](../tests/unit/color-palette.test.mjs) verifica a sincronização, a ordem dos tons, o limite por família e o uso da paleta nas fontes da interface e das Edge Functions.

Use `text-xs`, `text-sm` e `text-base` para a escala comum. `text-cali-micro`, `text-cali-label`, `text-cali-detail` e `text-cali-body` cobrem os passos intermediários do Workspace. Títulos seguem `text-lg`, `text-xl` e os degraus `text-cali-title-*` ou `text-cali-display-*` quando a composição pede a escala CALI. Use as variantes de peso, tracking e altura de linha junto do tamanho escolhido.

O shell compacto usa raiz de 13 px. Compare valores computados e prefira o passo mais próximo da escala de espaçamento do Tailwind. Classes como `gap-1.5`, `px-3` e `py-2` substituem medidas quebradas quando a diferença é pequena. Controles e painéis usam os raios de escala ou os tokens CALI. Reserve medidas próprias para cálculos de layout, limites responsivos, documentos com dimensão física e ativos com geometria definida.

### CSS colocalizado

- Integração de biblioteca com DOM interno fica ao lado do adaptador ou componente. Importe a folha com o componente. Use uma raiz de escopo e seletores de baixa especificidade. Quando a biblioteca expõe tokens, propriedades CSS ou classes por slot, use essa interface.
- Defina ordem de cascata explícita em cada integração. Quando for possível controlar os imports, coloque os estilos do fornecedor em uma camada anterior à da integração. Use regras base, estados e variantes responsivas em ordem coerente dentro do mesmo escopo. Registre a dependência quando uma folha externa sem camada determina a precedência.
- Keyframes exclusivos ficam ao lado do componente. Animações compartilhadas entre domínios entram como tokens no Tailwind. Conversas e notificações usam `animate-message-arrive`. Layout, duração, easing, estado e resposta a movimento reduzido usam utilitários onde aplicável. Fontes, reset, tokens e mídia paginada mantêm os recursos nativos do CSS que precisam.
- Para medidas em execução, passe o valor por propriedade CSS e mantenha a regra visual no componente. Posicionamento medido no viewport também pode ser expresso diretamente com o valor calculado.
- Resets do shell usam a camada base e seletores sem especificidade. As utilidades definem a tipografia e as margens do componente. Use faixas responsivas sem sobreposição quando dois limites alterarem a mesma propriedade.
- Remova regras antigas quando a marcação passar a controlar o estilo. Evite novas pilhas de seletores, `!important` e transposição de folhas para `@apply`. Marcadores usados por runtimes e testes podem continuar até os consumidores migrarem.

O [inventário da migração](TAILWIND_MIGRATION.md) acompanha as folhas ativas por domínio, os acoplamentos e as exceções confirmadas. A [base compacta](../src/styles/workspace-compact-foundation.css) concentra reset e comportamento de rolagem. O [tema compacto](../src/styles/workspace-compact-theme.css) fornece tokens apenas às rotas compactas.

Em Propostas, lista, briefing, editor e ações da prévia usam utilitários no JSX. O [briefing](../src/modules/admin/proposals/AdminProposalsPage.tsx) bloqueia a rolagem do fundo enquanto o painel lateral está montado. O [visualizador do PDF arquivado](../src/modules/admin/proposals/AdminProposalPreviewPage.tsx) controla as dimensões do iframe no JSX. Editor e prévia usam a [moldura de documentos](../src/components/workspace/WorkspaceShell.tsx). Ela carrega [tokens do tema e regras da raiz](../src/components/workspace/document-workspace-theme.css), inclusive para controles nativos montados em portais. Painéis e ações usam componentes com variantes explícitas. A [prévia editorial](../src/modules/admin/proposals/portal-proposal-preview.css) usa página A4 nomeada, alinha a capa à origem do papel e esconde a interface de revisão e envio na impressão. Em tela estreita, a faixa da capa acompanha o conteúdo para manter o nome do serviço sobre o fundo vinho. A lista e a revisão do Mapa de People compartilham o diálogo de envio em JSX. O relatório oficial recebe os estilos da própria página dentro do iframe.

Editor, filtros, alertas, complementos, histórico e diálogos de Relatórios usam utilitários no JSX. A leitura Cliente e a barra de impressão seguem o mesmo padrão. O papel executivo carrega a [base A4](../src/components/reports/report-document-a4.css) antes dos [estilos internos do documento](../src/components/reports/executive-report-paper.css). As folhas preservam medidas físicas em mm e pt, marca vetorial, margens, tipografia do PDF, seleção por coluna, repetição de cabeçalho da tabela e quebras de página. A folha A4 controla o reset da moldura, a quebra e a tipografia de impressão em Admin, Cliente e Partner. [Fontes de assinatura](../src/components/reports/report-signature-fonts.css) preservam os estilos históricos de assinatura.

A listagem e os convites de Perfil Comportamental usam Tailwind no JSX. Os relatórios DISC compartilham a [folha editorial A4](../src/modules/disc/components/profile-report-a4.css). O PDF gerado captura cada folha em 794 × 1123 px e a impressão do navegador usa uma página A4 nomeada. Os gráficos e o layout comum das folhas ficam nos componentes.

Formulários Admin e convites DISC compartilham tabela de respostas, estado e confirmação em componentes JSX. A tabela de respostas fixa as colunas de seleção, edição e data durante a rolagem. Os keyframes da [confirmação](../src/components/forms/form-feedback-motion.css) e da [gaveta de resposta](../src/modules/admin/forms/components/form-response-editor-motion.css) ficam junto aos componentes e respeitam a preferência de movimento reduzido.

As listas de Propostas, Mapa de People e Auditoria compartilham [indicadores](../src/components/workspace/components/AdminMetricsStrip.tsx) e [controles](../src/components/workspace/components/AdminListControls.tsx). Propostas, Mapa e Avisos reutilizam os [botões de linha](../src/components/workspace/components/AdminRowActions.tsx). A barra de Auditoria pode quebrar linha em qualquer largura.

## Primitivas

| Componente | Contrato |
| --- | --- |
| [Button](../src/components/ds/Button.tsx) | Variantes tipadas, submissão nativa, ação em andamento e foco de teclado. Botões de fechamento têm nome acessível. |
| [FieldLabel](../src/components/ds/FieldLabel.tsx), [Input](../src/components/ds/Input.tsx), [Textarea](../src/components/ds/Textarea.tsx), [Checkbox](../src/components/ds/Checkbox.tsx) | Mantêm label, autocomplete, referência DOM, validação e serialização nativas. O campo de data, mês e horário usa o seletor do navegador. |
| [Select](../src/components/ds/Select.tsx), [FilterSelect](../src/components/ds/FilterSelect.tsx) | O texto e a seta usam o mesmo recuo de 3,5 passos da escala Tailwind. A caixa reserva espaço extra para a largura da seta e o texto. Alto contraste usa a seta nativa. O select múltiplo mantém o listbox nativo. |
| [GuidedField](../src/components/ds/GuidedField.tsx) | Preserva o campo sublinhado dos formulários públicos guiados. |
| [DialogFrame](../src/components/ds/DialogFrame.tsx), [DialogForm](../src/components/ds/DialogForm.tsx) | Nome acessível, entrada e retorno de foco, Tab circular e Escape quando há ação de fechar. Formulário continua sendo um formulário nativo. |
| [InlineNotice](../src/components/ds/InlineNotice.tsx), [EmptyState](../src/components/ds/EmptyState.tsx), [LoadingState](../src/components/ds/LoadingState.tsx), [WorkspaceRouteLoader](../src/components/ds/WorkspaceRouteLoader.tsx) | Feedback de erro, confirmação, vazio e carregamento. A cor complementa texto e estado semântico. Avisos `warning` usam `px-4` e `py-3` e mantêm o texto corrido em um bloco. |
| [WorkflowList](../src/components/ds/WorkflowList.tsx), [WorkflowControls](../src/components/ds/WorkflowControls.tsx), [WorkflowHeading](../src/components/ds/WorkflowHeading.tsx) | Reutilizam grade, linha e filtros responsivos. Mantêm controles nativos e permitem que o módulo configure colunas e ações. |
| [WorkflowDialog](../src/components/ds/WorkflowDialog.tsx), [CompactDialog](../src/components/ds/CompactDialog.tsx), [AdminNotice](../src/components/ds/AdminNotice.tsx) | Utilitários dos diálogos e avisos operacionais no componente. Animações acompanham o [shell](../src/components/workspace/workspace-motion.css) e respeitam movimento reduzido. |
| [StatusBadge](../src/components/ds/StatusBadge.tsx), [DataTable](../src/components/ds/DataTable.tsx) | Preservam o elemento semântico e as variantes usadas pelos fluxos. Rótulos e estados persistidos pertencem ao domínio. |

As primitivas preservam seletores que fazem parte da integração com estilos e runtimes. As ações, as permissões e o conteúdo ficam nos componentes de domínio.

## Campos de formulário

- Use as primitivas para campos comuns em páginas, filtros, formulários, diálogos e tabelas. Separe a moldura e os estados do campo, que pertencem ao DS, da largura, da posição na grade e das dependências, que pertencem ao fluxo.
- Use `field` nos formulários com respiro padrão, `compact` em editores densos e `filter` nos selects de barras e tabelas. Use `bare` se a moldura e o estado de foco ficam em outro elemento, como uma busca com ícone. `embedded` preserva a geometria ou a apresentação própria de uma composição especializada, como uma célula da matriz editorial, o perfil com editor de assinatura ou o campo com menções.
- Regras ancestrais podem cuidar de campos ainda integrados a uma composição especial. Preserve o recuo horizontal da primitiva `Select`, inclusive em temas, diálogos e portais. Use `background-color` para trocar só a cor de fundo e preservar a imagem da seta.
- Controles especializados de upload, rádio, cor, range e campos ocultos podem usar o elemento nativo. Escolha rótulos, nomes, foco, estados desabilitados e mensagens de erro conforme a função. O teste de arquitetura protege a adoção das primitivas em toda a interface React.
- A revisão inclui filtros de Horas, Projetos e da Visão geral, lançamento e auditoria de Horas, Agenda, Equipe, Propostas, Formulários, Relatórios, Documentos, Ocorrências, Avisos, DISC e superfícies do Cliente e do Partner. A busca do Admin preserva texto e atalho em uma linha a 1203 × 906 e usa truncamento quando a largura cai.

## Aceite visual

Compare desktop, notebook, tablet e celular com fixtures equivalentes. Exercite tema, teclado, foco, vazio, carregamento e falha. Em diálogo ou gaveta, confira abertura, fechamento, rolagem, retorno do foco e ação primária com clique e toque. Em impressão, confira conteúdo, fonte, tamanho e quebra de página. [Comparação visual](VISUAL_QA.md) · [Matriz de aceite](CONSOLIDATION_ACCEPTANCE.md) · [Testes](TESTING.md)
