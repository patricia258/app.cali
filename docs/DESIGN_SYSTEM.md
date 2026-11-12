# Design system

A interface publicada fornece a referência de composição, tipografia, cores e estados. Os temas Dia e Noite usam a mesma estrutura de componentes. Formulários públicos, impressão e PDFs preservam a apresentação de seus fluxos.

## Tokens e Tailwind

[Tokens base](../src/styles/tokens.css) concentram a paleta CALI, tipografia, dimensões dos controles e carregamento. [Tokens de tema](../src/styles/theme-tokens.css) definem a superfície, o texto, o destaque, as bordas e os estados em Dia e Noite. A folha do shell mantém os valores próprios de sua composição.

[Configuração Tailwind](../src/styles/tailwind.css) expõe esses valores com `@theme inline`. Use utilidades `tw:` no JSX e tokens semânticos, como `tw:text-cali-accent`. O CSS mantém o reset e a precedência existentes. As folhas carregadas isoladamente referenciam o Tailwind com `@reference`. Use `@apply` quando um seletor já integra o contrato com o runtime, com um portal ou com o tema.

O CSS acompanha a página, o componente ou o domínio. Os [estilos de entrada](../src/styles/surfaces.css) definem a base das páginas públicas e dos documentos Admin. Landing e Login importam seus estilos próprios. As rotas de Propostas, Mapa e impressão Admin importam a [moldura dos documentos](../src/components/workspace/document-shell.css). O [estado visual da rota](../src/components/workspace/visualSystem.ts) seleciona o escopo e aplica o tema antes da renderização, sem injetar folhas. Os manifests de [Propostas](../src/modules/admin/proposals/document-styles.ts) e [Impressão](../src/modules/reports/print-styles.ts) aplicam as regras de domínio depois da moldura.

A [ordem operacional do shell](../src/components/workspace/operational.css) preserva as sobrescritas entre módulos. A [folha gerada do shell](../src/components/workspace/workspace-shell.generated.css) usa utilitários para as declarações equivalentes e mantém a ordem da fonte aprovada. Regras de impressão, fontes, animações, máscaras, seletores de runtime, composição de portais e geometrias calculadas ficam nas folhas de seus consumidores.

| CSS próprio | Motivo |
| --- | --- |
| [Tokens de tema](../src/styles/theme-tokens.css) | Variáveis de dia e noite aplicadas às superfícies públicas e de documentos. O Workspace compacto preserva a apresentação diurna. |
| [Landing](../src/modules/public/landing/landing-identity.css) e [Login](../src/modules/access/sign-in/sign-in.css) | Composição de marca, carrossel, ilustrações, formulário, autofill e comportamento responsivo. |
| [Moldura de documentos](../src/components/workspace/document-shell.css) | Navegação, perfil, tema e portais nas rotas Admin de proposta e Mapa e na impressão Admin. |
| [Proposta](../src/modules/admin/proposals/portal-proposal-preview.css) e [relatório](../src/modules/reports/report-pdf-pagination.css) | Medidas do papel, quebras, fontes editoriais e comportamento da mídia de impressão. |
| [Carregamento](../src/components/ds/route-loading.css) | Máscaras da marca, alternância dos símbolos e movimento reduzido. |
| [Timer global](../src/components/hours/global-timer-overflow.css) | Tamanho do painel dentro do viewport, sombra e valores calculados a partir do gatilho. |
| [Ordem operacional](../src/components/workspace/operational.css) | Seletores compartilhados com markup existente, portais, estados dos módulos e ajustes de cascata. |

O gerador de CSS usa os commits aprovados da V2 e do protótipo Admin. Para reproduzir a versão atual, execute `node scripts/generate-workspace-shell-css.cjs <checkout-v2> 7c0a2323bb221cfd61c0a8ed4ced8670c05cce78`. A revisão do Admin fica registrada no cabeçalho da folha gerada.

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
