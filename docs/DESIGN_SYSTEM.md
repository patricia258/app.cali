# Design system

A interface publicada fornece a referência de composição, tipografia, cores e estados. Os temas Dia e Noite usam a mesma estrutura de componentes. Formulários públicos, impressão e PDFs preservam a apresentação de seus fluxos.

## Tokens e Tailwind

[Tokens base](../src/styles/tokens.css) concentram a paleta CALI, tipografia, dimensões dos controles e carregamento. [Tokens de tema](../src/styles/theme-tokens.css) definem a superfície, o texto, o destaque, as bordas e os estados em Dia e Noite. A folha do shell mantém os valores próprios de sua composição.

[Configuração Tailwind](../src/styles/tailwind.css) expõe esses valores com `@theme inline`. Escreva layout, aparência, responsividade e estados com utilitários `tw:` no JSX do componente que possui a marcação. Use tokens semânticos para os temas e variantes de estado para foco, seleção, espera e erro. Agrupe classes repetidas por variante em um componente que represente a mesma interação.

Durante a migração, compare valores computados. O shell compacto usa raiz de 13 px. Prefira tokens e a escala de espaçamento e tipografia do Tailwind. Use `rem` quando a escala não representar a medida. Pequenas diferenças são aceitáveis quando preservam a identidade visual, a legibilidade e a interação. Mantenha as classes junto da marcação e reutilize componentes para padrões de interface recorrentes. O mesmo vale para a altura de linha acoplada às utilidades de fonte e para limites inclusivos de media queries.

### CSS colocalizado

- Integração de biblioteca com DOM interno fica ao lado do adaptador ou componente. Importe a folha com o componente. Use uma raiz de escopo e seletores de baixa especificidade. Quando a biblioteca expõe tokens, propriedades CSS ou classes por slot, use essa interface.
- Defina ordem de cascata explícita em cada integração. Quando for possível controlar os imports, coloque os estilos do fornecedor em uma camada anterior à da integração. Use regras base, estados e variantes responsivas em ordem coerente dentro do mesmo escopo. Registre a dependência quando uma folha externa sem camada determina a precedência.
- Keyframes próprios ficam ao lado do componente. Layout, duração, easing, estado e resposta a movimento reduzido usam utilitários onde aplicável. Fontes, reset, tokens e mídia paginada mantêm os recursos nativos do CSS que precisam.
- Para medidas em execução, passe o valor por propriedade CSS e mantenha a regra visual no componente. Posicionamento medido no viewport também pode ser expresso diretamente com o valor calculado.
- Resets do shell usam a camada base e seletores sem especificidade. As utilidades definem a tipografia e as margens do componente. Use faixas responsivas sem sobreposição quando dois limites alterarem a mesma propriedade.
- Remova regras antigas quando a marcação passar a controlar o estilo. Evite novas pilhas de seletores, `!important` e transposição de folhas para `@apply`. Marcadores usados por runtimes e testes podem continuar até os consumidores migrarem.

O [inventário da migração](TAILWIND_MIGRATION.md) acompanha as folhas ativas por domínio, os acoplamentos e as exceções confirmadas. O [manifest operacional](../src/components/workspace/operational.css) documenta a ordem atual das folhas transversais ainda em migração.

Em Propostas, lista, briefing, editor e ações da prévia usam utilitários no JSX. O [briefing](../src/modules/admin/proposals/AdminProposalsPage.tsx) bloqueia a rolagem do fundo enquanto o painel lateral está montado. O [visualizador do PDF arquivado](../src/modules/admin/proposals/AdminProposalPreviewPage.tsx) controla as dimensões do iframe no JSX. Editor e prévia usam a [moldura de documentos](../src/components/workspace/document-shell.css). A [prévia editorial](../src/modules/admin/proposals/portal-proposal-preview.css) usa página A4 nomeada, alinha a capa à origem do papel e esconde a interface de revisão e envio na impressão. A lista e a revisão do Mapa de People compartilham o diálogo de envio em JSX. O relatório oficial recebe os estilos da própria página dentro do iframe.

Editor, filtros, alertas, complementos, histórico e diálogos de Relatórios usam utilitários no JSX. A leitura Cliente e a barra de impressão seguem o mesmo padrão. O papel executivo carrega a [base A4](../src/components/reports/report-document-a4.css) antes dos [estilos internos do documento](../src/components/reports/executive-report-paper.css). As folhas preservam medidas físicas em mm e pt, marca vetorial, margens, tipografia do PDF, seleção por coluna, repetição de cabeçalho da tabela e quebras de página. A folha A4 controla o reset da moldura, a quebra e a tipografia de impressão em Admin, Cliente e Partner. [Fontes de assinatura](../src/components/reports/report-signature-fonts.css) preservam os estilos históricos de assinatura.

A listagem e os convites de Perfil Comportamental usam Tailwind no JSX. Os relatórios DISC compartilham a [folha editorial A4](../src/modules/disc/components/profile-report-a4.css). O PDF gerado captura cada folha em 794 × 1123 px e a impressão do navegador usa uma página A4 nomeada. Os gráficos e o layout comum das folhas ficam nos componentes.

Formulários Admin e convites DISC compartilham tabela de respostas, estado e confirmação em componentes JSX. A tabela de respostas fixa as colunas de seleção, edição e data durante a rolagem. Os keyframes da [confirmação](../src/components/forms/form-feedback-motion.css) e da [gaveta de resposta](../src/modules/admin/forms/components/form-response-editor-motion.css) ficam junto aos componentes e respeitam a preferência de movimento reduzido.

As listas de Propostas, Mapa de People e Auditoria compartilham [indicadores](../src/components/workspace/components/AdminMetricsStrip.tsx) e [controles](../src/components/workspace/components/AdminListControls.tsx). Propostas, Mapa e Avisos reutilizam os [botões de linha](../src/components/workspace/components/AdminRowActions.tsx). A barra de Auditoria pode quebrar linha em qualquer largura.

## Primitivas

| Componente | Contrato |
| --- | --- |
| [Button](../src/components/ds/Button.tsx) | Variantes tipadas, submissão nativa, ação em andamento e foco de teclado. Botões de fechamento têm nome acessível. |
| [FieldLabel](../src/components/ds/FieldLabel.tsx), [FilterSelect](../src/components/ds/FilterSelect.tsx), [GuidedField](../src/components/ds/GuidedField.tsx) | Mantêm rótulo, autocomplete, seleção, referência DOM e validação nativa. |
| [DialogFrame](../src/components/ds/DialogFrame.tsx), [DialogForm](../src/components/ds/DialogForm.tsx) | Nome acessível, entrada e retorno de foco, Tab circular e Escape quando há ação de fechar. Formulário continua sendo um formulário nativo. |
| [InlineNotice](../src/components/ds/InlineNotice.tsx), [EmptyState](../src/components/ds/EmptyState.tsx), [LoadingState](../src/components/ds/LoadingState.tsx), [WorkspaceRouteLoader](../src/components/ds/WorkspaceRouteLoader.tsx) | Feedback de erro, confirmação, vazio e carregamento. A cor complementa texto e estado semântico. |
| [StatusBadge](../src/components/ds/StatusBadge.tsx), [DataTable](../src/components/ds/DataTable.tsx) | Preservam o elemento semântico e as variantes usadas pelos fluxos. Rótulos e estados persistidos pertencem ao domínio. |

As primitivas preservam seletores que fazem parte da integração com estilos e runtimes. As ações, as permissões e o conteúdo ficam nos componentes de domínio.

## Aceite visual

Compare desktop, notebook, tablet e celular com fixtures equivalentes. Exercite tema, teclado, foco, vazio, carregamento e falha. Em diálogo ou gaveta, confira abertura, fechamento, rolagem, retorno do foco e ação primária com clique e toque. Em impressão, confira conteúdo, fonte, tamanho e quebra de página. [Comparação visual](VISUAL_QA.md) · [Matriz de aceite](CONSOLIDATION_ACCEPTANCE.md) · [Testes](TESTING.md)
